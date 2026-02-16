export type Grade =
  | 'Отличное'
  | 'Хорошее'
  | 'Нужна полировка'
  | 'Нужна переработка'
  | 'Полная переделка';

export interface Dimension {
  name: string;
  score: number;
  comment: string;
}

export interface ScoreResult {
  total_score: number;
  dimensions: Dimension[];
  verdict: string;
  grade: Grade;
}
