import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import lockfile from 'proper-lockfile';
import type { HistoryEntry, HistoryFilters } from '@shared/types.js';
import { getHistoryFile } from '../utils/paths.js';
import { logError } from '../utils/logger.js';

const MAX_ENTRIES = 500;

export async function saveEntry(entry: Omit<HistoryEntry, 'id'> & { id?: string }): Promise<HistoryEntry> {
  const file = getHistoryFile();
  const full: HistoryEntry = {
    id: entry.id ?? randomUUID(),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    repo: entry.repo,
    sourceBranch: entry.sourceBranch,
    targetBranch: entry.targetBranch,
    originalShas: entry.originalShas,
    newShas: entry.newShas,
    result: entry.result,
    durationMs: entry.durationMs,
    ...(entry.notes ? { notes: entry.notes } : {})
  };

  let release: (() => Promise<void>) | null = null;
  try {
    release = await lockfile.lock(file, { retries: { retries: 5, minTimeout: 50, maxTimeout: 200 } });
    await fsp.appendFile(file, JSON.stringify(full) + '\n', 'utf8');
  } catch (err) {
    logError('history.saveEntry failed', err);
    throw err;
  } finally {
    if (release) {
      try {
        await release();
      } catch (err) {
        logError('history.saveEntry release lock failed', err);
      }
    }
  }
  return full;
}

export async function listEntries(filters: HistoryFilters = {}): Promise<HistoryEntry[]> {
  const file = getHistoryFile();
  if (!fs.existsSync(file)) return [];
  const content = await fsp.readFile(file, 'utf8');
  const lines = content.split('\n').filter(Boolean);
  // Only keep last MAX_ENTRIES lines in memory
  const tail = lines.slice(-MAX_ENTRIES);
  const entries: HistoryEntry[] = [];
  for (const l of tail) {
    try {
      entries.push(JSON.parse(l));
    } catch {
      // skip corrupted line
    }
  }
  let filtered = entries;
  if (filters.repo) filtered = filtered.filter((e) => e.repo === filters.repo);
  if (filters.result) filtered = filtered.filter((e) => e.result === filters.result);
  if (filters.since) filtered = filtered.filter((e) => e.timestamp >= filters.since!);
  if (filters.until) filtered = filtered.filter((e) => e.timestamp <= filters.until!);
  // Newest first
  filtered.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  if (filters.limit && filters.limit > 0) filtered = filtered.slice(0, filters.limit);
  return filtered;
}

export async function exportAs(format: 'json' | 'csv'): Promise<string> {
  const entries = await listEntries({ limit: MAX_ENTRIES });
  if (format === 'json') {
    return JSON.stringify(entries, null, 2);
  }
  return toCsv(entries);
}

function toCsv(entries: HistoryEntry[]): string {
  const header = [
    'id',
    'timestamp',
    'repo',
    'sourceBranch',
    'targetBranch',
    'originalShas',
    'newShas',
    'result',
    'durationMs',
    'notes'
  ];
  const rows = entries.map((e) =>
    [
      e.id,
      e.timestamp,
      e.repo,
      e.sourceBranch,
      e.targetBranch,
      e.originalShas.join('|'),
      e.newShas.join('|'),
      e.result,
      String(e.durationMs),
      e.notes ?? ''
    ]
      .map(csvEscape)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
