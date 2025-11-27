"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Input from "@/app/_components/GlobalComponents/Form/Input";

interface LoginFormProps {
  oidcAvailable: boolean;
  isFirstUser: boolean;
}

export default function LoginForm({
  oidcAvailable,
  isFirstUser,
}: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isFirstUser) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, isAdmin: true }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Registration failed");
          setLoading(false);
          return;
        }

        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!loginResponse.ok) {
          setError("Account created but login failed. Please try logging in.");
          setLoading(false);
          return;
        }
      } else {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Login failed");
          setLoading(false);
          return;
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleOidcLogin = () => {
    window.location.href = "/api/oidc/login";
  };

  return (
    <div className="space-y-6">
      {oidcAvailable && !isFirstUser && (
        <div className="space-y-4">
          <Button
            type="button"
            variant="filled"
            size="lg"
            className="w-full"
            onClick={handleOidcLogin}
            disabled={loading}
          >
            Sign in with SSO
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-outline"></div>
            <span className="text-sm text-on-surface-variant">or</span>
            <div className="flex-1 h-px bg-outline"></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-error-container text-on-error-container">
            {error}
          </div>
        )}

        {isFirstUser && (
          <div className="p-4 rounded-lg bg-primary-container text-on-primary-container">
            <p className="text-sm font-medium">
              Create the first admin account
            </p>
          </div>
        )}

        <Input
          id="username"
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="Enter your username"
          disabled={loading}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
          disabled={loading}
        />

        <Button
          type="submit"
          variant="filled"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading
            ? isFirstUser
              ? "Creating account..."
              : "Signing in..."
            : isFirstUser
            ? "Create admin account"
            : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
