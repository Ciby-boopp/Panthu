// Notificações do celular (push): somem assim que a pessoa visualiza.
// Sem filtro = fecha todas (o app foi aberto). Com filtro = fecha só as que levam àquela tela.
export async function limparNotificacoes(caminho) {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const lista = await reg.getNotifications();
    lista.forEach((n) => {
      const url = n.data?.url || '';
      if (!caminho || url === caminho || url.startsWith(caminho + '?') || url.startsWith(caminho + '/')) n.close();
    });
    if (!caminho) navigator.clearAppBadge?.();
  } catch {}
}
