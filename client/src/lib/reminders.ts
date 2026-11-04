import { todayKey } from './utils';

const REMINDER_KEY = 'trackit_reminder';
const SHOWN_KEY = 'trackit_reminder_shown';

interface ReminderConfig {
  enabled: boolean;
  hour: number;
  minute: number;
}

export function loadReminderConfig(): ReminderConfig {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { enabled: false, hour: 9, minute: 0 };
}

export function saveReminderConfig(cfg: ReminderConfig) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(cfg));
}

let intervalId: number | undefined;

async function showIfDue(cfg: ReminderConfig) {
  const now = new Date();
  const shown = localStorage.getItem(SHOWN_KEY);
  const today = todayKey();
  if (shown === today) return;
  if (now.getHours() !== cfg.hour || now.getMinutes() !== cfg.minute) return;

  const messages = [
    "Solve today's problem",
    'Revise 3 problems',
    'Log your habits for the day',
  ];
  const body = messages[Math.floor(Math.random() * messages.length)];

  if ('Notification' in window && Notification.permission === 'granted') {
    // eslint-disable-next-line no-new
    new Notification('TrackIt', { body, icon: '/icons/pwa-192.png' });
  }
  localStorage.setItem(SHOWN_KEY, today);
}

/** Enable/disable the in-app daily reminder (best-effort; app must be open). */
export async function setRemindersEnabled(enabled: boolean): Promise<boolean> {
  const cfg = loadReminderConfig();
  cfg.enabled = enabled;
  saveReminderConfig(cfg);

  if (intervalId) window.clearInterval(intervalId);
  if (enabled) {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        cfg.enabled = false;
        saveReminderConfig(cfg);
        return false;
      }
    } else {
      return false;
    }
    intervalId = window.setInterval(() => void showIfDue(cfg), 20_000);
  }
  return cfg.enabled;
}

export function initReminders() {
  const cfg = loadReminderConfig();
  if (cfg.enabled && 'Notification' in window) {
    intervalId = window.setInterval(() => void showIfDue(cfg), 20_000);
  }
}
