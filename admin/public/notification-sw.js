/* Push-only service worker. Authenticated pages and API responses are never cached. */
self.addEventListener("push", event => {
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {};
  }
  const url =
    typeof payload.url === "string" &&
    /^\/notification\/[1-9]\d*$/.test(payload.url)
      ? payload.url
      : "/notifications";
  event.waitUntil(
    self.registration.showNotification("Cloud Nine", {
      body:
        typeof payload.body === "string"
          ? payload.body
          : "You have a new update.",
      icon: "/notification-icon-192.png",
      badge: "/notification-icon-192.png",
      tag: typeof payload.tag === "string" ? payload.tag : "cloud-nine-update",
      data: { url },
    })
  );
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const requested = event.notification.data?.url;
  const path =
    typeof requested === "string" &&
    /^\/notification\/[1-9]\d*$/.test(requested)
      ? requested
      : "/notifications";
  const destination = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const current = windows.find(
        client => new URL(client.url).origin === self.location.origin
      );
      if (current) {
        await current.navigate(destination);
        await current.focus();
      } else await self.clients.openWindow(destination);
    })()
  );
});
