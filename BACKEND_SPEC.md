# Resume Screener — ТЗ на бэкенд

## Обзор системы

Сервис анализирует резюме, находит проблемы, оценивает качество, подбирает подходящие роли, переупаковывает под выбранную роль и проверяет результат глазами рекрутера. Всё на базе LLM.

**Стек фронта:** React + TypeScript + Vite, работает на моках.
**Задача бэкенда:** заменить моки реальными LLM-вызовами, хранить сессии, отдавать данные по контракту.

---

## API-контракт

| # | Метод | Endpoint | Вход | Выход | Описание |
|---|-------|----------|------|-------|----------|
| 1 | POST | `/api/analyze` | `multipart/form-data` — поле `file` (PDF/DOCX/TXT, до 10MB) | `AnalyzeResponse` | Загрузка резюме → парсинг → диагностика + скоринг. Создаёт задачу (taskId) |
| 2 | GET | `/api/tasks/{taskId}/roles` | — | `RolesResult` | Подбор подходящих ролей на основе резюме |
| 3 | POST | `/api/tasks/{taskId}/rewrite` | `{ selectedRole: string }` | `RewriteResult` | Переупаковка резюме под выбранную роль |
| 4 | POST | `/api/tasks/{taskId}/verify` | — | `VerificationResult` | Проверка резюме глазами рекрутера |
| 5 | POST | `/api/tasks/{taskId}/recheck` | `{ updatedResume: string }` | `RecheckResult` | Повторная проверка после ручных правок пользователя |

---

## Пользовательские истории

### Ядро (MVP)

| # | История | Приоритет | Endpoint | LLM | Описание |
|---|---------|-----------|----------|-----|----------|
| US-1 | Загрузка и парсинг резюме | P0 | `POST /analyze` | нет | Пользователь загружает PDF/DOCX/TXT. Бэкенд парсит текст, создаёт задачу, сохраняет в БД |
| US-2 | Диагностика резюме | P0 | `POST /analyze` | да | Система определяет тип резюме, находит red flags, размечает проблемные фрагменты (annotations) с рекомендациями |
| US-3 | Скоринг резюме | P0 | `POST /analyze` | да | Система оценивает резюме по 6 измерениям (метрики, релевантность, структура, язык, навыки, общее впечатление), выдаёт балл 0–100 и грейд |
| US-4 | Подбор ролей | P0 | `GET /roles` | да | На основе диагноза система предлагает 3–4 роли с оценкой совпадения, сильными сторонами, пробелами и рекомендацией лучшей роли |
| US-5 | Переупаковка резюме | P0 | `POST /rewrite` | да | Генерация нового summary, переписанных буллетов с метриками, хинтов для [уточнить], блока навыков и рекомендаций |
| US-6 | Верификация рекрутером | P1 | `POST /verify` | да | AI-рекрутер оценивает переупакованное резюме: сильные стороны, решение о приглашении, блокеры, оставшиеся риски |
| US-7 | Recheck после правок | P1 | `POST /recheck` | да | Пользователь правит текст, отправляет на повторную проверку. Система сравнивает с предыдущими замечаниями, выставляет новый балл |

### Инфраструктура

| # | История | Приоритет | Описание |
|---|---------|-----------|----------|
| US-8 | Хранение сессий | P0 | Каждая задача (taskId) хранит: исходный текст, диагноз, скор, роли, rewrite, verification, rechecks. Время жизни — 24ч |
| US-9 | Парсинг файлов | P0 | Поддержка PDF (pdfplumber/PyMuPDF), DOCX (python-docx), TXT. Извлечение чистого текста |
| US-10 | Rate limiting | P1 | Ограничение: 10 задач/час на IP, чтобы не сжечь API-бюджет |
| US-11 | Стриминг ответов | P2 | SSE/WebSocket для длинных LLM-вызовов (rewrite, verify). Фронт показывает прогресс |
| US-12 | Кэширование ролей | P2 | Роли для одного taskId не меняются — кэшировать после первого вызова |

### Будущее (после MVP)

| # | История | Приоритет | Описание |
|---|---------|-----------|----------|
| US-13 | Экспорт в DOCX | P2 | Генерация .docx с форматированием из отредактированного резюме |
| US-14 | Серверное сохранение версий | P2 | `POST /tasks/{taskId}/versions` — сохранение snapshot'а (summary + bullets + score) |
| US-15 | Аутентификация | P3 | Регистрация/логин, привязка задач к юзеру, история анализов |
| US-16 | Пакетный анализ | P3 | Загрузка нескольких резюме, сравнение между собой |

---

## Модели данных

### Task (сессия)

```
Task {
  id: string (uuid)
  created_at: timestamp
  file_name: string
  raw_text: string          // распарсенный текст резюме
  diagnosis: json | null    // DiagnosisResult
  score: json | null        // ScoreResult
  roles: json | null        // RolesResult
  selected_role: string | null
  rewrite: json | null      // RewriteResult
  verification: json | null // VerificationResult
  rechecks: json[]          // RecheckResult[]
}
```

### DiagnosisResult

```
{
  resume_type: "Список обязанностей" | "Каша из ролей" | "Джун после курсов" | "Переходящий" | "Нормальный"
  resume_type_description: string
  main_problem: string
  red_flags: [{ flag, detail, severity: "critical"|"major"|"minor" }]
  sections: [{
    section_title: string
    period: string
    annotations: [{
      original_text: string     // точная цитата из резюме
      type: "critical"|"major"|"minor"
      comment: string
      suggestion: string
    }]
  }]
}
```

### ScoreResult

```
{
  total_score: number (0-100)
  dimensions: [{ name, score: number (1-10), comment }]
  verdict: string
  grade: "Отличное"|"Хорошее"|"Нужна полировка"|"Нужна переработка"|"Полная переделка"
}
```

### RolesResult

```
{
  roles: [{
    role: string
    match_level: "высокое"|"среднее"|"с натяжкой"
    strengths: string[]
    gaps: string[]
    typical_duties: string[]
    typical_stack: string[]
    team_position: string
  }]
  recommendation: { primary_role, reasoning }
}
```

### RewriteResult

```
{
  summary: string               // переписанный "О себе"
  original_summary: string      // оригинальный
  experiences: [{
    company, role, period: string
    original_bullets: string[]
    rewritten_bullets: string[]  // с метриками и [уточнить: X]
    highlights: [{ text, action: "add_metrics"|"rephrase"|"remove"|"clarify"|"keep", comment }]
    technologies: string[]
    responsibilities: string[]
  }]
  skills: {
    key_competencies: string[]
    tools: string[]
    ats_keywords: string[]
  }
  recommendations: string[]
}
```

### VerificationResult

```
{
  top_strengths: string[]
  invite_to_interview: "да"|"нет"|"с оговорками"
  blockers: string[]
  main_improvement: string
  remaining_risks: string[]
}
```

### RecheckResult

```
{
  previous_issues_status: [{
    original_comment: string
    status: "исправлено"|"частично"|"не исправлено"
    quality: "отлично"|"хорошо"|"формально"|"не применимо"
    note: string
  }]
  new_issues: [{ text, type: "critical"|"major"|"minor", comment }]
  updated_score: number (0-100)
  score_delta: number
  verdict: string
}
```

---

## Поток вызовов

```
Пользователь загружает файл
        │
        ▼
[1] POST /api/analyze  (file)
    ├─ Парсинг файла → raw_text
    ├─ LLM: диагностика (тип, red_flags, annotations)
    ├─ LLM: скоринг (dimensions, total_score, grade)
    └─ return { taskId, diagnosis, score }
        │
        ▼
[2] GET /api/tasks/{id}/roles
    ├─ LLM: подбор ролей на основе raw_text + diagnosis
    └─ return { roles[], recommendation }
        │
        ▼
    Пользователь выбирает роль
        │
        ▼
[3] POST /api/tasks/{id}/rewrite  { selectedRole }
    ├─ LLM: переупаковка (summary, bullets, skills, recommendations)
    └─ return RewriteResult
        │
        ├──────────────────────────┐
        ▼                          ▼
[4] POST /verify              Пользователь правит текст
    ├─ LLM: оценка рекрутером      │
    └─ return VerificationResult    ▼
                              [5] POST /recheck { updatedResume }
                                  ├─ LLM: сравнение с предыдущими замечаниями
                                  └─ return RecheckResult
```

---

## LLM-промпты (структура)

Каждый LLM-вызов — отдельный промпт с JSON-схемой ответа.

| Вызов | Контекст на вход | Формат ответа |
|-------|-----------------|---------------|
| Диагностика | raw_text резюме | DiagnosisResult JSON |
| Скоринг | raw_text + diagnosis (для контекста) | ScoreResult JSON |
| Подбор ролей | raw_text + diagnosis + score | RolesResult JSON |
| Переупаковка | raw_text + diagnosis + selectedRole | RewriteResult JSON |
| Верификация | rewrite (переупакованный текст) + selectedRole | VerificationResult JSON |
| Recheck | updatedResume + предыдущий verification.blockers | RecheckResult JSON |

---

## Технические требования

- **Формат ответов:** JSON, совпадающий с TypeScript-типами фронта
- **Коды ошибок:** 400 (bad file), 404 (task not found), 413 (file too large), 429 (rate limit), 500 (LLM error)
- **Таймауты:** LLM-вызовы до 60 сек, общий таймаут запроса 90 сек
- **Хранение:** Redis/SQLite для MVP, PostgreSQL для прода
- **Файлы:** Принимать multipart/form-data, валидировать MIME-тип и размер (10MB max)
- **CORS:** Разрешить localhost:5173 для dev
