// Mostra o texto de uma seção: linhas começadas com "- " viram lista; as demais viram parágrafos.
export default function DiretrizesTexto({ texto }) {
  const blocos = []; let lista = null;
  String(texto || '').split('\n').forEach((l, i) => {
    const t = l.trim();
    if (t.startsWith('- ')) { (lista ||= []).push(t.slice(2)); return; }
    if (lista) { blocos.push({ ul: lista, k: `u${i}` }); lista = null; }
    if (t) blocos.push({ p: t, k: `p${i}` });
  });
  if (lista) blocos.push({ ul: lista, k: 'uf' });
  return blocos.map((b) => b.ul ? <ul key={b.k}>{b.ul.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p key={b.k}>{b.p}</p>);
}
