import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { usePipeline } from '../hooks/usePipeline';
import { useAutoSave } from '../hooks/useAutoSave';
import type { Severity } from '../types/analysis';
import Spinner from '../components/shared/Spinner';
import StepProgress from '../components/shared/StepProgress';
import SeverityCounter from '../components/diagnosis/SeverityCounter';
import AnalysisPanel from '../components/diagnosis/DiagnosisPanel';
import RolesPanel from '../components/roles/RolesPanel';
import RewritePanel from '../components/rewrite/RewritePanel';
import RecheckPanel from '../components/recheck/RecheckPanel';

type Tab = 'analysis' | 'roles' | 'rewrite' | 'recheck';

interface TabDef {
  id: Tab;
  label: string;
  available: boolean;
}

const analysisSteps = new Set(['parsed', 'scoring', 'scored', 'annotating', 'annotated']);

export default function AnalysisPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const location = useLocation();
  const { state, startAnalysis, fetchRoles, selectRole, submitRecheck, changeRole, restore } = usePipeline();
  const { lastSaved, loadSaved } = useAutoSave(state);
  const [activeTab, setActiveTab] = useState<Tab>('analysis');
  const [isLoaded, setIsLoaded] = useState(false);

  const startedRef = useRef(false);
  useEffect(() => {
    if (taskId && state.step === 'idle' && !startedRef.current) {
      startedRef.current = true;

      // Try to restore from localStorage first
      const saved = loadSaved(taskId);
      if (saved && saved.parse) {
        restore({ ...saved, taskId });
        // Determine which tab to show based on restored state
        if (saved.rewrite) setActiveTab('rewrite');
        else if (saved.roles) setActiveTab('roles');
        return;
      }

      const preloadedParse = (location.state as { parse?: typeof state.parse })?.parse || undefined;
      startAnalysis(taskId, preloadedParse);
    }
  }, [taskId, state.step, startAnalysis, location.state, loadSaved, restore]);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  // Scroll to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Auto-switch tabs for downstream steps
  useEffect(() => {
    if (state.step === 'rewriting' && activeTab === 'roles') setActiveTab('rewrite');
  }, [state.step]);
  useEffect(() => {
    if (state.rewrite && activeTab !== 'rewrite') setActiveTab('rewrite');
  }, [state.rewrite]);
  useEffect(() => {
    if (state.rechecks.length > 0 && state.step === 'done') {
      setActiveTab('recheck');
    }
  }, [state.rechecks.length, state.step]);

  // Annotation counts — only count annotations actually matched in text
  const annotationCounts = useMemo<Record<Severity, number>>(() => {
    const counts: Record<Severity, number> = { critical: 0, major: 0, minor: 0 };
    const sections = state.parse?.sections || [];
    sections.forEach((s) => {
      const text = s.full_text || '';
      s.annotations
        .filter((a) => text.includes(a.original_text))
        .forEach((a) => counts[a.type]++);
    });
    return counts;
  }, [state.parse]);

  const handleSubmitRecheck = useCallback((text: string) => {
    submitRecheck(text);
    setActiveTab('recheck');
  }, [submitRecheck]);

  const handleChangeRole = useCallback(() => {
    changeRole();
    setActiveTab('roles');
  }, [changeRole]);

  const handleBackToEdit = useCallback(() => {
    setActiveTab('rewrite');
  }, []);

  const handleFetchRoles = useCallback(() => {
    fetchRoles();
    setActiveTab('roles');
  }, [fetchRoles]);

  const hasParse = !!state.parse;
  const hasScoring = !!state.scoring;
  const isAnnotating = state.step === 'annotating' || state.step === 'scoring' || state.step === 'scored';
  const isAnalysisComplete = hasParse && hasScoring && state.step === 'annotated';

  const tabs: TabDef[] = [
    { id: 'analysis', label: 'Анализ', available: hasParse },
    { id: 'roles', label: 'Роли', available: !!state.roles || state.step === 'loading_roles' },
    { id: 'rewrite', label: 'Переупаковка', available: !!state.rewrite || state.step === 'rewriting' },
    { id: 'recheck', label: 'Перепроверка', available: state.rechecks.length > 0 || state.step === 'rechecking' },
  ];

  const isInitialLoading = state.step === 'uploading' && !hasParse;

  // Step status text
  const stepStatus = (() => {
    switch (state.step) {
      case 'uploading': return 'Загрузка...';
      case 'parsed':
      case 'scoring': return 'Оценка резюме...';
      case 'scored':
      case 'annotating': return 'Анализ секций...';
      case 'loading_roles': return 'Подбор ролей...';
      case 'awaiting_role': return 'Выберите роль';
      case 'rewriting': return 'Переупаковка...';
      case 'rechecking': return 'Повторная проверка...';
      default: return null;
    }
  })();

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score < 40) return 'var(--nb-critical)';
    if (score < 70) return 'var(--nb-major)';
    return 'var(--nb-success)';
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* Sticky Header with Tabs */}
      <div
        style={{
          borderBottom: `var(--nb-border-width) solid var(--border-color)`,
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--header-bg)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 56,
          zIndex: 40,
          height: 52,
        }}
      >
        {/* Tab bar — neo-brutalist segmented control */}
        <div style={{
          display: 'flex',
          gap: 0,
          border: `var(--nb-border-width) solid var(--border-color)`,
          borderRadius: 'var(--nb-radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {tabs.filter((t) => t.available).map((tab, i, arr) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 18px',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                borderRight: i < arr.length - 1 ? `var(--nb-border-width) solid var(--border-color)` : 'none',
                cursor: 'pointer',
                background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg-card)',
                color: activeTab === tab.id ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
                borderRadius: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {stepStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spinner size="sm" className="text-accent" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {stepStatus}
              </span>
            </div>
          )}
          {lastSaved && (
            <span style={{ fontSize: 11, color: 'var(--nb-success)', fontWeight: 600 }}>
              Автосохранено
            </span>
          )}
        </div>
      </div>

      {/* Hero Block — compact */}
      {hasParse && (
        <div
          style={{
            padding: '16px 32px',
            borderBottom: `var(--nb-border-width) solid var(--border-color)`,
            animation: isLoaded ? 'slideUp 0.4s ease' : 'none',
            opacity: isLoaded ? 1 : 0,
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Score circle */}
            {hasScoring ? (
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: 'var(--bg-card)',
                  border: `var(--nb-border-width) solid ${getScoreColor(state.scoring!.total_score)}`,
                  boxShadow: `3px 3px 0 ${getScoreColor(state.scoring!.total_score)}`,
                }}
              >
                <span
                  style={{
                    fontSize: 18, fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: getScoreColor(state.scoring!.total_score),
                  }}
                >
                  {state.scoring!.total_score}
                </span>
              </div>
            ) : (
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: 'var(--bg-card)',
                  border: `var(--nb-border-width) solid var(--border-color)`,
                  animation: 'pulse-subtle 2s ease-in-out infinite',
                }}
              >
                <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>&hellip;</span>
              </div>
            )}

            {/* Type + severity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
              <span
                style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                  letterSpacing: '-0.2px',
                }}
              >
                {state.parse!.resume_type}
              </span>
              <span style={{ width: 2, height: 16, background: 'var(--border-color)', borderRadius: 1 }} />
              {annotationCounts.critical + annotationCounts.major + annotationCounts.minor > 0 && (
                <SeverityCounter counts={annotationCounts} />
              )}
            </div>

            {/* Grade badge — bordered pill */}
            {hasScoring && state.scoring!.grade && (
              <span
                className="nb-pill"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {state.scoring!.grade}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 32px 80px' }}>
        {/* Error — bordered error card */}
        {state.error && (
          <div
            className="nb-card-static animate-fade-in"
            style={{
              borderColor: 'var(--nb-critical)',
              padding: 16, marginBottom: 24,
              fontSize: 14, color: 'var(--nb-critical)',
              boxShadow: `4px 4px 0 var(--nb-critical)`,
            }}
          >
            {state.error}
          </div>
        )}

        {/* Initial loading (before parse arrives) */}
        {isInitialLoading && (
          <StepProgress messages={[
            'Загружаю файл...',
            'Извлекаю текст из резюме...',
            'Разбиваю на секции...',
          ]} />
        )}

        {/* Analysis tab — progressive rendering */}
        {activeTab === 'analysis' && hasParse && (
          <>
            <AnalysisPanel
              parse={state.parse!}
              scoring={state.scoring}
              isAnnotating={isAnnotating}
            />

            {/* Roles CTA button */}
            {(isAnalysisComplete || state.step === 'annotated') && !state.roles && state.step !== 'loading_roles' && (
              <div
                className="nb-card-static animate-fade-in"
                style={{
                  marginTop: 40, padding: 24, textAlign: 'center',
                  borderColor: 'var(--accent-border)',
                  background: 'var(--accent-bg)',
                }}
              >
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, margin: '0 0 16px' }}>
                  Анализ завершён. Хотите подобрать подходящие роли?
                </p>
                <button
                  className="nb-button nb-button-primary"
                  onClick={handleFetchRoles}
                >
                  Подобрать подходящие роли
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'roles' && state.roles && (
          <RolesPanel data={state.roles} onSelectRole={selectRole} selectedRole={state.selectedRole} />
        )}
        {activeTab === 'roles' && state.step === 'loading_roles' && !state.roles && (
          <StepProgress messages={[
            'Подбираю подходящие роли...',
            'Анализирую навыки из резюме...',
            'Сверяю с рынком вакансий...',
            'Оцениваю совпадение опыта...',
          ]} />
        )}
        {activeTab === 'rewrite' && state.step === 'rewriting' && !state.rewrite && (
          <StepProgress messages={[
            'Переупаковываю резюме...',
            'Адаптирую формулировки под роль...',
            'Усиливаю ключевые достижения...',
            'Подбираю правильные акценты...',
            'Проверяю структуру...',
          ]} />
        )}

        {/* Rewrite panel — always rendered when data available, hidden via display:none to preserve state */}
        {state.rewrite && state.selectedRole && (
          <div style={{ display: activeTab === 'rewrite' ? 'block' : 'none' }}>
            <RewritePanel
              data={state.rewrite}
              selectedRole={state.selectedRole}
              onSubmitRecheck={handleSubmitRecheck}
              onChangeRole={handleChangeRole}
              isRechecking={state.step === 'rechecking'}
            />
          </div>
        )}

        {/* Recheck panel — always rendered when available, hidden via display:none */}
        {(state.step === 'done' || state.step === 'rechecking' || state.rechecks.length > 0) && (
          <div style={{ display: activeTab === 'recheck' ? 'block' : 'none' }}>
            <RecheckPanel
              rechecks={state.rechecks}
              isRechecking={state.step === 'rechecking'}
              onBackToEdit={handleBackToEdit}
            />
          </div>
        )}
      </div>
    </div>
  );
}
