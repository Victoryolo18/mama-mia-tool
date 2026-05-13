import MamaMiaAngebotsgenerator from './MamaMiaAngebotsgenerator.jsx';
import MenuVerwaltung from './pages/MenuVerwaltung.jsx';
import Layout from './components/Layout.jsx';

const path = window.location.pathname;

export default function App() {
  if (path === '/admin/menu-verwaltung') {
    return (
      <Layout>
        <MenuVerwaltung />
      </Layout>
    );
  }
  return <MamaMiaAngebotsgenerator />;
}
