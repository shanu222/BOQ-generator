'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  Boxes,
  FileOutput,
  Settings,
  Moon,
  Sun,
  Undo2,
  Redo2,
  Menu,
  X,
  Save,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/store/project-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { formatPKR } from '@/lib/format';
import { useEstimate } from '@/hooks/use-estimate';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calculator', label: 'Cost Calculator', icon: Calculator },
  { href: '/boq', label: 'BOQ', icon: ClipboardList },
  { href: '/mto', label: 'Material Takeoff', icon: Boxes },
  { href: '/reports', label: 'Report Center', icon: FileOutput },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const project = useProjectStore((s) => s.project);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const past = useProjectStore((s) => s.past);
  const future = useProjectStore((s) => s.future);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  const hydrated = useProjectStore((s) => s.hydrated);
  const estimate = useEstimate();

  useKeyboardShortcuts();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebar = (
    <aside className="flex h-full w-60 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]">
      <div className="flex items-center gap-3 border-b border-[var(--sidebar-border)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm">
          <span className="font-display text-sm font-bold">BQ</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold leading-tight">BOQ Pro</p>
          <p className="truncate text-[11px] text-[var(--muted-foreground)]">
            Residential Estimation
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[var(--sidebar-active)] text-[var(--accent)] font-medium'
                  : 'text-[var(--sidebar-foreground)] hover:bg-[var(--muted)]',
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
                />
              )}
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-4">
        <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
          Project total
        </p>
        <p className="font-display mt-1 text-lg font-semibold tabular-nums">
          {hydrated ? formatPKR(estimate.costs.grandTotal) : '—'}
        </p>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60">{sidebar}</div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 z-50"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              {sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_88%,transparent)] px-4 backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <p className="truncate text-[11px] text-[var(--muted-foreground)]">
              {project.location || 'Pakistan'}
              {lastSavedAt ? ` · Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={past.length === 0}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={future.length === 0}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Saved" disabled>
              <Save className="h-4 w-4 opacity-50" />
            </Button>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
