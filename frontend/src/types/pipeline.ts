import type { AnalysisResult, ParseResult, ScoringResult } from './analysis';
import type { RolesResult } from './roles';
import type { RewriteResult } from './rewrite';
import type { RecheckResult } from './recheck';

export type PipelineStep =
  | 'idle'
  | 'uploading'
  | 'parsed'
  | 'scoring'
  | 'scored'
  | 'annotating'
  | 'annotated'
  | 'loading_roles'
  | 'awaiting_role'
  | 'rewriting'
  | 'done'
  | 'rechecking'
  | 'error';

export interface ResumeVersion {
  id: number;
  timestamp: number;
  selectedRole: string;
  summary: string;
  bullets: string[][];
  score?: number;
  label: string;
}

export interface PipelineState {
  step: PipelineStep;
  taskId: string | null;
  fileName: string | null;
  // Progressive analysis pieces
  parse: ParseResult | null;
  scoring: ScoringResult | null;
  // Merged analysis (built after annotations complete)
  analysis: AnalysisResult | null;
  roles: RolesResult | null;
  selectedRole: string | null;
  rewrite: RewriteResult | null;
  rewriteCache: Record<string, RewriteResult>;
  rechecks: RecheckResult[];
  versions: ResumeVersion[];
  error: string | null;
}

export type PipelineAction =
  | { type: 'START_UPLOAD'; fileName: string }
  | { type: 'UPLOAD_COMPLETE'; taskId: string }
  | { type: 'PARSE_LOADED'; data: ParseResult }
  | { type: 'START_SCORING' }
  | { type: 'SCORING_LOADED'; data: ScoringResult }
  | { type: 'START_ANNOTATING' }
  | { type: 'ANNOTATIONS_LOADED'; sections: import('./analysis').Section[] }
  | { type: 'START_ROLES' }
  | { type: 'ROLES_LOADED'; data: RolesResult }
  | { type: 'SELECT_ROLE'; role: string }
  | { type: 'REWRITE_LOADED'; data: RewriteResult }
  | { type: 'RECHECK_LOADED'; data: RecheckResult }
  | { type: 'START_RECHECK' }
  | { type: 'CHANGE_ROLE' }
  | { type: 'SAVE_VERSION'; version: ResumeVersion }
  | { type: 'RESTORE_VERSION'; versionId: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'UPDATE_BULLET'; blockId: number; bulletIndex: number; newText: string }
  | { type: 'RESTORE'; saved: Partial<PipelineState> }
  | { type: 'RESET' };
