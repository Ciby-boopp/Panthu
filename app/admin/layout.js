import Topo from '@/components/Topo';
import AdminNav from '@/components/admin/AdminNav';
import AdminVoltar from '@/components/admin/AdminVoltar';
import './admin.css';
export default function AdminLayout({ children }) {
  return (<><Topo papel="admin" /><main className="adm-main"><div className="adm-grid"><AdminNav /><div className="adm-conteudo"><AdminVoltar />{children}</div></div></main></>);
}
