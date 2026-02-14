"""
Interview engine — manages mock interview sessions with LLM.
Builds system prompts from genai.json content, manages conversation flow,
generates follow-up questions, and produces evaluation reports.
"""

import json
import uuid
from datetime import datetime
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.schemas.schemas import LLMConfig, InterviewEvaluation
from app.services.content_loader import content_loader
from app.services.llm_service import get_llm


# In-memory session store (for active sessions)
_sessions: dict[str, dict] = {}


def _build_system_prompt(interview_type: str, difficulty: str, num_questions: int) -> str:
    """Build a tailored system prompt for the interview type."""
    base = f"""You are a senior technical interviewer at a top-tier tech company (FAANG level).
You are conducting a {difficulty}-level mock interview for a Senior Python GenAI Engineer position.
You will ask {num_questions} questions total, one at a time.

Interview rules:
1. Ask ONE question at a time and wait for the candidate's response.
2. After each answer, briefly evaluate it (strengths, gaps), then ask a follow-up or the next question.
3. Start with a brief introduction and your first question.
4. Probe deeper when answers are surface-level — ask "why?", "how would you handle X?", "what are the tradeoffs?"
5. Be encouraging but honest. Point out gaps when you see them.
6. Keep track of the question number (e.g., "Question 2 of {num_questions}").
7. When all questions are done, say "INTERVIEW_COMPLETE" and provide nothing else.
"""

    # Add topic-specific context from genai.json
    context_parts = []

    if interview_type in ("python", "mixed"):
        competencies = content_loader.get_items("python_competencies")
        if competencies:
            context_parts.append("Python topics to draw from:\n" + "\n".join(f"- {c.title}" for c in competencies[:10]))

    if interview_type in ("system_design", "mixed"):
        scenarios = content_loader.get_items("hld_scenarios")
        if scenarios:
            context_parts.append("System Design scenarios:\n" + "\n".join(f"- {s.title}" for s in scenarios[:5]))
        dsa = content_loader.get_items("dsa_design_mapping")
        if dsa:
            context_parts.append("DSA → Design mappings:\n" + "\n".join(f"- {d.title} → {d.detail}" for d in dsa[:10]))

    if interview_type in ("genai", "mixed"):
        llm_concepts = content_loader.get_items("modern_llm_engineering")
        if llm_concepts:
            context_parts.append("GenAI/LLM topics:\n" + "\n".join(f"- {c.title}" for c in llm_concepts[:10]))
        topics = content_loader.get_items("key_2026_topics")
        if topics:
            context_parts.append("Key 2026 topics:\n" + "\n".join(f"- {t.title}: {t.detail}" for t in topics))

    if interview_type in ("ml_dl", "mixed"):
        ml_questions = content_loader.get_items("resume_screening")
        if ml_questions:
            context_parts.append("ML/DL questions:\n" + "\n".join(f"- {q.title}" for q in ml_questions[:10]))
        general = content_loader.get_items("general_topics")
        if general:
            context_parts.append("General topic questions:\n" + "\n".join(f"- {g.title}" for g in general[:10]))

    if context_parts:
        base += "\n\nReference material for your questions:\n" + "\n\n".join(context_parts)

    return base


def create_session(interview_type: str, difficulty: str, num_questions: int) -> dict:
    """Create a new interview session."""
    session_id = f"int_{uuid.uuid4().hex[:12]}"
    system_prompt = _build_system_prompt(interview_type, difficulty, num_questions)

    session = {
        "session_id": session_id,
        "interview_type": interview_type,
        "difficulty": difficulty,
        "num_questions": num_questions,
        "system_prompt": system_prompt,
        "messages": [{"role": "system", "content": system_prompt}],
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
    }
    _sessions[session_id] = session
    return session


def get_session(session_id: str) -> dict | None:
    return _sessions.get(session_id)


def add_message(session_id: str, role: str, content: str):
    session = _sessions.get(session_id)
    if session:
        session["messages"].append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })


async def get_interviewer_response(session_id: str, candidate_message: str, llm_config: LLMConfig) -> str:
    """Get the interviewer's response (non-streaming)."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    # Add candidate message
    add_message(session_id, "candidate", candidate_message)

    # Build LangChain messages
    lc_messages = []
    for msg in session["messages"]:
        if msg["role"] == "system":
            lc_messages.append(SystemMessage(content=msg["content"]))
        elif msg["role"] == "candidate":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "interviewer":
            lc_messages.append(AIMessage(content=msg["content"]))

    llm = get_llm(llm_config, streaming=False)
    response = await llm.ainvoke(lc_messages)

    # Add interviewer response
    add_message(session_id, "interviewer", response.content)

    # Check if interview is complete
    if "INTERVIEW_COMPLETE" in response.content:
        session["status"] = "completed"

    return response.content


async def stream_interviewer_response(session_id: str, candidate_message: str, llm_config: LLMConfig):
    """Stream the interviewer's response token by token."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    # Add candidate message
    add_message(session_id, "candidate", candidate_message)

    # Build LangChain messages
    lc_messages = []
    for msg in session["messages"]:
        if msg["role"] == "system":
            lc_messages.append(SystemMessage(content=msg["content"]))
        elif msg["role"] == "candidate":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "interviewer":
            lc_messages.append(AIMessage(content=msg["content"]))

    llm = get_llm(llm_config, streaming=True)
    full_response = ""

    async for chunk in llm.astream(lc_messages):
        token = chunk.content
        if token:
            full_response += token
            yield token

    # Store complete response
    add_message(session_id, "interviewer", full_response)

    if "INTERVIEW_COMPLETE" in full_response:
        session["status"] = "completed"


async def start_interview(session_id: str, llm_config: LLMConfig) -> str:
    """Start the interview — get the first message from the interviewer."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    lc_messages = [SystemMessage(content=session["system_prompt"])]
    llm = get_llm(llm_config, streaming=False)
    response = await llm.ainvoke(lc_messages)

    add_message(session_id, "interviewer", response.content)
    return response.content


async def stream_start_interview(session_id: str, llm_config: LLMConfig):
    """Stream the interview start message."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    lc_messages = [SystemMessage(content=session["system_prompt"])]
    llm = get_llm(llm_config, streaming=True)
    full_response = ""

    async for chunk in llm.astream(lc_messages):
        token = chunk.content
        if token:
            full_response += token
            yield token

    add_message(session_id, "interviewer", full_response)


async def evaluate_interview(session_id: str, llm_config: LLMConfig) -> InterviewEvaluation:
    """Generate an evaluation report for the completed interview."""
    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    # Build conversation transcript (exclude system prompt)
    transcript_parts = []
    for msg in session["messages"]:
        if msg["role"] == "system":
            continue
        role = "Interviewer" if msg["role"] == "interviewer" else "Candidate"
        transcript_parts.append(f"{role}: {msg['content']}")
    transcript = "\n\n".join(transcript_parts)

    eval_prompt = f"""You are evaluating a mock technical interview for a Senior Python GenAI Engineer position.
Interview type: {session['interview_type']}
Difficulty: {session['difficulty']}

Transcript:
{transcript}

Evaluate the candidate and return ONLY valid JSON with this exact structure:
{{
    "overall_score": <float 0-10>,
    "correctness": <float 0-10>,
    "depth": <float 0-10>,
    "communication": <float 0-10>,
    "strengths": ["strength 1", "strength 2", ...],
    "areas_to_improve": ["area 1", "area 2", ...],
    "recommendations": ["recommendation 1", "recommendation 2", ...]
}}
"""

    llm = get_llm(llm_config, streaming=False)
    response = await llm.ainvoke([
        SystemMessage(content="You are a technical interview evaluator. Return only valid JSON."),
        HumanMessage(content=eval_prompt),
    ])

    try:
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        data = json.loads(content.strip())
        return InterviewEvaluation(**data)
    except Exception:
        return InterviewEvaluation(
            overall_score=0,
            correctness=0,
            depth=0,
            communication=0,
            strengths=["Unable to parse evaluation"],
            areas_to_improve=["Please try again"],
            recommendations=["Retry the evaluation"],
        )


def get_session_messages(session_id: str) -> list[dict]:
    """Get all non-system messages for a session."""
    session = _sessions.get(session_id)
    if not session:
        return []
    return [m for m in session["messages"] if m["role"] != "system"]


def cleanup_session(session_id: str):
    """Remove a session from memory."""
    _sessions.pop(session_id, None)
