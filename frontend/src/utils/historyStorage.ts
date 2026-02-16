import type { HistoryEntry } from '../types/history';

const HISTORY_KEY = 'resume-screener-history';
const MAX_ENTRIES = 20;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const entries: HistoryEntry[] = JSON.parse(raw);
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: HistoryEntry): void {
  const entries = getHistory();
  const filtered = entries.filter(e => e.taskId !== entry.taskId);
  filtered.unshift(entry);
  const trimmed = filtered.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full
  }
}

export function updateHistoryEntry(taskId: string, updates: Partial<HistoryEntry>): void {
  const entries = getHistory();
  const idx = entries.findIndex(e => e.taskId === taskId);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], ...updates };
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function removeHistoryEntry(taskId: string): void {
  const entries = getHistory().filter(e => e.taskId !== taskId);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function cleanupOldTaskKeys(currentTaskIds: Set<string>): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('resume-screener-task-')) {
      const id = key.replace('resume-screener-task-', '');
      if (!currentTaskIds.has(id)) {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
