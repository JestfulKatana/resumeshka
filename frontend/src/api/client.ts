import type { ApiClient, AnalyzeResponse, AnalyzeTextResponse, TaskResponse, AnnotateResponse, RegenerateRequest, RegenerateResponse } from '../types/api';
import type { ParseResult } from '../types/analysis';
import type { ScoringResult } from '../types/analysis';
import type { RolesResult } from '../types/roles';
import type { RewriteResult } from '../types/rewrite';
import type { RecheckResult } from '../types/recheck';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const httpClient: ApiClient = {
  async analyze(file: File): Promise<AnalyzeResponse> {
    const form = new FormData();
    form.append('file', file);
    return request<AnalyzeResponse>('/api/analyze', {
      method: 'POST',
      body: form,
    });
  },

  async analyzeText(text: string): Promise<AnalyzeTextResponse> {
    return request<AnalyzeTextResponse>('/api/analyze-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  },

  async parse(taskId: string): Promise<ParseResult> {
    return request<ParseResult>(`/api/tasks/${taskId}/parse`, {
      method: 'POST',
    });
  },

  async getTask(taskId: string): Promise<TaskResponse> {
    return request<TaskResponse>(`/api/tasks/${taskId}`);
  },

  async score(taskId: string): Promise<ScoringResult> {
    return request<ScoringResult>(`/api/tasks/${taskId}/score`, {
      method: 'POST',
    });
  },

  async annotate(taskId: string): Promise<AnnotateResponse> {
    return request<AnnotateResponse>(`/api/tasks/${taskId}/annotate`, {
      method: 'POST',
    });
  },

  async getRoles(taskId: string): Promise<RolesResult> {
    return request<RolesResult>(`/api/tasks/${taskId}/roles`);
  },

  async rewrite(taskId: string, selectedRole: string): Promise<RewriteResult> {
    return request<RewriteResult>(`/api/tasks/${taskId}/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedRole }),
    });
  },

  async recheck(taskId: string, updatedResume: string): Promise<RecheckResult> {
    return request<RecheckResult>(`/api/tasks/${taskId}/recheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedResume }),
    });
  },

  async regenerate(taskId: string, req: RegenerateRequest): Promise<RegenerateResponse> {
    return request<RegenerateResponse>(`/api/tasks/${taskId}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  },
};
