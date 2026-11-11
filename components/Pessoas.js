import Link from 'next/link';
import Avatar from './Avatar';
import AcoesPessoa from './AcoesPessoa';
import './chat.css';

export default function Pessoas({ lista, euId }) {
  return (<div>
    {lista.map(p => (
      <div className="pessoa-linha" key={p.usuario_id}>
        <Link className="pessoa-link" href={`/app/pessoa/${p.usuario_id}`}><Avatar url={p.foto_url} nome={p.nome} tam={36} />{p.nome}</Link>
        {p.usuario_id !== euId && <AcoesPessoa id={p.usuario_id} />}
      </div>
    ))}
  </div>);
}
