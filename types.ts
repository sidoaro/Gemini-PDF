
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type ViewMode = 'list' | 'editor';

export interface SmartActionResponse {
  suggestedTitle?: string;
  summary?: string;
  tags?: string[];
  improvedContent?: string;
}
