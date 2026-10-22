"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { safeNextPath } from "../lib/redirect";

type Mode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
export function AuthForm({ mode }: { mode: Mode }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const title = {
    "sign-in": "Sign in",
    "sign-up": "Create account",
    "forgot-password": "Reset your password",
    "reset-password": "Choose a new password",
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
          const next = safeNextPath(params.get("next"));
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
            Full name
            <input name="name" autoComplete="name" minLength={2} required />
          </label>
        )}
        {mode !== "reset-password" && (
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required />
          </label>
        )}
        {mode !== "forgot-password" && (
          <div>
            <label htmlFor="auth-password">Password</label>
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
              <small id="password-help">Use at least 12 characters.</small>
            )}
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button className="button button-primary" disabled={pending}>
          {pending ? "Please wait…" : title}
        </button>
      </form>
      <div className="auth-links">
        {mode === "sign-in" ? (
          <>
            <Link href="/sign-up">Create account</Link>
            <Link href="/forgot-password">Forgot password?</Link>
          </>
        ) : (
          <Link href="/sign-in">Back to sign in</Link>
        )}
      </div>
    </div>
  );
}
