"""
Study plan router — serves the 14-day sprint plan with per-day state management.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.progress import Progress
from app.schemas.schemas import StudyDay, StudyPlanResponse
from app.services.content_loader import content_loader

router = APIRouter(prefix="/api/study-plan", tags=["Study Plan"])

# Map study plan days to structured tasks and linked sections
STUDY_PLAN_DAYS = [
    StudyDay(
        day=1, week=1,
        title="Advanced OOP — SOLID Principles",
        description="Deep dive into SOLID principles and how they apply to Python GenAI codebases.",
        tasks=[
            "Single Responsibility Principle with real LLM pipeline examples",
            "Open/Closed Principle for extending model adapters",
            "Liskov Substitution in base model classes",
            "Interface Segregation for API contracts",
            "Dependency Inversion for swappable LLM providers",
        ],
        linked_sections=["python_competencies"],
    ),
    StudyDay(
        day=2, week=1,
        title="Advanced OOP — Design Patterns",
        description="Factory, Strategy, and Observer patterns in Python GenAI context.",
        tasks=[
            "Factory Pattern for LLM provider instantiation",
            "Strategy Pattern for different chunking strategies",
            "Observer Pattern for pipeline event handling",
            "Implement a real example combining patterns",
        ],
        linked_sections=["python_competencies"],
    ),
    StudyDay(
        day=3, week=1,
        title="Concurrency — Asyncio Fundamentals",
        description="Master async/await, event loops, and concurrent LLM API calls.",
        tasks=[
            "Event loop internals and how asyncio works",
            "async/await syntax and coroutines",
            "asyncio.gather for parallel LLM calls",
            "GIL limitations and when to use multiprocessing",
        ],
        linked_sections=["python_competencies"],
    ),
    StudyDay(
        day=4, week=1,
        title="Concurrency — High-Performance Pipelines",
        description="Build concurrent RAG pipelines with asyncio and multi-processing.",
        tasks=[
            "Async RAG pipeline: concurrent embedding + retrieval",
            "Producer-consumer pattern with asyncio.Queue",
            "Multi-processing for CPU-bound tasks (embedding generation)",
            "Thread pools vs Process pools for I/O vs CPU bound tasks",
        ],
        linked_sections=["python_competencies", "modern_llm_engineering"],
    ),
    StudyDay(
        day=5, week=1,
        title="API Engineering — FastAPI Mastery",
        description="Build production-grade APIs with FastAPI, Pydantic V2, and async patterns.",
        tasks=[
            "FastAPI dependency injection and middleware",
            "Pydantic V2 models with strict validation",
            "Streaming responses (SSE) for LLM token streaming",
            "Background tasks for async operations",
        ],
        linked_sections=["python_competencies"],
    ),
    StudyDay(
        day=6, week=1,
        title="API Engineering — Auth & Security",
        description="JWT authentication, API key management, and security best practices.",
        tasks=[
            "JWT token-based authentication",
            "API key management and rotation",
            "Rate limiting implementation",
            "CORS, input sanitization, prompt injection defense",
        ],
        linked_sections=["python_competencies", "modern_llm_engineering"],
    ),
    StudyDay(
        day=7, week=1,
        title="API Engineering — Dockerizing AI Services",
        description="Containerize FastAPI AI microservices for production deployment.",
        tasks=[
            "Multi-stage Docker builds for Python apps",
            "Docker Compose for multi-service architecture",
            "Health checks and graceful shutdown",
            "Environment-based configuration",
        ],
        linked_sections=["python_competencies"],
    ),
    StudyDay(
        day=8, week=2,
        title="RAG Deep Dive — Chunking & Retrieval",
        description="Advanced chunking strategies, embedding models, and vector search.",
        tasks=[
            "Chunking strategies: fixed, semantic, recursive character",
            "Embedding models comparison (OpenAI, Sentence Transformers)",
            "Vector databases: Pinecone, Weaviate, ChromaDB",
            "Similarity search: cosine, dot product, Euclidean",
        ],
        linked_sections=["modern_llm_engineering", "key_2026_topics", "general_topics"],
    ),
    StudyDay(
        day=9, week=2,
        title="RAG Deep Dive — Hybrid Search & Reranking",
        description="Combine dense and sparse retrieval, rerankers, and evaluation.",
        tasks=[
            "Hybrid search: combining BM25 + vector search",
            "Cross-encoder reranking for improved precision",
            "Query expansion and HyDE technique",
            "Handling multi-hop questions in RAG",
        ],
        linked_sections=["modern_llm_engineering", "general_topics"],
    ),
    StudyDay(
        day=10, week=2,
        title="RAG Deep Dive — Evaluation with RAGAS",
        description="Evaluate RAG pipelines with RAGAS framework and custom metrics.",
        tasks=[
            "RAGAS metrics: faithfulness, relevance, context recall",
            "Building evaluation datasets",
            "A/B testing RAG configurations",
            "Hallucination detection and mitigation strategies",
        ],
        linked_sections=["modern_llm_engineering", "ai_maturity"],
    ),
    StudyDay(
        day=11, week=2,
        title="Model Engineering — Fine-tuning with LoRA/QLoRA",
        description="Hands-on fine-tuning with Parameter-Efficient methods.",
        tasks=[
            "LoRA: Low-Rank Adaptation theory and implementation",
            "QLoRA: Quantized LoRA for memory efficiency",
            "Choosing base models for fine-tuning",
            "Training data preparation and formatting",
        ],
        linked_sections=["research_papers", "ai_maturity"],
    ),
    StudyDay(
        day=12, week=2,
        title="Model Engineering — Quantization & Deployment",
        description="Model quantization, GGUF, vLLM, and inference optimization.",
        tasks=[
            "Quantization techniques: GPTQ, AWQ, GGUF",
            "vLLM for high-throughput inference",
            "Model serving: Ray Serve, TGI, Triton",
            "Distillation vs Quantization trade-offs",
        ],
        linked_sections=["research_papers", "ai_maturity", "general_topics"],
    ),
    StudyDay(
        day=13, week=2,
        title="System Design — Scaling Chat Systems",
        description="Design a chat system for 1M concurrent users with real-time messaging.",
        tasks=[
            "WebSocket architecture for real-time messaging",
            "Redis Pub/Sub for cross-server message routing",
            "Database sharding strategies for message storage",
            "Connection management and presence tracking",
        ],
        linked_sections=["hld_scenarios", "dsa_design_mapping", "amazon_criteria"],
    ),
    StudyDay(
        day=14, week=2,
        title="System Design — LLM System Architecture",
        description="Design production LLM systems: caching, routing, monitoring.",
        tasks=[
            "LLM Gateway: routing, load balancing, fallbacks",
            "Semantic caching for repeated queries",
            "Prompt management and versioning",
            "Observability: token usage, latency, cost tracking",
            "Review & mock interview practice",
        ],
        linked_sections=["hld_scenarios", "modern_llm_engineering", "ai_maturity", "amazon_criteria"],
    ),
]


@router.get("/", response_model=StudyPlanResponse)
async def get_study_plan(db: AsyncSession = Depends(get_db)):
    """Get the 14-day study plan with completion state."""
    # Check which days are completed via progress tracking
    days = []
    completed_days = 0
    current_day = None

    for day in STUDY_PLAN_DAYS:
        # Check if this day's progress item is marked complete
        item_id = f"study_plan:day_{day.day}"
        stmt = select(Progress).where(Progress.item_id == item_id)
        result = await db.execute(stmt)
        progress = result.scalar_one_or_none()

        is_completed = progress is not None and progress.status == "completed"
        if is_completed:
            completed_days += 1
        elif current_day is None:
            current_day = day.day

        days.append(StudyDay(
            day=day.day,
            week=day.week,
            title=day.title,
            description=day.description,
            tasks=day.tasks,
            linked_sections=day.linked_sections,
            is_completed=is_completed,
        ))

    return StudyPlanResponse(
        total_days=14,
        completed_days=completed_days,
        current_day=current_day or 1,
        days=days,
    )


@router.post("/complete/{day_number}")
async def complete_day(day_number: int, db: AsyncSession = Depends(get_db)):
    """Mark a study plan day as completed."""
    if day_number < 1 or day_number > 14:
        return {"error": "Day must be between 1 and 14"}

    item_id = f"study_plan:day_{day_number}"
    stmt = select(Progress).where(Progress.item_id == item_id)
    result = await db.execute(stmt)
    progress = result.scalar_one_or_none()

    from datetime import datetime
    now = datetime.utcnow()

    if progress:
        progress.status = "completed"
        progress.completed_at = now
    else:
        progress = Progress(
            item_id=item_id,
            section="study_plan",
            status="completed",
            confidence=5,
            times_reviewed=1,
            last_reviewed_at=now,
            completed_at=now,
        )
        db.add(progress)

    return {"status": "completed", "day": day_number}


@router.post("/uncomplete/{day_number}")
async def uncomplete_day(day_number: int, db: AsyncSession = Depends(get_db)):
    """Mark a study plan day as not completed."""
    item_id = f"study_plan:day_{day_number}"
    stmt = select(Progress).where(Progress.item_id == item_id)
    result = await db.execute(stmt)
    progress = result.scalar_one_or_none()

    if progress:
        progress.status = "not_started"
        progress.completed_at = None

    return {"status": "uncompleted", "day": day_number}
