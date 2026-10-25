"use client";
import { toast } from "sonner";
import { Button } from "./ui/button";

import { Input } from "./ui/input";

import { useI18n } from "./I18nProvider";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { safeNextPath } from "@marketplace/shared/redirect";
import { isAdminSite } from "@marketplace/shared/sites";
import "../auth.css";
import { OAuthSignIn } from "./OAuthSignIn";
import { oauthErrorMessage } from "@marketplace/shared/oauth";

type Mode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
export function AuthForm({
  mode,
  googleEnabled = false,
  telegramEnabled = false,
}: {
  mode: Mode;
  googleEnabled?: boolean;
  telegramEnabled?: boolean;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nextQuery, setNextQuery] = useState("");
  useEffect(() => {
    if (mode === "sign-in" || mode === "sign-up")
      setError(
        oauthErrorMessage(
          new URLSearchParams(location.search).get("error"),
          new URLSearchParams(location.search).get("oauth")
        )
      );
    const next = new URLSearchParams(window.location.search).get("next");
    if (next)
      setNextQuery(
        `?${new URLSearchParams({ next: safeNextPath(next, "/account") })}`
      );
  }, [mode]);

  const title = {
    "sign-in": t("Sign in"),
    "sign-up": t("Create account"),
    "forgot-password": t("Reset your password"),
    "reset-password": t("Choose a new password"),
  }[mode];
  return (
    <div className="auth-card">
      {(mode === "sign-in" || mode === "sign-up") && (
        <p className="customer-auth-eyebrow">
          {t(mode === "sign-in" ? "WELCOME BACK" : "LET'S GET YOU STARTED")}
        </p>
      )}
      <h1>{mode === "sign-in" ? t("Sign in to your account") : title}</h1>
      {mode === "forgot-password" && (
        <p className="customer-auth-description">
          {t(
            "Forgot your password? Request a reset link using the email address associated with your account."
          )}
        </p>
      )}
      <form
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
                toast.success(
                  t(
                    "Check your email to verify your account before signing in."
                  )
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
        {mode === "sign-up" && (
          <label>
            {t("Full name")}
            <Input
              name="name"
              autoComplete="name"
              placeholder={t("Full name")}
              minLength={2}
              disabled={pending}
              required
            />
          </label>
        )}
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
          <div>
            <label htmlFor="auth-password">{t("Password")}</label>
            <div className="auth-password-control">
              <Input
                id="auth-password"
                aria-describedby={
                  mode !== "sign-in" ? "password-help" : undefined
                }
                name="password"
                type={showPassword ? "text" : "password"}
                disabled={pending}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                minLength={mode === "sign-in" ? undefined : 12}
                maxLength={128}
                required
              />
              <button
                className="auth-password-toggle"
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
            {mode !== "sign-in" && (
              <small id="password-help" className="auth-password-help">
                {t("Use at least 12 characters.")}
              </small>
            )}
          </div>
        )}
        {mode === "sign-in" && (
          <Link className="customer-auth-forgot" href="/forgot-password">
            {t("Forgot password?")}
          </Link>
        )}
        {error && (
          <p className="auth-inline-error" role="alert">
            {t(error)}
          </p>
        )}
        {notice && (
          <p className="auth-inline-success" role="status">
            {t(notice)}
          </p>
        )}

        <Button
          variant="brand"
          size="brand"
          type="submit"
          className="button button-primary auth-submit"
          disabled={pending}
        >
          {pending ? t("Please wait…") : title}
        </Button>
      </form>
      {(mode === "sign-in" || mode === "sign-up") && (
        <OAuthSignIn
          googleEnabled={googleEnabled}
          telegramEnabled={telegramEnabled}
          pending={pending}
          setPending={setPending}
          onError={setError}
          signUp={mode === "sign-up"}
        />
      )}
      <div className="auth-links">
        {mode === "sign-in" ? (
          <>
            {!isAdminSite && (
              <>
                <span>{t("Don't have an account?")}</span>
                <Link href={`/sign-up${nextQuery}`}>{t("Create account")}</Link>
              </>
            )}
          </>
        ) : (
          <>
            {mode === "sign-up" && <span>{t("Already have an account?")}</span>}
            <Link href={`/sign-in${nextQuery}`}>{t("Back to sign in")}</Link>
          </>
        )}
      </div>
    </div>
  );
}
