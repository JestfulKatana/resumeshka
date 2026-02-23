"""Claude API client — unified interface for all LLM calls."""

import json
import logging
import os
import time

import anthropic

from prompts import (
    ANNOTATE_SCHEMA,
    ANNOTATE_SYSTEM,
    PARSE_SCHEMA,
    PARSE_SYSTEM,
    RECHECK_SCHEMA,
    RECHECK_SYSTEM,
    RECHECK_USER_TEMPLATE,
    REGENERATE_BULLET_SCHEMA,
    REGENERATE_BULLET_SYSTEM,
    REWRITE_BLOCK_SCHEMA,
    REWRITE_BLOCK_SYSTEM,
    REWRITE_META_SCHEMA,
    REWRITE_META_SYSTEM,
    ROLES_SCHEMA,
    ROLES_SYSTEM,
    SCORING_SCHEMA,
    SCORING_SYSTEM,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("llm")
logger.setLevel(logging.DEBUG)

_file_handler = logging.FileHandler(os.path.join(LOG_DIR, "llm.log"), encoding="utf-8")
_file_handler.setFormatter(logging.Formatter("%(asctime)s | %(message)s", datefmt="%H:%M:%S"))
logger.addHandler(_file_handler)

# Also print to console
_console_handler = logging.StreamHandler()
_console_handler.setFormatter(logging.Formatter("\033[36m%(asctime)s\033[0m | %(message)s", datefmt="%H:%M:%S"))
logger.addHandler(_console_handler)

# Pricing per 1M tokens (Haiku 4.5)
PRICE_INPUT = 0.80   # $/1M input tokens
PRICE_OUTPUT = 4.00  # $/1M output tokens
PRICE_CACHE_READ = 0.08  # $/1M cached input tokens
PRICE_CACHE_WRITE = 1.00  # $/1M cache write tokens

# Session totals
_session_totals = {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0, "cost": 0.0, "calls": 0}


def _calc_cost(usage) -> float:
    inp = getattr(usage, "input_tokens", 0) or 0
    out = getattr(usage, "output_tokens", 0) or 0
    cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
    cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
    # input_tokens = non-cached input (separate from cache counters)
    return (
        inp * PRICE_INPUT / 1_000_000
        + out * PRICE_OUTPUT / 1_000_000
        + cache_read * PRICE_CACHE_READ / 1_000_000
        + cache_write * PRICE_CACHE_WRITE / 1_000_000
    )


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 16384

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------

import asyncio


class TokenBucket:
    def __init__(self, rate_per_minute: int):
        self.rate = rate_per_minute
        self.tokens = float(rate_per_minute)
        self.last_refill = time.monotonic()

    async def acquire(self, cost: int = 1) -> None:
        while True:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.rate, self.tokens + elapsed * (self.rate / 60))
            self.last_refill = now
            if self.tokens >= cost:
                self.tokens -= cost
                return
            wait = (cost - self.tokens) / (self.rate / 60)
            await asyncio.sleep(wait)


rpm_limiter = TokenBucket(rate_per_minute=50)


# ---------------------------------------------------------------------------
# Core LLM call
# ---------------------------------------------------------------------------

async def call_claude(
    system_text: str,
    user_message: str | list[dict],
    output_schema: dict,
    schema_name: str = "result",
    max_tokens: int = MAX_TOKENS,
    label: str | None = None,
    web_search: bool = False,
) -> dict:
    """Call Claude with structured output via tool_use pattern.

    user_message can be a plain string or a list of content blocks
    (dicts with "type", "text", and optional "cache_control").

    schema_name — tool name in the API request (must be stable for caching).
    label — display name for logs (defaults to schema_name).
    web_search — if True, enable server-side web search tool (Claude searches the web).
    """
    log_label = label or schema_name
    await rpm_limiter.acquire()

    logger.info(f">>> [{log_label}] Sending request to {MODEL}{'  [+web_search]' if web_search else ''}...")
    t0 = time.monotonic()

    user_content = user_message if isinstance(user_message, list) else user_message

    tools: list[dict] = []
    if web_search:
        tools.append({
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 3,
            "user_location": {
                "type": "approximate",
                "country": "RU",
            },
        })
    tools.append({
        "name": schema_name,
        "description": "Return the structured analysis result",
        "input_schema": output_schema,
        "cache_control": {"type": "ephemeral"},
    })

    response = await client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=[
            {
                "type": "text",
                "text": system_text,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_content}],
        tools=tools,
        tool_choice={"type": "tool", "name": schema_name},
    )

    elapsed = time.monotonic() - t0
    usage = response.usage

    inp = getattr(usage, "input_tokens", 0) or 0
    out = getattr(usage, "output_tokens", 0) or 0
    cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
    cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
    cost = _calc_cost(usage)

    _session_totals["input"] += inp
    _session_totals["output"] += out
    _session_totals["cache_read"] += cache_read
    _session_totals["cache_write"] += cache_write
    _session_totals["cost"] += cost
    _session_totals["calls"] += 1

    # Log web search usage if present
    web_searches = getattr(getattr(usage, "server_tool_use", None), "web_search_requests", 0) or 0
    web_suffix = f" web_searches={web_searches}" if web_searches else ""

    logger.info(
        f"<<< [{log_label}] {elapsed:.1f}s | "
        f"in={inp} out={out} cache_read={cache_read} cache_write={cache_write}{web_suffix} | "
        f"${cost:.4f} (session: ${_session_totals['cost']:.4f}, {_session_totals['calls']} calls)"
    )

    if response.stop_reason == "max_tokens":
        logger.warning(f"!!! [{log_label}] Ответ обрезан — модель упёрлась в лимит {max_tokens} токенов (out={out})")
        raise RuntimeError(
            f"Модель не уложилась в лимит токенов при выполнении шага «{log_label}». "
            "Попробуйте загрузить резюме покороче или повторите попытку."
        )

    for block in response.content:
        if block.type == "tool_use":
            return block.input
    raise RuntimeError("No structured output returned by model")


# ---------------------------------------------------------------------------
# Pipeline step functions
# ---------------------------------------------------------------------------

async def run_parse(resume_text: str) -> dict:
    """Parse resume: split into sections + classify type + red_flags."""
    return await call_claude(
        PARSE_SYSTEM, resume_text, PARSE_SCHEMA, "parse"
    )


async def run_scoring(resume_text: str) -> dict:
    """Run scoring: 10 dimensions + server-computed total_score and grade."""
    result = await call_claude(
        SCORING_SYSTEM, resume_text, SCORING_SCHEMA, "scoring"
    )
    # Compute total_score from dimensions (model tends to hallucinate a fixed number)
    total = sum(d.get("score", 0) for d in result.get("dimensions", []))
    result["total_score"] = total
    # Derive grade from score
    if total >= 85:
        result["grade"] = "Отличное резюме"
    elif total >= 70:
        result["grade"] = "Хорошее резюме"
    elif total >= 55:
        result["grade"] = "Неплохая база"
    elif total >= 35:
        result["grade"] = "Есть над чем поработать"
    else:
        result["grade"] = "Нужна серьёзная доработка"
    return result


async def _annotate_section(section: dict, resume_text: str) -> dict:
    """Annotate a single experience section: weaknesses/strengths."""
    block_id = section["block_id"]
    user_blocks = [
        {
            "type": "text",
            "text": f"Полное резюме для контекста:\n{resume_text}",
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": (
                f"---\n\nПроанализируй ТОЛЬКО этот блок:\n\n"
                f"[БЛОК {block_id}] {section['section_title']}"
                f" ({section.get('period', '')})\n\n"
                f"{section.get('full_text', '')}"
            ),
        },
    ]
    result = await call_claude(
        ANNOTATE_SYSTEM,
        user_blocks,
        ANNOTATE_SCHEMA,
        "annotate",
        max_tokens=8192,
        label=f"annotate_{block_id}",
    )
    return {**section, "annotations": result.get("annotations", [])}


async def run_annotate(sections: list[dict], resume_text: str) -> list[dict]:
    """Annotate all sections in parallel. First call primes the cache, rest follow."""
    if not sections:
        return []
    # Fire first call to populate prompt cache
    first = await _annotate_section(sections[0], resume_text)
    if len(sections) == 1:
        return [first]
    # Remaining calls hit the cached prefix
    remaining = await asyncio.gather(
        *[_annotate_section(s, resume_text) for s in sections[1:]]
    )
    return [first] + list(remaining)


async def run_roles(resume_text: str, analysis: dict, key_skills: dict | None = None) -> dict:
    skills_part = ""
    if key_skills:
        skills_part = (
            f"\n\nНавыки кандидата:\n"
            f"Hard skills: {', '.join(key_skills.get('hard_skills', []))}\n"
            f"Soft skills: {', '.join(key_skills.get('soft_skills', []))}\n"
            f"Domain: {', '.join(key_skills.get('domain_knowledge', []))}"
        )
    analysis_part = (
        f"---\n\n"
        f"Результат анализа:\n"
        f"Тип резюме: {analysis['resume_type']}\n"
        f"Главная проблема: {analysis['main_problem']}\n"
        f"Red flags: {json.dumps(analysis['red_flags'], ensure_ascii=False)}"
        f"{skills_part}"
    )
    user_blocks = [
        {
            "type": "text",
            "text": f"Резюме:\n{resume_text}",
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": analysis_part,
        },
    ]
    result = await call_claude(
        ROLES_SYSTEM, user_blocks, ROLES_SCHEMA, "roles",
        web_search=True,
    )

    # Safety: ensure recommendation exists (model may omit it)
    if "recommendation" not in result or not result["recommendation"]:
        roles = result.get("roles", [])
        best = roles[0]["role"] if roles else ""
        result["recommendation"] = {"primary_role": best, "reasoning": ""}

    return result


async def _rewrite_block(
    section: dict,
    selected_role: str,
    role_details: dict,
    analysis_context: dict,
    resume_text: str,
) -> dict:
    """Rewrite a single experience block."""
    block_id = section["block_id"]
    annotations_json = json.dumps(
        section.get("annotations", []), ensure_ascii=False
    )

    # Cached part: shared context (same for all blocks → cache hit)
    # Resume text included to exceed 2048 token minimum for Haiku caching
    gender = analysis_context.get("gender", "male")
    gender_label = "женский" if gender == "female" else "мужской"
    cached_part = (
        f"Оригинальное резюме:\n{resume_text}\n\n---\n\n"
        f"Целевая роль: {selected_role}\n\n"
        f"Контекст роли:\n"
        f"{json.dumps(role_details, ensure_ascii=False)}\n\n"
        f"Тип резюме: {analysis_context.get('resume_type', '')}\n"
        f"Главная проблема: {analysis_context.get('main_problem', '')}\n"
        f"Пол кандидата: {gender_label} (используй соответствующий род глаголов!)"
    )

    # Variable part: this specific block
    block_part = (
        f"Блок опыта:\n"
        f"[БЛОК {block_id}] {section['section_title']}"
        f" ({section.get('period', '')})\n"
        f"{section.get('full_text', '')}\n\n"
        f"Замечания к этому блоку:\n{annotations_json}"
    )

    user_blocks = [
        {
            "type": "text",
            "text": cached_part,
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": block_part,
        },
    ]

    return await call_claude(
        REWRITE_BLOCK_SYSTEM,
        user_blocks,
        REWRITE_BLOCK_SCHEMA,
        "rewrite_block",
        max_tokens=4096,
        label=f"rewrite_block_{block_id}",
    )


async def _rewrite_meta(
    resume_text: str,
    rewritten_blocks: list[dict],
    selected_role: str,
    role_details: dict,
) -> dict:
    """Generate summary, skills, recommendations from all rewritten blocks."""
    blocks_json = json.dumps(rewritten_blocks, ensure_ascii=False)

    # Resume first with cache_control — stable across role changes,
    # second call reuses cached prefix (~15K tokens saved)
    user_blocks = [
        {
            "type": "text",
            "text": f"Оригинальное резюме:\n{resume_text}",
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": (
                f"Целевая роль: {selected_role}\n\n"
                f"Контекст роли:\n"
                f"{json.dumps(role_details, ensure_ascii=False)}\n\n"
                f"Переписанные блоки опыта:\n{blocks_json}"
            ),
        },
    ]

    return await call_claude(
        REWRITE_META_SYSTEM,
        user_blocks,
        REWRITE_META_SCHEMA,
        "rewrite_meta",
        max_tokens=4096,
    )


def _sanitize_block(block: dict) -> None:
    """Ensure rewritten_bullets and highlights are proper arrays."""
    # Model sometimes returns rewritten_bullets as a string instead of array
    rb = block.get("rewritten_bullets", [])
    if isinstance(rb, str):
        logger.warning(
            f"Block {block.get('block_id')}: rewritten_bullets is a string "
            f"({len(rb)} chars), splitting by newlines."
        )
        block["rewritten_bullets"] = [
            line.lstrip("•-– ").strip()
            for line in rb.split("\n")
            if line.strip()
        ]

    hl = block.get("highlights", [])
    if isinstance(hl, str):
        logger.warning(f"Block {block.get('block_id')}: highlights is a string, resetting.")
        block["highlights"] = []

    # Pad/trim highlights to match rewritten_bullets length
    rb_len = len(block.get("rewritten_bullets", []))
    highlights = block.get("highlights", [])
    hl_len = len(highlights)
    if hl_len != rb_len:
        logger.warning(
            f"Block {block.get('block_id')}: highlights({hl_len}) "
            f"!= rewritten_bullets({rb_len}). Padding/trimming."
        )
        if hl_len < rb_len:
            highlights.extend(
                [{"action": "keep", "comment": ""}] * (rb_len - hl_len)
            )
        else:
            highlights = highlights[:rb_len]
        block["highlights"] = highlights


async def run_rewrite(
    resume_text: str, analysis: dict, roles: dict, selected_role: str
) -> dict:
    """Rewrite resume: parallel per-block calls, then meta call."""
    sections = analysis.get("sections", [])

    # Find matching role details
    role_details = {}
    for r in roles.get("roles", []):
        if r["role"] == selected_role:
            role_details = r
            break

    analysis_context = {
        "resume_type": analysis.get("resume_type", ""),
        "main_problem": analysis.get("main_problem", ""),
        "gender": analysis.get("gender", "male"),
    }

    # Phase 1: rewrite blocks — first call primes cache, rest follow
    if not sections:
        rewritten_blocks = []
    elif len(sections) == 1:
        rewritten_blocks = [await _rewrite_block(
            sections[0], selected_role, role_details, analysis_context, resume_text
        )]
    else:
        # First call populates prompt cache
        first = await _rewrite_block(
            sections[0], selected_role, role_details, analysis_context, resume_text
        )
        # Remaining calls hit cached prefix
        remaining = await asyncio.gather(
            *[_rewrite_block(s, selected_role, role_details, analysis_context, resume_text)
              for s in sections[1:]],
            return_exceptions=True,
        )
        errors = [r for r in remaining if isinstance(r, Exception)]
        if errors:
            raise RuntimeError(
                f"Не удалось переписать {len(errors)} блок(ов): {errors[0]}"
            )
        rewritten_blocks = sorted(
            [first] + list(remaining), key=lambda b: b.get("block_id", 0)
        )

    # Sanitize + validate highlights alignment
    for block in rewritten_blocks:
        _sanitize_block(block)

    # Phase 2: generate meta (summary, skills, recommendations)
    meta = await _rewrite_meta(
        resume_text, rewritten_blocks, selected_role, role_details
    )

    # Assemble into the same RewriteResult shape
    return {
        "summary": meta["summary"],
        "original_summary": meta["original_summary"],
        "experiences": rewritten_blocks,
        "skills": meta["skills"],
        "recommendations": meta["recommendations"],
    }


async def run_regenerate_bullet(
    full_bullet: str,
    selected_text: str,
    user_comment: str,
    role: str,
    gender: str = "male",
) -> dict:
    """Regenerate a single bullet based on user's selection and comment."""
    gender_label = "женский" if gender == "female" else "мужской"
    user_msg = (
        f"Целевая роль: {role}\n"
        f"Пол кандидата: {gender_label}\n\n"
        f"Полный буллет:\n{full_bullet}\n\n"
        f"Выделенный фрагмент:\n{selected_text}\n\n"
        f"Комментарий пользователя:\n{user_comment}"
    )
    return await call_claude(
        REGENERATE_BULLET_SYSTEM,
        user_msg,
        REGENERATE_BULLET_SCHEMA,
        "regenerate_bullet",
        max_tokens=1024,
    )


async def run_recheck(
    updated_resume: str,
    analysis: dict,
    previous_score: int,
) -> dict:
    # Collect previous annotations
    annotations = []
    for section in analysis.get("sections", []):
        for ann in section.get("annotations", []):
            annotations.append(ann["comment"])

    user_msg = RECHECK_USER_TEMPLATE.format(
        updated_resume=updated_resume,
        previous_annotations_json=json.dumps(annotations, ensure_ascii=False),
        previous_blockers_json=json.dumps([], ensure_ascii=False),
        previous_score=previous_score,
    )
    return await call_claude(RECHECK_SYSTEM, user_msg, RECHECK_SCHEMA, "recheck")
