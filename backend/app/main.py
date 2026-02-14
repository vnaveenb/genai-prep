"""
GenAI Interview Prep — FastAPI Application
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.services.content_loader import content_loader
from app.routers import content, quiz, progress, notes, study_plan, interview, settings as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Initialize database
    await init_db()
    print("Database initialized")

    # Load content from genai.json
    content_loader.load()
    print(f"Loaded {len(content_loader.all_items)} content items from genai.json")
    print(f"Generated {len(content_loader.all_flashcards)} flashcards")
    print(f"Indexed {len(content_loader.sections)} sections")

    yield

    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A comprehensive interview preparation platform for Senior Python GenAI Engineers",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(content.router)
app.include_router(quiz.router)
app.include_router(progress.router)
app.include_router(notes.router)
app.include_router(study_plan.router)
app.include_router(interview.router)
app.include_router(settings_router.router)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "content_loaded": len(content_loader.all_items) > 0,
        "total_items": len(content_loader.all_items),
        "total_sections": len(content_loader.sections),
    }
