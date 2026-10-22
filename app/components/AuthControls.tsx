"use client";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
export function AuthControls() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <span aria-live="polite">Loading account…</span>;
  if (!session)
    return (
      <Link className="button button-primary" href="/sign-in">
        Sign in
      </Link>
    );
  return (
    <>
      <Link href="/account">{session.user.name}</Link>
      <button
        className="button button-secondary"
        onClick={async () => {
          const result = await authClient.signOut();
          if (!result.error) window.location.assign("/");
        }}
      >
        Sign out
      </button>
    </>
  );
}
