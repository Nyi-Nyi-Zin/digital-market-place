"use client";
import { toast } from "sonner";
import { Button } from "./ui/button";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { useI18n } from "./I18nProvider";

export function SignOut({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  return (
    <>
      <Button
        variant="brand"
        size="brand"
        className={compact ? "icon-button" : "button button-secondary"}
        aria-label={t("Sign out")}
        title={t("Sign out")}
        disabled={pending}
        onClick={async () => {
          setPending(true);

          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error(result.error.message);
            window.location.assign("/sign-in");
          } catch {
            toast.error(t("Please try again."), { id: "operation-error" });
            setPending(false);
          }
        }}
      >
        <LogOut size={18} aria-hidden="true" />
        {!compact && t("Sign out")}
      </Button>
    </>
  );
}
