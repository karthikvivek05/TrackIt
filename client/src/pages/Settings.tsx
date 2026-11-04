import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { api } from '../lib/endpoints';
import { Button, Field, Input, Toggle } from '../components/ui';
import { Download, Upload } from '../components/icons';
import { setRemindersEnabled } from '../lib/reminders';

export default function Settings() {
  const { user, logout, updateUser } = useAuth();
  const { canInstall, promptInstall } = useNetwork();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [goal, setGoal] = useState(String(user?.settings?.dailyGoal ?? 2));
  const [reminders, setReminders] = useState(
    user?.settings?.remindersEnabled ?? false,
  );
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveProfile = async () => {
    setMessage(null);
    try {
      const res = await api.updateMe({
        name,
        settings: { dailyGoal: Math.max(0, Number(goal) || 0) },
      });
      updateUser(res.user);
      setMessage('Settings saved');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save');
    }
  };

  const onToggleReminders = async (enabled: boolean) => {
    setReminders(enabled);
    const ok = await setRemindersEnabled(enabled);
    if (!ok && enabled) {
      setReminders(false);
      setMessage('Notifications were denied by the browser.');
      return;
    }
    try {
      const res = await api.updateMe({
        settings: { remindersEnabled: enabled },
      });
      updateUser(res.user);
    } catch {
      /* offline - local toggle already applied */
    }
  };

  const exportData = async () => {
    setMessage(null);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackit-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Export downloaded');
    } catch (e: any) {
      setMessage(e?.message || 'Export failed');
    }
  };

  const onImportFile = async (file: File) => {
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await api.importData(data);
      setMessage(
        `Imported ${res.imported?.progress ?? 0} problems, ${res.imported?.trackers ?? 0} trackers, ${res.imported?.entries ?? 0} entries. Reloading…`,
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      setMessage(e?.message || 'Import failed');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {message && (
        <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          {message}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Profile</h2>
        <div className="space-y-4">
          <Field label="Email">
            <Input value={user?.email ?? ''} disabled />
          </Field>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={`Daily goal (problems)`}>
            <Input
              type="number"
              min={0}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </Field>
          <Button onClick={saveProfile}>Save profile</Button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Reminders</h2>
        <Toggle
          checked={reminders}
          onChange={onToggleReminders}
          label="Daily reminder (best-effort, requires notifications permission)"
        />
        <p className="mt-2 text-xs text-slate-500">
          Shows a reminder while the app is open. OS-level scheduled push needs a
          push server; see the README for the limitation.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Data</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" onClick={exportData}>
            <Download className="h-4 w-4" /> Export JSON
          </Button>
          <Button variant="subtle" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Import replaces your progress, trackers, and entries.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Install app</h2>
        {canInstall ? (
          <Button onClick={promptInstall}>
            <Download className="h-4 w-4" /> Install TrackIt
          </Button>
        ) : (
          <p className="text-sm text-slate-500">
            On iOS Safari, tap{' '}
            <span className="font-medium">Share, then Add to Home Screen</span>. On
            desktop Chrome/Edge, use the install icon in the address bar.
          </p>
        )}
      </section>

      <Button
        variant="danger"
        onClick={() => {
          logout();
          navigate('/auth');
        }}
      >
        Log out
      </Button>
    </div>
  );
}
