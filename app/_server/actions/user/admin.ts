"use server";

import bcrypt from "bcryptjs";
import type { CurrentUser } from "@/app/_types";
import {
  dropUserSessions,
  isValidUsername,
  newEncryptionKey,
  readUsers,
  updateUsers,
} from "@/app/_lib/auth-utils";
import { getCurrentUser } from "@/app/_lib/current-user";
import {
  createUserFolder,
  removeAvatarFile,
  removeUserFolder,
} from "@/app/_lib/user-files";
import { purgeUserData } from "@/app/_lib/user-migration";
import { auditLog } from "@/app/_lib/audit-log";
import {
  ActionResult,
  BCRYPT_ROUNDS,
  MIN_PASSWORD_LENGTH,
} from "@/app/_server/actions/user/constants";

const UNAUTHORIZED: ActionResult = { success: false, error: "Unauthorized" };

const _requireAdmin = async (): Promise<CurrentUser | null> => {
  const user = await getCurrentUser();
  return user?.isAdmin ? user : null;
};

const _passwordError = (password: unknown): string | null =>
  typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH
    ? null
    : `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;

export const createUser = async (
  username: string,
  password: string,
  isAdmin: boolean
): Promise<ActionResult> => {
  if (!(await _requireAdmin())) return UNAUTHORIZED;

  if (!isValidUsername(username)) {
    return { success: false, error: "Invalid username" };
  }

  const passwordError = _passwordError(password);
  if (passwordError) return { success: false, error: passwordError };

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const created = await updateUsers((users) => {
    if (users.some((u) => u.username === username)) return false;

    users.push({
      username,
      passwordHash,
      isAdmin: isAdmin === true,
      createdAt: new Date().toISOString(),
      encryptionKey: newEncryptionKey(),
    });
    return true;
  });

  if (!created) return { success: false, error: "User already exists" };

  if (isAdmin !== true) await createUserFolder(username);

  await auditLog("user:create", { resource: username, success: true });
  return { success: true };
};

export const deleteUser = async (username: string): Promise<ActionResult> => {
  const admin = await _requireAdmin();
  if (!admin) return UNAUTHORIZED;

  if (admin.username === username) {
    return { success: false, error: "Cannot delete your own account" };
  }

  const users = await readUsers();
  const target = users.find((u) => u.username === username);

  if (!target) return { success: false, error: "User not found" };
  if (target.isSuperAdmin) {
    return { success: false, error: "Cannot delete super admin" };
  }

  await updateUsers((all) => {
    const index = all.findIndex((u) => u.username === username);
    if (index >= 0) all.splice(index, 1);
  });

  await dropUserSessions(username);
  await removeAvatarFile(target.avatar);
  await purgeUserData(username);

  if (!target.isAdmin) await removeUserFolder(username);

  await auditLog("user:delete", { resource: username, success: true });
  return { success: true };
};

export const updateUser = async (
  username: string,
  updates: { password?: string; isAdmin?: boolean }
): Promise<ActionResult> => {
  const admin = await _requireAdmin();
  if (!admin) return UNAUTHORIZED;

  const users = await readUsers();
  const target = users.find((u) => u.username === username);

  if (!target) return { success: false, error: "User not found" };
  if (target.isSuperAdmin && admin.username !== username) {
    return { success: false, error: "Cannot modify super admin" };
  }
  if (target.isSuperAdmin && updates.isAdmin !== undefined) {
    return { success: false, error: "Cannot change super admin role" };
  }

  if (updates.password) {
    const passwordError = _passwordError(updates.password);
    if (passwordError) return { success: false, error: passwordError };
  }

  const passwordHash = updates.password
    ? await bcrypt.hash(updates.password, BCRYPT_ROUNDS)
    : undefined;

  await updateUsers((all) => {
    const user = all.find((u) => u.username === username);
    if (!user) return;

    if (passwordHash) user.passwordHash = passwordHash;
    if (updates.isAdmin !== undefined) user.isAdmin = updates.isAdmin === true;
  });

  if (passwordHash && username !== admin.username) {
    await dropUserSessions(username);
  }

  const demoted = target.isAdmin && updates.isAdmin === false;
  if (demoted) await createUserFolder(username);

  if (updates.isAdmin !== undefined && updates.isAdmin !== target.isAdmin) {
    await auditLog("user:role_change", {
      resource: username,
      details: { isAdmin: updates.isAdmin },
      success: true,
    });
  }

  return { success: true };
};
