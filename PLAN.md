# Resume Screener — План доработок

## Контекст

Фронтенд работает на моках, пайплайн проходит от загрузки до recheck. Но UX сломан: нельзя сменить роль, нет истории версий, нет сохранения. Без этого пользоваться невозможно.

## Уже сделано в этой сессии

### Баг-фиксы
1. **Scroll-to-top при смене табов** — `AnalysisPage.tsx`: добавлен `useEffect` на `activeTab`
2. **Textarea "СТАЛО — О СЕБЕ" не показывала текст** — `SummaryEditor.tsx`: заменил `useEffect` на `requestAnimationFrame`
3. **Попап аннотации** — `AnnotatedText.tsx`: добавлен `maxWidth`, `stopPropagation`; `DiagnosisPanel.tsx`: добавлен `overflow: visible`

### Архитектурный фикс
4. **Verification больше НЕ запускается автоматом после rewrite** — пользователь сначала смотрит переупаковку, редактирует, и только потом жмёт "Отправить на проверку рекрутеру"
   - `usePipeline.ts`: разделил `selectRole` и `startVerification` на два отдельных метода
   - `pipeline.ts` (types): добавлен `START_VERIFY` action
   - `RewritePanel.tsx`: две кнопки — "Отправить на проверку рекрутеру" (до verification) и "Перепроверить после правок" (после)
   - `AnalysisPage.tsx`: убрано авто-переключение rewrite→verify, передаются новые пропсы

## Что нужно сделать дальше

### 1. Смена роли (вернуться к выбору ролей)

**Проблема:** После выбора роли и переупаковки нельзя выбрать другую роль. Всё залочено.

**Решение:**
- Добавить кнопку "Выбрать другую роль" на вкладке Переупаковка (рядом с бейджем роли)
- В `usePipeline.ts` добавить action `CHANGE_ROLE`:
  - Сбрасывает: `selectedRole`, `rewrite`, `verification`, `rechecks`
  - Ставит `step: 'awaiting_role'`
  - Роли НЕ перезагружаются (уже есть в `state.roles`)
- В `AnalysisPage.tsx` — при `CHANGE_ROLE` переключать на таб `roles`
- Перед сбросом — спросить юзера "Уверены? Текущая переупаковка будет потеряна" (или сохранить в историю, см. пункт 2)

**Файлы:**
- `src/types/pipeline.ts` — добавить action `CHANGE_ROLE`
- `src/hooks/usePipeline.ts` — добавить reducer case + метод `changeRole`
- `src/components/rewrite/RewritePanel.tsx` — кнопка "Выбрать другую роль"
- `src/pages/AnalysisPage.tsx` — обработка changeRole, переключение на roles

### 2. История версий / откат

**Проблема:** При редактировании и recheck предыдущая версия теряется. Нельзя вернуться к варианту до правок.

**Решение:**
- Добавить в `PipelineState` массив `versions`:
  ```ts
  interface ResumeVersion {
    id: number;
    timestamp: number;
    selectedRole: string;
    summary: string;
    bullets: string[][];  // editedBullets per experience
    score?: number;       // если был recheck
  }
  versions: ResumeVersion[];
  ```
- Автосохранение версии:
  - При первой загрузке rewrite → version 1 (оригинал от AI)
  - При отправке на recheck → сохранить текущие правки как новую версию
  - При смене роли → сохранить текущую версию перед сбросом
- UI: выпадающий список версий на вкладке Переупаковка
  - "v1 — Оригинал AI (38 баллов)"
  - "v2 — После правок (61 балл)"
  - Клик → восстановить текст в редакторе
- Откат НЕ перезапускает recheck — просто подставляет текст

**Файлы:**
- `src/types/pipeline.ts` — `ResumeVersion` интерфейс, добавить в `PipelineState`
- `src/types/pipeline.ts` — actions: `SAVE_VERSION`, `RESTORE_VERSION`
- `src/hooks/usePipeline.ts` — логика сохранения/восстановления
- `src/components/rewrite/RewritePanel.tsx` — селектор версий, передача editedSummary/editedBullets наверх
- `src/components/rewrite/VersionSelector.tsx` — **новый компонент**, выпадающий список версий

### 3. Сохранение / экспорт резюме

**Проблема:** Единственный способ забрать результат — копировать текст из CopyAllBlock. Нет скачивания, нет персистентности.

**Решение (моки):**
- Кнопка "Скачать .txt" — генерирует текстовый файл из editedSummary + editedBullets + skills, скачивает через `Blob` + `URL.createObjectURL`
- Кнопка "Скачать .docx" — мок (заглушка с alert "Coming soon" или генерация через простой шаблон)
- Сохранение в localStorage:
  - Автосохранение каждые 30 сек (или при каждом изменении через debounce)
  - При перезагрузке страницы — восстановление из localStorage
  - Бейдж "Автосохранено" рядом с кнопками

**Файлы:**
- `src/components/rewrite/ExportButtons.tsx` — **новый компонент**, кнопки скачивания
- `src/components/rewrite/RewritePanel.tsx` — интеграция ExportButtons
- `src/hooks/useAutoSave.ts` — **новый хук**, localStorage persistence
- `src/components/rewrite/CopyAllBlock.tsx` — добавить кнопку "Скачать"

### 4. Сохранение в моке API

- `src/api/mock/client.ts` (или `src/mock/client.ts`) — добавить метод `save(taskId, data)` → возвращает `{ saved: true, url: '/saved/xxx' }`
- Это заглушка для будущего бэкенда

## Порядок реализации

1. **Смена роли** — самое критичное, без этого UX тупик
2. **Экспорт .txt** — быстро, сразу полезно
3. **История версий** — связано с recheck flow
4. **Автосохранение localStorage** — nice to have

## Тестирование

- Обновить `test-ui.mjs` — добавить сценарии:
  - Выбрать роль → посмотреть переупаковку → сменить роль → выбрать другую
  - Сделать recheck → откатиться к v1 → снова отправить
  - Скачать .txt
- Запустить `node test-ui.mjs` и проверить скриншоты
- Dev-сервер: http://localhost:5173/
