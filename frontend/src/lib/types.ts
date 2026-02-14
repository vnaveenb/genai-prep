// ─── API Types matching backend Pydantic schemas ────────────────

export interface ContentSection {
  section_key: string;
  title: string;
  description: string;
  item_count: number;
}

export interface ContentItem {
  item_id: string;
  section: string;
  title: string;
  subtitle?: string;
  detail?: string;
  extra?: Record<string, unknown>;
  short_answer?: string;
  detailed_answer?: string;
}

export interface InterviewSubcategory {
  name: string;
  items: ContentItem[];
}

export interface InterviewCategory {
  category: string;
  subcategories: InterviewSubcategory[];
}

export interface FlashCard {
  item_id: string;
  section: string;
  front: string;
  back: string;
  category: string;
}

// Progress
export interface Progress {
  id: number;
  item_id: string;
  section: string;
  status: "not_started" | "in_progress" | "completed";
  confidence: number;
  times_reviewed: number;
  last_reviewed_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SectionProgress {
  section: string;
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
  average_confidence: number;
  completion_percentage: number;
}

export interface OverallProgress {
  total_items: number;
  completed: number;
  in_progress: number;
  not_started: number;
  overall_completion: number;
  average_confidence: number;
  sections: SectionProgress[];
  days_active: number;
  current_streak: number;
}

// Notes
export interface Note {
  id: number;
  item_id: string;
  section: string;
  content?: string;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

// Quiz
export interface QuizQuestion {
  question_id: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  question_type: "mcq" | "open_ended";
  section: string;
  topic?: string;
}

export interface QuizResult {
  session_id: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  results: Array<{
    question: string;
    selected_answer?: string;
    correct_answer: string;
    is_correct: boolean;
    explanation?: string;
  }>;
}

export interface QuizHistoryItem {
  session_id: string;
  section: string;
  topic?: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  created_at: string;
}

// Study Plan
export interface StudyDay {
  day: number;
  week: number;
  title: string;
  description: string;
  tasks: string[];
  linked_sections: string[];
  is_completed: boolean;
}

export interface StudyPlanResponse {
  total_days: number;
  completed_days: number;
  current_day?: number;
  days: StudyDay[];
}

// Interview
export interface LLMConfig {
  provider: "gemini" | "openai" | "anthropic" | "ollama";
  api_key?: string;
  model?: string;
  base_url?: string;
}

export interface InterviewMessage {
  role: "interviewer" | "candidate" | "system";
  content: string;
  timestamp?: string;
}

export interface InterviewEvaluation {
  overall_score: number;
  correctness: number;
  depth: number;
  communication: number;
  strengths: string[];
  areas_to_improve: string[];
  recommendations: string[];
}

// Settings
export interface UserSettings {
  preferred_provider?: string;
  preferred_model?: string;
  has_gemini_key: boolean;
  has_openai_key: boolean;
  has_anthropic_key: boolean;
  ollama_base_url?: string;
}

export interface ContentStats {
  total_sections: number;
  total_items: number;
  total_flashcards: number;
  sections: Array<{
    key: string;
    title: string;
    item_count: number;
  }>;
}

// Provider models map
export const PROVIDER_MODELS: Record<string, string[]> = {
  gemini: ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  ollama: ["llama3.2", "llama3.1", "mistral", "codellama", "phi3"],
};
