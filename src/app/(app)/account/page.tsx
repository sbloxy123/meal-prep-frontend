"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, signOut } from "@/lib/auth-client";
import { PageHeader } from "@/components/page-header";

export default function AccountPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = new FormData(e.currentTarget);
    const currentPassword = form.get("currentPassword") as string;
    const newPassword = form.get("newPassword") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match");
      setStatus("error");
      return;
    }

    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });

    if (error) {
      setErrorMsg(error.message ?? "Failed to change password");
      setStatus("error");
    } else {
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <>
      <PageHeader
        title="Account"
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => signOut().then(() => router.push("/sign-in"))}
          >
            Sign out
          </button>
        }
      />
      <div className="page-body max-w-md">
        <div className="bg-white rounded-xl shadow p-8">
        <h2 className="text-base font-medium text-gray-900 mb-4">Change password</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}
          {status === "success" && (
            <p className="text-sm text-green-600">Password changed successfully.</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {status === "loading" ? "Updating…" : "Update password"}
          </button>
        </form>
        </div>
      </div>
    </>
  );
}
