# Resume Screener — Architecture Guide

## Stack
- **Backend**: Python FastAPI (`backend/main.py`), Claude API via `anthropic` SDK
- **Frontend**: React + TypeScript + Vite (`frontend/`)
- **LLM**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)

## Project Structure
```
backend/
  main.py          — FastAPI endpoints (API surface)
  llm.py           — All LLM calls, rate limiter, cost tracking
  prompts.py       — System prompts + JSON schemas for every LLM step
  parsers.py       — PDF/DOCX/TXT file parsing
  storage.py       — In-memory task storage (dict, TTL 24h)
  logs/llm.log     — LLM call logs with timing/cost

frontend/src/
  pages/
    HomePage.tsx       — Upload entry
    AnalysisPage.tsx   — Main pipeline orchestrator
  hooks/
    usePipeline.ts     — State machine (reducer pattern)
  api/
    client.ts          — HTTP client to backend
  types/
    analysis.ts        — AnalysisResult types
    rewrite.ts         — RewriteResult, Experience, Highlight types
    roles.ts           — RolesResult types
    verification.ts    — VerificationResult types
    recheck.ts         — RecheckResult types
    pipeline.ts        — PipelineState, PipelineAction
  components/
    diagnosis/         — DiagnosisPanel, AnnotatedText, annotations display
    score/             — ScorePanel, dimensions, grade
    roles/             — RolesPanel, RoleCard
    rewrite/           — RewritePanel, ExperienceEditor, EditableBullet
    verification/      — VerificationPanel
    recheck/           — RecheckPanel
  mock/                — Mock data for dev without backend
```

## LLM Pipeline (`llm.py`)

All calls go through `call_claude()` which handles:
- Structured output via tool_use pattern (forced tool_choice)
- Prompt caching (`cache_control: {"type": "ephemeral"}` on system + schema)
- Rate limiting (TokenBucket, 50 RPM)
- Cost tracking + logging to `logs/llm.log`

### Step 0: Analysis (`run_analyze`)
Decomposed into 3 phases:

**Phase 1 (parallel):**
- `_run_parse(resume_text)` → sections (block_id, title, period, full_text) + resume_type + red_flags + main_problem. NO annotations. Schema: `PARSE_SCHEMA`
- `_run_scoring(resume_text)` → 10 dimensions + total_score + grade + verdict. Schema: `SCORING_SCHEMA`

**Phase 2 (parallel, after parse):**
- `_annotate_section(section)` × N → annotations per section (weaknesses/strengths). Schema: `ANNOTATE_SCHEMA`

Results merged into single `AnalysisResult` — frontend sees one response.

### Step 1: Roles (`run_roles`)
Single call. Input: resume_text + analysis summary. Output: 2-3 roles with match_level, strengths, gaps, duties, stack, team_position. Schema: `ROLES_SCHEMA`

Uses multi-block user message with `cache_control` on resume text block.

### Step 2: Rewrite (`run_rewrite`)
Decomposed into per-block parallel calls:

**Phase 1 (parallel):**
- `_rewrite_block(section, role, role_details, analysis_context)` × N → rewritten bullets + index-based highlights + technologies + responsibilities. Schema: `REWRITE_BLOCK_SCHEMA`, max_tokens=4096
- Shared context (role + analysis) cached via `cache_control: ephemeral`
- `_pad_highlights()` ensures highlights.length == rewritten_bullets.length

**Phase 2 (sequential):**
- `_rewrite_meta(resume_text, blocks, role, role_details)` → summary + original_summary + skills + recommendations. Schema: `REWRITE_META_SCHEMA`

Results assembled into `RewriteResult` — frontend sees one response.

### Step 3: Verify (`run_verify`)
Single call. Recruiter perspective on rewritten resume. Schema: `VERIFY_SCHEMA`

### Step 4: Recheck (`run_recheck`)
Single call. Compares user edits against previous annotations + blockers. Schema: `RECHECK_SCHEMA`

## API Endpoints (`main.py`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analyze` | Upload file + run analysis |
| GET | `/api/tasks/{id}` | Fetch stored task |
| GET | `/api/tasks/{id}/roles` | Get role matches (cached) |
| POST | `/api/tasks/{id}/rewrite` | Rewrite for selected role |
| POST | `/api/tasks/{id}/verify` | Recruiter verification |
| POST | `/api/tasks/{id}/recheck` | Re-check after user edits |

## Frontend Pipeline State
```
idle → uploading → analyzing → loading_roles → awaiting_role → rewriting → done
                                                                verifying → done
                                                                rechecking → done
```

## Key Design Decisions
- **Highlights are index-based**: `highlights[i]` = hint for `rewritten_bullets[i]`. Action `keep` with empty comment = no hint displayed.
- **Backend orchestration**: All LLM decomposition is internal to `llm.py`. API endpoints unchanged. Frontend unaware of parallel calls.
- **Prompt caching**: System prompts + schemas cached automatically. User messages use multi-block format with `cache_control` on stable parts (shared across parallel calls).
- **block_id**: Preserved through entire pipeline (parse → annotate → rewrite). Integer starting from 1.

## Running
```bash
# Backend
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend && npm run dev  # port 5173
```
