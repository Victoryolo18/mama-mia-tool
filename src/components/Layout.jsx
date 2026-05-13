import { C } from '../lib/theme.js';

const TABS = [
  { path: '/admin/menu-verwaltung', label: '🍽️ Menü-Verwaltung' },
];

export default function Layout({ children }) {
  const current = window.location.pathname;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        .mm-input:focus { outline: none; border-color: ${C.gold} !important; box-shadow: 0 0 0 3px ${C.gold}33; }
      `}</style>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <span style={S.logoMain}>Mama Mia</span>
            <span style={S.logoSub}>Verwaltung</span>
          </div>
          <nav style={S.nav}>
            {TABS.map(tab => (
              <a
                key={tab.path}
                href={tab.path}
                style={{
                  ...S.navLink,
                  ...(current === tab.path ? S.navLinkActive : {}),
                }}
              >
                {tab.label}
              </a>
            ))}
          </nav>
          <a href="/" style={S.backLink}>← Zum Generator</a>
        </div>
      </header>

      <main style={S.main}>{children}</main>
    </div>
  );
}

const S = {
  root: {
    minHeight: '100vh',
    background: '#F8F5F0',
    fontFamily: "'DM Sans', -apple-system, sans-serif",
  },
  header: {
    background: C.burgundy,
    padding: '14px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    boxShadow: '0 2px 8px rgba(28,16,8,.12)',
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  logo: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1,
    marginRight: 8,
    flexShrink: 0,
  },
  logoMain: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 700,
    color: C.gold,
    fontStyle: 'italic',
  },
  logoSub: {
    fontSize: 10,
    color: C.cream,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    opacity: 0.75,
  },
  nav: {
    display: 'flex',
    gap: 4,
    flex: 1,
  },
  navLink: {
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: C.cream,
    textDecoration: 'none',
    opacity: 0.7,
    transition: 'all .2s',
  },
  navLinkActive: {
    background: 'rgba(201,168,76,.18)',
    color: C.gold,
    opacity: 1,
  },
  backLink: {
    fontSize: 12,
    color: C.gold,
    textDecoration: 'none',
    opacity: 0.8,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 20px 60px',
  },
};
