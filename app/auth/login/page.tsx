import { redirect } from "next/navigation";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import LoginForm from "@/app/auth/login/LoginForm";
import { getCurrentUser, hasUsers } from "@/app/_lib/current-user";
import {
  isOidcAvailable,
  isPasswordLoginDisabled,
  OidcError,
} from "@/app/_lib/oidc";

const SSO_ERROR_MESSAGES: Record<OidcError, string> = {
  [OidcError.NOT_CONFIGURED]: "Single sign-on is not configured.",
  [OidcError.DISCOVERY]:
    "Could not reach the identity provider. Check OIDC_ISSUER and the server logs.",
  [OidcError.STATE]:
    "Sign-in session expired or APP_URL does not match the address in your browser. Please try again.",
  [OidcError.TOKEN]:
    "The identity provider rejected the login. Check the client ID, secret and redirect URI.",
  [OidcError.ID_TOKEN]: "The identity provider returned an invalid ID token.",
  [OidcError.NONCE]: "Sign-in could not be verified. Please try again.",
  [OidcError.USERNAME]:
    "Your identity provider did not send a usable username, email or subject.",
  [OidcError.UNAUTHORIZED]: "You are not allowed to sign in to this instance.",
  [OidcError.SERVER]: "Something went wrong while signing you in.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  if (await getCurrentUser()) {
    redirect("/");
  }

  const { error } = await searchParams;
  const usersExist = await hasUsers();
  const ssoError = SSO_ERROR_MESSAGES[error as OidcError];

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
            oidcAvailable={isOidcAvailable()}
            isFirstUser={!usersExist}
            passwordLoginDisabled={isPasswordLoginDisabled()}
            initialError={ssoError}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
