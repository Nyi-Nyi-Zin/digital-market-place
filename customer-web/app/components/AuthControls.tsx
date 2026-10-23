"use client";
import { useI18n } from "./I18nProvider";

import Link from "next/link";
import { authClient } from "../lib/auth-client";
export function AuthControls() {
  const { t } = useI18n();
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
      <button
        className="button button-secondary"
        onClick={async () => {
          const result = await authClient.signOut();
          if (!result.error) window.location.assign("/");
        }}
      >
        {t("Sign out")}
      </button>
    </>
  );
}
