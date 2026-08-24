self.addEventListener("push", (event) => {
  let payload;
  try { payload = event.data?.json(); } catch { payload = null; }
  if (!payload?.title || !payload?.url) return;
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body ?? "A placement update is available.",
    data: { url: payload.url, type: payload.type, entityId: payload.entityId, eventKey: payload.eventKey },
    tag: payload.eventKey,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/student", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const matching = clients.find((client) => client.url === target);
    if (matching) return matching.focus();
    return self.clients.openWindow(target);
  }));
});
