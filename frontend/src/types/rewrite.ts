export type HighlightAction = 'add_metrics' | 'rephrase' | 'remove' | 'clarify' | 'keep';

export interface Highlight {
  action: HighlightAction;
  comment: string;
}

export interface Experience {
  block_id: number;
  company: string;
  role: string;
  period: string;
  original_bullets: string[];
  rewritten_bullets: string[];
  highlights: Highlight[];
  responsibilities: string[];
}

export interface Skills {
  key_competencies: string[];
  tools: string[];
  ats_keywords: string[];
}

export interface RewriteResult {
  summary: string;
  original_summary: string;
  experiences: Experience[];
  skills: Skills;
  recommendations: string[];
}
