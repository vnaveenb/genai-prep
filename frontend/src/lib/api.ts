import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Content ──────────────────────────────────────────────────

export const contentApi = {
  getSections: () => api.get("/api/content/sections"),
  getSectionItems: (sectionKey: string) => api.get(`/api/content/sections/${sectionKey}/items`),
  getItem: (itemId: string) => api.get(`/api/content/items/${itemId}`),
  getFlashcards: (section?: string) => api.get("/api/content/flashcards", { params: { section } }),
  getStats: () => api.get("/api/content/stats"),
  search: (query: string) => api.get("/api/content/search", { params: { q: query } }),
  getInterviewQuestions: () => api.get("/api/content/interview-questions"),
};

// ─── Quiz ─────────────────────────────────────────────────────

export const quizApi = {
  generate: (params: { section: string; count?: number; topic?: string; mode?: string; difficulty?: string }) =>
    api.post("/api/quiz/generate", params),
  generateAi: (params: { section: string; count?: number; topic?: string; difficulty?: string }, llmConfig: Record<string, unknown>) =>
    api.post("/api/quiz/generate-ai", { ...params, ...llmConfig }),
  submit: (sessionId: string, answers: Record<string, unknown>[]) =>
    api.post("/api/quiz/submit", { session_id: sessionId, answers }),
  getHistory: () => api.get("/api/quiz/history"),
};

// ─── Progress ─────────────────────────────────────────────────

export const progressApi = {
  getOverview: () => api.get("/api/progress/overview"),
  getItems: (section?: string, status?: string) =>
    api.get("/api/progress/items", { params: { section, status } }),
  getItem: (itemId: string) => api.get(`/api/progress/items/${itemId}`),
  updateItem: (data: { item_id: string; section: string; status: string; confidence: number }) =>
    api.post("/api/progress/items", data),
  patchItem: (itemId: string, data: { status?: string; confidence?: number }) =>
    api.patch(`/api/progress/items/${itemId}`, data),
  batchUpdate: (items: Array<{ item_id: string; section: string; status: string; confidence: number }>) =>
    api.post("/api/progress/batch", items),
};

// ─── Notes ────────────────────────────────────────────────────

export const notesApi = {
  list: (section?: string, bookmarkedOnly?: boolean, search?: string) =>
    api.get("/api/notes/", { params: { section, bookmarked_only: bookmarkedOnly, search } }),
  get: (itemId: string) => api.get(`/api/notes/${itemId}`),
  createOrUpdate: (data: { item_id: string; section: string; content?: string; is_bookmarked?: boolean }) =>
    api.post("/api/notes/", data),
  update: (itemId: string, data: { content?: string; is_bookmarked?: boolean }) =>
    api.patch(`/api/notes/${itemId}`, data),
  delete: (itemId: string) => api.delete(`/api/notes/${itemId}`),
  toggleBookmark: (itemId: string, section: string) =>
    api.post(`/api/notes/bookmark/${itemId}?section=${section}`),
};

// ─── Study Plan ───────────────────────────────────────────────

export const studyPlanApi = {
  getPlan: () => api.get("/api/study-plan/"),
  get: () => api.get("/api/study-plan/"),
  completeDay: (day: number) => api.post(`/api/study-plan/complete/${day}`),
  uncompleteDay: (day: number) => api.post(`/api/study-plan/uncomplete/${day}`),
};

// ─── Interview ────────────────────────────────────────────────

export const interviewApi = {
  testConnection: (llmConfig: Record<string, unknown>) =>
    api.post("/api/interview/test-connection", { llm_config: llmConfig }),
  start: (data: {
    interview_type: string;
    llm_config: Record<string, unknown>;
    difficulty?: string;
    num_questions?: number;
  }) => api.post("/api/interview/start", data),
  startStream: (data: {
    interview_type: string;
    llm_config: Record<string, unknown>;
    difficulty?: string;
    num_questions?: number;
  }) => {
    return fetch(`${API_BASE_URL}/api/interview/start-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  sendMessage: (data: {
    session_id: string;
    message: string;
    llm_config: Record<string, unknown>;
  }) => api.post("/api/interview/message", data),
  sendMessageStream: (data: {
    session_id: string;
    message: string;
    llm_config: Record<string, unknown>;
  }) => {
    return fetch(`${API_BASE_URL}/api/interview/message-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  evaluate: (data: { session_id: string; llm_config: Record<string, unknown> }) =>
    api.post("/api/interview/evaluate", data),
  listSessions: () => api.get("/api/interview/sessions"),
  getSession: (sessionId: string) => api.get(`/api/interview/sessions/${sessionId}`),
};

// ─── Settings ─────────────────────────────────────────────────

export const settingsApi = {
  get: () => api.get("/api/settings/"),
  update: (data: Record<string, unknown>) => api.put("/api/settings/", data),
  getApiKey: (provider: string) => api.get(`/api/settings/api-key/${provider}`),
  deleteApiKey: (provider: string) => api.delete(`/api/settings/api-key/${provider}`),
};

export default api;
