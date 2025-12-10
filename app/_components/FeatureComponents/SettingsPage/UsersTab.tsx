"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUser, updateUser } from "@/app/_server/actions/user";
import { useUsers } from "@/app/_providers/UsersProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";
import CreateUserModal from "@/app/_components/FeatureComponents/Modals/CreateUserModal";

export default function UsersTab() {
  const router = useRouter();
  const { users, refreshUsers } = useUsers();
  const { user: currentUser } = usePreferences();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!currentUser?.isAdmin) {
    return (
      <div className="p-6 text-center text-on-surface-variant">
        You do not have permission to manage users.
      </div>
    );
  }

  const handleEditClick = (username: string, isAdmin: boolean) => {
    setEditingUser(username);
    setEditIsAdmin(isAdmin);
    setEditPassword("");
    setEditConfirmPassword("");
    setError("");
    setSuccess("");
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditPassword("");
    setEditConfirmPassword("");
    setError("");
    setSuccess("");
  };

  const handleSaveEdit = async (username: string) => {
    setIsUpdating(true);
    setError("");
    setSuccess("");

    const updates: { password?: string; isAdmin?: boolean } = {};

    const user = users.find((u) => u.username === username);
    if (!user) {
      setError("User not found");
      setIsUpdating(false);
      return;
    }

    if (editPassword || editConfirmPassword) {
      if (editPassword !== editConfirmPassword) {
        setError("Passwords do not match");
        setIsUpdating(false);
        return;
      }
      if (editPassword) {
        updates.password = editPassword;
      }
    }

    if (editIsAdmin !== user.isAdmin) {
      updates.isAdmin = editIsAdmin;
    }

    if (Object.keys(updates).length === 0) {
      setEditingUser(null);
      setIsUpdating(false);
      return;
    }

    try {
      const result = await updateUser(username, updates);
      if (result.success) {
        setSuccess("User updated successfully!");
        setEditingUser(null);
        setEditPassword("");
        setEditConfirmPassword("");
        await refreshUsers();
        router.refresh();
      } else {
        setError(result.error || "Failed to update user");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    setIsDeleting(username);
    setError("");
    setSuccess("");

    try {
      const result = await deleteUser(username);
      if (result.success) {
        setSuccess("User deleted successfully!");
        await refreshUsers();
        router.refresh();
      } else {
        setError(result.error || "Failed to delete user");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-on-surface">Users</h2>
        <Button
          variant="filled"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Icon icon="add" size="sm" />
          Create User
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-primary-container text-on-primary-container text-sm">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.username}
            className="bg-sidebar rounded-lg p-4 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={`/api/avatar/${user.avatar}`}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
                    <Icon
                      icon="person"
                      size="md"
                      className="text-on-surface-variant"
                    />
                  </div>
                )}
                <div>
                  <div className="font-medium text-on-surface">
                    {user.username}
                  </div>
                  <div className="text-sm text-on-surface-variant">
                    {user.isSuperAdmin
                      ? "Super Admin"
                      : user.isAdmin
                        ? "Administrator"
                        : "User"}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {!user.isSuperAdmin && user.username !== currentUser.username && (
                <div className="flex gap-2">
                  {editingUser === user.username ? (
                    <>
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="filled"
                        size="sm"
                        onClick={() => handleSaveEdit(user.username)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() =>
                          handleEditClick(user.username, user.isAdmin)
                        }
                        disabled={isDeleting === user.username}
                      >
                        <Icon icon="edit" size="sm" />
                      </Button>
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => handleDelete(user.username)}
                        disabled={isDeleting === user.username}
                        className="text-error"
                      >
                        {isDeleting === user.username ? (
                          <Icon icon="progress_activity" size="sm" />
                        ) : (
                          <Icon icon="delete" size="sm" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {editingUser === user.username && (
              <div className="space-y-4 pt-4 border-t border-outline-variant">
                <Input
                  label="New Password (leave empty to keep current)"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  disabled={isUpdating}
                  helperText="Minimum 6 characters"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={editConfirmPassword}
                  onChange={(e) => setEditConfirmPassword(e.target.value)}
                  disabled={isUpdating}
                  error={
                    editConfirmPassword && editPassword !== editConfirmPassword
                      ? "Passwords do not match"
                      : undefined
                  }
                />
                <Switch
                  id={`admin-${user.username}`}
                  checked={editIsAdmin}
                  onChange={setEditIsAdmin}
                  label="Administrator"
                  description="Admin users have full access to all files and settings"
                  disabled={isUpdating}
                />
              </div>
            )}
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            No users found.
          </div>
        )}
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          refreshUsers();
          router.refresh();
        }}
      />
    </div>
  );
}
