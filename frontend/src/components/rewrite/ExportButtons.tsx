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

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportButtons({ summary, experiences, skills }: ExportButtonsProps) {
  const handleDownloadTxt = () => {
    const text = buildResumeText(summary, experiences, skills);
    downloadFile(text, 'resume.txt', 'text/plain;charset=utf-8');
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="nb-button nb-button-secondary"
        onClick={handleDownloadTxt}
        style={{
          fontSize: 13,
          padding: '8px 16px',
        }}
      >
        Скачать .txt
      </button>
    </div>
  );
}
