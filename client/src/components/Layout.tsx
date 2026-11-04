import { useEffect, useMemo, useState } from 'react';
import type { FC, SVGProps } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { classNames } from '../lib/utils';
import { addDays, todayKey } from '../lib/utils';
import { useDSA } from '../hooks/useDSA';
import { api } from '../lib/endpoints';
import {
  Home,
  Layers,
  Refresh,
  Calendar,
  Settings,
  TrendingUp,
  LogOut,
} from './icons';

type NavIcon = FC<SVGProps<SVGSVGElement>>;

const NAV: { to: string; label: string; icon: NavIcon }[] = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/dsa', label: 'DSA', icon: Layers },
  { to: '/revision', label: 'Revision', icon: Refresh },
  { to: '/today', label: 'TO-DO', icon: Calendar },
];

function Logo({ size = 'md' }: { size?: 'md' | 'sm' }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={classNames(
          'flex items-center justify-center rounded-md bg-brand-600 text-white dark:bg-slate-200 dark:text-slate-900',
          size === 'md' ? 'h-8 w-8' : 'h-7 w-7',
        )}
      >
        <TrendingUp className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} />
      </span>
      <span
        className={classNames(
          'font-bold tracking-tight',
          size === 'md' ? 'text-xl' : 'text-base',
        )}
      >
        TrackIt
      </span>
    </div>
  );
}

export default function Layout() {
  const { logout } = useAuth();
  const { canInstall, promptInstall, updateAvailable, refreshApp } =
    useNetwork();
  const { steps, progressMap } = useDSA();
  const navigate = useNavigate();
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const loadTaskCount = async () => {
      try {
        const res = await api.getEntriesByDate(todayKey());
        const checklist = res.data.items.find(
          (item) => item.tracker.type === 'checklist',
        );
        const items = checklist?.entry?.value;
        setTaskCount(
          Array.isArray(items)
            ? items.filter(
                (item) =>
                  typeof item === 'object' &&
                  item !== null &&
                  'done' in item &&
                  typeof item.done === 'boolean' &&
                  !item.done,
              ).length
            : 0,
        );
      } catch {
        setTaskCount(0);
      }
    };
    void loadTaskCount();
    const handleChecklistUpdate = (event: Event) => {
      const count = (event as CustomEvent<{ pendingCount?: number }>).detail
        ?.pendingCount;
      if (typeof count === 'number') {
        setTaskCount(count);
      } else {
        void loadTaskCount();
      }
    };
    window.addEventListener('today-checklist-updated', handleChecklistUpdate);
    return () =>
      window.removeEventListener('today-checklist-updated', handleChecklistUpdate);
  }, []);
  const revisionCount = useMemo(() => {
    const today = todayKey();
    let count = 0;
    for (const step of steps) {
      for (const subStep of step.subSteps) {
        for (const problem of subStep.problems) {
          const progress = progressMap[problem.slug];
          if (!progress) continue;
          if (
            progress.status !== 'Solved' ||
            (progress.revisionCount || 0) >= 3
          ) {
            continue;
          }
          const base = progress.lastRevisedAt || progress.solvedAt;
          if (
            base &&
            addDays(base.slice(0, 10), [3, 7, 21][progress.revisionCount || 0]) <=
              today
          ) {
            count += 1;
          }
        }
      }
    }
    return count;
  }, [steps, progressMap]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-3 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                classNames(
                  'tap flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.to === '/revision' && revisionCount > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  {revisionCount}
                </span>
              )}
              {item.to === '/today' && (
                <span className="min-w-7 rounded-full bg-brand-100 px-2 py-1 text-center text-xs font-bold leading-none text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  {taskCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 p-3 pb-6">
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="group relative flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full bg-rose-500 text-white shadow-[2px_2px_10px_rgba(0,0,0,0.2)] transition-colors duration-300 hover:bg-rose-600 active:translate-x-0.5 active:translate-y-0.5"
          >
            <LogOut className="h-[17px] w-[17px]" />
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              classNames(
                'tap flex h-[50px] w-[50px] items-center justify-center rounded-full text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100',
              )
            }
          >
            <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-black/20 bg-white shadow-[0_10px_10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:bg-slate-700 hover:shadow-[0_10px_10px_rgba(0,0,0,0.11)] group">
              <Settings className="h-4 w-4 text-slate-600 transition-colors duration-300 group-hover:text-white" />
            </span>
          </NavLink>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/80 px-4 pt-safe backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="md:hidden">
            <Logo size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {canInstall && (
              <button
                onClick={promptInstall}
                className="tap rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
              >
                Install
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-safe dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              classNames(
                'relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium',
                isActive
                  ? 'text-brand-600 dark:text-slate-200'
                  : 'text-slate-500 dark:text-slate-400',
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
            {item.to === '/revision' && revisionCount > 0 && (
              <span className="absolute right-2 top-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                {revisionCount}
              </span>
            )}
            {item.to === '/today' && (
              <span className="absolute right-1 top-0 min-w-7 rounded-full bg-brand-100 px-2 py-1 text-center text-xs font-bold leading-none text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                {taskCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Update toast */}
      {updateAvailable && (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-800 md:bottom-6">
          <span className="text-sm font-medium">New version available</span>
          <button
            onClick={refreshApp}
            className="tap rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
