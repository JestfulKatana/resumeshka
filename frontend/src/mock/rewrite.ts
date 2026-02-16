import type { RewriteResult } from '../types/rewrite';

export const mockRewrite: RewriteResult = {
  original_summary:
    'Менеджер с опытом в IT. Работал с продуктами и проектами. Умею координировать команду и общаться с заказчиками.',
  summary:
    'Product Manager с 4-летним опытом в B2B SaaS — от аналитики до управления продуктом. Специализируется на discovery, приоритизации на основе данных и запуске фичей, влияющих на ключевые бизнес-метрики. Управлял кросс-функциональной командой из 8 человек.',
  experiences: [
    {
      company: 'TechCorp',
      role: 'Product Manager',
      period: '2022–2024',
      original_bullets: [
        'Управлял продуктовым бэклогом и приоритизировал задачи',
        'Проводил исследования пользователей и формировал гипотезы',
        'Координировал работу команды из 8 человек',
      ],
      rewritten_bullets: [
        'Владел продуктовым бэклогом из 120+ задач, приоритизируя по RICE-фреймворку — доставлял [уточнить: X] ключевых фичей в квартал',
        'Провёл [уточнить: X] пользовательских интервью и A/B тестов, подтвердив 70% продуктовых гипотез — результаты напрямую влияли на roadmap',
        'Управлял кросс-функциональной командой из 8 человек (3 разработчика, 2 дизайнера, QA, аналитик, DevOps), обеспечивая запуск в срок в [уточнить: X]% случаев',
      ],
      highlights: [
        {
          action: 'add_metrics',
          comment: 'Вспомните реальное количество запусков за квартал. Даже 2-3 — это нормально для PM.',
        },
        {
          action: 'add_metrics',
          comment: 'Примерная цифра. Если знаете реальную — замените. Если нет — уберите процент и оставьте "большинство".',
        },
        {
          action: 'keep',
          comment: '',
        },
      ],
      technologies: ['Jira', 'Confluence', 'Figma', 'Amplitude', 'Miro'],
      responsibilities: [
        'Управление продуктовым бэклогом',
        'Проведение пользовательских исследований',
        'Координация кросс-функциональной команды',
        'Приоритизация задач и планирование спринтов',
      ],
    },
    {
      company: 'StartupAI',
      role: 'Project Manager',
      period: '2021–2022',
      original_bullets: [
        'Отвечал за запуск новых фичей и контроль сроков',
        'Взаимодействовал с заказчиками и собирал требования',
      ],
      rewritten_bullets: [
        'Запустил [уточнить: X] фичей за год, управляя полным циклом от discovery до delivery. Средний Time-to-Market — [уточнить: X] недель',
        'Вёл [уточнить: X] B2B-заказчиков, трансформируя бизнес-требования в технические задачи. NPS клиентов вырос с [уточнить] до [уточнить]',
      ],
      highlights: [
        {
          action: 'add_metrics',
          comment: 'Укажите средний срок от идеи до релиза. Для стартапа 2-4 недели — хороший показатель.',
        },
        {
          action: 'add_metrics',
          comment: 'Если NPS не измерялся — замените на CSAT или процент повторных заказов.',
        },
      ],
      technologies: ['Asana', 'Notion', 'Slack'],
      responsibilities: [
        'Запуск новых фичей продукта',
        'Контроль сроков и бюджета',
        'Сбор и управление требованиями',
      ],
    },
    {
      company: 'Digital Agency',
      role: 'Junior Analyst → Product Analyst',
      period: '2020–2021',
      original_bullets: [
        'Составлял отчёты по веб-аналитике и готовил презентации для клиентов',
      ],
      rewritten_bullets: [
        'Анализировал поведение пользователей для [уточнить: X] клиентов агентства. Рекомендации по оптимизации конверсии привели к росту CR на [уточнить: X]% в среднем',
      ],
      highlights: [
        {
          action: 'add_metrics',
          comment: 'Даже небольшой рост конверсии (5-10%) выглядит сильно. Если точных цифр нет — напишите "до 15%" как ориентир.',
        },
      ],
      technologies: ['Google Analytics', 'Google Sheets', 'PowerPoint'],
      responsibilities: [
        'Составление отчётов по веб-аналитике',
        'Подготовка презентаций для клиентов',
        'Анализ поведения пользователей',
      ],
    },
  ],
  skills: {
    key_competencies: [
      'Product Discovery & Validation',
      'Backlog Management & Prioritization (RICE)',
      'Cross-functional Team Leadership',
      'User Research & A/B Testing',
      'Stakeholder Management',
      'Agile / Scrum',
    ],
    tools: [
      'Jira', 'Confluence', 'Figma', 'Amplitude', 'Miro',
      'Notion', 'Google Analytics', 'SQL (базовый)',
    ],
    ats_keywords: [
      'product manager', 'product owner', 'backlog management',
      'user research', 'A/B testing', 'agile', 'scrum',
      'roadmap', 'stakeholder management', 'B2B SaaS',
      'cross-functional team', 'product discovery',
    ],
  },
  recommendations: [
    'Добавить раздел "Достижения" в начало резюме с 3-4 ключевыми метриками',
    'Указать конкретные продукты и их масштаб (MAU, revenue, количество пользователей)',
    'Добавить ссылку на LinkedIn с рекомендациями от коллег',
    'Рассмотреть получение сертификации (PSPO, Product Analytics) для усиления позиционирования',
    'Заполнить все [уточнить] реальными цифрами — даже приблизительные метрики лучше, чем их отсутствие',
  ],
};
