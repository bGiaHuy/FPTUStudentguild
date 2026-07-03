import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Map, MessageCircle, BookOpen, User, LogOut } from 'lucide-react';
import { supabase } from '../../services/supabase';

const Layout = () => {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Trang chủ' },
    { path: '/map', icon: Map, label: 'Bản đồ' },
    { path: '/portal', icon: BookOpen, label: 'Học vụ' },
    { path: '/chat', icon: MessageCircle, label: 'Cóc AI' },
    { path: '/profile', icon: User, label: 'Cá nhân' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--color-background)' }}>

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="glass-panel layout-header" style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 50,
        borderRadius: 0,
        borderLeft: 'none', borderRight: 'none', borderTop: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1440px',
          padding: '0 16px'
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="layout-brand" style={{ margin: 0, fontWeight: 800, color: 'var(--color-foreground)', letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--color-primary)' }}>FPTU</span>
              <span className="brand-suffix"> Student Guide</span>
            </h1>
          </div>

          {/* Desktop Nav pill — hidden on mobile */}
          <nav className="desktop-nav" style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-surface)',
            padding: '6px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-pill)',
                    color: isActive ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                    background: isActive ? 'var(--color-primary)' : 'transparent',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '15px',
                    boxShadow: isActive ? '0 4px 12px rgba(242, 109, 33, 0.35)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (isActive) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(242, 109, 33, 0.45)';
                    } else {
                      e.currentTarget.style.color = 'var(--color-primary)';
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-soft)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isActive) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(242, 109, 33, 0.35)';
                    } else {
                      e.currentTarget.style.color = 'var(--color-muted-foreground)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ transition: 'color 0.3s' }} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Logout — hidden on mobile */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '120px' }}>
            <button
              onClick={handleLogout}
              style={{
                color: 'var(--color-muted-foreground)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '15px',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-destructive)';
                e.currentTarget.style.borderColor = 'var(--color-destructive-soft)';
                e.currentTarget.style.backgroundColor = 'var(--color-destructive-soft)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-muted-foreground)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <LogOut size={18} /> <span>Đăng xuất</span>
            </button>
          </div>

          {/* Mobile Logout button — icon only */}
          <button
            className="mobile-logout-btn"
            onClick={handleLogout}
            style={{
              color: 'var(--color-muted-foreground)',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-muted)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
            }}
            aria-label="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────── */}
      <main className="layout-main" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </main>

      {/* ─── Mobile Bottom Navigation ────────────────────────────────── */}
      <nav className="mobile-bottom-nav layout-bottom-nav" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{ textDecoration: 'none' }}
              className="bottom-nav-item"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="bottom-nav-icon-wrap" style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '32px',
                borderRadius: '16px',
                backgroundColor: isActive ? 'var(--color-primary-soft)' : 'transparent',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: '2px',
              }}>
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  color={isActive ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                />
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '16px',
                    backgroundColor: 'var(--color-primary)',
                    opacity: 0.12,
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                transition: 'color 0.2s',
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <style dangerouslySetInnerHTML={{__html: `
        /* ── Desktop header ── */
        .layout-header {
          height: var(--header-height-desktop);
        }
        .layout-main {
          padding-top: var(--header-height-desktop);
        }
        .layout-brand {
          font-size: 19px;
        }
        .desktop-nav {
          display: flex !important;
        }
        .mobile-logout-btn {
          display: none !important;
        }
        .layout-bottom-nav {
          display: none !important;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 768px) {
          .layout-header {
            height: var(--header-height-mobile);
          }
          .layout-main {
            padding-top: var(--header-height-mobile);
            padding-bottom: calc(var(--bottom-nav-height) + var(--safe-bottom));
          }
          .layout-brand {
            font-size: 17px;
          }
          .brand-suffix {
            display: none;
          }
          .desktop-nav {
            display: none !important;
          }
          .mobile-logout-btn {
            display: flex !important;
          }
          .layout-bottom-nav {
            display: flex !important;
            position: fixed;
            left: 0; right: 0; bottom: 0;
            height: calc(var(--bottom-nav-height) + var(--safe-bottom));
            padding-bottom: var(--safe-bottom);
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid var(--color-border);
            box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
            z-index: 200;
            justify-content: space-around;
            align-items: stretch;
          }
          .bottom-nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            padding: 6px 0;
            transition: opacity 0.15s;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
          }
          .bottom-nav-item:active {
            opacity: 0.7;
          }
        }
      `}} />
    </div>
  );
};

export default Layout;
