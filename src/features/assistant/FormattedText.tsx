import type { ReactNode } from 'react';

/**
 * Shows AI replies with simple formatting: **bold** text and bullet lists
 * (lines starting with "-", "*" or "•"), plus numbered lines.
 * It builds React elements — it never inserts the AI's text as raw HTML,
 * so a reply cannot inject scripts or styles into the page.
 */
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : part.replace(/\*\*/g, ''),
  );
}

export function FormattedText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="msg__list">
          {bullets.map((b, i) => <li key={i}>{renderInline(b)}</li>)}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const bullet = /^([-*•])\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[2] ?? '');
      continue;
    }
    flush();
    if (line === '') continue;
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    blocks.push(<p key={`p-${blocks.length}`}>{renderInline(heading ? (heading[1] ?? '') : line)}</p>);
  }
  flush();

  return <div className="msg__text msg__text--formatted">{blocks}</div>;
}
