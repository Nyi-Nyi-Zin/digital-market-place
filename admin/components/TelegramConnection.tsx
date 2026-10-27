"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { authClient } from "../lib/auth-client";
import { useI18n } from "./I18nProvider";
import { oauthErrorMessage } from "@marketplace/shared/oauth";

export function TelegramConnection({
  enabled,
  linked,
  emailVerified,
}: {
  enabled: boolean;
  linked: boolean;
  emailVerified: boolean;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("oauth") === "telegram")
      setError(oauthErrorMessage(params.get("error"), "telegram"));
  }, []);
  return (
    <section
      className="admin-panel admin-form admin-security-panel"
      aria-labelledby="telegram-connection-title"
    >
      <div className="admin-security-heading">
        <span className="summary-icon summary-icon-purple">
          <ShieldCheck size={20} aria-hidden="true" />
        </span>
        <h2 id="telegram-connection-title">
          {t("Security & Connected Accounts")}
        </h2>
      </div>
      <h3>{t("Telegram sign-in")}</h3>
      <p>
        {t("Link Telegram to your administrator account for secure sign-in.")}
      </p>
      {linked ? (
        <p role="status">
          {t("Telegram is connected. You can use it on the sign-in page.")}
        </p>
      ) : (
        <>
          {!emailVerified && (
            <p>{t("Verify your account email before connecting Telegram.")}</p>
          )}
          {!enabled && <p>{t("Telegram sign-in is currently unavailable.")}</p>}
          <Button
            variant="outline"
            type="button"
            disabled={pending || !enabled || !emailVerified}
            onClick={async () => {
              if (pending) return;
              setError("");
              setPending(true);
              const destination = new URL("/account", location.origin);
              destination.searchParams.set("oauth", "telegram");
              try {
                const result = await authClient.linkSocial({
                  provider: "telegram",
                  callbackURL: destination.toString(),
                  errorCallbackURL: destination.toString(),
                });
                if (result.error || !result.data?.url)
                  throw new Error("Telegram link failed");
              } catch {
                const message = "Unable to connect Telegram. Please try again.";
                setError(message);
                toast.error(t(message), { id: "operation-error" });
                setPending(false);
              }
            }}
          >
            <Send size={20} color="#229ED9" aria-hidden="true" />
            {t(pending ? "Please wait…" : "Connect Telegram")}
          </Button>
        </>
      )}
      {error && <p role="alert">{t(error)}</p>}
    </section>
  );
}
