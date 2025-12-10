import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import LoginForm from "@/app/auth/login/LoginForm";
import {
  hasUsers,
  isOidcAvailable,
  isPasswordLoginDisabled,
  readSessions,
} from "@/app/_server/actions/user";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;

  if (sessionId) {
    const sessions = await readSessions();
    if (sessions && sessions[sessionId]) {
      redirect("/");
    }
  }

  const usersExist = await hasUsers();
  const oidcAvail = await isOidcAvailable();
  const passwordLoginDisabled = await isPasswordLoginDisabled();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8 p-4 rounded-lg relative">
        <div className="mb-8">
          <Logo className="w-52 mx-auto" />
        </div>

        <div className="bg-sidebar py-8 px-4">
          <div className="text-center">
            <p className="text-on-surface-variant">
              {usersExist ? "" : "Create the first admin account"}
            </p>
          </div>

          <LoginForm
            oidcAvailable={oidcAvail}
            isFirstUser={!usersExist}
            passwordLoginDisabled={passwordLoginDisabled}
          />
        </div>
      </div>
    </div>
  );
}
