"""
Quiz generator — builds quiz questions from genai.json content.
Two modes:
  - static: deterministic MCQs derived from the loaded data
  - ai: LLM-generated contextual questions via LangChain
"""

import random
import json
import uuid
from langchain_core.messages import SystemMessage, HumanMessage

from app.schemas.schemas import QuizQuestion, LLMConfig
from app.services.content_loader import content_loader
from app.services.llm_service import get_llm


def generate_static_quiz(section: str, count: int = 5, topic: str | None = None) -> list[QuizQuestion]:
    """Generate deterministic MCQs from the loaded content."""
    items = content_loader.get_items(section)
    if not items:
        return []

    # Filter by topic/subtitle if specified
    if topic:
        filtered = [i for i in items if topic.lower() in (i.subtitle or "").lower() or topic.lower() in i.title.lower()]
        if filtered:
            items = filtered

    random.shuffle(items)
    items = items[:count]
    questions = []

    all_section_items = content_loader.get_items(section)

    for item in items:
        q_id = f"q_{uuid.uuid4().hex[:8]}"

        # Build MCQ based on section type
        if section == "research_papers":
            question = f"What is the topic of the paper '{item.title}'?"
            correct = item.subtitle or item.detail or ""
            distractors = _get_distractors(correct, [i.subtitle or i.detail or "" for i in all_section_items], 3)
            options = distractors + [correct]
            random.shuffle(options)
        elif section == "dsa_design_mapping":
            question = f"Which system design pattern is related to the DSA problem '{item.title}'?"
            correct = item.detail or ""
            distractors = _get_distractors(correct, [i.detail or "" for i in all_section_items], 3)
            options = distractors + [correct]
            random.shuffle(options)
        elif section == "key_2026_topics":
            question = f"What does '{item.title}' refer to in the context of GenAI?"
            correct = item.detail or ""
            distractors = _get_distractors(correct, [i.detail or "" for i in all_section_items], 3)
            options = distractors + [correct]
            random.shuffle(options)
        else:
            # For question-based sections, use the title as the question (open-ended style as MCQ)
            question = item.title
            correct = item.detail or item.subtitle or "Refer to study material"
            options = None  # open-ended

        questions.append(QuizQuestion(
            question_id=q_id,
            question=question,
            options=options,
            correct_answer=correct,
            explanation=item.detail,
            question_type="mcq" if options else "open_ended",
            section=section,
            topic=item.subtitle,
        ))

    return questions


async def generate_ai_quiz(
    section: str,
    count: int = 5,
    difficulty: str = "medium",
    topic: str | None = None,
    llm_config: LLMConfig | None = None,
) -> list[QuizQuestion]:
    """Generate contextual MCQs using LLM."""
    if not llm_config:
        raise ValueError("LLM config required for AI quiz generation")

    items = content_loader.get_items(section)
    context_items = items[:20]  # limit context size
    context_str = "\n".join([f"- {i.title}: {i.detail or i.subtitle or ''}" for i in context_items])

    section_info = next((s for s in content_loader.sections if s.section_key == section), None)
    section_name = section_info.title if section_info else section

    system_prompt = f"""You are a technical interview quiz generator for a Senior Python GenAI Engineer position.
Generate {count} multiple-choice questions about "{section_name}" at {difficulty} difficulty level.
{f'Focus on the topic: {topic}' if topic else ''}

Context from the study material:
{context_str}

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question": "the question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correct_answer": "the correct option text (must match one of the options exactly)",
    "explanation": "brief explanation of why this is correct"
  }}
]
"""

    llm = get_llm(llm_config, streaming=False)
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Generate {count} {difficulty} difficulty MCQs about {section_name}."),
    ])

    # Parse LLM response
    try:
        content = response.content
        # Extract JSON from markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        raw_questions = json.loads(content.strip())
        questions = []
        for rq in raw_questions[:count]:
            q_id = f"q_{uuid.uuid4().hex[:8]}"
            questions.append(QuizQuestion(
                question_id=q_id,
                question=rq["question"],
                options=rq.get("options"),
                correct_answer=rq["correct_answer"],
                explanation=rq.get("explanation"),
                question_type="mcq" if rq.get("options") else "open_ended",
                section=section,
                topic=topic,
            ))
        return questions
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        raise ValueError(f"Failed to parse LLM quiz response: {e}")


def _get_distractors(correct: str, all_options: list[str], count: int) -> list[str]:
    """Get random distractors (wrong answers) from the pool, excluding the correct answer."""
    pool = [o for o in all_options if o and o != correct]
    if len(pool) < count:
        # Pad with generic options if not enough
        generic = ["Not applicable", "None of the above", "All of the above", "Multiple correct"]
        pool.extend(generic)
    return random.sample(pool[:20], min(count, len(pool)))
