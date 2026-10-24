"use client";
import { toast } from "sonner";
import { Button } from "./ui/button";

import { Input } from "./ui/input";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { useI18n } from "./I18nProvider";
import { CircleCheck, Mail, ShieldCheck, UserRound } from "lucide-react";
import { SummaryCards } from "./SummaryCards";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [profileName, setProfileName] = useState(name);

  return (
    <>
      <SummaryCards
        cards={[
          {
            label: "Full name",
            value: profileName,
            icon: UserRound,
            tone: "blue",
          },
          { label: "Email", value: email, icon: Mail, tone: "green" },
          {
            label: "Access",
            value: t("Admin"),
            icon: ShieldCheck,
            tone: "amber",
          },
          {
            label: "Status",
            value: t("Signed in"),
            icon: CircleCheck,
            tone: "purple",
          },
        ]}
      />
      <form
        className="admin-panel admin-form profile-form"
        onSubmit={async event => {
          event.preventDefault();
          setPending(true);

          const data = new FormData(event.currentTarget);
          try {
            const result = await authClient.updateUser({
              name: String(data.get("name")),
            });
            if (result.error) throw new Error(result.error.message);
            setProfileName(String(data.get("name")));
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
        <label>
          {t("Full name")}
          <Input
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
          <Input value={email} readOnly type="email" />
        </label>
        <Button
          variant="brand"
          size="brand"
          className="button button-primary"
          disabled={pending}
        >
          {pending ? t("Please wait…") : t("Save profile")}
        </Button>

        <Link href="/forgot-password">{t("Reset your password →")}</Link>
      </form>
    </>
  );
}
