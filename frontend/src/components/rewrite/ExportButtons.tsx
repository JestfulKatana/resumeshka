import { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import type { Experience, Skills } from '../../types/rewrite';

interface ExportButtonsProps {
  summary: string;
  experiences: Experience[];
  skills: Skills;
}

function buildResumeText(summary: string, experiences: Experience[], skills: Skills): string {
  const parts: string[] = [];

  parts.push('О себе');
  parts.push(summary);
  parts.push('');

  experiences.forEach((exp) => {
    parts.push(`${exp.company} — ${exp.role} (${exp.period})`);
    parts.push('');
    exp.rewritten_bullets.forEach((b, i) => parts.push(`${i + 1}. ${b}`));
    if (exp.responsibilities.length > 0) {
      parts.push('');
      exp.responsibilities.forEach((r) => parts.push(`• ${r}`));
    }
    parts.push('');
  });

  parts.push('Ключевые навыки');
  parts.push([...skills.key_competencies, ...skills.tools].join(', '));

  return parts.join('\n');
}

/** Strip [placeholder] brackets for clean export */
function cleanBullet(text: string): string {
  return text.replace(/\[([^\]]+)\]/g, '$1');
}

/** Build a print-ready HTML document for PDF export */
function buildPrintHtml(summary: string, experiences: Experience[], skills: Skills): string {
  const expHtml = experiences.map((exp) => {
    const bullets = exp.rewritten_bullets
      .map((b) => `<li>${cleanBullet(b)}</li>`)
      .join('\n');
    const responsibilities = exp.responsibilities.length > 0
      ? `<ul class="duties">${exp.responsibilities.map((r) => `<li>${r}</li>`).join('\n')}</ul>`
      : '';
    return `
      <div class="exp-block">
        <div class="exp-header">
          <strong>${exp.company} — ${exp.role}</strong>
          <span class="period">${exp.period}</span>
        </div>
        <ul>${bullets}</ul>
        ${responsibilities}
      </div>`;
  }).join('\n');

  const allSkills = [...skills.key_competencies, ...skills.tools];
  const skillsHtml = allSkills.length > 0
    ? `<h2>Ключевые навыки</h2><p class="skills">${allSkills.join(', ')}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Резюме</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px; line-height: 1.6; color: #222;
      max-width: 700px; margin: 0 auto; padding: 32px 24px;
    }
    h2 {
      font-size: 14px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; margin: 24px 0 10px; color: #333;
      border-bottom: 1.5px solid #ddd; padding-bottom: 4px;
    }
    .summary { margin-bottom: 8px; }
    .exp-block { margin-bottom: 20px; }
    .exp-header {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 6px;
    }
    .exp-header strong { font-size: 14px; }
    .period { font-size: 12px; color: #666; font-style: italic; }
    ul { padding-left: 20px; margin-top: 4px; }
    li { margin-bottom: 4px; }
    .duties { color: #555; margin-top: 8px; }
    .skills { color: #444; }
    @media print {
      body { padding: 0; }
      .exp-block { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h2>О себе</h2>
  <p class="summary">${summary}</p>

  <h2>Опыт работы</h2>
  ${expHtml}

  ${skillsHtml}
</body>
</html>`;
}

async function generateDocx(summary: string, experiences: Experience[], skills: Skills) {
  const children: Paragraph[] = [];

  // Summary
  children.push(new Paragraph({
    text: 'О себе',
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 120 },
  }));
  children.push(new Paragraph({
    text: summary,
    spacing: { after: 240 },
  }));

  // Experience
  children.push(new Paragraph({
    text: 'Опыт работы',
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 120 },
  }));

  experiences.forEach((exp) => {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${exp.company} — ${exp.role}`, bold: true, size: 24 }),
      ],
      spacing: { before: 200, after: 60 },
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: exp.period, italics: true, size: 20, color: '666666' }),
      ],
      spacing: { after: 120 },
    }));

    exp.rewritten_bullets.forEach((b) => {
      children.push(new Paragraph({
        text: `• ${cleanBullet(b)}`,
        spacing: { after: 60 },
        indent: { left: 360 },
      }));
    });
  });

  // Skills
  const allSkills = [...skills.key_competencies, ...skills.tools];
  if (allSkills.length > 0) {
    children.push(new Paragraph({
      text: 'Ключевые навыки',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    }));
    children.push(new Paragraph({
      text: allSkills.join(', '),
      spacing: { after: 120 },
    }));
  }

  const doc = new Document({
    sections: [{ children }],
    creator: 'РЕЗЮМЕШКА',
    description: 'Резюме, подготовленное с помощью РЕЗЮМЕШКА',
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'resume.docx');
}

export default function ExportButtons({ summary, experiences, skills }: ExportButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleDownloadPdf = () => {
    const html = buildPrintHtml(summary, experiences, skills);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    // Wait for content to render, then trigger print
    win.onload = () => win.print();
    // Fallback if onload doesn't fire (some browsers)
    setTimeout(() => win.print(), 300);
  };

  const handleDownloadDocx = async () => {
    await generateDocx(summary, experiences, skills);
  };

  const handleCopy = async () => {
    const text = buildResumeText(summary, experiences, skills);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buttonSecondary: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-card)',
    border: '2px solid var(--border-color)',
    borderRadius: 'var(--nb-radius-sm)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        onClick={handleDownloadPdf}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 12px',
          color: 'var(--text-on-accent)',
          background: 'var(--accent)',
          border: '2px solid var(--accent-border)',
          borderRadius: 'var(--nb-radius-sm)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        📄 PDF
      </button>
      <button onClick={handleDownloadDocx} style={buttonSecondary}>
        📝 DOCX
      </button>
      <button onClick={handleCopy} style={buttonSecondary}>
        {copied ? '✓ Готово' : '📋 Копия'}
      </button>
    </div>
  );
}
