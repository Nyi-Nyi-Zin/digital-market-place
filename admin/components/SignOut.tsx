"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { useI18n } from "./I18nProvider";

export function SignOut({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className={compact ? "icon-button" : "button button-secondary"}
        aria-label={t("Sign out")}
        title={t("Sign out")}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error(result.error.message);
            window.location.assign("/sign-in");
          } catch {
            setError("Please try again.");
            setPending(false);
          }
        }}
      >
        <LogOut size={18} aria-hidden="true" />
        {!compact && t("Sign out")}
      </button>
      {error && <span role="alert">{t(error)}</span>}
    </>
  );
}
