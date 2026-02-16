export type Severity = 'critical' | 'major' | 'minor';

export type ResumeType =
  | 'Список обязанностей'
  | 'Каша из ролей'
  | 'Джун после курсов'
  | 'Переходящий'
  | 'Нормальный';

export type Grade =
  | 'Отличное резюме'
  | 'Хорошее резюме'
  | 'Неплохая база'
  | 'Есть над чем поработать'
  | 'Нужна серьёзная доработка'
  // legacy grades (LLM may still return these)
  | 'Отличное'
  | 'Хорошее'
  | 'Нужна полировка'
  | 'Нужна переработка'
  | 'Полная переделка';

/** Compute grade label from score (authoritative, matches backend logic) */
export function gradeFromScore(score: number): Grade {
  if (score >= 85) return 'Отличное резюме';
  if (score >= 70) return 'Хорошее резюме';
  if (score >= 55) return 'Неплохая база';
  if (score >= 35) return 'Есть над чем поработать';
  return 'Нужна серьёзная доработка';
}

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
