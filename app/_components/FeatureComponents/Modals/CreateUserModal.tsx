"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";
import { createUser } from "@/app/_server/actions/user";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateUserModal({
  isOpen,
  onClose,
}: CreateUserModalProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const result = await createUser(username, password, isAdmin);
      if (!result.success) {
        setError(result.error || "Failed to create user");
        setLoading(false);
        return;
      }

      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setIsAdmin(false);
      onClose();
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create User" size="sm">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-error-container text-on-error-container">
            {error}
          </div>
        )}

        <Input
          id="username"
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="Enter username"
          disabled={loading}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter password"
          disabled={loading}
        />

        <Input
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Confirm password"
          disabled={loading}
        />

        <Switch
          id="isAdmin"
          checked={isAdmin}
          onChange={setIsAdmin}
          label="Admin user"
          disabled={loading}
        />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outlined"
            size="lg"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="filled"
            size="lg"
            className="flex-1"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
