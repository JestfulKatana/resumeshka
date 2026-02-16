import type { RolesResult } from '../types/roles';

export const mockRoles: RolesResult = {
  roles: [
    {
      role: 'Product Manager (B2B SaaS)',
      match_level: 'высокое',
      match_score: 82,
      strengths: [
        'Опыт управления продуктовым бэклогом в TechCorp',
        'Проведение пользовательских исследований и формирование гипотез',
        'Опыт координации кросс-функциональной команды из 8 человек',
      ],
      gaps: [
        'Нет метрик по бизнес-результатам (revenue, retention, conversion)',
        'Не показан опыт работы с unit-экономикой и product analytics',
        'Отсутствует опыт A/B тестирования и data-driven решений',
      ],
      typical_duties:
        'Определение продуктовой стратегии и roadmap, приоритизация бэклога на основе данных и управление стейкхолдерами',
      matched_skills: ['Jira', 'Confluence', 'Figma', 'Miro', 'SQL'],
      missing_skills: ['Amplitude', 'Mixpanel', 'Tableau'],
      reports_to: 'CPO / Head of Product',
      works_with: 'Дизайнеры, разработчики, аналитики, маркетинг',
    },
    {
      role: 'Project Manager (IT)',
      match_level: 'среднее',
      match_score: 58,
      strengths: [
        'Прямой опыт в роли Project Manager в StartupAI',
        'Опыт контроля сроков и запуска фичей',
        'Взаимодействие с заказчиками и сбор требований',
      ],
      gaps: [
        'Нет сертификаций (PMP, Scrum Master)',
        'Не показан масштаб проектов (бюджет, сроки, команда)',
        'Нет примеров управления рисками и проблемами',
      ],
      typical_duties:
        'Планирование и контроль сроков проекта, управление бюджетом и ресурсами, риск-менеджмент и коммуникация с заказчиками',
      matched_skills: ['Jira', 'Confluence', 'Slack', 'Google Workspace'],
      missing_skills: ['MS Project', 'Asana', 'PMP'],
      reports_to: 'CTO / Директор проектного офиса',
      works_with: 'Разработчики, QA, дизайнеры, заказчики',
    },
    {
      role: 'Product Analyst',
      match_level: 'с натяжкой',
      match_score: 31,
      strengths: [
        'Бэкграунд в аналитике (Junior Analyst в Digital Agency)',
        'Опыт составления отчётов по веб-аналитике',
        'Понимание продуктовых метрик на уровне PM',
      ],
      gaps: [
        'Нет опыта работы с SQL, Python или BI-инструментами',
        'Аналитический опыт устарел (2020–2021)',
        'Карьера двигалась в сторону менеджмента, а не аналитики',
      ],
      typical_duties:
        'Анализ поведения пользователей и построение воронок, A/B тестирование, построение дашбордов и SQL-запросы',
      matched_skills: ['Excel', 'Google Analytics'],
      missing_skills: ['SQL', 'Python', 'Amplitude', 'Tableau', 'Redash'],
      reports_to: 'Head of Analytics / CPO',
      works_with: 'Продакт-менеджеры, маркетинг, дата-инженеры',
    },
  ],
  recommendation: {
    primary_role: 'Product Manager (B2B SaaS)',
    reasoning:
      'Наибольшее пересечение опыта, прямая карьерная траектория от аналитика через PjM к PM. Нужно усилить блок метрик и результатов, чтобы конкурировать с сильными кандидатами.',
  },
};
