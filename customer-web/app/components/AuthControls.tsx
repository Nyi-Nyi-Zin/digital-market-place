"use client";
import { Button } from "./ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "./I18nProvider";

import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { api } from "../lib/api";
import { adminHref } from "@marketplace/shared/sites";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
export function AuthControls() {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const { data: profile } = useQuery({
    queryKey: ["account-profile", session?.user.id, session?.session.id],
    queryFn: ({ signal }) =>
      api<{ user: { role: "admin" | "user" } | null }>("/api/auth/me", {
        signal,
      }),
    enabled: Boolean(session),
    retry: false,
  });
  if (isPending)
    return (
      <span className="account-loading" role="status">
        {t("Loading account…")}
      </span>
    );
  if (!session)
    return (
      <Link className="button button-primary" href="/sign-in">
        {t("Sign in")}
      </Link>
    );
  const name = session.user.name.trim() || session.user.email || t("Account");
  const words = name.split(/\s+/);
  const initials = [
    words[0],
    ...(words.length > 1 ? [words[words.length - 1]] : []),
  ]
    .map(word => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase();
  const isAdmin = profile?.user?.role === "admin";

  async function signOut() {
    if (pending) return;
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      window.location.assign("/");
    } catch {
      toast.error(t("Please try again."), { id: "operation-error" });
      setPending(false);
    }
  }

  return (
    <>
      <span
        className="h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-800"
        aria-hidden="true"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="brand"
            size="brand"
            type="button"
            disabled={pending}
            aria-label={`${t("Account")}: ${name}`}
            className="flex min-h-11 max-w-full items-center gap-2.5 rounded-full border border-solid border-zinc-200/80 bg-zinc-50/50 py-1.5 pl-1.5 pr-3 shadow-none transition-colors hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-600/15 text-xs font-semibold text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
            >
              {initials}
            </span>
            <span className="max-w-24 truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {name}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 text-zinc-400 transition-transform [[data-state=open]>&]:rotate-180 motion-reduce:transition-none"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" data-header-account>
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="mt-1 block truncate text-xs font-normal text-muted-ink">
              {session.user.email}
            </span>
            {profile?.user && (
              <span className="mt-2 inline-flex rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
                {t(isAdmin ? "Administrator" : "Customer")}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account">
              <UserRound aria-hidden="true" />
              {t("Account")}
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuItem asChild>
                <Link href={adminHref("/")}>
                  <LayoutDashboard aria-hidden="true" />
                  {t("Admin Dashboard")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={adminHref("/settings/store")}>
                  <Settings aria-hidden="true" />
                  {t("Settings")}
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            onSelect={event => {
              event.preventDefault();
              void signOut();
            }}
            className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-950/50 dark:focus:text-red-400"
          >
            <LogOut aria-hidden="true" />
            {t("Sign out")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
