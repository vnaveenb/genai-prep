from pydantic import BaseModel, Field
from datetime import datetime


# ─── Content Schemas ───────────────────────────────────────────

class ResearchPaper(BaseModel):
    id: int
    title: str
    topic: str
    relevance: str


class KeyTopic(BaseModel):
    concept: str
    detail: str


class DSADesignMapping(BaseModel):
    id: int
    dsa_problem: str
    system_design: str


class DesignScenario(BaseModel):
    scenario: str
    probes: list[str]
    follow_up: str | None = None


class DSAFollowUp(BaseModel):
    problem: str
    follow_up: str


class ContentSection(BaseModel):
    section_key: str
    title: str
    description: str
    item_count: int


class ContentItem(BaseModel):
    item_id: str
    section: str
    title: str
    subtitle: str | None = None
    detail: str | None = None
    extra: dict | None = None
    short_answer: str | None = None
    detailed_answer: str | None = None


class InterviewSubcategory(BaseModel):
    name: str
    items: list[ContentItem]


class InterviewCategory(BaseModel):
    category: str
    subcategories: list[InterviewSubcategory]


class FlashCard(BaseModel):
    item_id: str
    section: str
    front: str
    back: str
    category: str


# ─── Progress Schemas ──────────────────────────────────────────

class ProgressCreate(BaseModel):
    item_id: str
    section: str
    status: str = "not_started"
    confidence: int = Field(default=0, ge=0, le=5)


class ProgressUpdate(BaseModel):
    status: str | None = None
    confidence: int | None = Field(default=None, ge=0, le=5)


class ProgressResponse(BaseModel):
    id: int
    item_id: str
    section: str
    status: str
    confidence: int
    times_reviewed: int
    last_reviewed_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SectionProgress(BaseModel):
    section: str
    total: int
    completed: int
    in_progress: int
    not_started: int
    average_confidence: float
    completion_percentage: float


class OverallProgress(BaseModel):
    total_items: int
    completed: int
    in_progress: int
    not_started: int
    overall_completion: float
    average_confidence: float
    sections: list[SectionProgress]
    days_active: int
    current_streak: int


# ─── Note Schemas ──────────────────────────────────────────────

class NoteCreate(BaseModel):
    item_id: str
    section: str
    content: str | None = None
    is_bookmarked: bool = False


class NoteUpdate(BaseModel):
    content: str | None = None
    is_bookmarked: bool | None = None


class NoteResponse(BaseModel):
    id: int
    item_id: str
    section: str
    content: str | None
    is_bookmarked: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Quiz Schemas ──────────────────────────────────────────────

class QuizQuestion(BaseModel):
    question_id: str
    question: str
    options: list[str] | None = None
    correct_answer: str
    explanation: str | None = None
    question_type: str = "mcq"
    section: str
    topic: str | None = None


class QuizGenerateRequest(BaseModel):
    section: str
    topic: str | None = None
    count: int = Field(default=5, ge=1, le=20)
    mode: str = "static"  # static or ai
    difficulty: str = "medium"  # easy, medium, hard


class QuizSubmitRequest(BaseModel):
    session_id: str
    answers: list[dict]  # [{question_id, selected_answer, time_taken_seconds}]


class QuizResult(BaseModel):
    session_id: str
    total_questions: int
    correct_answers: int
    score_percentage: float
    results: list[dict]


class QuizHistoryItem(BaseModel):
    session_id: str
    section: str
    topic: str | None
    total_questions: int
    correct_answers: int
    score_percentage: float
    created_at: datetime


# ─── Study Plan Schemas ────────────────────────────────────────

class StudyDay(BaseModel):
    day: int
    week: int
    title: str
    description: str
    tasks: list[str]
    linked_sections: list[str]
    is_completed: bool = False


class StudyPlanResponse(BaseModel):
    total_days: int
    completed_days: int
    current_day: int | None
    days: list[StudyDay]


# ─── Interview Schemas ─────────────────────────────────────────

class LLMConfig(BaseModel):
    provider: str  # gemini, openai, anthropic, ollama
    api_key: str | None = None
    model: str | None = None
    base_url: str | None = None  # for ollama


class InterviewStartRequest(BaseModel):
    interview_type: str  # python, system_design, genai, ml_dl, mixed
    llm_config: LLMConfig
    difficulty: str = "medium"
    num_questions: int = Field(default=5, ge=1, le=15)


class InterviewMessageRequest(BaseModel):
    session_id: str
    message: str
    llm_config: LLMConfig


class InterviewEndRequest(BaseModel):
    session_id: str
    llm_config: LLMConfig


class InterviewMessage(BaseModel):
    role: str  # interviewer, candidate, system
    content: str
    timestamp: datetime | None = None


class InterviewEvaluation(BaseModel):
    overall_score: float
    correctness: float
    depth: float
    communication: float
    strengths: list[str]
    areas_to_improve: list[str]
    recommendations: list[str]


class InterviewSessionResponse(BaseModel):
    session_id: str
    interview_type: str
    status: str
    messages: list[InterviewMessage]
    evaluation: InterviewEvaluation | None = None
    created_at: datetime


# ─── Settings Schemas ──────────────────────────────────────────

class UserSettingsUpdate(BaseModel):
    preferred_provider: str | None = None
    preferred_model: str | None = None
    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    ollama_base_url: str | None = None


class UserSettingsResponse(BaseModel):
    preferred_provider: str | None
    preferred_model: str | None
    has_gemini_key: bool
    has_openai_key: bool
    has_anthropic_key: bool
    ollama_base_url: str | None

    class Config:
        from_attributes = True


class TestConnectionRequest(BaseModel):
    llm_config: LLMConfig
