'use client';
import { useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';
// Liga/desliga uma coluna booleana (ex.: ativa/ativo) de uma linha de tabela.
export default function AlternarAtivo({ tabela, id, coluna, inicial, rotulos = ['Ativo', 'Inativo'] }) {
  const sb = useRef(null); const [v, setV] = useState(!!inicial); const [e, setE] = useState(false);
  async function trocar() {
    const { error } = await (sb.current ||= criarCliente()).from(tabela).update({ [coluna]: !v }).eq('id', id);
    if (error) setE(true); else { setV(!v); setE(false); }
  }
  return <button type="button" className={`btn mini ${v ? 's' : 'o'}`} aria-pressed={v} onClick={trocar} title={e ? 'Não foi possível alterar' : undefined}>{e ? 'Erro' : v ? rotulos[0] : rotulos[1]}</button>;
}
