"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
type Notification = {
  id: number;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};
export function NotificationsClient() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: Notification[] }>("/api/notifications"),
  });
  const mutation = useMutation({
    mutationFn: () => api("/api/notifications", { method: "PATCH" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  if (query.isPending) return <p role="status">Loading notifications…</p>;
  if (query.error) return <p role="alert">{query.error.message}</p>;
  return (
    <>
      <button
        className="button button-secondary"
        disabled={
          mutation.isPending || !query.data?.notifications.some(n => !n.read)
        }
        onClick={() => mutation.mutate()}
      >
        Mark all as read
      </button>
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
      <div className="purchase-list">
        {query.data?.notifications.map(n => (
          <article key={n.id}>
            <div>
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
            <span className="pill">{n.read ? "Read" : "Unread"}</span>
          </article>
        ))}
        {!query.data?.notifications.length && (
          <div className="empty-panel">No notifications yet.</div>
        )}
      </div>
    </>
  );
}
