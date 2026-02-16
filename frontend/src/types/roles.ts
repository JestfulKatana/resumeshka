export type MatchLevel = 'высокое' | 'среднее' | 'с натяжкой';

export interface Role {
  role: string;
  match_level: MatchLevel;
  match_score: number;
  strengths: string[];
  gaps: string[];
  typical_duties: string;
  matched_skills: string[];
  missing_skills: string[];
  reports_to: string;
  works_with: string;
}

export interface Recommendation {
  primary_role: string;
  reasoning: string;
}

export interface RolesResult {
  roles: Role[];
  recommendation: Recommendation;
}
