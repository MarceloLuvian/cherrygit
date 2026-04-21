import { useEffect, useState } from 'react';
import { FolderOpen, FileText } from 'lucide-react';
import type { Preferences } from '@shared/types';
import { ThemeToggle } from '@renderer/components/layout/ThemeToggle';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Card, CardTitle, CardDescription } from '@renderer/components/ui/Card';
import { Spinner } from '@renderer/components/ui/Spinner';
import { api } from '@renderer/lib/api';
import { usePreferencesStore } from '@renderer/stores/preferences.store';
import { toast, toastError } from '@renderer/components/feedback/Toast';

const EDITOR_OPTIONS: { value: Preferences['editor']; label: string }[] = [
  { value: 'vscode', label: 'Visual Studio Code' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'sublime', label: 'Sublime Text' },
  { value: 'system', label: 'Editor por defecto del sistema' },
  { value: 'none', label: 'Ninguno' }
];

const TERMINAL_OPTIONS: { value: Preferences['terminal']; label: string }[] = [
  { value: 'iterm', label: 'iTerm2' },
  { value: 'terminal', label: 'Terminal.app' },
  { value: 'warp', label: 'Warp' },
  { value: 'system', label: 'Terminal del sistema' }
];

export function PreferencesPage(): JSX.Element {
  const prefs = usePreferencesStore((s) => s.prefs);
  const loading = usePreferencesStore((s) => s.loading);
  const load = usePreferencesStore((s) => s.load);
  const save = usePreferencesStore((s) => s.save);

  const [draft, setDraft] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (prefs && !draft) {
      setDraft(prefs);
    }
  }, [prefs, draft]);

  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Spinner size={20} />
      </div>
    );
  }

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    setSaving(true);
    try {
      await save(draft);
      toast('Preferencias guardadas.');
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePickFolder = async (): Promise<void> => {
    try {
      const picked = await api.system.pickDirectory();
      if (picked) update('reposRoot', picked);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenLogs = async (): Promise<void> => {
    try {
      await api.system.openLogsDir();
    } catch (err) {
      toastError(err);
    }
  };

  const dirty = prefs ? JSON.stringify(prefs) !== JSON.stringify(draft) : false;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Preferencias</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Configura el comportamiento de CherryGit.
        </p>
      </div>

      <Card>
        <CardTitle>Tema</CardTitle>
        <CardDescription className="mt-1">
          Elige si la app sigue el tema del sistema o usa uno fijo.
        </CardDescription>
        <div className="mt-3">
          <ThemeToggle variant="inline" />
        </div>
      </Card>

      <Card>
        <CardTitle>Carpeta base de repos</CardTitle>
        <CardDescription className="mt-1">
          Directorio que contiene tus clones locales. Cada subcarpeta con un{' '}
          <code className="font-mono">.git</code> se detecta como repo.
        </CardDescription>
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={draft.reposRoot}
            onChange={(e) => update('reposRoot', e.target.value)}
            aria-label="Ruta de carpeta base de repos"
            className="flex-1"
          />
          <Button
            variant="secondary"
            size="md"
            onClick={handlePickFolder}
            aria-label="Elegir carpeta"
          >
            <FolderOpen size={14} aria-hidden="true" />
            Elegir carpeta
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Editor externo</CardTitle>
        <CardDescription className="mt-1">
          Aplicacion que se abrira al resolver conflictos.
        </CardDescription>
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor="editor-select" className="text-sm font-medium">
            Editor
          </label>
          <select
            id="editor-select"
            value={draft.editor}
            onChange={(e) => update('editor', e.target.value as Preferences['editor'])}
            className="h-9 w-full max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 text-sm"
          >
            {EDITOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <CardTitle>Terminal</CardTitle>
        <CardDescription className="mt-1">
          Aplicacion que se abrira al usar &quot;Abrir en terminal&quot;.
        </CardDescription>
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor="terminal-select" className="text-sm font-medium">
            Terminal
          </label>
          <select
            id="terminal-select"
            value={draft.terminal}
            onChange={(e) => update('terminal', e.target.value as Preferences['terminal'])}
            className="h-9 w-full max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 text-sm"
          >
            {TERMINAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <CardTitle>Cherry-pick</CardTitle>
        <CardDescription className="mt-1">
          Comportamiento por defecto al ejecutar cherry-pick.
        </CardDescription>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.useX}
              onChange={(e) => update('useX', e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Usar <code className="font-mono text-xs">-x</code> (agrega referencia al commit
              original en el mensaje)
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.confirmBeforeExecute}
              onChange={(e) => update('confirmBeforeExecute', e.target.checked)}
              className="mt-0.5"
            />
            <span>Pedir confirmacion antes de ejecutar</span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.cherryPickDryRunFirst}
              onChange={(e) => update('cherryPickDryRunFirst', e.target.checked)}
              className="mt-0.5"
            />
            <span>Ejecutar dry-run antes del cherry-pick real</span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.notificationsEnabled}
              onChange={(e) => update('notificationsEnabled', e.target.checked)}
              className="mt-0.5"
            />
            <span>Mostrar notificaciones del sistema al terminar</span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.autoFetch}
              onChange={(e) => update('autoFetch', e.target.checked)}
              className="mt-0.5"
            />
            <span>Hacer <code className="font-mono text-xs">fetch</code> automatico al listar ramas</span>
          </label>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="since-days" className="text-sm">
              Rango por defecto para listar commits (dias)
            </label>
            <Input
              id="since-days"
              type="number"
              min={1}
              max={365}
              value={String(draft.defaultSinceDays)}
              onChange={(e) =>
                update('defaultSinceDays', Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="w-28"
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Logs</CardTitle>
        <CardDescription className="mt-1">
          Los logs de la aplicacion se escriben en{' '}
          <code className="font-mono text-xs">~/Library/Logs/cherrygit/app.log</code>.
        </CardDescription>
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={handleOpenLogs}>
            <FileText size={14} aria-hidden="true" />
            Abrir carpeta de logs
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="md"
          onClick={() => prefs && setDraft(prefs)}
          disabled={!dirty || saving || loading}
        >
          Descartar cambios
        </Button>
        <Button onClick={handleSave} disabled={!dirty || saving || loading} loading={saving}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
