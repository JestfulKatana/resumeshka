export interface HistoryEntry {
  taskId: string;
  fileName: string;
  resumeType: string;
  score: number | null;
  grade: string | null;
  createdAt: number;
}
