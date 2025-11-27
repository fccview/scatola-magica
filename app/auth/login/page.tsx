import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import LoginForm from "@/app/auth/login/LoginForm";
import { hasUsers, isOidcAvailable, readSessions } from "@/app/actions/auth";
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

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mb-8">
            <Logo className="w-32 h-32 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-on-surface mb-2">
            Scatola Magica
          </h1>
          <p className="text-on-surface-variant">
            {usersExist
              ? "Sign in to continue"
              : "Create the first admin account"}
          </p>
        </div>

        <LoginForm oidcAvailable={oidcAvail} isFirstUser={!usersExist} />
      </div>
    </div>
  );
}
