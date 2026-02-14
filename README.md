# GenAI Interview Prep

A full-stack web application to prepare for **Senior Python GenAI Engineer** interviews. Built with FastAPI, Next.js, LangChain, and Shadcn/UI.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000?style=flat&logo=next.js)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=flat)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

## Features

| Feature | Description |
|---------|-------------|
| **Quiz Mode** | MCQ quizzes from curated content or AI-generated questions |
| **Flashcards** | Flip-card interface with Know/Review tracking and shuffle |
| **Progress Tracker** | Section-wise completion, confidence ratings, streaks |
| **14-Day Study Plan** | Structured sprint with daily tasks and linked sections |
| **AI Mock Interview** | Real-time SSE-streamed interview with evaluation report |
| **Notes & Bookmarks** | Markdown notes per topic, bookmark toggle, search/filter |
| **Settings** | Multi-provider LLM config (Gemini, OpenAI, Anthropic, Ollama) |

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Next.js    │────▶│   FastAPI         │────▶│   SQLite       │
│   Frontend   │     │   Backend         │     │   (aiosqlite)  │
│   (Port 3000)│◀────│   (Port 8000)     │     └────────────────┘
└──────────────┘     │                    │
                     │   LangChain        │────▶ Gemini / OpenAI
                     │   (Multi-Provider) │     / Anthropic / Ollama
                     └──────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) Docker & Docker Compose

### 1. Clone & Setup Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
```

### 2. Run Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Setup Frontend

```bash
cd frontend
npm install
```

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Docker (Alternative)

```bash
docker-compose up --build
```

This starts both backend (`:8000`) and frontend (`:3000`).

## Configuration

### LLM Providers

Configure via the **Settings** page in the UI, or pass API keys per-request in the Mock Interview page.

| Provider | Env / UI Field | Default Model |
|----------|---------------|---------------|
| Google Gemini | `GEMINI_API_KEY` | gemini-2.0-flash |
| OpenAI | `OPENAI_API_KEY` | gpt-4o-mini |
| Anthropic | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| Ollama | `OLLAMA_BASE_URL` | llama3.2 |

API keys are **encrypted at rest** using Fernet symmetric encryption.

### Environment Variables

Backend (`.env` or env vars):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./genai_learn.db` | Database connection |
| `GENAI_JSON_PATH` | `../genai.json` | Path to curriculum data |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins |
| `ENCRYPTION_KEY` | `genai-learn-secret-key` | Key for API key encryption |

Frontend:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

## Project Structure

```
genai-learn/
├── genai.json                 # Curriculum data (155+ items)
├── docker-compose.yml
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app/
│       ├── main.py            # FastAPI app + lifespan
│       ├── config.py          # Pydantic Settings
│       ├── database.py        # SQLAlchemy async setup
│       ├── models/            # SQLAlchemy models
│       ├── schemas/           # Pydantic V2 schemas
│       ├── services/          # Business logic
│       │   ├── content_loader.py   # Parses genai.json
│       │   ├── llm_service.py      # LangChain multi-provider
│       │   ├── quiz_generator.py   # Static + AI quiz gen
│       │   └── interview_engine.py # SSE interview sessions
│       ├── routers/           # API endpoints
│       │   ├── content.py
│       │   ├── quiz.py
│       │   ├── progress.py
│       │   ├── notes.py
│       │   ├── study_plan.py
│       │   ├── interview.py
│       │   └── settings.py
│       └── utils/
│           └── encryption.py  # Fernet encryption
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── next.config.ts
│   └── src/
│       ├── lib/
│       │   ├── api.ts         # Axios + SSE API client
│       │   ├── types.ts       # TypeScript interfaces
│       │   └── utils.ts       # cn() utility
│       ├── components/
│       │   ├── ui/            # Shadcn/UI components
│       │   └── layout/
│       │       └── sidebar.tsx
│       └── app/
│           ├── page.tsx       # Dashboard
│           ├── quiz/
│           ├── flashcards/
│           ├── progress/
│           ├── study-plan/
│           ├── interview/
│           ├── notes/
│           └── settings/
```

## API Endpoints

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/content/` | GET | Sections, items, flashcards, search |
| `/api/quiz/` | POST, GET | Generate, submit, history |
| `/api/progress/` | GET, POST, PATCH | Track item progress, overview |
| `/api/notes/` | GET, POST, PATCH, DELETE | Notes CRUD, bookmarks |
| `/api/study-plan/` | GET, POST | 14-day plan, mark complete |
| `/api/interview/` | POST, GET | Start, message (SSE), evaluate |
| `/api/settings/` | GET, PUT, DELETE | Provider config, API keys |

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0 (async), aiosqlite, Pydantic V2, LangChain 0.3
- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, Shadcn/UI, Framer Motion
- **Database**: SQLite with async support
- **LLM**: LangChain abstracting Gemini, OpenAI, Anthropic, Ollama
- **Deployment**: Docker + Docker Compose

## License

MIT
