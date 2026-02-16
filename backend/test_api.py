"""Backend API tests — unit tests (mocked LLM) + integration tests (live LLM).

Run:
  pytest test_api.py -v             # unit tests only (fast, no API calls)
  pytest test_api.py -v -m live     # integration tests (real Claude API calls, slow)
  pytest test_api.py -v -m "not live"  # unit tests only
"""

import io
import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app
from storage import storage

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_RESUME = """Иван Петров
Product Manager

О себе:
Менеджер с опытом в IT. Работал с продуктами и проектами.

Опыт работы:

TechnoSoft — Менеджер проектов (2022–2024)
- Управлял проектами по разработке ПО
- Координировал команду из 8 человек

Банк "Прогресс" — Бизнес-аналитик (2020–2022)
- Анализировал бизнес-процессы
- Составлял ТЗ для разработки

Навыки: Jira, Confluence, SQL
"""

MOCK_DIAGNOSIS = {
    "resume_type": "Список обязанностей",
    "resume_type_description": "Опыт описан процессами без результатов",
    "main_problem": "Нет конкретных метрик и результатов",
    "red_flags": [
        {"flag": "Нет цифр", "detail": "Отсутствуют метрики", "severity": "critical"}
    ],
    "sections": [
        {
            "section_title": "TechnoSoft — Менеджер проектов",
            "period": "2022–2024",
            "full_text": "Управлял проектами.\nРабота с командой.",
            "annotations": [
                {
                    "original_text": "Управлял проектами",
                    "type": "major",
                    "comment": "Слишком размыто",
                    "suggestion": "Добавить количество проектов и результат",
                }
            ],
        }
    ],
}

MOCK_SCORE = {
    "total_score": 45,
    "dimensions": [
        {"name": "Метрики и результаты", "score": 3, "comment": "Нет цифр"},
        {"name": "Релевантность", "score": 6, "comment": "Опыт PM есть"},
        {"name": "Конкретика", "score": 4, "comment": "Общие слова"},
        {"name": "Структура", "score": 7, "comment": "Нормальная"},
        {"name": "Навыки", "score": 5, "comment": "Базовые"},
        {"name": "Позиционирование", "score": 4, "comment": "Размыто"},
        {"name": "ATS", "score": 6, "comment": "ОК"},
        {"name": "Визуальное", "score": 5, "comment": "Базовое"},
        {"name": "Уникальность", "score": 2, "comment": "Нет"},
        {"name": "Готовность", "score": 3, "comment": "Не готово"},
    ],
    "verdict": "Нужна серьёзная переработка",
    "grade": "Нужна переработка",
}

MOCK_ROLES = {
    "roles": [
        {
            "role": "Project Manager",
            "match_level": "высокое",
            "match_score": 85,
            "strengths": ["Опыт управления командой"],
            "gaps": ["Нет метрик"],
            "typical_duties": "Управление проектами, контроль сроков и бюджета",
            "matched_skills": ["Jira", "Confluence"],
            "missing_skills": ["MS Project", "Agile-сертификация"],
            "reports_to": "CTO",
            "works_with": "Разработчики, QA, дизайнеры",
        },
        {
            "role": "Product Manager",
            "match_level": "среднее",
            "match_score": 55,
            "strengths": ["Понимание бизнеса"],
            "gaps": ["Нет продуктовых метрик"],
            "typical_duties": "Управление продуктом, приоритизация бэклога",
            "matched_skills": ["SQL"],
            "missing_skills": ["Figma", "Amplitude", "A/B тесты"],
            "reports_to": "CPO",
            "works_with": "Аналитики, маркетинг, разработка",
        },
    ],
    "recommendation": {
        "primary_role": "Project Manager",
        "reasoning": "Больше всего опыта",
    },
}

MOCK_REWRITE = {
    "summary": "Project Manager с 2+ годами опыта",
    "original_summary": "Менеджер с опытом в IT",
    "experiences": [
        {
            "company": "TechnoSoft",
            "role": "Project Manager",
            "period": "2022–2024",
            "original_bullets": ["Управлял проектами"],
            "rewritten_bullets": ["Управлял портфелем из 5 проектов"],
            "highlights": [
                {
                    "text": "[уточнить: X] проектов",
                    "action": "add_metrics",
                    "comment": "Укажите реальное количество",
                }
            ],
            "technologies": ["Jira", "Confluence"],
            "responsibilities": ["Управление проектами", "Координация команды"],
        }
    ],
    "skills": {
        "key_competencies": ["Project Management", "Agile"],
        "tools": ["Jira", "Confluence"],
        "ats_keywords": ["project manager", "agile"],
    },
    "recommendations": ["Добавить метрики"],
}

MOCK_RECHECK = {
    "previous_issues_status": [
        {
            "original_comment": "Слишком размыто",
            "status": "исправлено",
            "quality": "хорошо",
            "note": "Добавлены метрики",
        }
    ],
    "new_issues": [],
    "updated_score": 68,
    "score_delta": 23,
    "verdict": "Значительное улучшение",
}


# ---------------------------------------------------------------------------
# Helper to create a task with mock data
# ---------------------------------------------------------------------------

def create_mock_task():
    """Create a task with all mock data pre-populated."""
    task_id = storage.create_task("test.txt", SAMPLE_RESUME)
    storage.update_task(
        task_id,
        parse_result=MOCK_DIAGNOSIS,
        scoring=MOCK_SCORE,
        annotations=MOCK_DIAGNOSIS["sections"],
        roles=MOCK_ROLES,
        selected_role="Project Manager",
        rewrite=MOCK_REWRITE,
    )
    return task_id


# ---------------------------------------------------------------------------
# Unit Tests (mocked LLM)
# ---------------------------------------------------------------------------


class TestAnalyzeEndpoint:
    """POST /api/analyze"""

    @patch("main.run_parse", new_callable=AsyncMock)
    def test_analyze_txt_success(self, mock_llm):
        mock_llm.return_value = MOCK_DIAGNOSIS
        resp = client.post(
            "/api/analyze",
            files={"file": ("resume.txt", SAMPLE_RESUME.encode(), "text/plain")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "taskId" in data
        assert data["parse"]["resume_type"] == "Список обязанностей"

    def test_analyze_unsupported_format(self):
        resp = client.post(
            "/api/analyze",
            files={"file": ("resume.jpg", b"fake image", "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "Unsupported file type" in resp.json()["detail"]

    def test_analyze_empty_file(self):
        resp = client.post(
            "/api/analyze",
            files={"file": ("resume.txt", b"", "text/plain")},
        )
        assert resp.status_code == 400

    @patch("main.run_parse", new_callable=AsyncMock)
    def test_analyze_returns_taskid(self, mock_llm):
        mock_llm.return_value = MOCK_DIAGNOSIS
        resp = client.post(
            "/api/analyze",
            files={"file": ("resume.txt", SAMPLE_RESUME.encode(), "text/plain")},
        )
        task_id = resp.json()["taskId"]
        assert len(task_id) == 36  # UUID format


class TestGetTaskEndpoint:
    """GET /api/tasks/{taskId}"""

    def test_get_existing_task(self):
        task_id = create_mock_task()
        resp = client.get(f"/api/tasks/{task_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["taskId"] == task_id
        assert data["parse"] is not None
        assert data["scoring"] is not None

    def test_get_nonexistent_task(self):
        resp = client.get("/api/tasks/nonexistent-id")
        assert resp.status_code == 404


class TestRolesEndpoint:
    """GET /api/tasks/{taskId}/roles"""

    @patch("main.run_roles", new_callable=AsyncMock)
    def test_roles_success(self, mock_llm):
        mock_llm.return_value = MOCK_ROLES
        task_id = storage.create_task("test.txt", SAMPLE_RESUME)
        storage.update_task(task_id, parse_result=MOCK_DIAGNOSIS, scoring=MOCK_SCORE)

        resp = client.get(f"/api/tasks/{task_id}/roles")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["roles"]) >= 2
        assert data["recommendation"]["primary_role"] == "Project Manager"

    def test_roles_cached(self):
        task_id = create_mock_task()
        resp = client.get(f"/api/tasks/{task_id}/roles")
        assert resp.status_code == 200
        assert resp.json()["roles"][0]["role"] == "Project Manager"

    def test_roles_nonexistent_task(self):
        resp = client.get("/api/tasks/nonexistent/roles")
        assert resp.status_code == 404

    def test_roles_no_diagnosis(self):
        task_id = storage.create_task("test.txt", SAMPLE_RESUME)
        resp = client.get(f"/api/tasks/{task_id}/roles")
        assert resp.status_code == 400


class TestRewriteEndpoint:
    """POST /api/tasks/{taskId}/rewrite"""

    @patch("main.run_rewrite", new_callable=AsyncMock)
    def test_rewrite_success(self, mock_llm):
        mock_llm.return_value = MOCK_REWRITE
        task_id = storage.create_task("test.txt", SAMPLE_RESUME)
        storage.update_task(
            task_id,
            parse_result=MOCK_DIAGNOSIS,
            scoring=MOCK_SCORE,
            annotations=MOCK_DIAGNOSIS["sections"],
            roles=MOCK_ROLES,
        )

        resp = client.post(
            f"/api/tasks/{task_id}/rewrite",
            json={"selectedRole": "Project Manager"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data
        assert "experiences" in data
        assert "skills" in data
        assert "recommendations" in data

    def test_rewrite_nonexistent_task(self):
        resp = client.post(
            "/api/tasks/nonexistent/rewrite",
            json={"selectedRole": "PM"},
        )
        assert resp.status_code == 404

    def test_rewrite_no_previous_steps(self):
        task_id = storage.create_task("test.txt", SAMPLE_RESUME)
        resp = client.post(
            f"/api/tasks/{task_id}/rewrite",
            json={"selectedRole": "PM"},
        )
        assert resp.status_code == 400


class TestRecheckEndpoint:
    """POST /api/tasks/{taskId}/recheck"""

    @patch("main.run_recheck", new_callable=AsyncMock)
    def test_recheck_success(self, mock_llm):
        mock_llm.return_value = MOCK_RECHECK
        task_id = create_mock_task()
        resp = client.post(
            f"/api/tasks/{task_id}/recheck",
            json={"updatedResume": "Updated resume text with metrics..."},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["updated_score"] == 68
        assert data["score_delta"] == 23

    def test_recheck_no_diagnosis(self):
        task_id = storage.create_task("test.txt", SAMPLE_RESUME)
        resp = client.post(
            f"/api/tasks/{task_id}/recheck",
            json={"updatedResume": "text"},
        )
        assert resp.status_code == 400


class TestResponseSchemas:
    """Verify response shapes match frontend TypeScript types."""

    def test_diagnosis_shape(self):
        task_id = create_mock_task()
        resp = client.get(f"/api/tasks/{task_id}")
        d = resp.json()["parse"]
        assert "resume_type" in d
        assert "resume_type_description" in d
        assert "main_problem" in d
        assert "red_flags" in d
        assert "sections" in d
        for section in d["sections"]:
            assert "section_title" in section
            assert "period" in section
            assert "annotations" in section
            for ann in section["annotations"]:
                assert "original_text" in ann
                assert "type" in ann
                assert "comment" in ann
                assert "suggestion" in ann

    def test_score_shape(self):
        task_id = create_mock_task()
        resp = client.get(f"/api/tasks/{task_id}")
        s = resp.json()["scoring"]
        assert "total_score" in s
        assert "dimensions" in s
        assert "verdict" in s
        assert "grade" in s
        for dim in s["dimensions"]:
            assert "name" in dim
            assert "score" in dim
            assert "comment" in dim

    def test_roles_shape(self):
        task_id = create_mock_task()
        resp = client.get(f"/api/tasks/{task_id}/roles")
        r = resp.json()
        assert "roles" in r
        assert "recommendation" in r
        for role in r["roles"]:
            assert "role" in role
            assert "match_level" in role
            assert "strengths" in role
            assert "gaps" in role
            assert "match_score" in role
            assert "typical_duties" in role
            assert "matched_skills" in role
            assert "missing_skills" in role
            assert "reports_to" in role
            assert "works_with" in role
        assert "primary_role" in r["recommendation"]
        assert "reasoning" in r["recommendation"]

    @patch("main.run_rewrite", new_callable=AsyncMock)
    def test_rewrite_shape(self, mock_llm):
        mock_llm.return_value = MOCK_REWRITE
        task_id = create_mock_task()
        storage.update_task(task_id, rewrite=None, annotations=MOCK_DIAGNOSIS["sections"])
        resp = client.post(
            f"/api/tasks/{task_id}/rewrite",
            json={"selectedRole": "PM"},
        )
        rw = resp.json()
        assert "summary" in rw
        assert "original_summary" in rw
        assert "experiences" in rw
        assert "skills" in rw
        assert "recommendations" in rw
        for exp in rw["experiences"]:
            assert "company" in exp
            assert "role" in exp
            assert "period" in exp
            assert "original_bullets" in exp
            assert "rewritten_bullets" in exp
            assert "highlights" in exp
            assert "responsibilities" in exp

    @patch("main.run_recheck", new_callable=AsyncMock)
    def test_recheck_shape(self, mock_llm):
        mock_llm.return_value = MOCK_RECHECK
        task_id = create_mock_task()
        resp = client.post(
            f"/api/tasks/{task_id}/recheck",
            json={"updatedResume": "text"},
        )
        rc = resp.json()
        assert "previous_issues_status" in rc
        assert "new_issues" in rc
        assert "updated_score" in rc
        assert "score_delta" in rc
        assert "verdict" in rc


class TestEdgeCases:
    """Edge cases and error handling."""

    def test_missing_file_field(self):
        resp = client.post("/api/analyze")
        assert resp.status_code == 422  # FastAPI validation error

    def test_large_file_rejected(self):
        large_content = b"x" * (10 * 1024 * 1024 + 1)  # 10MB + 1 byte
        resp = client.post(
            "/api/analyze",
            files={"file": ("resume.txt", large_content, "text/plain")},
        )
        assert resp.status_code == 413

    @patch("main.run_parse", new_callable=AsyncMock)
    def test_llm_error_returns_500(self, mock_llm):
        mock_llm.side_effect = Exception("API rate limit exceeded")
        resp = client.post(
            "/api/analyze",
            files={"file": ("resume.txt", SAMPLE_RESUME.encode(), "text/plain")},
        )
        assert resp.status_code == 500

    def test_roles_caching(self):
        """Once roles are computed, GET returns cached result."""
        task_id = create_mock_task()
        r1 = client.get(f"/api/tasks/{task_id}/roles").json()
        r2 = client.get(f"/api/tasks/{task_id}/roles").json()
        assert r1 == r2

    def test_multiple_rechecks(self):
        """Multiple rechecks should append to list."""
        task_id = create_mock_task()
        task = storage.get_task(task_id)
        task["rechecks"] = [MOCK_RECHECK]
        with patch("main.run_recheck", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = {**MOCK_RECHECK, "updated_score": 75}
            resp = client.post(
                f"/api/tasks/{task_id}/recheck",
                json={"updatedResume": "better text"},
            )
            assert resp.status_code == 200
            assert len(storage.get_task(task_id)["rechecks"]) == 2


# ---------------------------------------------------------------------------
# Integration tests (real Claude API calls)
# ---------------------------------------------------------------------------


@pytest.mark.live
class TestLiveAPI:
    """Integration tests using real Claude API. Run with: pytest -m live"""

    def test_full_pipeline(self):
        """End-to-end pipeline test with real LLM calls."""
        # Step 1: Analyze
        resp = client.post(
            "/api/analyze",
            files={"file": ("resume.txt", SAMPLE_RESUME.encode(), "text/plain")},
        )
        assert resp.status_code == 200
        data = resp.json()
        task_id = data["taskId"]

        # Verify parse structure
        d = data["parse"]
        assert d["resume_type"] in [
            "Список обязанностей",
            "Каша из ролей",
            "Джун после курсов",
            "Переходящий",
            "Нормальный",
        ]
        assert len(d["sections"]) > 0

        # Verify key_skills extracted
        assert "key_skills" in d
        assert len(d["key_skills"]["hard_skills"]) > 0

        # Step 2: Get roles
        resp = client.get(f"/api/tasks/{task_id}/roles")
        assert resp.status_code == 200
        roles = resp.json()
        assert len(roles["roles"]) >= 2
        for r in roles["roles"]:
            assert "match_score" in r
            assert isinstance(r["match_score"], int)
            assert "matched_skills" in r
            assert "missing_skills" in r
            assert "reports_to" in r
            assert "works_with" in r
        role_name = roles["recommendation"]["primary_role"]

        # Step 3: Rewrite
        resp = client.post(
            f"/api/tasks/{task_id}/rewrite",
            json={"selectedRole": role_name},
        )
        assert resp.status_code == 200
        rw = resp.json()
        assert len(rw["summary"]) > 10
        assert len(rw["experiences"]) > 0

        # Step 4: Recheck
        resp = client.post(
            f"/api/tasks/{task_id}/recheck",
            json={"updatedResume": "Improved resume with metrics..."},
        )
        assert resp.status_code == 200
        rc = resp.json()
        assert isinstance(rc["updated_score"], int)
