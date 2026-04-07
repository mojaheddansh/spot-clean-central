import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Building2, AlertTriangle, Sparkles, Users,
  BarChart3, Settings, Bell, LogOut, Menu, X, QrCode
} from 'lucide-react';
import { useState } from 'react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  manager: 'Sorumlu Yönetici',
  cleaner: 'Temizlik Personeli',
  user: 'Kullanıcı',
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Panel', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cleaner', 'user'] },
    { label: 'Odalar', href: '/rooms', icon: Building2, roles: ['admin', 'manager'] },
    { label: 'Şikâyetler', href: '/complaints', icon: AlertTriangle, roles: ['admin', 'manager', 'user'] },
    { label: 'Temizlik', href: '/cleaning', icon: Sparkles, roles: ['admin', 'manager', 'cleaner'] },
    { label: 'Kullanıcılar', href: '/users', icon: Users, roles: ['admin'] },
    { label: 'QR Kodları', href: '/qr-management', icon: QrCode, roles: ['admin'] },
    { label: 'Raporlar', href: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { label: 'Ayarlar', href: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item => profile && item.roles.includes(profile.role));

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/dashboard" className="font-bold text-lg text-primary">
              {settings.site_name || 'CampusClean'}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/notifications">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex flex-col w-56 border-r bg-card min-h-[calc(100vh-3.5rem)] p-3 gap-1">
          {filteredNav.map(item => (
            <Link key={item.href} to={item.href}>
              <Button
                variant={location.pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                size="sm"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
          <div className="mt-auto pt-4 border-t">
            <p className="text-xs text-muted-foreground px-2">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground px-2">{ROLE_LABELS[profile?.role || ''] || profile?.role}</p>
          </div>
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
            <aside className="relative z-50 w-64 bg-card h-full shadow-lg p-4 flex flex-col gap-1">
              {filteredNav.map(item => (
                <Link key={item.href} to={item.href} onClick={() => setMenuOpen(false)}>
                  <Button
                    variant={location.pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    size="sm"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
};
