"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  changeUsername,
  updateAvatar,
  changePassword,
  removeAvatar,
} from "@/app/actions/auth";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import UserAvatar from "@/app/_components/FeatureComponents/User/UserAvatar";

export default function ProfileTab() {
  const { user } = usePreferences();

  if (!user) {
    return null;
  }
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleUsernameChange = async () => {
    if (username === user.username) return;

    setIsChangingUsername(true);
    setUsernameError("");
    setUsernameSuccess(false);

    try {
      const result = await changeUsername(username || "");
      if (result.success) {
        setUsernameSuccess(true);
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        setUsernameError(result.error || "Failed to change username");
      }
    } catch (error) {
      setUsernameError("An error occurred");
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 2MB");
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const result = await updateAvatar(base64, file.name);
      if (result.success) {
        router.refresh();
      } else {
        setAvatarError(result.error || "Failed to upload avatar");
      }
    } catch (error) {
      setAvatarError("An error occurred");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user.avatar) return;

    setIsRemovingAvatar(true);
    setAvatarError("");

    try {
      const result = await removeAvatar();
      if (result.success) {
        router.refresh();
      } else {
        setAvatarError(result.error || "Failed to remove avatar");
      }
    } catch (error) {
      setAvatarError("An error occurred");
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess(false);

    try {
      const result = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );
      if (result.success) {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(result.error || "Failed to change password");
      }
    } catch (error) {
      setPasswordError("An error occurred");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">Avatar</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20">
              <UserAvatar user={user} size="xl" className="!w-20 !h-20" />
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin">
                  <Icon
                    icon="progress_activity"
                    size="md"
                    className="text-white"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="outlined"
                onClick={handleAvatarSelect}
                disabled={isUploadingAvatar || isRemovingAvatar}
              >
                {isUploadingAvatar ? "Uploading..." : "Change Avatar"}
              </Button>
              {user.avatar && (
                <Button
                  variant="outlined"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar || isRemovingAvatar}
                  className="text-error"
                >
                  {isRemovingAvatar ? "Removing..." : "Remove"}
                </Button>
              )}
            </div>
            {avatarError && <p className="text-error text-sm">{avatarError}</p>}
            <p className="text-on-surface-variant text-sm">
              JPG, PNG or GIF. Max size 2MB.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">Username</h2>
        <div className="space-y-4">
          <Input
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError("");
              setUsernameSuccess(false);
            }}
            error={usernameError}
            disabled={isChangingUsername}
          />
          {usernameSuccess && (
            <div className="p-3 rounded-lg bg-primary-container text-on-primary-container text-sm">
              Username changed successfully!
            </div>
          )}
          <Button
            variant="filled"
            onClick={handleUsernameChange}
            disabled={
              isChangingUsername ||
              username === user.username ||
              !username?.trim()
            }
          >
            {isChangingUsername ? "Saving..." : "Save Username"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setPasswordError("");
              setPasswordSuccess(false);
            }}
            disabled={isChangingPassword}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordError("");
              setPasswordSuccess(false);
            }}
            disabled={isChangingPassword}
            required
            helperText="Minimum 6 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError("");
              setPasswordSuccess(false);
            }}
            error={
              confirmPassword && newPassword !== confirmPassword
                ? "Passwords do not match"
                : undefined
            }
            disabled={isChangingPassword}
            required
          />
          {passwordError && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-primary-container text-on-primary-container text-sm">
              Password changed successfully!
            </div>
          )}
          <Button
            variant="filled"
            type="submit"
            disabled={
              isChangingPassword ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword
            }
          >
            {isChangingPassword ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">
          Account Information
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Role:</span>
            <span className="text-on-surface">
              {user.isAdmin ? "Administrator" : "User"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
