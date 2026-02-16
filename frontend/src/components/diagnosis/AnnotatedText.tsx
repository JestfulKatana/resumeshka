import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Annotation, Severity } from '../../types/analysis';

const severityConfig: Record<Severity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: 'var(--nb-critical)', bg: 'color-mix(in srgb, var(--nb-critical) 10%, transparent)', border: 'var(--nb-critical)', label: 'Критично' },
  major: { color: 'var(--nb-major)', bg: 'color-mix(in srgb, var(--nb-major) 10%, transparent)', border: 'var(--nb-major)', label: 'Важно' },
  minor: { color: 'var(--nb-minor)', bg: 'color-mix(in srgb, var(--nb-minor) 10%, transparent)', border: 'var(--nb-minor)', label: 'Мелочь' },
};

interface AnnotatedTextProps {
  text: string;
  annotations: Annotation[];
  blockId: string;
}

interface TooltipData {
  annotation: Annotation;
  rect: DOMRect;
}

function Tooltip({ annotation, rect, onClose }: { annotation: Annotation; rect: DOMRect; onClose: () => void }) {
  const cfg = severityConfig[annotation.type];
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const tooltipRect = el.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    // Keep within viewport
    if (left + tooltipRect.width > window.innerWidth - 16) {
      left = window.innerWidth - tooltipRect.width - 16;
    }
    if (left < 16) left = 16;
    if (top + tooltipRect.height > window.innerHeight - 16) {
      top = rect.top - tooltipRect.height - 8;
    }

    setPos({ top, left });
  }, [rect]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        background: 'var(--bg-card)',
        border: `var(--nb-border-width) solid ${cfg.color}`,
        borderRadius: 'var(--nb-radius-lg)',
        padding: 16,
        boxShadow: `6px 6px 0 ${cfg.color}`,
      }}
      className="animate-fade-in"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: cfg.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: cfg.bg,
            padding: '3px 8px',
            borderRadius: 'var(--nb-radius-sm)',
            border: `2px solid ${cfg.color}`,
          }}
        >
          {cfg.label}
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
        {annotation.comment}
      </p>
      <div
        style={{
          background: 'color-mix(in srgb, var(--nb-success) 8%, transparent)',
          border: `2px solid var(--nb-success)`,
          borderRadius: 'var(--nb-radius-md)',
          padding: 12,
          boxShadow: `2px 2px 0 color-mix(in srgb, var(--nb-success) 30%, transparent)`,
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--nb-success)', fontWeight: 700, marginBottom: 6, letterSpacing: '0.5px' }}>
          РЕКОМЕНДАЦИЯ
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
          {annotation.suggestion}
        </p>
      </div>
    </div>,
    document.body
  );
}

export default function AnnotatedText({ text, annotations, blockId }: AnnotatedTextProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Build segments from annotations mapping original_text to positions in text
  const segments: { text: string; annotation: Annotation | null; index: number }[] = [];
  const sorted = [...annotations];

  // Find each annotation's original_text in the remaining text
  const positions: { start: number; end: number; annotation: Annotation; index: number }[] = [];
  sorted.forEach((ann, i) => {
    const idx = text.indexOf(ann.original_text);
    if (idx !== -1) {
      positions.push({ start: idx, end: idx + ann.original_text.length, annotation: ann, index: i });
    }
  });
  positions.sort((a, b) => a.start - b.start);

  let lastEnd = 0;
  positions.forEach((pos) => {
    if (pos.start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, pos.start), annotation: null, index: -1 });
    }
    segments.push({ text: text.slice(pos.start, pos.end), annotation: pos.annotation, index: pos.index });
    lastEnd = pos.end;
  });
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), annotation: null, index: -1 });
  }

  const handleClose = useCallback(() => setTooltip(null), []);

  return (
    <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
      {segments.map((seg, i) => {
        if (!seg.annotation) return <span key={i}>{seg.text}</span>;

        const cfg = severityConfig[seg.annotation.type];
        const isActive = tooltip?.annotation === seg.annotation;

        return (
          <span
            key={i}
            onClick={(e) => {
              if (isActive) {
                setTooltip(null);
              } else {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltip({ annotation: seg.annotation!, rect });
              }
            }}
            style={{
              background: isActive ? cfg.bg : 'color-mix(in srgb, ' + cfg.color + ' 8%, transparent)',
              borderBottom: `3px solid ${cfg.color}`,
              padding: '1px 2px',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {seg.text}
          </span>
        );
      })}
      {tooltip && (
        <Tooltip annotation={tooltip.annotation} rect={tooltip.rect} onClose={handleClose} />
      )}
    </div>
  );
}
