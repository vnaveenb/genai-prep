"""
Content loader service — parses genai.json at startup and indexes every item
with a composite section:id key for cross-feature reference.
"""

import json
from pathlib import Path
from app.config import settings
from app.schemas.schemas import (
    ContentSection,
    ContentItem,
    FlashCard,
    InterviewCategory,
    InterviewSubcategory,
)


class ContentLoader:
    def __init__(self):
        self._data: dict = {}
        self._sections: list[ContentSection] = []
        self._items: dict[str, list[ContentItem]] = {}
        self._flashcards: dict[str, list[FlashCard]] = {}
        self._all_items: list[ContentItem] = []
        self._all_flashcards: list[FlashCard] = []
        self._study_plan: dict = {}
        self._raw: dict = {}

    def load(self, path: str | None = None):
        json_path = path or settings.GENAI_JSON_PATH
        with open(json_path, "r", encoding="utf-8") as f:
            self._data = json.load(f)
        self._raw = self._data
        self._index_all()

    @property
    def raw(self) -> dict:
        return self._raw

    @property
    def sections(self) -> list[ContentSection]:
        return self._sections

    @property
    def all_items(self) -> list[ContentItem]:
        return self._all_items

    @property
    def all_flashcards(self) -> list[FlashCard]:
        return self._all_flashcards

    def get_items(self, section: str) -> list[ContentItem]:
        return self._items.get(section, [])

    def get_flashcards(self, section: str | None = None) -> list[FlashCard]:
        if section:
            return self._flashcards.get(section, [])
        return self._all_flashcards

    def get_item(self, item_id: str) -> ContentItem | None:
        for item in self._all_items:
            if item.item_id == item_id:
                return item
        return None

    def get_study_plan(self) -> dict:
        return self._study_plan

    def get_section_item_count(self, section: str) -> int:
        return len(self._items.get(section, []))

    def _index_all(self):
        """Index all sections from genai.json into structured items & flashcards."""
        self._sections = []
        self._items = {}
        self._flashcards = {}
        self._all_items = []
        self._all_flashcards = []

        # 1. Research Papers
        self._index_research_papers()
        # 2. Core Concepts - Modern LLM Engineering
        self._index_modern_llm_engineering()
        # 3. Core Concepts - Key 2026 Topics
        self._index_key_2026_topics()
        # 4. System Design - DSA to Design Mapping
        self._index_dsa_design_mapping()
        # 5. System Design - HLD Scenarios
        self._index_hld_scenarios()
        # 6. System Design - Amazon Evaluation Criteria
        self._index_amazon_criteria()
        # 7. System Design - Hard DSA Follow-ups
        self._index_hard_dsa_followups()
        # 8. Interview Viva - Resume Screening ML Quiz
        self._index_resume_screening()
        # 9. Interview Viva - General Topic Questions
        self._index_general_topic_questions()
        # 10. Python Senior Competencies
        self._index_python_competencies()
        # 11. AI Engineering Maturity Levels
        self._index_ai_maturity_levels()
        # 12. Study Plan
        self._index_study_plan()

    def _add_section(self, key: str, title: str, description: str, count: int):
        self._sections.append(
            ContentSection(
                section_key=key,
                title=title,
                description=description,
                item_count=count,
            )
        )

    def _add_item(self, section: str, item: ContentItem):
        self._items.setdefault(section, []).append(item)
        self._all_items.append(item)

    def _add_flashcard(self, section: str, card: FlashCard):
        self._flashcards.setdefault(section, []).append(card)
        self._all_flashcards.append(card)

    # ─── Section Indexers ──────────────────────────────────────

    def _index_research_papers(self):
        papers = self._data.get("research_papers_must_read", [])
        section = "research_papers"
        self._add_section(section, "Research Papers", "Must-read foundational AI/ML papers", len(papers))
        for p in papers:
            item_id = f"{section}:{p['id']}"
            self._add_item(section, ContentItem(
                item_id=item_id, section=section,
                title=p["title"], subtitle=p["topic"], detail=p["relevance"],
                short_answer=p.get("short_answer"),
                detailed_answer=p.get("detailed_answer")
            ))
            self._add_flashcard(section, FlashCard(
                item_id=item_id, section=section, category="Research Papers",
                front=p["title"],
                back=f"Topic: {p['topic']}\nRelevance: {p['relevance']}"
            ))

    def _index_modern_llm_engineering(self):
        concepts = self._data.get("core_concepts", {}).get("modern_llm_engineering", [])
        section = "modern_llm_engineering"
        self._add_section(section, "Modern LLM Engineering", "Core concepts for LLM engineering", len(concepts))
        for i, c in enumerate(concepts):
            item_id = f"{section}:{i}"
            if isinstance(c, dict):
                title = c.get("topic", str(c))
                short_ans = c.get("short_answer")
                detailed_ans = c.get("detailed_answer")
            else:
                title = str(c)
                short_ans = None
                detailed_ans = None
            self._add_item(section, ContentItem(
                item_id=item_id, section=section, title=title,
                short_answer=short_ans, detailed_answer=detailed_ans
            ))
            front = title.split("(")[0].strip() if "(" in title else title
            self._add_flashcard(section, FlashCard(
                item_id=item_id, section=section, category="LLM Engineering",
                front=front,
                back=short_ans or title
            ))

    def _index_key_2026_topics(self):
        topics = self._data.get("core_concepts", {}).get("key_2026_topics", [])
        section = "key_2026_topics"
        self._add_section(section, "Key 2026 Topics", "Critical concepts for 2026 interviews", len(topics))
        for i, t in enumerate(topics):
            item_id = f"{section}:{i}"
            self._add_item(section, ContentItem(
                item_id=item_id, section=section,
                title=t["concept"], detail=t["detail"],
                short_answer=t.get("short_answer"),
                detailed_answer=t.get("detailed_answer")
            ))
            self._add_flashcard(section, FlashCard(
                item_id=item_id, section=section, category="Key Topics",
                front=t["concept"], back=t.get("short_answer") or t["detail"]
            ))

    def _index_dsa_design_mapping(self):
        mappings = self._data.get("system_design_mastery", {}).get("dsa_to_design_mapping", [])
        section = "dsa_design_mapping"
        self._add_section(section, "DSA → System Design", "DSA problems mapped to real system design patterns", len(mappings))
        for m in mappings:
            item_id = f"{section}:{m['id']}"
            self._add_item(section, ContentItem(
                item_id=item_id, section=section,
                title=m["dsa_problem"], detail=m["system_design"]
            ))
            self._add_flashcard(section, FlashCard(
                item_id=item_id, section=section, category="DSA → Design",
                front=f"DSA: {m['dsa_problem']}",
                back=f"System Design: {m['system_design']}"
            ))

    def _index_hld_scenarios(self):
        scenarios = self._data.get("system_design_mastery", {}).get("high_level_design_scenarios", [])
        section = "hld_scenarios"
        self._add_section(section, "HLD Scenarios", "High-level design interview scenarios with probes", len(scenarios))
        for i, s in enumerate(scenarios):
            item_id = f"{section}:{i}"
            extra = {"probes": s["probes"]}
            if s.get("follow_up"):
                extra["follow_up"] = s["follow_up"]
            self._add_item(section, ContentItem(
                item_id=item_id, section=section,
                title=s["scenario"],
                detail=", ".join(s["probes"]),
                extra=extra
            ))
            self._add_flashcard(section, FlashCard(
                item_id=item_id, section=section, category="System Design",
                front=s["scenario"],
                back="Key probes: " + ", ".join(s["probes"])
            ))

    def _index_amazon_criteria(self):
        criteria = self._data.get("system_design_mastery", {}).get("amazon_evaluation_criteria", [])
        section = "amazon_criteria"
        self._add_section(section, "Amazon Eval Criteria", "How Amazon evaluates system design interviews", len(criteria))
        for i, c in enumerate(criteria):
            item_id = f"{section}:{i}"
            self._add_item(section, ContentItem(
                item_id=item_id, section=section, title=c
            ))
            self._add_flashcard(section, FlashCard(
                item_id=item_id, section=section, category="Evaluation",
                front=c.split("(")[0].strip() if "(" in c else c,
                back=c
            ))

    def _index_hard_dsa_followups(self):
        followups = self._data.get("system_design_mastery", {}).get("hard_dsa_follow_ups", [])
        section = "hard_dsa_followups"
        self._add_section(section, "Hard DSA Follow-ups", "Advanced follow-up questions for DSA problems", len(followups))
        for i, f in enumerate(followups):
            item_id = f"{section}:{i}"
            self._add_item(section, ContentItem(
                item_id=item_id, section=section,
                title=f["problem"], detail=f["follow_up"],
                short_answer=f.get("short_answer"),
                detailed_answer=f.get("detailed_answer")
            ))
            self._add_flashcard(section, FlashCard(
                item_id=item_id, section=section, category="DSA Follow-ups",
                front=f"Problem: {f['problem']}",
                back=f.get("short_answer") or f"Follow-up: {f['follow_up']}"
            ))

    def _index_resume_screening(self):
        quiz = self._data.get("interview_viva_questions", {}).get("resume_screening_ml_quiz", {})
        section = "resume_screening"
        total = sum(len(v) for v in quiz.values())
        self._add_section(section, "Resume Screening Quiz", "ML quiz questions from resume screening rounds", total)
        for category, questions in quiz.items():
            for i, q in enumerate(questions):
                item_id = f"{section}:{category}:{i}"
                if isinstance(q, dict):
                    title = q.get("question", str(q))
                    short_ans = q.get("short_answer")
                    detailed_ans = q.get("detailed_answer")
                else:
                    title = str(q)
                    short_ans = None
                    detailed_ans = None
                self._add_item(section, ContentItem(
                    item_id=item_id, section=section,
                    title=title, subtitle=category.replace("_", " ").title(),
                    short_answer=short_ans, detailed_answer=detailed_ans
                ))
                self._add_flashcard(section, FlashCard(
                    item_id=item_id, section=section, category=category.replace("_", " ").title(),
                    front=title,
                    back=short_ans or f"Category: {category.replace('_', ' ').title()}\nPrepare a detailed answer for this question."
                ))

    def _index_general_topic_questions(self):
        topics = self._data.get("interview_viva_questions", {}).get("general_topic_questions", {})
        section = "general_topics"
        total = sum(len(v) for v in topics.values())
        self._add_section(section, "General Topic Questions", "Interview questions across all major topics", total)
        for topic, questions in topics.items():
            for i, q in enumerate(questions):
                item_id = f"{section}:{topic}:{i}"
                if isinstance(q, dict):
                    title = q.get("question", str(q))
                    short_ans = q.get("short_answer")
                    detailed_ans = q.get("detailed_answer")
                else:
                    title = str(q)
                    short_ans = None
                    detailed_ans = None
                self._add_item(section, ContentItem(
                    item_id=item_id, section=section,
                    title=title, subtitle=topic.replace("_", " ").title(),
                    short_answer=short_ans, detailed_answer=detailed_ans
                ))
                self._add_flashcard(section, FlashCard(
                    item_id=item_id, section=section,
                    category=topic.replace("_", " ").title(),
                    front=title,
                    back=short_ans or f"Topic: {topic.replace('_', ' ').title()}\nPrepare a structured answer."
                ))

    def _index_python_competencies(self):
        competencies = self._data.get("python_senior_competencies", {})
        section = "python_competencies"
        total = sum(len(v) for v in competencies.values())
        self._add_section(section, "Python Senior Competencies", "Skills expected from a Senior Python engineer", total)
        for area, skills in competencies.items():
            for i, skill in enumerate(skills):
                item_id = f"{section}:{area}:{i}"
                if isinstance(skill, dict):
                    title = skill.get("topic", str(skill))
                    short_ans = skill.get("short_answer")
                    detailed_ans = skill.get("detailed_answer")
                else:
                    title = str(skill)
                    short_ans = None
                    detailed_ans = None
                self._add_item(section, ContentItem(
                    item_id=item_id, section=section,
                    title=title, subtitle=area.replace("_", " ").title(),
                    short_answer=short_ans, detailed_answer=detailed_ans
                ))
                front = title.split(":")[0].strip() if ":" in title else title
                self._add_flashcard(section, FlashCard(
                    item_id=item_id, section=section,
                    category=area.replace("_", " ").title(),
                    front=front,
                    back=short_ans or title
                ))

    def _index_ai_maturity_levels(self):
        levels = self._data.get("ai_engineering_maturity_levels", {})
        section = "ai_maturity"
        total = sum(len(v.get("skills", [])) for v in levels.values())
        self._add_section(section, "AI Engineering Maturity", "4-level progression from using to optimizing AI", total)
        for level_key, level_data in levels.items():
            focus = level_data.get("focus", "")
            for i, skill in enumerate(level_data.get("skills", [])):
                item_id = f"{section}:{level_key}:{i}"
                self._add_item(section, ContentItem(
                    item_id=item_id, section=section,
                    title=skill, subtitle=f"{level_key.replace('_', ' ').title()} — {focus}"
                ))
                self._add_flashcard(section, FlashCard(
                    item_id=item_id, section=section,
                    category=f"Level: {focus}",
                    front=skill,
                    back=f"Maturity Level: {focus}\nSkill: {skill}"
                ))

    def _index_study_plan(self):
        plan = self._data.get("study_plan_14_day_sprint", {})
        self._study_plan = plan

    # ─── Interview Questions Grouped by Category ───────────────

    CATEGORY_MAP = {
        "Core ML": {
            "Classical ML": [("resume_screening", "classical_ml")],
            "Machine Learning": [("general_topics", "machine_learning")],
            "Deep Learning": [("general_topics", "deep_learning")],
        },
        "LLMs & Transformers": {
            "Modern LLM Engineering": [("modern_llm_engineering", None)],
            "Key 2026 Topics": [("key_2026_topics", None)],
            "LLM Concepts": [("general_topics", "llm")],
            "Transformer Architecture": [("general_topics", "transformer_architecture")],
            "RAG": [("general_topics", "rag")],
            "Prompting": [("general_topics", "prompting")],
            "Frameworks": [("general_topics", "frameworks")],
        },
        "System Design": {
            "Hard DSA Follow-ups": [("hard_dsa_followups", None)],
        },
        "Python & Engineering": {
            "Python Competencies": [("python_competencies", None)],
            "Python Concepts": [("general_topics", "python")],
        },
        "Computer Vision & NLP": {
            "Deep Learning & CNN": [("resume_screening", "deep_learning_cnn")],
            "NLP": [("general_topics", "nlp")],
            "RNN & LSTM": [("general_topics", "rnn_lstm")],
        },
        "Research Papers": {
            "Must-Read Papers": [("research_papers", None)],
            "Research Specific": [("resume_screening", "research_specific")],
        },
    }

    def get_interview_questions(self) -> list[InterviewCategory]:
        """Return all items that have short_answer/detailed_answer, grouped by user-facing categories."""
        categories: list[InterviewCategory] = []

        for cat_name, subcats in self.CATEGORY_MAP.items():
            sub_list: list[InterviewSubcategory] = []
            for subcat_name, sources in subcats.items():
                items: list[ContentItem] = []
                for section_key, sub_key in sources:
                    section_items = self._items.get(section_key, [])
                    for item in section_items:
                        # Filter by sub_key if specified (subcategory embedded in item_id)
                        if sub_key:
                            if f":{sub_key}:" not in item.item_id:
                                continue
                        # Only include items with at least one answer
                        if item.short_answer or item.detailed_answer:
                            items.append(item)
                if items:
                    sub_list.append(InterviewSubcategory(name=subcat_name, items=items))
            if sub_list:
                categories.append(InterviewCategory(category=cat_name, subcategories=sub_list))

        return categories


# Singleton instance
content_loader = ContentLoader()
