import type { RecheckResult } from '../types/recheck';

export const mockRecheck: RecheckResult = {
  previous_issues_status: [
    {
      original_comment: 'Много [уточнить] — резюме выглядит незаконченным',
      status: 'исправлено',
      quality: 'хорошо',
      note: 'Большинство placeholder заменены реальными цифрами. Остались 2 из 8.',
    },
    {
      original_comment: 'Нет конкретных продуктов: непонятно что за продукт в TechCorp',
      status: 'исправлено',
      quality: 'отлично',
      note: 'Добавлено название продукта и ключевые метрики (50K MAU, B2B SaaS).',
    },
    {
      original_comment: 'SQL указан как "базовый"',
      status: 'частично',
      quality: 'формально',
      note: 'Изменено на "SQL (intermediate)", но нет примеров использования в опыте.',
    },
  ],
  new_issues: [
    {
      text: 'Раздел навыков',
      type: 'minor',
      comment: 'Добавлен Tableau, но он не упоминается в опыте. Лучше убрать или добавить контекст.',
    },
  ],
  updated_score: 61,
  score_delta: 19,
  verdict:
    'Резюме значительно улучшилось. Главные проблемы исправлены: появились метрики, продуктовый контекст, чёткое позиционирование. Осталось доработать мелочи — и можно отправлять.',
};
