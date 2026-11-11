/* eslint-disable @next/next/no-img-element */
export default function Avatar({ url, nome = '', tam = 36 }) {
  const base = { width: tam, height: tam, borderRadius: '50%', flex: 'none', objectFit: 'cover' };
  if (url) return <img src={url} alt="" style={base} />;
  return (
    <span aria-hidden="true" style={{ ...base, display: 'grid', placeItems: 'center', background: 'var(--uva)', color: '#fff', fontWeight: 700, fontSize: Math.round(tam * 0.42) }}>
      {(nome || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}
