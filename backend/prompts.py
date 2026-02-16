"""System prompts and JSON schemas for all LLM steps.

JSON schemas MUST match the frontend TypeScript types exactly.
"""

# ---------------------------------------------------------------------------
# Step 0a: Parse — split resume into sections + classify (lightweight)
# ---------------------------------------------------------------------------

PARSE_SYSTEM = """Ты — опытный рекрутер. Разбери резюме на блоки и дай общую диагностику.

1. ОПРЕДЕЛИ ТИП РЕЗЮМЕ:
- "Список обязанностей" — есть опыт, но описан процессами, без результатов
- "Каша из ролей" — опыт разнородный, непонятно кто этот человек
- "Джун после курсов" — нет реального коммерческого опыта
- "Переходящий" — опыт из другой сферы, хочет сменить роль
- "Нормальный" — есть результаты, нужна полировка

2. РАЗБЕЙ НА БЛОКИ ОПЫТА:
Для каждого блока:
- В full_text скопируй ВЕСЬ оригинальный текст блока как есть \
(от названия компании до конца описания). \
НЕ ПРОПУСКАЙ ни один блок опыта.

3. ОПРЕДЕЛИ:
- Red flags (частая смена работы, даунгрейд, пробелы)
- Главная проблема этого резюме в одном предложении

4. ИЗВЛЕКИ НАВЫКИ кандидата — всё что упомянуто в резюме:
- hard_skills: инструменты, технологии, системы (1С, Excel, Bitrix, маркетплейсы и т.д.)
- soft_skills: компетенции, управленческие навыки
- domain_knowledge: отраслевая экспертиза (ВЭД, категорийный менеджмент и т.д.)

5. ОПРЕДЕЛИ ПОЛ кандидата по имени или глагольным формам в тексте \
("male" или "female"). Это нужно для правильного рода глаголов при переписывании.

НЕ анализируй содержание блоков — только разбей, классифицируй и извлеки навыки."""

PARSE_SCHEMA = {
    "type": "object",
    "properties": {
        "resume_type": {
            "type": "string",
            "enum": [
                "Список обязанностей",
                "Каша из ролей",
                "Джун после курсов",
                "Переходящий",
                "Нормальный",
            ],
        },
        "resume_type_description": {
            "type": "string",
            "description": "Объяснение типа в 1-2 предложения",
        },
        "main_problem": {
            "type": "string",
            "description": "Главная проблема резюме в одном предложении",
        },
        "red_flags": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "flag": {"type": "string"},
                    "detail": {"type": "string"},
                    "severity": {
                        "type": "string",
                        "enum": ["critical", "major", "minor"],
                    },
                },
                "required": ["flag", "detail", "severity"],
            },
        },
        "sections": {
            "type": "array",
            "description": (
                "Блоки опыта работы. "
                "КАЖДЫЙ блок из резюме должен быть здесь."
            ),
            "items": {
                "type": "object",
                "properties": {
                    "block_id": {
                        "type": "integer",
                        "description": (
                            "Порядковый номер блока начиная с 1"
                        ),
                    },
                    "section_title": {
                        "type": "string",
                        "description": "Название компании и роли",
                    },
                    "period": {"type": "string"},
                    "full_text": {
                        "type": "string",
                        "description": (
                            "ПОЛНЫЙ оригинальный текст этого блока "
                            "опыта из резюме, как есть. Копируй дословно."
                        ),
                    },
                },
                "required": [
                    "block_id",
                    "section_title",
                    "period",
                    "full_text",
                ],
            },
        },
        "key_skills": {
            "type": "object",
            "description": "Навыки кандидата, извлечённые из резюме",
            "properties": {
                "hard_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": (
                        "Инструменты, технологии, системы"
                    ),
                },
                "soft_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Компетенции, управленческие навыки",
                },
                "domain_knowledge": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Отраслевая экспертиза",
                },
            },
            "required": [
                "hard_skills",
                "soft_skills",
                "domain_knowledge",
            ],
        },
        "gender": {
            "type": "string",
            "enum": ["male", "female"],
            "description": "Пол кандидата (по имени или глагольным формам)",
        },
    },
    "required": [
        "resume_type",
        "resume_type_description",
        "main_problem",
        "red_flags",
        "sections",
        "key_skills",
        "gender",
    ],
}

# ---------------------------------------------------------------------------
# Step 0b: Annotate — per-section weaknesses/strengths (parallel)
# ---------------------------------------------------------------------------

ANNOTATE_SYSTEM = """Ты — опытный рекрутер. Проанализируй ОДИН блок опыта из резюме.

Тебе предоставлено полное резюме для контекста, но анализируй ТОЛЬКО указанный блок.
Используй контекст всего резюме чтобы точнее оценить слабые и сильные стороны блока.

Смотри как рекрутер, который за 30 секунд решает — звать или нет.

- Выдели конкретные формулировки, которые звучат слабо или размыто
- Объясни, почему они не работают
- Предложи, как усилить (без переписывания — только направление)
- Укажи severity: critical / major / minor

original_text — дословная цитата из блока (подстрока full_text)."""

ANNOTATE_SCHEMA = {
    "type": "object",
    "properties": {
        "annotations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "original_text": {
                        "type": "string",
                        "description": (
                            "Цитата из резюме "
                            "(должна быть подстрокой full_text)"
                        ),
                    },
                    "type": {
                        "type": "string",
                        "enum": ["critical", "major", "minor"],
                    },
                    "comment": {
                        "type": "string",
                        "description": "Что не так и почему",
                    },
                    "suggestion": {
                        "type": "string",
                        "description": "Направление для усиления",
                    },
                },
                "required": [
                    "original_text",
                    "type",
                    "comment",
                    "suggestion",
                ],
            },
        },
    },
    "required": ["annotations"],
}

# ---------------------------------------------------------------------------
# Step 0b: Scoring (parallel call 2 of 2)
# ---------------------------------------------------------------------------

SCORING_SYSTEM = """Ты — опытный рекрутер и карьерный консультант.
Оцени резюме по 10 измерениям, каждое от 0 до 10.
Будь строгим, но справедливым. Типичное «нормальное» резюме получает 50-65 баллов, не выше.

Измерения:
1. Метрики и результаты — есть ли конкретные цифры и достижения
2. Релевантность для целевой роли — насколько опыт соответствует желаемой позиции
3. Конкретика опыта — детали vs общие слова
4. Структура и читаемость — легко ли за 30 сек понять кандидата
5. Навыки и инструменты — актуальны ли, достаточно ли
6. Позиционирование — понятно ли кто этот человек и в чём силён
7. ATS-совместимость — пройдёт ли автоматический фильтр
8. Визуальное впечатление — профессиональность оформления
9. Уникальность — чем выделяется среди 100 похожих резюме
10. Готовность к отправке — можно ли отправить рекрутеру прямо сейчас

Также дай общий вердикт в 2-3 предложения."""

SCORING_SCHEMA = {
    "type": "object",
    "properties": {
        "total_score": {
            "type": "integer",
            "description": "Сумма всех измерений, 0-100",
        },
        "dimensions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "score": {
                        "type": "integer",
                        "description": "0-10",
                    },
                    "comment": {"type": "string"},
                },
                "required": ["name", "score", "comment"],
            },
        },
        "verdict": {
            "type": "string",
            "description": "Общий вердикт 2-3 предложения",
        },
        "grade": {
            "type": "string",
            "enum": [
                "Отличное",
                "Хорошее",
                "Нужна полировка",
                "Нужна переработка",
                "Полная переделка",
            ],
        },
    },
    "required": ["total_score", "dimensions", "verdict", "grade"],
}

# ---------------------------------------------------------------------------
# Step 1: Role Matching
# ---------------------------------------------------------------------------

ROLES_SYSTEM = """На основе проведённого анализа определи 2-3 роли, на которые этот кандидат может реально претендовать.

Для каждой роли укажи:
- Название роли
- Уровень соответствия: высокое / среднее / с натяжкой
- match_score: числовая оценка 0-100 (высокое ≈ 75-95, среднее ≈ 45-74, с натяжкой ≈ 15-44)
- Что в опыте работает на эту роль (конкретные пункты из резюме)
- Чего не хватает
- Типичные обязанности на этой роли (одно предложение-саммари, не список)
- matched_skills: навыки/инструменты кандидата, которые подходят для этой роли (из резюме)
- missing_skills: навыки/инструменты, которые нужны для роли, но отсутствуют в резюме
- Позиция в команде: кому подчиняется (reports_to) и с кем взаимодействует (works_with)

В конце дай рекомендацию: какую роль выбрать как основную для позиционирования и почему.

Контекст анализа будет передан в сообщении пользователя."""

ROLES_USER_TEMPLATE = """Резюме:
{resume_text}

---

Результат анализа:
Тип резюме: {resume_type}
Главная проблема: {main_problem}
Red flags: {red_flags_summary}"""

ROLES_SCHEMA = {
    "type": "object",
    "properties": {
        "roles": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "role": {"type": "string"},
                    "match_level": {
                        "type": "string",
                        "enum": ["высокое", "среднее", "с натяжкой"],
                    },
                    "match_score": {
                        "type": "integer",
                        "description": "Числовая оценка соответствия 0-100",
                    },
                    "strengths": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "gaps": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "typical_duties": {
                        "type": "string",
                        "description": "Краткое описание типичных обязанностей (1-2 предложения)",
                    },
                    "matched_skills": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Навыки/инструменты кандидата, подходящие для этой роли",
                    },
                    "missing_skills": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Навыки/инструменты, нужные для роли, но отсутствующие у кандидата",
                    },
                    "reports_to": {
                        "type": "string",
                        "description": "Кому подчиняется",
                    },
                    "works_with": {
                        "type": "string",
                        "description": "С какими отделами/ролями взаимодействует",
                    },
                },
                "required": [
                    "role",
                    "match_level",
                    "match_score",
                    "strengths",
                    "gaps",
                    "typical_duties",
                    "matched_skills",
                    "missing_skills",
                    "reports_to",
                    "works_with",
                ],
            },
        },
        "recommendation": {
            "type": "object",
            "properties": {
                "primary_role": {"type": "string"},
                "reasoning": {"type": "string"},
            },
            "required": ["primary_role", "reasoning"],
        },
    },
    "required": ["roles", "recommendation"],
}

# ---------------------------------------------------------------------------
# Step 2: Rewrite — per-block (parallel calls)
# ---------------------------------------------------------------------------

REWRITE_BLOCK_SYSTEM = """Кандидат выбрал целевую роль. \
Перепиши ОДИН блок опыта работы под эту роль.

ФОРМАТ: каждый буллет = обязанность + результат + ключевые слова.
Не разделяй обязанности и результаты — совмещай в одном пункте.

Правила:
- ГРАММАТИЧЕСКИЙ РОД: используй глагольные формы, соответствующие \
полу кандидата (указан в контексте). Ж: «Управляла», «Снизила». \
М: «Управлял», «Снизил». Это критически важно!
- СОКРАЩАЙ: оставь 5-8 самых сильных буллетов, не переписывай всё
- Каждый буллет: обязанность + конкретный результат/метрика
- Естественно вплетай ключевые слова для ATS (рекрутерский поиск)
- Убери дублирование и «воду» — рекрутер читает за 30 секунд
- Ничего не выдумывай — меняй формулировки и акценты
- Где нет цифр — пометь [уточнить: ...] (кандидат заполнит)
- highlights: параллельный массив к rewritten_bullets. \
highlights[i] = подсказка для rewritten_bullets[i]. \
Длина ОБЯЗАНА совпадать. \
Для буллетов без подсказки: action="keep", comment=""."""

REWRITE_BLOCK_SCHEMA = {
    "type": "object",
    "properties": {
        "block_id": {
            "type": "integer",
            "description": "block_id из анализа — должен совпадать",
        },
        "company": {"type": "string"},
        "role": {"type": "string"},
        "period": {"type": "string"},
        "original_bullets": {
            "type": "array",
            "items": {"type": "string"},
        },
        "rewritten_bullets": {
            "type": "array",
            "items": {"type": "string"},
        },
        "highlights": {
            "type": "array",
            "description": (
                "Параллельный массив к rewritten_bullets. "
                "Длина ДОЛЖНА совпадать."
            ),
            "items": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": [
                            "add_metrics",
                            "rephrase",
                            "remove",
                            "clarify",
                            "keep",
                        ],
                    },
                    "comment": {
                        "type": "string",
                        "description": (
                            "Подсказка для буллета. "
                            "Пустая строка если action=keep."
                        ),
                    },
                },
                "required": ["action", "comment"],
            },
        },
        "technologies": {
            "type": "array",
            "items": {"type": "string"},
        },
        "responsibilities": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Ключевые обязанности на этой позиции",
        },
    },
    "required": [
        "block_id",
        "company",
        "role",
        "period",
        "original_bullets",
        "rewritten_bullets",
        "highlights",
        "technologies",
        "responsibilities",
    ],
}

# ---------------------------------------------------------------------------
# Step 2c: Rewrite — meta (summary + skills + recommendations)
# ---------------------------------------------------------------------------

REWRITE_META_SYSTEM = """На основе переписанных блоков опыта сгенерируй мета-информацию для резюме:

1. original_summary — оригинальный текст «О себе» из резюме (как есть)
2. summary — переписанный «О себе» (2-3 предложения) под целевую роль
3. skills:
   - key_competencies: ключевые компетенции
   - tools: инструменты
   - ats_keywords: ATS-ключевые слова для этой роли
4. recommendations — что ещё стоит добавить или уточнить (3-5 пунктов)"""

REWRITE_META_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "Переписанный 'О себе' (2-3 предложения)",
        },
        "original_summary": {
            "type": "string",
            "description": "Оригинальный текст 'О себе' из резюме",
        },
        "skills": {
            "type": "object",
            "properties": {
                "key_competencies": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "tools": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "ats_keywords": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["key_competencies", "tools", "ats_keywords"],
        },
        "recommendations": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "summary",
        "original_summary",
        "skills",
        "recommendations",
    ],
}

# ---------------------------------------------------------------------------
# Step 3: Verification
# ---------------------------------------------------------------------------

VERIFY_SYSTEM = """Прочитай переупакованное резюме как рекрутер, который закрывает вакансию на указанную роль.

Ответь:
- Какие 3 сильные стороны кандидата сразу видны
- Вызывает ли резюме желание позвать на интервью (да / нет / с оговорками)
- Если нет или с оговорками — что конкретно мешает
- Чем это резюме лучше исходного (главное улучшение)
- Оставшиеся риски, которые нужно закрыть на интервью"""

VERIFY_USER_TEMPLATE = """Целевая роль: {selected_role}

Переупакованное резюме:
{rewritten_resume_json}

Оригинальное резюме (для сравнения):
{original_resume_text}"""

VERIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "top_strengths": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3 сильные стороны, видные сразу",
        },
        "invite_to_interview": {
            "type": "string",
            "enum": ["да", "нет", "с оговорками"],
        },
        "blockers": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Что мешает (если invite != да)",
        },
        "main_improvement": {
            "type": "string",
            "description": "Чем резюме стало лучше",
        },
        "remaining_risks": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "top_strengths",
        "invite_to_interview",
        "blockers",
        "main_improvement",
        "remaining_risks",
    ],
}

# ---------------------------------------------------------------------------
# Recheck
# ---------------------------------------------------------------------------

RECHECK_SYSTEM = """Пользователь внёс правки в резюме после твоих рекомендаций.
Сравни обновлённую версию с предыдущей критикой.

Для каждого предыдущего замечания определи:
- Исправлено ли оно
- Если да — насколько хорошо (отлично / хорошо / формально / не применимо)
- Если нет — напомни

Также:
- Пересчитай overall score (0-100)
- Укажи новые проблемы, если появились
- Дай обновлённый вердикт"""

RECHECK_USER_TEMPLATE = """Обновлённое резюме:
{updated_resume}

---

Предыдущие замечания (annotations):
{previous_annotations_json}

Предыдущие блокеры верификации:
{previous_blockers_json}

Предыдущий скор: {previous_score}"""

RECHECK_SCHEMA = {
    "type": "object",
    "properties": {
        "previous_issues_status": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "original_comment": {"type": "string"},
                    "status": {
                        "type": "string",
                        "enum": ["исправлено", "частично", "не исправлено"],
                    },
                    "quality": {
                        "type": "string",
                        "enum": ["отлично", "хорошо", "формально", "не применимо"],
                    },
                    "note": {"type": "string"},
                },
                "required": ["original_comment", "status", "quality", "note"],
            },
        },
        "new_issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "type": {
                        "type": "string",
                        "enum": ["critical", "major", "minor"],
                    },
                    "comment": {"type": "string"},
                },
                "required": ["text", "type", "comment"],
            },
        },
        "updated_score": {"type": "integer"},
        "score_delta": {
            "type": "integer",
            "description": "Изменение относительно прошлого скора",
        },
        "verdict": {"type": "string"},
    },
    "required": [
        "previous_issues_status",
        "new_issues",
        "updated_score",
        "score_delta",
        "verdict",
    ],
}
