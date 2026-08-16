import { useState, ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Wine, LayoutDashboard, ShoppingCart, Package, BarChart3, Users,
  LogOut, Menu, X, Moon, Sun, ShieldCheck, Settings2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/context/ToastContext';
import type { Permission } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, permission: 'voir_rapports' },
  { to: '/pos', label: 'Caisse', icon: ShoppingCart, permission: 'enregistrer_vente' },
  { to: '/stock', label: 'Stocks', icon: Package, permission: 'voir_stocks' },
  { to: '/sales', label: 'Ventes', icon: BarChart3, permission: 'voir_rapports' },
  { to: '/employees', label: 'Personnel', icon: Users, adminOnly: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, hasPermission, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => (item.adminOnly ? isAdmin : !item.permission || hasPermission(item.permission))
  );

  const handleSignOut = async () => {
    await signOut();
    showToast('Déconnexion réussie', 'info');
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02))]">
      <div className="flex items-center gap-3 px-3 py-3.5 border-b min-w-0" style={{ borderColor: 'rgb(var(--border))' }}>
        <img src="/les-baccus-logo.svg" alt="Les Bacchus" className="w-9 h-9 rounded-xl object-cover border border-black/5 dark:border-white/10 shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-[13px] leading-tight truncate">Les Bacchus</p>
          <p className="text-[10px] text-muted leading-tight truncate">Gestion de buvette</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-2.5 space-y-1.5 overflow-y-auto min-w-0">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden min-w-0 ${
                isActive
                  ? 'text-primary shadow-sm'
                  : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: 'rgba(var(--primary) / 0.08)', boxShadow: 'inset 0 0 0 1px rgba(var(--primary) / 0.08)' } : {}
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-2.5 py-2.5 border-t space-y-2.5 min-w-0" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-3 px-1.5 py-1.5 min-w-0 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold surface-2 shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate">{profile?.full_name}</p>
            <div className="flex items-center gap-1 min-w-0">
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[10px] text-muted truncate">Administrateur</span>
                </>
              ) : (
                <span className="text-[10px] text-muted truncate">Employé</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {isAdmin && (
            <button onClick={() => navigate('/employees')} className="btn btn-ghost justify-center min-w-0 px-1.5 py-1.5 rounded-lg">
              <Settings2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[9px] truncate">Paramètres</span>
            </button>
          )}
          <button onClick={toggle} className="btn btn-ghost justify-center min-w-0 px-1.5 py-1.5 rounded-lg">
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 shrink-0" /> : <Moon className="w-3.5 h-3.5 shrink-0" />}
            <span className="text-[9px] truncate">{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
          </button>
          <button onClick={handleSignOut} className="btn btn-ghost justify-center min-w-0 px-1.5 py-1.5 rounded-lg text-red-600 hover:text-red-700">
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[9px] truncate">Sortir</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 surface border-r shadow-[0_0_0_1px_rgba(0,0,0,0.02)]" style={{ borderColor: 'rgb(var(--border))' }}>
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 surface border-r animate-slide-in" style={{ borderColor: 'rgb(var(--border))' }}>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 surface border-b" style={{ borderColor: 'rgb(var(--border))' }}>
          <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo_App.jpg" alt="Les Bacchus" className="w-7 h-7 rounded-md object-cover" />
            <span className="font-bold text-sm brand-wordmark">Les Bacchus</span>
          </div>
          <button onClick={toggle} className="btn-ghost p-2 rounded-lg">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
