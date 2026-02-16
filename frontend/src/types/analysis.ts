export type Severity = 'critical' | 'major' | 'minor';

export type ResumeType =
  | 'Список обязанностей'
  | 'Каша из ролей'
  | 'Джун после курсов'
  | 'Переходящий'
  | 'Нормальный';

export type Grade =
  | 'Отличное'
  | 'Хорошее'
  | 'Нужна полировка'
  | 'Нужна переработка'
  | 'Полная переделка';

export interface RedFlag {
  flag: string;
  detail: string;
  severity: Severity;
}

export interface Annotation {
  original_text: string;
  type: Severity;
  comment: string;
  suggestion: string;
}

export interface Section {
  block_id: number;
  section_title: string;
  period: string;
  full_text: string;
  annotations: Annotation[];
}

export interface Dimension {
  name: string;
  score: number;
  comment: string;
}

export interface KeySkills {
  hard_skills: string[];
  soft_skills: string[];
  domain_knowledge: string[];
}

export interface ParseResult {
  resume_type: ResumeType;
  resume_type_description: string;
  main_problem: string;
  red_flags: RedFlag[];
  sections: Section[];
  key_skills?: KeySkills;
}

export interface ScoringResult {
  total_score: number;
  dimensions: Dimension[];
  verdict: string;
  grade: Grade;
}

export interface AnalysisResult extends ParseResult, ScoringResult {}
