"use client";
import { useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { safeNextPath } from "@marketplace/shared/redirect";
import { useI18n } from "./I18nProvider";
import { authClient } from "../lib/auth-client";

export function AuthForm({
  mode,
}: {
  mode: "sign-in" | "forgot-password" | "reset-password";
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const title = {
    "sign-in": "Sign in",
    "forgot-password": "Reset your password",
    "reset-password": "Choose a new password",
  }[mode];
  return (
    <section className="admin-auth-card">
      <div className="auth-icon">
        <LockKeyhole size={23} aria-hidden="true" />
      </div>
      <p className="eyebrow">{t("OPERATIONS CENTER")}</p>
      <h1>{t(title)}</h1>
      <p className="auth-description">{t("Administrator access required")}</p>
      <form
        className="admin-form"
        onSubmit={async event => {
          event.preventDefault();
          setPending(true);
          setMessage("");
          setError("");
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
              setMessage(
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
              setMessage(
                "Password updated. You can sign in with your new password."
              );
            }
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Please try again."
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {mode !== "reset-password" && (
          <label>
            {t("Email address")}
            <input name="email" type="email" autoComplete="email" required />
          </label>
        )}
        {mode !== "forgot-password" && (
          <label>
            {t("Password")}
            <input
              name="password"
              type="password"
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
            {mode === "reset-password" && (
              <small id="password-help">
                {t("Use at least 12 characters.")}
              </small>
            )}
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {t(message)}
          </p>
        )}
        <button className="button button-primary" disabled={pending}>
          {pending ? t("Please wait…") : t(title)}
        </button>
      </form>
      <div className="auth-links">
        <Link href={mode === "sign-in" ? "/forgot-password" : "/sign-in"}>
          {t(mode === "sign-in" ? "Forgot password?" : "Back to sign in")}
        </Link>
      </div>
    </section>
  );
}
