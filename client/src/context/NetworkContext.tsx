import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { syncPending, listenForSyncMessages } from '../lib/sync';
import { setupServiceWorker } from '../lib/sw-register';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced';

interface NetworkCtx {
  online: boolean;
  syncStatus: SyncStatus;
  canInstall: boolean;
  updateAvailable: boolean;
  promptInstall: () => Promise<void>;
  refreshApp: () => void;
  syncNow: () => Promise<void>;
}

const Ctx = createContext<NetworkCtx>({
  online: true,
  syncStatus: 'online',
  canInstall: false,
  updateAvailable: false,
  promptInstall: async () => {},
  refreshApp: () => {},
  syncNow: async () => {},
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [recentlySynced, setRecentlySynced] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const installEvent = useRef<any>(null);
  const updateSW = useRef<((reload?: boolean) => void) | null>(null);
  const syncedTimer = useRef<number | undefined>(undefined);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      await syncPending();
      setRecentlySynced(true);
      window.clearTimeout(syncedTimer.current);
      syncedTimer.current = window.setTimeout(
        () => setRecentlySynced(false),
        2500,
      );
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [syncNow]);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      installEvent.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () =>
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  useEffect(() => {
    const updateFn = setupServiceWorker({
      onNeedRefresh: () => setUpdateAvailable(true),
    });
    updateSW.current = updateFn;
    const unlisten = listenForSyncMessages(() => void syncNow());
    void syncNow();
    return unlisten;
  }, [syncNow]);

  const promptInstall = async () => {
    if (!installEvent.current) return;
    installEvent.current.prompt();
    try {
      await installEvent.current.userChoice;
    } finally {
      installEvent.current = null;
      setCanInstall(false);
    }
  };

  const refreshApp = () => updateSW.current?.(true);

  const syncStatus: SyncStatus = !online
    ? 'offline'
    : syncing
      ? 'syncing'
      : recentlySynced
        ? 'synced'
        : 'online';

  return (
    <Ctx.Provider
      value={{
        online,
        syncStatus,
        canInstall,
        updateAvailable,
        promptInstall,
        refreshApp,
        syncNow,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useNetwork = () => useContext(Ctx);
