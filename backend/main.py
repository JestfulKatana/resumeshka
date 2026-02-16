"""Resume Screener — FastAPI backend."""

import hashlib

from fastapi import Depends, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import get_current_user, verify_telegram_auth
from llm import run_annotate, run_parse, run_recheck, run_rewrite, run_roles, run_scoring
from parsers import parse_file
from storage import storage

app = FastAPI(title="Resume Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class RewriteRequest(BaseModel):
    selectedRole: str


class RecheckRequest(BaseModel):
    updatedResume: str


class TextAnalyzeRequest(BaseModel):
    text: str


class TelegramAuthRequest(BaseModel):
    id: int
    first_name: str
    username: str = ""
    photo_url: str = ""
    auth_date: int
    hash: str


# ---------------------------------------------------------------------------
# Helper: reconstruct merged analysis from progressive pieces
# ---------------------------------------------------------------------------

def _build_analysis(task: dict) -> dict | None:
    """Reconstruct full AnalysisResult from parse_result + scoring + annotations."""
    if not task["parse_result"]:
        return None
    result = {**task["parse_result"]}
    if task["scoring"]:
        result.update(task["scoring"])
    if task["annotations"]:
        result["sections"] = task["annotations"]
    return result


# ---------------------------------------------------------------------------
# POST /api/analyze — upload file + parse (progressive step 1)
# ---------------------------------------------------------------------------

@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...), user=Depends(get_current_user)):
    # Validate file extension
    filename = file.filename or "unknown.txt"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large. Maximum size is 10 MB.")

    # Check hash cache
    content_hash = hashlib.sha256(content).hexdigest()
    cached = storage.find_by_hash(content_hash)
    if cached and cached["parse_result"]:
        return {
            "taskId": cached["id"],
            "parse": cached["parse_result"],
            "cached": True,
        }

    # Parse text
    try:
        raw_text = parse_file(content, filename)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")

    if not raw_text.strip():
        raise HTTPException(400, "File is empty or could not extract text.")

    # Create task with hash
    user_id = user["tg_id"] if user else None
    task_id = storage.create_task(filename, raw_text, content_hash=content_hash, user_id=user_id)

    # Run parse only (sections + type + red_flags + main_problem)
    try:
        parse_result = await run_parse(raw_text)
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")

    storage.update_task(task_id, parse_result=parse_result)

    return {
        "taskId": task_id,
        "parse": parse_result,
    }


# ---------------------------------------------------------------------------
# POST /api/analyze-text — paste text + parse (progressive step 1)
# ---------------------------------------------------------------------------

@app.post("/api/analyze-text")
async def analyze_text(body: TextAnalyzeRequest, user=Depends(get_current_user)):
    raw_text = body.text.strip()
    if not raw_text:
        raise HTTPException(400, "Text is empty.")

    # Check hash cache
    content_hash = hashlib.sha256(raw_text.encode()).hexdigest()
    cached = storage.find_by_hash(content_hash)
    if cached and cached["parse_result"]:
        return {
            "taskId": cached["id"],
            "parse": cached["parse_result"],
            "cached": True,
        }

    user_id = user["tg_id"] if user else None
    task_id = storage.create_task("pasted_text.txt", raw_text, content_hash=content_hash, user_id=user_id)

    # Return taskId immediately — parse will happen via /tasks/{id}/parse
    return {
        "taskId": task_id,
    }


# ---------------------------------------------------------------------------
# POST /api/tasks/{taskId}/parse — run parse (for text-based tasks)
# ---------------------------------------------------------------------------

@app.post("/api/tasks/{task_id}/parse")
async def parse(task_id: str):
    task = storage.get_task(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")

    # Return cached if available
    if task["parse_result"] is not None:
        return task["parse_result"]

    if task["raw_text"] is None:
        raise HTTPException(400, "No resume text available")

    try:
        parse_result = await run_parse(task["raw_text"])
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")

    storage.update_task(task_id, parse_result=parse_result)
    return parse_result


# ---------------------------------------------------------------------------
# GET /api/tasks/{taskId} — get task results (for page refresh)
# ---------------------------------------------------------------------------

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    task = storage.get_task(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")

    return {
        "taskId": task["id"],
        "parse": task["parse_result"],
        "scoring": task["scoring"],
        "annotations": task["annotations"],
        "roles": task["roles"],
    }


# ---------------------------------------------------------------------------
# POST /api/tasks/{taskId}/score — scoring (progressive step 2)
# ---------------------------------------------------------------------------

@app.post("/api/tasks/{task_id}/score")
async def score(task_id: str):
    task = storage.get_task(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")

    # Return cached if available
    if task["scoring"] is not None:
        return task["scoring"]

    if task["raw_text"] is None:
        raise HTTPException(400, "No resume text available")

    try:
        scoring = await run_scoring(task["raw_text"])
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")

    storage.update_task(task_id, scoring=scoring)
    return scoring


# ---------------------------------------------------------------------------
# POST /api/tasks/{taskId}/annotate — annotations (progressive step 3)
# ---------------------------------------------------------------------------

@app.post("/api/tasks/{task_id}/annotate")
async def annotate(task_id: str):
    task = storage.get_task(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")

    # Return cached if available
    if task["annotations"] is not None:
        return {"sections": task["annotations"]}

    if task["parse_result"] is None:
        raise HTTPException(400, "Parse not completed yet")

    try:
        sections = task["parse_result"]["sections"]
        annotated_sections = await run_annotate(sections, task["raw_text"])
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")

    storage.update_task(task_id, annotations=annotated_sections)
    return {"sections": annotated_sections}


# ---------------------------------------------------------------------------
# GET /api/tasks/{taskId}/roles — role matching
# ---------------------------------------------------------------------------

@app.get("/api/tasks/{task_id}/roles")
async def get_roles(task_id: str):
    task = storage.get_task(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")

    # Return cached if available
    if task["roles"] is not None:
        return task["roles"]

    if task["parse_result"] is None:
        raise HTTPException(400, "Parse not completed yet")

    # Build analysis context for roles (needs parse fields, scoring optional)
    analysis_for_roles = {
        "resume_type": task["parse_result"]["resume_type"],
        "main_problem": task["parse_result"]["main_problem"],
        "red_flags": task["parse_result"]["red_flags"],
        "sections": task["annotations"] or task["parse_result"]["sections"],
    }
    if task["scoring"]:
        analysis_for_roles.update(task["scoring"])

    try:
        roles = await run_roles(
            task["raw_text"],
            analysis_for_roles,
            key_skills=task["parse_result"].get("key_skills"),
        )
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")

    storage.update_task(task_id, roles=roles)
    return roles


# ---------------------------------------------------------------------------
# POST /api/tasks/{taskId}/rewrite — repackage resume for selected role
# ---------------------------------------------------------------------------

@app.post("/api/tasks/{task_id}/rewrite")
async def rewrite(task_id: str, body: RewriteRequest):
    task = storage.get_task(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")

    analysis = _build_analysis(task)
    if analysis is None or task["roles"] is None:
        raise HTTPException(400, "Previous steps not completed")
    if task["annotations"] is None:
        raise HTTPException(400, "Annotations not completed yet")

    try:
        result = await run_rewrite(
            task["raw_text"],
            analysis,
            task["roles"],
            body.selectedRole,
        )
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")

    storage.update_task(task_id, selected_role=body.selectedRole, rewrite=result)
    return result


# ---------------------------------------------------------------------------
# POST /api/tasks/{taskId}/recheck — re-check after user edits
# ---------------------------------------------------------------------------

@app.post("/api/tasks/{task_id}/recheck")
async def recheck(task_id: str, body: RecheckRequest):
    task = storage.get_task(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")

    analysis = _build_analysis(task)
    if analysis is None:
        raise HTTPException(400, "Analysis not completed")

    previous_score = 0
    if task["scoring"]:
        previous_score = task["scoring"].get("total_score", 0)
    # Use last recheck score if available
    if task["rechecks"]:
        previous_score = task["rechecks"][-1].get("updated_score", previous_score)

    try:
        result = await run_recheck(
            body.updatedResume,
            analysis,
            previous_score,
        )
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")

    task["rechecks"].append(result)
    return result


# ---------------------------------------------------------------------------
# POST /api/auth/telegram — login via Telegram Login Widget
# ---------------------------------------------------------------------------

@app.post("/api/auth/telegram")
async def auth_telegram(body: TelegramAuthRequest, response: Response):
    data = {
        "id": str(body.id),
        "first_name": body.first_name,
        "username": body.username,
        "photo_url": body.photo_url,
        "auth_date": str(body.auth_date),
        "hash": body.hash,
    }
    if not verify_telegram_auth(data):
        raise HTTPException(401, "Invalid Telegram auth")

    user = storage.upsert_user(
        tg_id=body.id,
        username=body.username,
        first_name=body.first_name,
        photo_url=body.photo_url or None,
    )
    token = storage.create_session(body.id)
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )
    return {"ok": True, "user": user}


# ---------------------------------------------------------------------------
# GET /api/auth/me — current user (or null)
# ---------------------------------------------------------------------------

@app.get("/api/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return {"user": user}


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------

@app.post("/api/auth/logout")
async def auth_logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}


# ---------------------------------------------------------------------------
# GET /api/history — user's task history (authenticated only)
# ---------------------------------------------------------------------------

@app.get("/api/history")
async def get_history(user=Depends(get_current_user)):
    if user is None:
        return {"tasks": []}

    tasks = storage.get_user_tasks(user["tg_id"])
    return {
        "tasks": [
            {
                "taskId": t["id"],
                "fileName": t["file_name"],
                "createdAt": t["created_at"],
                "hasResults": t["parse_result"] is not None,
            }
            for t in tasks
        ]
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
