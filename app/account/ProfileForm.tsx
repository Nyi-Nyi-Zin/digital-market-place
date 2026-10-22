"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="admin-panel admin-form"
      onSubmit={async e => {
        e.preventDefault();
        setPending(true);
        const data = new FormData(e.currentTarget);
        try {
          const result = await authClient.updateUser({
            name: String(data.get("name")),
          });
          setMessage(result.error?.message ?? "Profile updated.");
        } catch {
          setMessage("Unable to update your profile. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Profile</h2>
      <label>
        Full name
        <input
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={160}
        />
      </label>
      <label>
        Email
        <input value={email} readOnly type="email" />
      </label>
      <button className="button button-primary" disabled={pending}>
        Save profile
      </button>
      {message && <p role="status">{message}</p>}
      <Link href="/forgot-password">Reset your password →</Link>
    </form>
  );
}
