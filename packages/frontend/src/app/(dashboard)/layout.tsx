'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import {
  LayoutDashboard, Users, BookOpen, Link2, Cpu, BarChart3,
  Settings, LogOut, Building2, GraduationCap, Handshake, Wrench, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const NAV_ITEMS: Record<string, { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  SUPER_ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Programmes', href: '/programmes', icon: BookOpen },
    { label: 'Relationships', href: '/relationships', icon: Link2 },
    { label: 'Matching', href: '/matching', icon: Cpu },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  ECOSYSTEM_ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Programmes', href: '/programmes', icon: BookOpen },
    { label: 'Relationships', href: '/relationships', icon: Link2 },
    { label: 'Matching', href: '/matching', icon: Cpu },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ],
  PROGRAMME_OWNER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Programmes', href: '/programmes', icon: BookOpen },
    { label: 'Relationships', href: '/relationships', icon: Link2 },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ],
  MENTOR: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Companies', href: '/relationships', icon: Building2 },
    { label: 'Match Proposals', href: '/matching', icon: Cpu },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  COMPANY_REP: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Programmes', href: '/programmes', icon: BookOpen },
    { label: 'My Mentors', href: '/relationships', icon: GraduationCap },
    { label: 'Match Proposals', href: '/matching', icon: Cpu },
  ],
  PARTNER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Relationships', href: '/relationships', icon: Handshake },
  ],
  SERVICE_PROVIDER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Relationships', href: '/relationships', icon: Wrench },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, initialize, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] || [];

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    router.push('/login');
  };

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700',
    PROGRAMME_OWNER: 'bg-purple-100 text-purple-700',
    ECOSYSTEM_ADMIN: 'bg-orange-100 text-orange-700',
    MENTOR: 'bg-blue-100 text-blue-700',
    COMPANY_REP: 'bg-green-100 text-green-700',
    PARTNER: 'bg-yellow-100 text-yellow-700',
    SERVICE_PROVIDER: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">EcoLink</span>
          </Link>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-sm">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium group">
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors text-sm font-medium w-full">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
