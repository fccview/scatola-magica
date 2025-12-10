import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  readUsers,
  writeUsers,
  getSessionUsername,
} from "@/app/_server/actions/user";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { username, password, isAdmin } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const users = await readUsers();
    const isFirstUser = users.length === 0;

    if (!isFirstUser) {
      const sessionId = request.cookies.get(COOKIE_NAME)?.value;
      if (!sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const currentUsername = await getSessionUsername(sessionId);
      if (!currentUsername) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const currentUser = users.find((u) => u.username === currentUsername);

      if (!currentUser || !currentUser.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existingUser = users.find((u) => u.username === username);
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let encryptionKey: string;
    if (process.env.ENCRYPTION_KEY) {
      encryptionKey = process.env.ENCRYPTION_KEY;
    } else {
      const crypto = await import("crypto");
      encryptionKey = crypto.randomUUID().slice(0, 13);
    }

    users.push({
      username,
      passwordHash,
      isAdmin: isFirstUser ? true : isAdmin === true,
      isSuperAdmin: isFirstUser,
      createdAt: new Date().toISOString(),
      encryptionKey,
    });

    await writeUsers(users);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
