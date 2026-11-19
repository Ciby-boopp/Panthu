// Service worker do Panthu: recebe notificações push e abre a conversa ao tocar.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'Panthu', body: event.data ? event.data.text() : '' }; }
  // Se o app já está aberto e visível, o aviso aparece dentro dele: não empilha notificação no celular.
  event.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (abertas.some((c) => c.visibilityState === 'visible' && c.url.startsWith(self.location.origin))) return;
    await self.registration.showNotification(d.title || 'Panthu', {
    body: d.body || '',
    icon: '/icone-192.png',
    badge: '/icone-192.png',
    tag: d.tag || 'panthu',
    renotify: true,
    silent: false,
    vibrate: [120, 60, 120],
    data: { url: d.url || '/app/chat' },
  });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const alvo = new URL((event.notification.data && event.notification.data.url) || '/app/chat', self.location.origin).href;
  event.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.startsWith(self.location.origin) && 'focus' in c) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(alvo); } catch {} }
        return;
      }
    }
    await self.clients.openWindow(alvo);
  })());
});
