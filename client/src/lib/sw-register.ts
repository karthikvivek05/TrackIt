import { registerSW } from 'virtual:pwa-register';

export interface SWCallbacks {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (reg: ServiceWorkerRegistration) => void;
}

export function setupServiceWorker(callbacks: SWCallbacks = {}) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      callbacks.onNeedRefresh?.();
    },
    onOfflineReady() {
      callbacks.onOfflineReady?.();
    },
    onRegisteredSW(_url, reg) {
      if (reg) callbacks.onRegistered?.(reg);
    },
  });
  return updateSW;
}
