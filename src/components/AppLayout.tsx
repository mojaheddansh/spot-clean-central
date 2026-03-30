import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Building2, AlertTriangle, Sparkles, Users,
  BarChart3, Settings, Bell, LogOut, Menu, X, QrCode
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: t.nav_dashboard as string, href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cleaner', 'user'] },
    { label: t.nav_rooms as string, href: '/rooms', icon: Building2, roles: ['admin', 'manager'] },
    { label: t.nav_complaints as string, href: '/complaints', icon: AlertTriangle, roles: ['admin', 'manager', 'user'] },
    { label: t.nav_cleaning as string, href: '/cleaning', icon: Sparkles, roles: ['admin', 'manager', 'cleaner'] },
    { label: t.nav_users as string, href: '/users', icon: Users, roles: ['admin'] },
    { label: t.nav_qr as string, href: '/qr-management', icon: QrCode, roles: ['admin'] },
    { label: t.nav_reports as string, href: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { label: t.nav_settings as string, href: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item => profile && item.roles.includes(profile.role));

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/dashboard" className="font-bold text-lg text-primary">
              {t.app_name as string}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/notifications">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t.logout as string}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - desktop */}
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
            <p className="text-xs text-muted-foreground px-2 capitalize">{profile?.role}</p>
          </div>
        </aside>

        {/* Mobile nav */}
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

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
};
