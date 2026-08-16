import { useState, ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Wine, LayoutDashboard, ShoppingCart, Package, BarChart3, Users,
  LogOut, Menu, X, Moon, Sun, ShieldCheck
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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
        <img src="/les-baccus-logo.svg" alt="Les Bacchus" className="w-10 h-10 rounded-xl object-cover border border-black/5 dark:border-white/10" />
        <div>
          <p className="font-bold text-sm">Les Bacchus</p>
          <p className="text-xs text-muted">Gestion de buvette</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: 'rgba(var(--primary) / 0.1)' } : {}
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t space-y-3" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold surface-2">
            {profile?.full_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <div className="flex items-center gap-1">
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted">Administrateur</span>
                </>
              ) : (
                <span className="text-xs text-muted">Employé</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggle} className="btn btn-ghost flex-1 justify-center">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-xs">{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
          </button>
          <button onClick={handleSignOut} className="btn btn-ghost flex-1 justify-center text-red-600 hover:text-red-700">
            <LogOut className="w-4 h-4" />
            <span className="text-xs">Sortir</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 surface border-r" style={{ borderColor: 'rgb(var(--border))' }}>
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
