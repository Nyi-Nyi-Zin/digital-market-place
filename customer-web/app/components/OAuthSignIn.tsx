"use client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { safeNextPath } from "@marketplace/shared/redirect";
import { useI18n } from "./I18nProvider";

export function OAuthSignIn({
  googleEnabled,
  telegramEnabled,
  pending,
  setPending,
  onError,
  signUp = false,
}: {
  googleEnabled: boolean;
  telegramEnabled: boolean;
  pending: boolean;
  setPending: (value: boolean) => void;
  onError: (message: string) => void;
  signUp?: boolean;
}) {
  const { t } = useI18n();
  async function signIn(provider: "google" | "telegram") {
    if (pending) return;
    onError("");
    setPending(true);
    const next = safeNextPath(
      new URLSearchParams(location.search).get("next"),
      "/account"
    );
    const errorURL = new URL(signUp ? "/sign-up" : "/sign-in", location.origin);
    errorURL.searchParams.set("next", next);
    errorURL.searchParams.set("oauth", provider);
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: next,
        errorCallbackURL: errorURL.toString(),
      });
      if (result.error || !result.data?.url)
        throw new Error("OAuth sign-in failed");
    } catch {
      const message =
        provider === "google"
          ? "Unable to sign in with Google. Please try again."
          : "Unable to sign in with Telegram. Please try again.";
      onError(message);
      toast.error(t(message), { id: "operation-error" });
      setPending(false);
    }
  }
  return (
    <div className="customer-auth-social">
      <p className="customer-auth-divider">{t("or continue with")}</p>
      <Button
        variant="outline"
        className="customer-auth-google"
        type="button"
        disabled={pending || !googleEnabled}
        aria-describedby={!googleEnabled ? "google-unavailable" : undefined}
        onClick={() => signIn("google")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
          />
        </svg>
        {t("Continue with Google")}
      </Button>
      {!googleEnabled && (
        <small id="google-unavailable">
          {t("Google sign-in is currently unavailable.")}
        </small>
      )}
      {!signUp && (
        <>
          <Button
            variant="outline"
            className="customer-auth-google"
            type="button"
            disabled={pending || !telegramEnabled}
            aria-describedby="telegram-help"
            onClick={() => signIn("telegram")}
          >
            <Send size={20} color="#229ED9" aria-hidden="true" />
            {t("Continue with Telegram")}
          </Button>
          <small id="telegram-help">
            {t(
              telegramEnabled
                ? "Connect Telegram in your profile before using it to sign in."
                : "Telegram sign-in is currently unavailable."
            )}
          </small>
        </>
      )}
    </div>
  );
}
