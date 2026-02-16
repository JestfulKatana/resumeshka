export type Severity = 'critical' | 'major' | 'minor';

export type ResumeType =
  | 'Список обязанностей'
  | 'Каша из ролей'
  | 'Джун после курсов'
  | 'Переходящий'
  | 'Нормальный';

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
  section_title: string;
  period: string;
  full_text: string;
  annotations: Annotation[];
}

export interface DiagnosisResult {
  resume_type: ResumeType;
  resume_type_description: string;
  main_problem: string;
  red_flags: RedFlag[];
  sections: Section[];
}
