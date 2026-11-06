export type NoteType = 'wiki' | 'quick';

export interface AISummary {
  tldr: string[];
  actionItems: string[];
  tags: string[];
  keyEntities: string[];
  generatedAt: number;
  model: string;
}

export interface Note {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  tags: string[];
  links: string[]; // target titles or IDs linked via [[wiki-links]]
  summary?: AISummary;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'wiki' | 'quick' | 'tag';
  noteId?: string;
  size: number;
  color: string;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'explicit' | 'semantic'; // explicit = [[wiki-link]], semantic = shared tags
  label?: string;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'claude' | 'ollama';
  apiKey: string;
  modelName: string;
  baseUrl?: string;
}

export interface GeminiModelInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isRecommended?: boolean;
}

export type ViewMode = 'notes' | 'quick' | 'graph' | 'settings';
export type SearchTab = 'instant' | 'ask-ai';

export interface ContextualSuggestion {
  quickNote: Note;
  matchedTags: string[];
  reason: string;
}
