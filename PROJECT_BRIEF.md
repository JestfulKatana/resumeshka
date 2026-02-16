# РЕЗЮМЭН — Полное описание проекта

## Что это

AI-скринер резюме. Пользователь загружает резюме (PDF/DOCX/текст), получает детальный анализ, подбор подходящих ролей и переупакованное резюме под конкретную роль. Полный цикл занимает ~30-60 секунд.

Название: **РЕЗЮМЭН** (от "резюме" + "-мэн"). Слоган: «Покажи мне своё резюме — и я скажу, кто ты».

---

## Стек

- **Backend**: Python FastAPI, Claude Haiku 4.5 через Anthropic SDK
- **Frontend**: React + TypeScript + Vite
- **LLM**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **Хранение**: in-memory (dict с TTL 24ч), localStorage на фронте
- **Дизайн**: необрутализм (bold borders, offset shadows, жёлтый акцент в светлой теме, фиолетовый в тёмной)

---

## Пайплайн (5 шагов)

### Шаг 0: Анализ (`/api/analyze` → `/api/tasks/{id}/score` → `/api/tasks/{id}/annotate`)

Три фазы, оркестрированные фронтом:

**Фаза 1 — Parse** (1 вызов LLM):
- Классифицирует тип резюме (5 категорий: "Список обязанностей", "Каша из ролей", "Джун после курсов", "Переходящий", "Нормальный")
- Разбивает на секции (block_id, title, period, full_text)
- Находит red flags, извлекает навыки (hard/soft/domain)
- Определяет пол для грамматического согласования

**Фаза 2 — Scoring + Annotating** (параллельно):
- **Scoring** (1 вызов): 10 параметров 0-10 (метрики, релевантность, специфичность, структура, навыки, позиционирование, ATS, визуал, уникальность, готовность к отправке). Итоговый балл 0-100, грейд, вердикт.
- **Annotating** (N вызовов, по секции): Для каждой секции — список аннотаций (original_text, severity: critical/major/minor, comment, suggestion). Первый вызов последовательный (прогрев кеша), остальные параллельно.

**Результат**: Пользователь видит прогрессивно — сначала секции, потом оценку, потом аннотации появляются в тексте.

### Шаг 1: Подбор ролей (`GET /api/tasks/{id}/roles`)

1 вызов LLM. На входе: текст резюме + результат анализа. На выходе: 2-3 роли с:
- match_level (высокое/среднее/с натяжкой), match_score (0-100)
- strengths, gaps (подходящие/недостающие навыки)
- typical_duties, matched_skills, missing_skills
- organizational position (reports_to, works_with)
- recommendation (primary_role + reasoning)

### Шаг 2: Переупаковка (`POST /api/tasks/{id}/rewrite`)

Декомпозирован на параллельные вызовы:

**Фаза 1 — Rewrite blocks** (N вызовов параллельно):
- На каждый experience block: переписанные буллеты (5-8 штук), index-based highlights (action: add_metrics/rephrase/remove/clarify/keep + comment), technologies, responsibilities.
- Правила: правильный род, каждый буллет = ответственность + результат/метрика, ATS-ключевики, `[уточнить: ...]` для отсутствующих цифр.
- `_sanitize_block()` — safety net на бэке: фиксит строки вместо массивов, выравнивает длину highlights к bullets.

**Фаза 2 — Rewrite meta** (1 вызов, после всех блоков):
- Summary (оригинальное + переписанное "О себе")
- Skills (key_competencies, tools, ats_keywords)
- Recommendations (3-5 советов)

### Шаг 3: Verify (НЕ РЕАЛИЗОВАН)

Описан в промптах (`VERIFY_SYSTEM`, `VERIFY_SCHEMA`), но функция `run_verify` отсутствует в `llm.py`, эндпоинта нет в `main.py`. Задумка: рекрутерская оценка переписанного резюме — 3 сильные стороны, решение о приглашении, блокеры, основное улучшение, оставшиеся риски.

### Шаг 4: Перепроверка (`POST /api/tasks/{id}/recheck`)

1 вызов LLM. Сравнивает отредактированное пользователем резюме с предыдущими аннотациями. На выходе:
- previous_issues_status[] — для каждой аннотации: fixed/partially/not_fixed + quality rating
- new_issues[] — новые найденные проблемы
- updated_score, score_delta, verdict

---

## Текущий UX (фронтенд)

### Главная страница
- Два режима ввода: загрузка файла или вставка текста (toggle)
- AI disclaimer (предупреждение о чувствительных данных)
- История прошлых анализов (localStorage)

### Страница анализа
- **Таб-бар** с 4 вкладками: Анализ → Роли → Переупаковка → Перепроверка (появляются по мере прохождения шагов)
- **Hero block**: тип резюме, итоговый балл (кружок с цветом), грейд, счётчик аннотаций по severity
- **Анализ**: секции резюме с inline-аннотациями (подчёркивание по severity, tooltip при клике с комментарием и рекомендацией). Бары по параметрам с анимацией. Вердикт. Ключевые навыки.
- **Роли**: таблица-грид с gauge ring, навыками (matched/missing), описанием позиции. Выбор роли запускает переупаковку.
- **Переупаковка**:
  - Бейдж выбранной роли + кнопка "сменить роль"
  - Summary editor (до/после)
  - Experience blocks — collapsible карточки с двумя колонками: слева буллеты, справа хинты (подсказки от AI что изменено и почему)
  - Skills block (компетенции, инструменты, ATS-ключевики)
  - Recommendations list
  - Copy all / Export
- **Перепроверка**: ScoreDelta (было/стало), статус предыдущих проблем (fixed/partial/not_fixed), новые проблемы

### Прогрессивная загрузка
- Каждый шаг показывается отдельно по мере готовности
- StepProgress — анимированный персонаж "P" с speech bubble и сменяющимися сообщениями
- Автосохранение в localStorage

### Тема
- Светлая: белый фон, чёрные бордеры/тени, жёлтый (#FFD60A) акцент
- Тёмная: почти чёрный (#101010), серые бордеры (#333), фиолетовый (#8B5CF6) акцент
- Toggle в хедере с анимацией

---

## Технические решения

### Prompt caching
Все вызовы через `call_claude()` с `cache_control: {"type": "ephemeral"}` на system prompt и schema. Для параллельных вызовов (annotate, rewrite): первый вызов последовательный (прогрев кеша), остальные параллельно — экономия на cache reads ($0.08/M vs $0.80/M input).

### Structured output
Все ответы через `tool_use` pattern с forced `tool_choice`. Схемы в `prompts.py` зеркалят TypeScript типы на фронте.

### Стоимость одного прогона
~8-12 вызовов Claude Haiku 4.5 на полный цикл (parse + scoring + N annotate + roles + N rewrite_block + rewrite_meta). Примерно $0.02-0.05 за прогон.

### Rate limiting
TokenBucket на 50 RPM. Не shared между воркерами.

### Rewrite caching (фронт)
`rewriteCache[role]` — при смене роли и возврате, кешированный результат показывается мгновенно.

### Дедупликация
SHA-256 хеш файла. Повторная загрузка того же файла возвращает кешированный taskId.

---

## Слабые стороны и проблемы

### Критичные
1. **ExperienceEditor — только просмотр, не редактирование.** Несмотря на название "Editor", пользователь НЕ МОЖЕТ редактировать буллеты inline. Это главная проблема UX: человек видит подсказки, но чтобы применить изменения, должен копировать текст куда-то ещё. Нет цикла "увидел подсказку → исправил → перепроверил".
2. **Highlights/хинты мало показываются.** LLM часто возвращает action: "keep" для большинства буллетов. Фронтенд фильтрует `action !== 'keep'`, поэтому для многих блоков хинты пустые. Бэкенд `_pad_highlights()` добавляет ещё больше "keep" записей.
3. **Verify шаг не реализован.** Промпты написаны, но функция и эндпоинт отсутствуют. Задумка ценная (рекрутерская оценка переписанного), но не доделана.
4. **RESTORE_VERSION — no-op.** Версии сохраняются, но восстановление не работает. Код: `return state`.

### Архитектурные
5. **In-memory storage.** Все данные теряются при рестарте бэкенда. Нет persistence.
6. **Нет retry/backoff** на LLM вызовы. Один сбой = ошибка пользователю.
7. **Нет отмены** in-flight запросов при уходе со страницы (нет AbortController).
8. **Нет авторизации на уровне задач.** Любой с UUID может получить чужие данные.
9. **API ключ захардкожен как default value** в `llm.py`.

### UX
10. **Нет inline-редактирования буллетов.** Главный блокер для реального использования. Пользователь не может: (а) отредактировать буллет прямо в интерфейсе, (б) заменить `[уточнить: ...]` плейсхолдеры на свои данные, (в) перетаскивать/удалять буллеты.
11. **Нет diff-view.** Невозможно увидеть "было/стало" для буллетов. Summary editor показывает оригинал и переписанное рядом, но experience blocks — нет.
12. **Нет выбора/кастомизации роли.** Только 2-3 предложенных. Нельзя ввести свою роль или отредактировать существующую.
13. **Нет экспорта в PDF/DOCX.** Кнопки Export есть, но реальной генерации файлов нет — только copy-to-clipboard.
14. **Recheck принимает весь текст целиком,** а не отдельные изменения. Нет tracking'а что именно пользователь поменял.
15. **Нет мобильной адаптации.** Двухколоночный layout в experience editor ломается на узких экранах.

### Промпты
16. **Scoring dimensions не фиксированы enum'ом** — LLM может называть параметры по-разному каждый раз.
17. **`original_text` в аннотациях** полагается на точное совпадение подстроки. Хрупко — LLM может слегка изменить текст, и аннотация не привяжется.
18. **Нет контроля длины ответа** для rewrite_block — иногда LLM генерит 20+ буллетов вместо 5-8.

---

## Структура файлов

```
backend/
  main.py          — FastAPI endpoints (13 маршрутов)
  llm.py           — LLM pipeline (call_claude, run_*, rate limiter, cost tracking)
  prompts.py       — System prompts + JSON schemas (8 шагов)
  parsers.py       — PDF/DOCX/TXT парсинг
  storage.py       — In-memory dict с TTL 24ч
  logs/llm.log     — Логи LLM вызовов с таймингом и стоимостью

frontend/src/
  pages/
    HomePage.tsx         — Загрузка + история
    AnalysisPage.tsx     — Оркестратор пайплайна (~400 строк)
    NotFoundPage.tsx     — 404
  hooks/
    usePipeline.ts       — State machine (useReducer, 18 actions, 13 steps)
    useAutoSave.ts       — Автосохранение в localStorage
    useTheme.ts          — Тема (light/dark)
  api/
    client.ts            — HTTP client к бэкенду
  types/
    analysis.ts          — AnalysisResult, Section, Annotation, Severity
    rewrite.ts           — RewriteResult, Experience, Highlight, HighlightAction
    roles.ts             — RolesResult, Role
    recheck.ts           — RecheckResult
    pipeline.ts          — PipelineState (13 fields), PipelineAction (18 types)
  components/
    layout/Shell.tsx     — Header + logo + theme toggle
    diagnosis/           — DiagnosisPanel, AnnotatedText, SeverityCounter
    roles/               — RolesPanel, GaugeRing
    rewrite/             — RewritePanel, ExperienceEditor, SummaryEditor,
                           SkillsBlock, CopyAllBlock, RecommendationsList, ExportButtons
    recheck/             — RecheckPanel, ScoreDelta, IssueStatusList/Item, NewIssuesList
    shared/              — Spinner, StepProgress, CopyButton
    upload/              — UploadZone, FilePreview
    history/             — HistoryList
```

---

## Стоимость API (Haiku 4.5)

| Тип | Цена |
|-----|------|
| Input | $0.80 / 1M токенов |
| Output | $4.00 / 1M токенов |
| Cache read | $0.08 / 1M токенов |
| Cache write | $1.00 / 1M токенов |

Типичный полный прогон: $0.02-0.05.

---

## Что хочется обсудить

1. Как переделать ExperienceEditor в настоящий редактор с inline-editing?
2. Как улучшить highlights — чтобы LLM давал больше полезных хинтов, а не "keep"?
3. Стоит ли добавить diff-view (было/стало) для буллетов?
4. Как реализовать verify шаг и куда его вставить в UX?
5. Нужен ли кастомный ввод роли (вместо только предложенных)?
6. Как сделать экспорт в PDF/DOCX?
7. Общая архитектура переупаковки — правильный ли подход?
