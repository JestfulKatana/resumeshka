import { useReducer, useCallback } from 'react';
import type { ParseResult, Section } from '../types/analysis';
import type { PipelineState, PipelineAction, ResumeVersion } from '../types/pipeline';
import { api } from '../api';
import { updateHistoryEntry } from '../utils/historyStorage';

const initialState: PipelineState = {
  step: 'idle',
  taskId: null,
  fileName: null,
  parse: null,
  scoring: null,
  analysis: null,
  roles: null,
  selectedRole: null,
  rewrite: null,
  rewriteCache: {},
  rechecks: [],
  versions: [],
  error: null,
};

function buildAnalysis(state: PipelineState, sections?: Section[]) {
  const parse = state.parse;
  const scoring = state.scoring;
  if (!parse || !scoring) return null;
  return {
    ...parse,
    ...scoring,
    sections: sections || parse.sections,
  };
}

function reducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'START_UPLOAD':
      return { ...initialState, step: 'uploading', fileName: action.fileName };
    case 'UPLOAD_COMPLETE':
      return { ...state, step: 'uploading', taskId: action.taskId };

    case 'PARSE_LOADED': {
      const sections = action.data.sections.map(s => ({
        ...s,
        annotations: s.annotations || [],
      }));
      return {
        ...state,
        step: 'parsed',
        parse: { ...action.data, sections },
      };
    }

    case 'START_SCORING':
      return { ...state, step: state.step === 'parsed' ? 'scoring' : state.step };
    case 'SCORING_LOADED': {
      const next = { ...state, scoring: action.data };
      // Don't override step if we're already past scoring (e.g. annotating)
      if (state.step === 'parsed' || state.step === 'scoring') {
        next.step = 'scored';
      }
      // Try to build analysis if annotations already available
      next.analysis = buildAnalysis(next);
      return next;
    }

    case 'START_ANNOTATING':
      return { ...state, step: state.step === 'scored' || state.step === 'parsed' || state.step === 'scoring' ? 'annotating' : state.step };
    case 'ANNOTATIONS_LOADED': {
      const updatedParse = state.parse ? { ...state.parse, sections: action.sections } : null;
      const next: PipelineState = {
        ...state,
        step: 'annotated',
        parse: updatedParse,
      };
      next.analysis = buildAnalysis(next, action.sections);
      return next;
    }

    case 'START_ROLES':
      return { ...state, step: 'loading_roles' };
    case 'ROLES_LOADED':
      return { ...state, step: 'awaiting_role', roles: action.data };
    case 'SELECT_ROLE':
      return { ...state, step: 'rewriting', selectedRole: action.role };
    case 'REWRITE_LOADED': {
      const cache = { ...state.rewriteCache };
      if (state.selectedRole) cache[state.selectedRole] = action.data;
      return { ...state, step: 'done', rewrite: action.data, rewriteCache: cache };
    }
    case 'START_RECHECK':
      return { ...state, step: 'rechecking', error: null };
    case 'RECHECK_LOADED':
      return { ...state, step: 'done', rechecks: [...state.rechecks, action.data] };
    case 'CHANGE_ROLE':
      return {
        ...state,
        step: 'awaiting_role',
        selectedRole: null,
        rewrite: null,
        rechecks: [],
        versions: [],
      };
    case 'SAVE_VERSION':
      return {
        ...state,
        versions: [...state.versions, action.version],
      };
    case 'RESTORE_VERSION':
      return state;
    case 'SET_ERROR':
      return { ...state, step: 'error', error: action.error };
    case 'RESTORE': {
      const s = action.saved;
      // Determine the correct step from saved data
      let step: PipelineState['step'] = 'idle';
      if (s.rewrite) step = 'done';
      else if (s.selectedRole) step = 'rewriting';
      else if (s.roles) step = 'awaiting_role';
      else if (s.parse && s.scoring) step = 'annotated';
      else if (s.parse) step = 'parsed';

      return {
        ...initialState,
        ...s,
        step: s.step && s.step !== 'uploading' && s.step !== 'error' ? s.step : step,
        rewriteCache: s.rewriteCache || {},
        rechecks: s.rechecks || [],
        versions: s.versions || [],
      };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function usePipeline() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startAnalysis = useCallback(async (taskId: string, preloadedParse?: ParseResult) => {
    dispatch({ type: 'UPLOAD_COMPLETE', taskId });

    try {
      let parse: ParseResult | null = preloadedParse || null;
      let cachedTask: Awaited<ReturnType<typeof api.getTask>> | null = null;

      // If no preloaded parse, fetch task state (page refresh case)
      if (!parse) {
        cachedTask = await api.getTask(taskId);
        parse = cachedTask.parse;
      }

      // If still no parse (text-based task, not yet parsed), run parse
      if (!parse) {
        parse = await api.parse(taskId);
      }

      dispatch({ type: 'PARSE_LOADED', data: parse });
      updateHistoryEntry(taskId, { resumeType: parse.resume_type });

      // If we have cached data from a refresh, dispatch it all and return
      if (cachedTask?.scoring) {
        dispatch({ type: 'SCORING_LOADED', data: cachedTask.scoring });
        if (cachedTask.annotations) {
          dispatch({ type: 'ANNOTATIONS_LOADED', sections: cachedTask.annotations });
        }
        if (cachedTask.roles) {
          dispatch({ type: 'ROLES_LOADED', data: cachedTask.roles });
        }
        // Fire any missing steps
        const needsScoring = !cachedTask.scoring;
        const needsAnnotations = !cachedTask.annotations;
        if (!needsScoring && !needsAnnotations) return;
      }

      // Fire scoring + annotate in parallel
      // Score is typically faster (1 LLM call) so user sees: sections → score → annotations
      const needsScoring = !cachedTask?.scoring;
      const needsAnnotations = !cachedTask?.annotations;

      const promises: Promise<void>[] = [];

      if (needsScoring) {
        promises.push((async () => {
          dispatch({ type: 'START_SCORING' });
          const scoring = await api.score(taskId);
          dispatch({ type: 'SCORING_LOADED', data: scoring });
          updateHistoryEntry(taskId, { score: scoring.total_score, grade: scoring.grade });
        })());
      }

      if (needsAnnotations) {
        promises.push((async () => {
          dispatch({ type: 'START_ANNOTATING' });
          const annotated = await api.annotate(taskId);
          dispatch({ type: 'ANNOTATIONS_LOADED', sections: annotated.sections });
        })());
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    if (!state.taskId) return;
    dispatch({ type: 'START_ROLES' });

    try {
      const roles = await api.getRoles(state.taskId);
      dispatch({ type: 'ROLES_LOADED', data: roles });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [state.taskId]);

  const selectRole = useCallback(async (role: string) => {
    if (!state.taskId) return;

    // Use cached rewrite if available for this role
    const cached = state.rewriteCache[role];
    if (cached) {
      dispatch({ type: 'SELECT_ROLE', role });
      dispatch({ type: 'REWRITE_LOADED', data: cached });
      return;
    }

    dispatch({ type: 'SELECT_ROLE', role });

    try {
      const rewrite = await api.rewrite(state.taskId, role);
      dispatch({ type: 'REWRITE_LOADED', data: rewrite });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [state.taskId, state.rewriteCache]);

  const submitRecheck = useCallback(async (updatedResume: string) => {
    if (!state.taskId) return;
    dispatch({ type: 'START_RECHECK' });

    try {
      const recheck = await api.recheck(state.taskId, updatedResume);
      dispatch({ type: 'RECHECK_LOADED', data: recheck });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [state.taskId]);

  const changeRole = useCallback(() => dispatch({ type: 'CHANGE_ROLE' }), []);

  const saveVersion = useCallback((summary: string, bullets: string[][], label: string, score?: number) => {
    if (!state.selectedRole) return;
    const version: ResumeVersion = {
      id: state.versions.length + 1,
      timestamp: Date.now(),
      selectedRole: state.selectedRole,
      summary,
      bullets,
      score,
      label,
    };
    dispatch({ type: 'SAVE_VERSION', version });
  }, [state.selectedRole, state.versions.length]);

  const restore = useCallback((saved: Partial<PipelineState>) => {
    dispatch({ type: 'RESTORE', saved });
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, startAnalysis, fetchRoles, selectRole, submitRecheck, changeRole, saveVersion, restore, reset };
}
