import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileText, Table2 } from 'lucide-react';

interface ExportMenuProps {
  onReport: () => void;
  onCsv: () => void;
  reportLabel?: string;
  csvLabel?: string;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ onReport, onCsv, reportLabel = 'Generate PDF report', csvLabel = 'Export CSV data' }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return <div className="export-menu" ref={rootRef}>
    <button className="btn btn-primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><Download size={15}/> Export <ChevronDown size={14}/></button>
    {open && <div className="export-menu-list" role="menu">
      <button role="menuitem" onClick={() => choose(onReport)}><FileText size={17}/><span><strong>{reportLabel}</strong><small>Evidence-formatted document</small></span></button>
      <button role="menuitem" onClick={() => choose(onCsv)}><Table2 size={17}/><span><strong>{csvLabel}</strong><small>Current role and view data</small></span></button>
    </div>}
    <style>{`.export-menu{position:relative;display:inline-flex}.export-menu-list{position:absolute;right:0;top:calc(100% + .45rem);z-index:120;width:260px;padding:.4rem;background:var(--surface-elevated);border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:var(--shadow-lg)}.export-menu-list button{width:100%;display:flex;align-items:center;gap:.65rem;padding:.7rem;text-align:left;color:var(--text-primary);background:transparent;border-radius:var(--radius-sm)}.export-menu-list button:hover{background:var(--surface-hover)}.export-menu-list span{display:grid;gap:.15rem}.export-menu-list strong{font-size:.76rem}.export-menu-list small{font-size:.67rem;color:var(--text-muted)}`}</style>
  </div>;
};
