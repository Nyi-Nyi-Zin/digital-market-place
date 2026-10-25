"use client";
import { toast } from "sonner";
import { Button } from "./ui/button";

import { Input } from "./ui/input";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { safeNextPath } from "@marketplace/shared/redirect";
import { useI18n } from "./I18nProvider";
import { authClient } from "../lib/auth-client";
import { OAuthSignIn } from "./OAuthSignIn";
import { oauthErrorMessage } from "@marketplace/shared/oauth";

export function AuthForm({
  mode,
  googleEnabled = false,
  telegramEnabled = false,
}: {
  mode: "sign-in" | "forgot-password" | "reset-password";
  googleEnabled?: boolean;
  telegramEnabled?: boolean;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (mode === "sign-in")
      setError(
        oauthErrorMessage(
          new URLSearchParams(location.search).get("error"),
          new URLSearchParams(location.search).get("oauth")
        )
      );
  }, [mode]);

  const title = {
    "sign-in": "Sign in",
    "forgot-password": "Reset your password",
    "reset-password": "Choose a new password",
  }[mode];
  return (
    <section className="admin-auth-card">
      <p className="eyebrow">{t("OPERATIONS CENTER")}</p>
      <h1>{t(mode === "sign-in" ? "Sign in to your account" : title)}</h1>
      <p className="auth-description">
        {t(
          mode === "forgot-password"
            ? "Forgot your password? Request a reset link using the email address associated with your account."
            : "Administrator access required"
        )}
      </p>
      <form
        className="admin-form"
        aria-busy={pending}
        onSubmit={async event => {
          event.preventDefault();
          if (pending) return;
          setError("");
          setNotice("");
          setPending(true);

          const fields = new FormData(event.currentTarget);
          const email = String(fields.get("email") ?? "");
          const password = String(fields.get("password") ?? "");
          const params = new URLSearchParams(location.search);
          try {
            if (mode === "sign-in") {
              const next = safeNextPath(params.get("next"), "/");
              const result = await authClient.signIn.email({
                email,
                password,
                callbackURL: next,
              });
              if (result.error)
                throw new Error(result.error.message ?? "Unable to sign in");
              location.assign(next);
            } else if (mode === "forgot-password") {
              const result = await authClient.requestPasswordReset({
                email,
                redirectTo: `${location.origin}/reset-password`,
              });
              if (result.error)
                throw new Error(
                  result.error.message ?? "Unable to request a password reset"
                );
              toast.success(
                t(
                  "If an account exists for that email, password reset instructions will be sent."
                )
              );
              setNotice(
                "If an account exists for that email, password reset instructions will be sent."
              );
            } else {
              const token = params.get("token");
              if (!token)
                throw new Error(
                  "This reset link is invalid. Request a new one."
                );
              const result = await authClient.resetPassword({
                newPassword: password,
                token,
              });
              if (result.error)
                throw new Error(
                  result.error.message ?? "Unable to reset password"
                );
              toast.success(
                t("Password updated. You can sign in with your new password.")
              );
              setNotice(
                "Password updated. You can sign in with your new password."
              );
            }
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Please try again."
            );
            toast.error(
              t(cause instanceof Error ? cause.message : "Please try again."),
              { id: "operation-error" }
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {mode !== "reset-password" && (
          <label>
            {t("Email address")}
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              disabled={pending}
              required
            />
          </label>
        )}
        {mode !== "forgot-password" && (
          <div className="admin-signin-password">
            <label htmlFor="admin-auth-password">{t("Password")}</label>
            <div className="admin-auth-password-control">
              <Input
                id="admin-auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                disabled={pending}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                minLength={mode === "sign-in" ? undefined : 12}
                maxLength={128}
                aria-describedby={
                  mode === "reset-password" ? "password-help" : undefined
                }
                required
              />
              <button
                className="admin-auth-password-toggle"
                type="button"
                aria-label={t(showPassword ? "Hide password" : "Show password")}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(show => !show)}
              >
                {showPassword ? (
                  <EyeOff size={21} aria-hidden="true" />
                ) : (
                  <Eye size={21} aria-hidden="true" />
                )}
              </button>
            </div>
            {mode === "reset-password" && (
              <small id="password-help">
                {t("Use at least 12 characters.")}
              </small>
            )}
          </div>
        )}
        {mode === "sign-in" && (
          <Link className="admin-signin-forgot" href="/forgot-password">
            {t("Forgot password?")}
          </Link>
        )}
        {error && (
          <p className="admin-auth-error" role="alert">
            {t(error)}
          </p>
        )}
        {notice && (
          <p className="admin-auth-success" role="status">
            {t(notice)}
          </p>
        )}

        <Button
          variant="brand"
          size="brand"
          className="button button-primary"
          type="submit"
          disabled={pending}
        >
          {pending ? t("Please wait…") : t(title)}
        </Button>
      </form>
      {mode === "sign-in" && (
        <OAuthSignIn
          googleEnabled={googleEnabled}
          telegramEnabled={telegramEnabled}
          pending={pending}
          setPending={setPending}
          onError={setError}
        />
      )}
      {mode !== "sign-in" && (
        <div className="auth-links">
          <Link href="/sign-in">{t("Back to sign in")}</Link>
        </div>
      )}
    </section>
  );
}
