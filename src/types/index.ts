export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  session_id: string;
  createdAt: string;
  updatedAt: string;
  copiedCount: number;
  lastUsedAt: string | null;
}
