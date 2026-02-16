import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadZone from '../components/upload/UploadZone';
import StepProgress from '../components/shared/StepProgress';
import HistoryList from '../components/history/HistoryList';
import { api } from '../api';
import { getHistory, addHistoryEntry, removeHistoryEntry, cleanupOldTaskKeys } from '../utils/historyStorage';
import type { HistoryEntry } from '../types/history';

type InputMode = 'file' | 'text';

export default function HomePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<InputMode>('file');
  const [text, setText] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const entries = getHistory();
    setHistory(entries);
    cleanupOldTaskKeys(new Set(entries.map(e => e.taskId)));
  }, []);

  async function handleAnalyze(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      const { taskId, parse } = await api.analyze(file);
      addHistoryEntry({
        taskId,
        fileName: file.name,
        resumeType: parse.resume_type,
        score: null,
        grade: null,
        createdAt: Date.now(),
      });
      navigate(`/analysis/${taskId}`, { state: { parse } });
    } catch (e) {
      setIsLoading(false);
      setError(e instanceof Error ? e.message : 'Что-то пошло не так');
    }
  }

  async function handleAnalyzeText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await api.analyzeText(trimmed);
      addHistoryEntry({
        taskId: resp.taskId,
        fileName: 'Вставленный текст',
        resumeType: resp.parse?.resume_type || '',
        score: null,
        grade: null,
        createdAt: Date.now(),
      });
      navigate(`/analysis/${resp.taskId}`, {
        state: resp.parse ? { parse: resp.parse } : undefined,
      });
    } catch (e) {
      setIsLoading(false);
      setError(e instanceof Error ? e.message : 'Что-то пошло не так');
    }
  }

  function handleDeleteHistory(taskId: string) {
    removeHistoryEntry(taskId);
    localStorage.removeItem(`resume-screener-task-${taskId}`);
    setHistory(prev => prev.filter(e => e.taskId !== taskId));
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px' }}>
        <StepProgress messages={[
          'Читаю ваше резюме...',
          'Извлекаю текст...',
          'Разбиваю на секции...',
        ]} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px 80px',
    }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center', marginBottom: 40,
        animation: 'fadeIn 0.5s ease-out',
      }}>
        <h1 style={{
          fontSize: 44, fontWeight: 900, letterSpacing: '-1px',
          marginBottom: 16, lineHeight: 1.1,
          color: 'var(--text-primary)',
        }}>
          РЕЗЮМЕШКА
        </h1>
        <p style={{
          fontSize: 18, fontWeight: 500,
          color: 'var(--text-secondary)',
          maxWidth: 420, margin: '0 auto 8px',
          lineHeight: 1.4,
        }}>
          Загрузи резюме — получи готовое под вакансию
        </p>
        <p style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginBottom: 20,
        }}>
          Проверим, переупакуем, отправишь
        </p>

        {/* 3 steps */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
        }}>
          <span>📋 Анализ за 30 сек</span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <span>🎯 Подбор ролей</span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <span>📄 Готовое резюме</span>
        </div>
      </div>

      {/* AI disclaimer */}
      <div style={{
        maxWidth: 500, width: '100%', marginBottom: 28,
        background: 'var(--bg-card)',
        border: 'var(--nb-border-width) solid var(--nb-amber)',
        borderRadius: 'var(--nb-radius-lg)',
        boxShadow: '3px 3px 0 color-mix(in srgb, var(--nb-amber) 40%, transparent)',
        padding: '12px 16px',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>&#x26A0;&#xFE0F;</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Резюме анализирует AI. Не&nbsp;загружайте паспортные данные, ИНН и адрес.
          Можно вставить текст вручную, убрав личное.
        </span>
      </div>

      {/* Mode toggle */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 24,
        border: 'var(--nb-border-width) solid var(--border-color)',
        borderRadius: 'var(--nb-radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
      }}>
        {(['file', 'text'] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '10px 28px', fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--accent)' : 'var(--bg-card)',
              color: mode === m ? 'var(--text-on-accent)' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {m === 'file' ? 'Загрузить файл' : 'Вставить текст'}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="animate-fade-in"
          style={{
            maxWidth: 500, width: '100%', marginBottom: 20,
            background: 'var(--bg-card)',
            border: 'var(--nb-border-width) solid var(--nb-critical)',
            borderRadius: 'var(--nb-radius-md)',
            boxShadow: '3px 3px 0 color-mix(in srgb, var(--nb-critical) 30%, transparent)',
            padding: '10px 16px',
            fontSize: 13, fontWeight: 600,
            color: 'var(--nb-critical)',
          }}
        >
          {error}
        </div>
      )}

      {mode === 'file' ? (
        <UploadZone onAnalyze={handleAnalyze} isLoading={isLoading} />
      ) : (
        <div style={{ maxWidth: 500, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Вставьте текст резюме сюда..."
            className="nb-input"
            style={{
              minHeight: 220,
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.6,
              resize: 'vertical',
              fontSize: 13,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              {text.trim().length > 0 ? `${text.trim().length} символов` : ''}
            </span>
            <button
              onClick={handleAnalyzeText}
              disabled={!text.trim()}
              className="nb-button nb-button-primary"
              style={{
                opacity: text.trim() ? 1 : 0.4,
                cursor: text.trim() ? 'pointer' : 'default',
              }}
            >
              Анализировать
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <HistoryList entries={history} onDelete={handleDeleteHistory} />
    </div>
  );
}
