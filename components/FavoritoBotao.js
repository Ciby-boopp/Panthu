'use client';
import { useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

// Estrela para salvar eventos, grupos, pessoas e estabelecimentos. `compacto` mostra só o ícone (usado nos cartões).
export default function FavoritoBotao({ tipo, id, inicial = false, compacto = false, rotulo }) {
  const sb = useRef(null);
  const [fav, setFav] = useState(inicial);
  const [espera, setEspera] = useState(false);
  async function alternar(e) {
    e.preventDefault(); e.stopPropagation();
    if (espera) return;
    setEspera(true);
    const antes = fav; setFav(!antes);
    const { data, error } = await (sb.current ||= criarCliente()).rpc('alternar_favorito', { p_tipo: tipo, p_item: String(id) });
    if (error) setFav(antes); else setFav(!!data);
    setEspera(false);
  }
  const nome = rotulo || 'favoritos';
  return (
    <button type="button" className={compacto ? 'fav-btn' : 'btn o mini'} aria-pressed={fav} aria-label={fav ? `Remover ${nome} dos favoritos` : `Salvar ${nome} nos favoritos`} title={fav ? 'Salvo nos favoritos' : 'Salvar nos favoritos'} onClick={alternar}>
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" style={fav ? { fill: 'var(--ouro)', stroke: 'var(--ouro)' } : undefined}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z" /></svg>
      {!compacto && (fav ? 'Salvo' : 'Salvar')}
    </button>
  );
}
