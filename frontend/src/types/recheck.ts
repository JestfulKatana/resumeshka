export type IssueStatus = 'исправлено' | 'частично' | 'не исправлено';
export type IssueQuality = 'отлично' | 'хорошо' | 'формально' | 'не применимо';

export interface PreviousIssueStatus {
  original_comment: string;
  status: IssueStatus;
  quality: IssueQuality;
  note: string;
}

export interface NewIssue {
  text: string;
  type: 'critical' | 'major' | 'minor';
  comment: string;
}

export interface RecheckResult {
  previous_issues_status: PreviousIssueStatus[];
  new_issues: NewIssue[];
  updated_score: number;
  score_delta: number;
  verdict: string;
}
