// ============================================================================
// Service worker dos apps JMT (Gestão e Colaborador): só notificações.
// Não guarda cópia do sistema em cache de propósito — cada publicação nova já
// chega pra todo mundo na hora (o sistema precisa de internet de qualquer jeito).
// ============================================================================

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Notificação enviada pela função "enviar-push" do Supabase.
self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: 'JMT', corpo: event.data ? event.data.text() : '' };
  }
  const portal = String(dados.url || '').includes('form=portal');
  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'JMT', {
      body: dados.corpo || '',
      icon: portal ? '/icons/portal-192.png' : '/icons/gestao-192.png',
      badge: portal ? '/icons/portal-192.png' : '/icons/gestao-192.png',
      tag: dados.tag || undefined,
      renotify: !!dados.tag,
      data: { url: dados.url || '/' },
    })
  );
});

// Tocar na notificação: abre (ou traz pra frente) o app já no lugar certo.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let url = event.notification.data?.url || '/';
  // Avisos do portal abrem na página do app JMT Colaborador (/colaborador/).
  if (url.startsWith('/?form=portal')) url = '/colaborador' + url;
  const destino = new URL(url, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const mesmaArea = abertas.find((c) => c.url.includes('form=portal') === destino.includes('form=portal'));
      if (mesmaArea) {
        await mesmaArea.navigate(destino).catch(() => undefined);
        return mesmaArea.focus();
      }
      return self.clients.openWindow(destino);
    })()
  );
});
