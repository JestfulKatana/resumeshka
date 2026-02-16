import type { ParseResult, ScoringResult, Section } from './analysis';
import type { RolesResult } from './roles';
import type { RewriteResult } from './rewrite';
import type { RecheckResult } from './recheck';

export interface AnalyzeResponse {
  taskId: string;
  parse: ParseResult;
}

export interface AnalyzeTextResponse {
  taskId: string;
  parse?: ParseResult;
  cached?: boolean;
}

export interface TaskResponse {
  taskId: string;
  parse: ParseResult | null;
  scoring: ScoringResult | null;
  annotations: Section[] | null;
  roles: RolesResult | null;
}

export interface AnnotateResponse {
  sections: Section[];
}

export interface ApiClient {
  analyze(file: File): Promise<AnalyzeResponse>;
  analyzeText(text: string): Promise<AnalyzeTextResponse>;
  parse(taskId: string): Promise<ParseResult>;
  getTask(taskId: string): Promise<TaskResponse>;
  score(taskId: string): Promise<ScoringResult>;
  annotate(taskId: string): Promise<AnnotateResponse>;
  getRoles(taskId: string): Promise<RolesResult>;
  rewrite(taskId: string, selectedRole: string): Promise<RewriteResult>;
  recheck(taskId: string, updatedResume: string): Promise<RecheckResult>;
}
