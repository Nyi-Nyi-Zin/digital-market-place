"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useI18n } from "./I18nProvider";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { formatDate } from "@marketplace/shared/format";
import {
  notificationMessage,
  notificationPath,
  type NotificationList,
  type NotificationRecord,
  type NotificationSettings,
} from "@marketplace/shared/notifications";

const base = "/api/admin";
const inboxPath = "/notifications";
const audience = "admin";

function useNotificationAccess() {
  const {
    data: session,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchSession,
    isRefetching,
  } = authClient.useSession();
  return {
    session,
    sessionPending,
    sessionError,
    refetchSession,
    isRefetching,
    key: [
      "notifications",
      audience,
      session?.user.id,
      session?.session.id,
    ] as const,
  };
}
function useNotificationList(page = 1, filter = "all", limit = 20) {
  const { session, key } = useNotificationAccess();
  return useQuery({
    queryKey: [...key, "list", page, filter, limit],
    queryFn: ({ signal }) =>
      api<NotificationList>(
        `${base}/notifications?page=${page}&filter=${filter}&limit=${limit}`,
        { signal }
      ),
    enabled: Boolean(session),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}
function useReadNotification() {
  const client = useQueryClient();
  const { key } = useNotificationAccess();
  return useMutation({
    mutationFn: (
      data: { id: number; read: boolean } | { all: true; throughId?: number }
    ) =>
      api(`${base}/notifications`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
function NotificationItems({
  records,
  onOpen,
  busy,
  onRead,
}: {
  records: NotificationRecord[];
  onOpen: (notice: NotificationRecord) => Promise<void>;
  busy: boolean;
  onRead?: (notice: NotificationRecord) => void;
}) {
  const { t, intlLocale } = useI18n();
  return (
    <ul className="notification-list">
      {records.map(notice => {
        const message = notificationMessage(notice, t);
        return (
          <li
            key={notice.id}
            className="notification-item"
            data-unread={!notice.read}
          >
            <div className="notification-item-main">
              <Link
                href={notificationPath(notice)}
                aria-disabled={busy}
                onClick={event => {
                  event.preventDefault();
                  if (!busy) void onOpen(notice).catch(() => {});
                }}
              >
                <strong>{message.title}</strong>
                <p>{message.body}</p>
              </Link>
              <time dateTime={notice.createdAt}>
                {formatDate(notice.createdAt, intlLocale)}
              </time>
              <span className="notification-read-label">
                {t(notice.read ? "Read" : "Unread")}
              </span>
            </div>
            {onRead && (
              <Button
                variant="brand"
                size="brand"
                className="notification-text-button"
                disabled={busy}
                aria-label={t(
                  notice.read
                    ? "Mark {title} as unread"
                    : "Mark {title} as read",
                  { title: message.title }
                )}
                onClick={() => onRead(notice)}
              >
                {t(notice.read ? "Mark as unread" : "Mark as read")}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationBell() {
  const { t } = useI18n();
  const { session } = useNotificationAccess();
  const query = useNotificationList(1, "all", 5);
  const read = useReadNotification();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!session) return null;
  const count = query.data?.unreadCount ?? 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="brand"
          size="brand"
          className="notification-bell"
          aria-label={t("Notifications, {count} unread", { count })}
        >
          <Bell size={20} aria-hidden="true" />
          {count > 0 && (
            <span className="notification-count" aria-hidden="true">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="notification-popover"
        aria-label={t("Notifications")}
      >
        <div className="notification-heading">
          <h2>{t("Notifications")}</h2>
          <Link href={inboxPath} onClick={() => setOpen(false)}>
            {t("View all")}
          </Link>
        </div>
        {query.isPending ? (
          <p role="status">{t("Loading notifications…")}</p>
        ) : query.error ? (
          <div role="alert">
            <p>{t(query.error.message)}</p>
            <Button
              variant="brand"
              size="brand"
              className="notification-control"
              onClick={() => query.refetch()}
            >
              {t("Try again")}
            </Button>
          </div>
        ) : query.data?.notifications.length ? (
          <NotificationItems
            records={query.data.notifications}
            busy={read.isPending}
            onOpen={async notice => {
              if (!notice.read)
                await read.mutateAsync({ id: notice.id, read: true });
              setOpen(false);
              router.push(notificationPath(notice));
            }}
          />
        ) : (
          <p>{t("No notifications yet.")}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function NotificationCenter() {
  const { t } = useI18n();
  const access = useNotificationAccess();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const query = useNotificationList(page, filter);
  const read = useReadNotification();
  const router = useRouter();
  const openNotice = async (notice: NotificationRecord) => {
    if (!notice.read) await read.mutateAsync({ id: notice.id, read: true });
    router.push(notificationPath(notice));
  };
  // An unread-only page can shrink after marking items read.
  useEffect(() => {
    if (query.data && page > query.data.pages) setPage(query.data.pages);
  }, [query.data, page]);
  if (!access.session)
    return (
      <section className="notification-center">
        {access.sessionPending ? (
          <p role="status">{t("Loading account?")}</p>
        ) : access.sessionError ? (
          <div role="alert">
            <p>{t("Unable to load your account. Please try again.")}</p>
            <Button
              variant="brand"
              size="brand"
              className="notification-control"
              disabled={access.isRefetching}
              onClick={() => void access.refetchSession()}
            >
              {t("Try again")}
            </Button>
          </div>
        ) : (
          <Link href={"/sign-in?next=" + encodeURIComponent(inboxPath)}>
            {t("Please sign in to continue")}
          </Link>
        )}
      </section>
    );
  return (
    <div className="notification-center">
      <NotificationDestination />
      <NotificationPreferences />
      <div className="notification-toolbar">
        <div role="group" aria-label={t("Notification filter")}>
          {["all", "unread"].map(value => (
            <Button
              key={value}
              variant="brand"
              size="brand"
              className="notification-control"
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {t(value === "all" ? "All" : "Unread")}
            </Button>
          ))}
        </div>
        <Button
          variant="brand"
          size="brand"
          className="notification-control"
          disabled={read.isPending || !query.data?.unreadCount}
          onClick={() => read.mutate({ all: true })}
        >
          {t("Mark all as read")}
        </Button>
      </div>
      {query.isPending ? (
        <p role="status">{t("Loading notifications…")}</p>
      ) : query.error ? (
        <div role="alert">
          <p>{t(query.error.message)}</p>
          <Button
            variant="brand"
            size="brand"
            className="notification-control"
            onClick={() => query.refetch()}
          >
            {t("Try again")}
          </Button>
        </div>
      ) : query.data?.notifications.length ? (
        <NotificationItems
          records={query.data.notifications}
          busy={read.isPending}
          onOpen={openNotice}
          onRead={notice => read.mutate({ id: notice.id, read: !notice.read })}
        />
      ) : (
        <p className="notification-empty">
          {t(
            filter === "unread"
              ? "No unread notifications."
              : "No notifications yet."
          )}
        </p>
      )}
      {query.data && query.data.pages > 1 && (
        <nav className="notification-pagination" aria-label={t("Pagination")}>
          <Button
            variant="brand"
            size="brand"
            className="notification-control"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage(p => p - 1)}
          >
            {t("Previous")}
          </Button>
          <span aria-live="polite">
            {t("Page {page} of {pages}", { page, pages: query.data.pages })}
          </span>
          <Button
            variant="brand"
            size="brand"
            className="notification-control"
            disabled={page >= query.data.pages || query.isFetching}
            onClick={() => setPage(p => p + 1)}
          >
            {t("Next")}
          </Button>
        </nav>
      )}
    </div>
  );
}
function NotificationDestination() {
  const { t } = useI18n();
  const { session } = useNotificationAccess();
  const router = useRouter();
  const client = useQueryClient();
  const [target, setTarget] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const handled = useRef("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get(
      "notification"
    );
    if (value) {
      if (/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)))
        setTarget(Number(value));
      else setFailed(true);
    }
  }, []);
  const sessionId = session?.session.id;
  useEffect(() => {
    if (!target || !sessionId) return;
    const token = `${sessionId}:${target}`;
    if (handled.current === token) return;
    handled.current = token;
    let cancelled = false;
    void (async () => {
      try {
        const result = await api<NotificationList>(
          `${base}/notifications?id=${target}`
        );
        const notice = result.notifications[0];
        if (!notice) throw new Error("Notification not found");
        if (cancelled) return;
        await api(`${base}/notifications`, {
          method: "PATCH",
          body: JSON.stringify({ id: notice.id, read: true }),
        });
        if (cancelled) return;
        await client.invalidateQueries({
          queryKey: ["notifications", audience],
        });
        router.replace(notificationPath(notice));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      handled.current = "";
    };
  }, [target, sessionId, router, client]);
  return failed ? <p role="alert">{t("Notification not found")}</p> : null;
}

export function NotificationBootstrap() {
  const { session } = useNotificationAccess();
  const { locale } = useI18n();
  const sessionId = session?.session.id;
  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    void api(`${base}/notification-preferences`, {
      method: "PATCH",
      body: JSON.stringify({ locale }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [sessionId, locale]);
  return null;
}

function NotificationPreferences() {
  const { t } = useI18n();
  const { session, key } = useNotificationAccess();
  const client = useQueryClient();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<boolean | null>(null);
  const query = useQuery({
    queryKey: [...key, "preferences"],
    enabled: Boolean(session),
    queryFn: ({ signal }) =>
      api<NotificationSettings>(`${base}/notification-preferences`, { signal }),
  });
  const mutation = useMutation({
    mutationFn: (emailEnabled: boolean) =>
      api<NotificationSettings>(`${base}/notification-preferences`, {
        method: "PATCH",
        body: JSON.stringify({ emailEnabled }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [...key, "preferences"] });
      toast.success(t("Changes saved."));
    },
    onSettled: () => setPendingEmail(null),
  });
  const sessionId = session?.session.id;
  const refreshPush = useCallback(async () => {
    const available =
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(available);
    if (!available) return;
    setPermission(Notification.permission);
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    // A browser subscription may belong to an older signed-out session. The server remains authoritative.
    if (subscription && Notification.permission === "granted") {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(subscription.endpoint)
      );
      const device = Array.from(new Uint8Array(digest), byte =>
        byte.toString(16).padStart(2, "0")
      ).join("");
      const status = await api<{ active: boolean }>(
        `${base}/push-subscriptions?device=${device}`
      );
      setPushEnabled(status.active);
    } else setPushEnabled(false);
  }, []);
  useEffect(() => {
    void refreshPush().catch(() =>
      setPushError("Unable to check push notifications.")
    );
  }, [refreshPush, sessionId]);
  const changePush = async () => {
    setPushBusy(true);
    setPushError("");
    try {
      if (pushEnabled) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await api(`${base}/push-subscriptions`, {
            method: "DELETE",
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
      } else {
        // Permission request is made directly in the click handler.
        const granted = await Notification.requestPermission();
        setPermission(granted);
        if (granted !== "granted") return;
        const registration = await navigator.serviceWorker.register(
          "/notification-sw.js",
          { scope: "/" }
        );
        await navigator.serviceWorker.ready;
        const bytes = Uint8Array.from(
          atob(
            query.data!.vapidPublicKey!.replace(/-/g, "+").replace(/_/g, "/")
          ),
          c => c.charCodeAt(0)
        );
        const previous = await registration.pushManager.getSubscription();
        if (previous) {
          await api(`${base}/push-subscriptions`, {
            method: "DELETE",
            body: JSON.stringify({ endpoint: previous.endpoint }),
          });
          await previous.unsubscribe();
        }
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        });
        try {
          const raw = subscription.toJSON();
          await api(`${base}/push-subscriptions`, {
            method: "POST",
            body: JSON.stringify({ endpoint: raw.endpoint, keys: raw.keys }),
          });
        } catch (error) {
          await subscription.unsubscribe();
          throw error;
        }
      }
      await refreshPush();
      toast.success(t("Changes saved."));
    } catch (error) {
      setPushError(
        error instanceof Error
          ? error.message
          : "Unable to enable push notifications."
      );
    } finally {
      setPushBusy(false);
    }
  };
  if (query.isPending)
    return <p role="status">{t("Loading notification settings…")}</p>;
  if (query.error) return <p role="alert">{t(query.error.message)}</p>;
  return (
    <section
      className="notification-settings"
      aria-label={t("Notification settings")}
    >
      <h2>{t("Notification settings")}</h2>
      <p>{t("Website notifications are always enabled.")}</p>
      <label className="notification-email-toggle">
        <input
          type="checkbox"
          checked={pendingEmail ?? query.data!.emailEnabled}
          disabled={mutation.isPending}
          onChange={event => {
            setPendingEmail(event.target.checked);
            mutation.mutate(event.target.checked);
          }}
        />
        {t("Email notifications")}
      </label>
      {!query.data!.emailConfigured && (
        <p className="notification-hint">
          {t("Email delivery is not configured")}
        </p>
      )}
      <div className="notification-push-control">
        <span>
          {t(
            pushEnabled
              ? "Push enabled on this device"
              : "Push disabled on this device"
          )}
        </span>
        <Button
          variant="brand"
          size="brand"
          className="notification-control"
          disabled={
            pushBusy ||
            !supported ||
            (!pushEnabled &&
              (!query.data!.pushConfigured || permission === "denied"))
          }
          onClick={() => void changePush()}
        >
          {t(
            pushBusy
              ? "Please wait…"
              : pushEnabled
                ? "Disable push"
                : "Enable push"
          )}
        </Button>
      </div>
      {!query.data!.pushConfigured && (
        <p className="notification-hint">
          {t("Push delivery is not configured")}
        </p>
      )}
      {!supported && (
        <p className="notification-hint">
          {t(
            "Push requires a supported browser and HTTPS. On iPhone or iPad, add this site to your Home Screen first."
          )}
        </p>
      )}
      {permission === "denied" && (
        <p className="notification-hint">
          {t(
            "Notifications are blocked. Allow them in your browser settings to enable push."
          )}
        </p>
      )}
      <p className="notification-hint">
        {t(
          "On iPhone or iPad, add this site to your Home Screen and open it there to enable push."
        )}
      </p>
      {pushError && <p role="alert">{t(pushError)}</p>}
    </section>
  );
}
