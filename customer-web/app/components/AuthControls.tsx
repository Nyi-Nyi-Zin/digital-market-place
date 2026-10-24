"use client";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "./I18nProvider";

import Link from "next/link";
import { authClient } from "../lib/auth-client";
export function AuthControls() {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  if (isPending)
    return (
      <span className="account-loading" role="status">
        {t("Loading account…")}
      </span>
    );
  if (!session)
    return (
      <Link className="button button-primary" href="/sign-in">
        {t("Sign in")}
      </Link>
    );
  return (
    <>
      <Link className="account-link" href="/account">
        {session.user.name}
      </Link>
      <Button
        variant="brand"
        size="brand"
        className="button button-secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error(result.error.message);
            window.location.assign("/");
          } catch {
            toast.error(t("Please try again."), { id: "operation-error" });
            setPending(false);
          }
        }}
      >
        {t("Sign out")}
      </Button>
    </>
  );
}
