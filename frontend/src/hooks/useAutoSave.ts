import { useEffect, useRef, useCallback, useState } from 'react';
import type { PipelineState } from '../types/pipeline';

const OLD_KEY = 'resume-screener-autosave';

function taskKey(taskId: string): string {
  return `resume-screener-task-${taskId}`;
}

interface SavedState {
  taskId: string;
  timestamp: number;
  state: Partial<PipelineState>;
}

export function useAutoSave(state: PipelineState) {
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced save on every meaningful state change
  useEffect(() => {
    if (!state.taskId || state.step === 'idle' || state.step === 'uploading') return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const toSave: SavedState = {
        taskId: state.taskId!,
        timestamp: Date.now(),
        state: {
          step: state.step,
          taskId: state.taskId,
          fileName: state.fileName,
          parse: state.parse,
          scoring: state.scoring,
          analysis: state.analysis,
          roles: state.roles,
          selectedRole: state.selectedRole,
          rewrite: state.rewrite,
          rewriteCache: state.rewriteCache,
          rechecks: state.rechecks,
          versions: state.versions,
        },
      };
      try {
        localStorage.setItem(taskKey(state.taskId!), JSON.stringify(toSave));
        setLastSaved(Date.now());
      } catch {
        // localStorage full or unavailable — ignore silently
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);

  const loadSaved = useCallback((taskId: string): Partial<PipelineState> | null => {
    // Try per-task key first
    try {
      const raw = localStorage.getItem(taskKey(taskId));
      if (raw) {
        const saved: SavedState = JSON.parse(raw);
        return saved.state;
      }
    } catch { /* fall through */ }

    // Migration: try old single key
    try {
      const raw = localStorage.getItem(OLD_KEY);
      if (raw) {
        const saved: SavedState = JSON.parse(raw);
        if (saved.taskId === taskId) {
          localStorage.setItem(taskKey(taskId), raw);
          localStorage.removeItem(OLD_KEY);
          return saved.state;
        }
      }
    } catch { /* ignore */ }

    return null;
  }, []);

  const clearSaved = useCallback(() => {
    if (state.taskId) {
      localStorage.removeItem(taskKey(state.taskId));
    }
    setLastSaved(null);
  }, [state.taskId]);

  return { lastSaved, loadSaved, clearSaved };
}
