import Topo from '@/components/Topo';
import AdminNav from '@/components/admin/AdminNav';
import './admin.css';
export default function AdminLayout({ children }) {
  return (<><Topo papel="admin" /><main><AdminNav />{children}</main></>);
}
