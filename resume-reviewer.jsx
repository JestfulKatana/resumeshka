import { useState, useEffect, useRef } from "react";

const MOCK_RESUME = {
  name: "Алексей Петров",
  target_role: "Product Owner",
  sections: [
    {
      title: "О себе",
      blocks: [
        {
          id: "about-1",
          original: "Опытный специалист с большим стажем работы в IT-сфере. Умею работать в команде и решать сложные задачи. Ответственный, коммуникабельный, стрессоустойчивый.",
          annotations: [
            {
              start: 0,
              end: 56,
              type: "critical",
              comment: "Вода. Нет конкретики — какой опыт, какие технологии, какой домен?",
              suggestion: "Продакт-менеджер с 4-летним опытом запуска B2B SaaS-продуктов в финтехе"
            },
            {
              start: 57,
              end: 100,
              type: "minor",
              comment: "Штампы из 2010-х. Рекрутеры пропускают мимо глаз.",
              suggestion: "Убрать полностью. Лучше показать через конкретные кейсы."
            }
          ]
        }
      ]
    },
    {
      title: "Опыт работы",
      blocks: [
        {
          id: "exp-1",
          company: "ООО «ТехноСофт»",
          period: "2021 — настоящее время",
          role: "Менеджер продукта",
          original: "Управление продуктом. Работа с командой разработки. Проведение встреч с заказчиками. Составление требований. Контроль сроков и качества.",
          annotations: [
            {
              start: 0,
              end: 22,
              type: "major",
              comment: "Список обязанностей вместо результатов. Что именно вы сделали?",
              suggestion: "Вывел продукт из бета-версии в прод за 6 месяцев, привлёк первых 12 B2B-клиентов"
            },
            {
              start: 23,
              end: 55,
              type: "major",
              comment: "Нет метрик. Какая команда? Какие результаты встреч?",
              suggestion: "Координировал кросс-функциональную команду из 8 человек (3 бэк, 2 фронт, QA, дизайнер, аналитик)"
            },
            {
              start: 56,
              end: 140,
              type: "minor",
              comment: "Слишком общие формулировки. Добавьте числа и артефакты.",
              suggestion: "Внедрил процесс discovery-интервью: 40+ интервью → приоритизация через RICE → сокращение time-to-market на 30%"
            }
          ]
        },
        {
          id: "exp-2",
          company: "АО «Банк Прогресс»",
          period: "2019 — 2021",
          role: "Бизнес-аналитик",
          original: "Сбор и анализ требований. Написание ТЗ. Взаимодействие со стейкхолдерами. Участие в Agile-церемониях. Подготовка презентаций для руководства.",
          annotations: [
            {
              start: 0,
              end: 30,
              type: "major",
              comment: "Для перехода в PO покажите, что вы уже думали как продакт",
              suggestion: "Провёл анализ 15 клиентских сегментов, что привело к пересмотру стратегии мобильного банкинга"
            },
            {
              start: 31,
              end: 85,
              type: "minor",
              comment: "Agile-церемонии — слишком размыто. Какая роль?",
              suggestion: "Фасилитировал Sprint Review для 3 продуктовых команд, готовил демо для C-level"
            }
          ]
        }
      ]
    },
    {
      title: "Навыки",
      blocks: [
        {
          id: "skills-1",
          original: "MS Office, Jira, Confluence, Miro, Figma (базовый), SQL (базовый), Agile/Scrum, Kanban, CJM, BPMN, UML",
          annotations: [
            {
              start: 0,
              end: 10,
              type: "minor",
              comment: "MS Office не впечатляет в 2025 году",
              suggestion: "Убрать. Это подразумевается."
            },
            {
              start: 40,
              end: 112,
              type: "major",
              comment: "Для PO добавьте продуктовые навыки: A/B тесты, метрики, unit-экономика, product discovery",
              suggestion: "Добавить: Product Analytics (Amplitude/Mixpanel), A/B-тестирование, RICE/ICE, Unit-экономика, OKR"
            }
          ]
        }
      ]
    }
  ],
  overall: {
    total_score: 38,
    max_score: 100,
    dimensions: [
      { name: "Метрики и результаты", score: 2, max: 10, icon: "📊" },
      { name: "Релевантность для PO", score: 4, max: 10, icon: "🎯" },
      { name: "Конкретика опыта", score: 3, max: 10, icon: "💼" },
      { name: "Структура и читаемость", score: 5, max: 10, icon: "📋" },
      { name: "Навыки и инструменты", score: 4, max: 10, icon: "🛠" },
      { name: "Позиционирование", score: 2, max: 10, icon: "🏷" },
      { name: "ATS-совместимость", score: 6, max: 10, icon: "🤖" },
      { name: "Визуальное впечатление", score: 5, max: 10, icon: "👁" },
      { name: "Уникальность", score: 3, max: 10, icon: "✨" },
      { name: "Готовность к отправке", score: 4, max: 10, icon: "📨" }
    ],
    verdict: "Резюме написано в стиле «список обязанностей» — типичная ошибка при переходе из аналитиков в продакты. Нужна полная переработка под результаты и продуктовое мышление."
  }
};

const severityConfig = {
  critical: { color: "#FF3B30", bg: "rgba(255,59,48,0.08)", border: "rgba(255,59,48,0.3)", label: "Критично", dot: "🔴" },
  major: { color: "#FF9500", bg: "rgba(255,149,0,0.08)", border: "rgba(255,149,0,0.3)", label: "Важно", dot: "🟠" },
  minor: { color: "#007AFF", bg: "rgba(0,122,255,0.08)", border: "rgba(0,122,255,0.3)", label: "Мелочь", dot: "🔵" }
};

function ScoreRadial({ score, max, size = 160 }) {
  const [animated, setAnimated] = useState(0);
  const pct = (score / max) * 100;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const color = pct < 40 ? "#FF3B30" : pct < 70 ? "#FF9500" : "#34C759";

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(pct), 300);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ - (circ * animated / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-2px" }}>
          {score}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>из {max}</span>
      </div>
    </div>
  );
}

function DimensionBar({ dim, delay }) {
  const [width, setWidth] = useState(0);
  const pct = (dim.score / dim.max) * 100;
  const color = pct < 30 ? "#FF3B30" : pct < 50 ? "#FF9500" : pct < 70 ? "#FFD60A" : "#34C759";

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 200 + delay * 80);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <span style={{ fontSize: 15, width: 22, textAlign: "center" }}>{dim.icon}</span>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", width: 180, flexShrink: 0, fontWeight: 500 }}>{dim.name}</span>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${width}%`, background: color, borderRadius: 3,
          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)"
        }} />
      </div>
      <span style={{
        fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color, fontWeight: 700, width: 32, textAlign: "right"
      }}>
        {dim.score}
      </span>
    </div>
  );
}

function AnnotatedText({ block, activeAnnotation, setActiveAnnotation }) {
  const text = block.original;
  const annotations = [...block.annotations].sort((a, b) => a.start - b.start);

  const segments = [];
  let lastEnd = 0;

  annotations.forEach((ann, i) => {
    if (ann.start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, ann.start), annotation: null });
    }
    segments.push({ text: text.slice(ann.start, Math.min(ann.end, text.length)), annotation: ann, index: i });
    lastEnd = Math.min(ann.end, text.length);
  });
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), annotation: null });
  }

  const annId = (blockId, idx) => `${blockId}-${idx}`;

  return (
    <div style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.85)" }}>
      {segments.map((seg, i) => {
        if (!seg.annotation) return <span key={i}>{seg.text}</span>;
        const cfg = severityConfig[seg.annotation.type];
        const isActive = activeAnnotation === annId(block.id, seg.index);
        return (
          <span key={i} style={{ position: "relative", display: "inline" }}>
            <span
              onClick={() => setActiveAnnotation(isActive ? null : annId(block.id, seg.index))}
              style={{
                background: isActive ? cfg.bg.replace(/[\d.]+\)$/, "0.2)") : cfg.bg,
                borderBottom: `2px solid ${cfg.color}`,
                padding: "1px 2px",
                borderRadius: 2,
                cursor: "pointer",
                transition: "all 0.2s",
                textDecorationStyle: seg.annotation.type === "critical" ? "wavy" : "solid"
              }}
            >
              {seg.text}
            </span>
            {isActive && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100,
                width: 360, background: "#1C1C1E", border: `1px solid ${cfg.border}`,
                borderRadius: 12, padding: 16, boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.border}`,
                animation: "fadeIn 0.2s ease"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: "uppercase",
                    letterSpacing: "0.5px", background: cfg.bg, padding: "3px 8px", borderRadius: 4
                  }}>
                    {cfg.dot} {cfg.label}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "0 0 12px", lineHeight: 1.5 }}>
                  {seg.annotation.comment}
                </p>
                <div style={{
                  background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)",
                  borderRadius: 8, padding: 12
                }}>
                  <div style={{ fontSize: 11, color: "#34C759", fontWeight: 700, marginBottom: 6, letterSpacing: "0.5px" }}>
                    💡 РЕКОМЕНДАЦИЯ
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", margin: 0, lineHeight: 1.5 }}>
                    {seg.annotation.suggestion}
                  </p>
                </div>
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}

function AnnotationSummary({ annotations }) {
  const counts = { critical: 0, major: 0, minor: 0 };
  annotations.forEach(a => counts[a.type]++);
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {Object.entries(counts).filter(([, c]) => c > 0).map(([type, count]) => (
        <span key={type} style={{
          fontSize: 12, fontWeight: 600, color: severityConfig[type].color,
          background: severityConfig[type].bg, padding: "3px 10px", borderRadius: 20,
          border: `1px solid ${severityConfig[type].border}`
        }}>
          {severityConfig[type].dot} {count} {severityConfig[type].label.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

export default function ResumeReviewer() {
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [activeTab, setActiveTab] = useState("review");
  const [isLoaded, setIsLoaded] = useState(false);
  const data = MOCK_RESUME;

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const allAnnotations = data.sections.flatMap(s => s.blocks.flatMap(b => b.annotations));

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A", color: "#fff",
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(20px)", background: "rgba(10,10,10,0.8)",
        position: "sticky", top: 0, zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18,
            background: "linear-gradient(135deg, #FF3B30, #FF9500)"
          }}>📄</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Resume Screener</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>by @analyst_exe</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 3 }}>
          {[
            { id: "review", label: "🔍 Разбор" },
            { id: "scores", label: "📊 Оценки" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, cursor: "pointer",
              background: activeTab === tab.id ? "rgba(255,255,255,0.12)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.5)",
              transition: "all 0.2s"
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{
        padding: "32px 32px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        animation: isLoaded ? "slideUp 0.6s ease" : "none",
        opacity: isLoaded ? 1 : 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26, fontWeight: 800,
            background: "linear-gradient(135deg, rgba(255,59,48,0.15), rgba(255,149,0,0.15))",
            border: "1px solid rgba(255,255,255,0.08)", color: "#FF9500",
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {data.name.split(" ").map(w => w[0]).join("")}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>{data.name}</h1>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <span style={{
                fontSize: 12, background: "rgba(0,122,255,0.12)", color: "#007AFF",
                padding: "3px 10px", borderRadius: 6, fontWeight: 600,
                border: "1px solid rgba(0,122,255,0.2)"
              }}>
                🎯 Целевая роль: {data.target_role}
              </span>
              <AnnotationSummary annotations={allAnnotations} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px 80px" }}>
        {activeTab === "review" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Verdict Banner */}
            <div style={{
              background: "linear-gradient(135deg, rgba(255,59,48,0.06), rgba(255,149,0,0.06))",
              border: "1px solid rgba(255,149,0,0.15)", borderRadius: 16, padding: 20, marginBottom: 28
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#FF9500" }}>Вердикт AI</span>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.65 }}>
                {data.overall.verdict}
              </p>
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#34C759", animation: "fadeIn 1s ease infinite alternate" }} />
              Кликайте на выделенные фрагменты, чтобы увидеть комментарии
            </div>

            {data.sections.map((section, si) => (
              <div key={si} style={{
                marginBottom: 32,
                animation: `slideUp 0.5s ease ${si * 0.1}s both`
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 16
                }}>
                  <div style={{
                    width: 4, height: 20, borderRadius: 2,
                    background: si === 0 ? "#FF9500" : si === 1 ? "#FF3B30" : "#007AFF"
                  }} />
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.3px" }}>
                    {section.title}
                  </h2>
                </div>

                {section.blocks.map((block, bi) => (
                  <div key={bi} style={{
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 14, padding: 20, marginBottom: 12
                  }}>
                    {block.company && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{block.role}</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>@ {block.company}</span>
                        </div>
                        <span style={{
                          fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: "auto",
                          fontFamily: "'JetBrains Mono', monospace"
                        }}>{block.period}</span>
                      </div>
                    )}
                    <AnnotatedText block={block} activeAnnotation={activeAnnotation} setActiveAnnotation={setActiveAnnotation} />
                    <div style={{ marginTop: 12 }}>
                      <AnnotationSummary annotations={block.annotations} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === "scores" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{
              display: "flex", gap: 32, alignItems: "flex-start", marginBottom: 32
            }}>
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20, padding: 28, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 12, flexShrink: 0
              }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Общий балл</span>
                <ScoreRadial score={data.overall.total_score} max={data.overall.max_score} />
                <span style={{
                  fontSize: 12, fontWeight: 700, color: "#FF3B30",
                  background: "rgba(255,59,48,0.1)", padding: "4px 12px", borderRadius: 6
                }}>
                  Нужна переработка
                </span>
              </div>
              <div style={{
                flex: 1, background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 24
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "rgba(255,255,255,0.6)" }}>
                  Детализация по измерениям
                </h3>
                {data.overall.dimensions.map((dim, i) => (
                  <DimensionBar key={i} dim={dim} delay={i} />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Критичных", value: allAnnotations.filter(a => a.type === "critical").length, color: "#FF3B30", icon: "🔴" },
                { label: "Важных", value: allAnnotations.filter(a => a.type === "major").length, color: "#FF9500", icon: "🟠" },
                { label: "Мелких", value: allAnnotations.filter(a => a.type === "minor").length, color: "#007AFF", icon: "🔵" }
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14, padding: 20, textAlign: "center"
                }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{stat.icon}</div>
                  <div style={{
                    fontSize: 32, fontWeight: 800, color: stat.color,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>{stat.value}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
