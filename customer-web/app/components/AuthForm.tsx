"use client";
import { useI18n } from "./I18nProvider";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { safeNextPath } from "@marketplace/shared/redirect";
import { isAdminSite } from "@marketplace/shared/sites";

type Mode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
export function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const title = {
    "sign-in": t("Sign in"),
    "sign-up": t("Create account"),
    "forgot-password": t("Reset your password"),
    "reset-password": t("Choose a new password"),
  }[mode];
  return (
    <div className="auth-card">
      <h1>{title}</h1>
      <form
        onSubmit={async event => {
          event.preventDefault();
          setPending(true);
          setError("");
          setMessage("");
          const fields = new FormData(event.currentTarget);
          const email = String(fields.get("email") ?? "");
          const password = String(fields.get("password") ?? "");
          const params = new URLSearchParams(window.location.search);
          const next = safeNextPath(
            params.get("next"),
            isAdminSite ? "/" : "/account"
          );
          try {
            if (mode === "sign-in") {
              const result = await authClient.signIn.email({
                email,
                password,
                callbackURL: next,
              });
              if (result.error)
                throw new Error(result.error.message ?? "Unable to sign in");
              window.location.assign(next);
            } else if (mode === "sign-up") {
              const result = await authClient.signUp.email({
                email,
                password,
                name: String(fields.get("name")),
                callbackURL: next,
              });
              if (result.error)
                throw new Error(
                  result.error.message ?? "Unable to create account"
                );
              if (result.data?.token) window.location.assign(next);
              else
                setMessage(
                  "Check your email to verify your account before signing in."
                );
            } else if (mode === "forgot-password") {
              const result = await authClient.requestPasswordReset({
                email,
                redirectTo: `${window.location.origin}/reset-password`,
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
        {mode === "sign-up" && (
          <label>
            {t("Full name")}
            <input name="name" autoComplete="name" minLength={2} required />
          </label>
        )}
        {mode !== "reset-password" && (
          <label>
            {t("Email address")}
            <input name="email" type="email" autoComplete="email" required />
          </label>
        )}
        {mode !== "forgot-password" && (
          <div>
            <label htmlFor="auth-password">{t("Password")}</label>
            <input
              id="auth-password"
              aria-describedby={
                mode !== "sign-in" ? "password-help" : undefined
              }
              name="password"
              type="password"
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              minLength={mode === "sign-in" ? undefined : 12}
              maxLength={128}
              required
            />
            {mode !== "sign-in" && (
              <small id="password-help">
                {t("Use at least 12 characters.")}
              </small>
            )}
          </div>
        )}
        {error && <p role="alert">{t(error)}</p>}
        {message && <p role="status">{t(message)}</p>}
        <button className="button button-primary" disabled={pending}>
          {pending ? t("Please wait…") : title}
        </button>
      </form>
      <div className="auth-links">
        {mode === "sign-in" ? (
          <>
            {!isAdminSite && <Link href="/sign-up">{t("Create account")}</Link>}
            <Link href="/forgot-password">{t("Forgot password?")}</Link>
          </>
        ) : (
          <Link href="/sign-in">{t("Back to sign in")}</Link>
        )}
      </div>
    </div>
  );
}
