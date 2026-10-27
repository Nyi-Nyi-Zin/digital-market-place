"use client";
import { toast } from "sonner";
import { Button } from "../components/ui/button";

import { Input } from "../components/ui/input";

import { useI18n } from "../components/I18nProvider";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { t } = useI18n();

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
          if (result.error) throw new Error(result.error.message);
          toast.success(t("Profile updated."));
        } catch {
          toast.error(t("Unable to update your profile. Please try again."), {
            id: "operation-error",
          });
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>{t("Profile")}</h2>
      <div className="profile-fields">
        <label>
          {t("Full name")}
          <Input
            name="name"
            autoComplete="name"
            defaultValue={name}
            required
            minLength={2}
            maxLength={160}
          />
        </label>
        <label>
          {t("Email")}
          <Input value={email} readOnly type="email" />
        </label>
      </div>
      <div className="profile-footer">
        <Button
          variant="brand"
          size="brand"
          className="button button-primary"
          disabled={pending}
        >
          {t("Save profile")}
        </Button>

        <Link href="/forgot-password">{t("Reset your password →")}</Link>
      </div>
    </form>
  );
}
