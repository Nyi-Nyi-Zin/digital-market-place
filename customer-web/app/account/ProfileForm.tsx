"use client";
import { useI18n } from "../components/I18nProvider";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="account-panel account-form"
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
      <h2>{t("Profile")}</h2>
      <label>
        {t("Full name")}
        <input
          name="name"
          defaultValue={name}
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
        {t("Save profile")}
      </button>
      {message && <p role="status">{t(message)}</p>}
      <Link href="/forgot-password">{t("Reset your password →")}</Link>
    </form>
  );
}
