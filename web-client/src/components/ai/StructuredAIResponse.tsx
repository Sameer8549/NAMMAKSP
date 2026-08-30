import React from 'react';

const cleanInline = (value: string) => value
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/__(.*?)__/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .trim();

export const StructuredAIResponse: React.FC<{ text: string }> = ({ text }) => {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index].trim();
    if (!raw || /^[-_*]{3,}$/.test(raw)) { index += 1; continue; }

    if (raw.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[index + 1])) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes('|')) {
        const cells = lines[index].split('|').map(cleanInline).filter(Boolean);
        if (cells.length && !cells.every(cell => /^:?-+:?$/.test(cell))) rows.push(cells);
        index += 1;
      }
      if (rows.length) blocks.push(<div className="ai-response-table-wrap" key={`table-${index}`}><table className="ai-response-table"><thead><tr>{rows[0].map((cell, cellIndex) => <th key={cellIndex}>{cell}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }

    const heading = raw.match(/^#{1,4}\s+(.+)$/) || raw.match(/^\*\*(.+?)\*\*:?$/);
    if (heading) {
      blocks.push(<h4 className="ai-response-heading" key={`heading-${index}`}>{cleanInline(heading[1])}</h4>);
      index += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(raw) || /^\d+[.)]\s+/.test(raw)) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
        if (!item) break;
        items.push(cleanInline(item[1])); index += 1;
      }
      blocks.push(<ul className="ai-response-list" key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>);
      continue;
    }

    const paragraph: string[] = [cleanInline(raw)];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^#{1,4}\s+/.test(lines[index].trim()) && !/^[-*•]\s+/.test(lines[index].trim()) && !/^\d+[.)]\s+/.test(lines[index].trim()) && !lines[index].includes('|')) {
      paragraph.push(cleanInline(lines[index])); index += 1;
    }
    blocks.push(<p className="ai-response-paragraph" key={`paragraph-${index}`}>{paragraph.join(' ')}</p>);
  }

  return <div className="ai-structured-response">{blocks.length ? blocks : <p>{cleanInline(text)}</p>}</div>;
};
