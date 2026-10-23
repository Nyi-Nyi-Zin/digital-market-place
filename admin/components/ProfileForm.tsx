"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { useI18n } from "./I18nProvider";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="admin-panel admin-form profile-form"
      onSubmit={async event => {
        event.preventDefault();
        setPending(true);
        setMessage("");
        setError("");
        const data = new FormData(event.currentTarget);
        try {
          const result = await authClient.updateUser({
            name: String(data.get("name")),
          });
          if (result.error) throw new Error(result.error.message);
          setMessage("Profile updated.");
        } catch {
          setError("Unable to update your profile. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>{t("Profile")}</h2>
      <label>
        {t("Full name")}
        <input
          name="name"
          defaultValue={name}
          autoComplete="name"
          required
          minLength={2}
          maxLength={160}
        />
      </label>
      <label>
        {t("Email")}
        <input value={email} readOnly type="email" />
      </label>
      <button className="button button-primary" disabled={pending}>
        {pending ? t("Please wait…") : t("Save profile")}
      </button>
      {message && (
        <p className="notice" role="status">
          {t(message)}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <Link href="/forgot-password">{t("Reset your password →")}</Link>
    </form>
  );
}
