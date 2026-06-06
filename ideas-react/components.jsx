/* ════════════════════════════════════════════════════════════════
   COMPONENTS — shared building blocks
   ════════════════════════════════════════════════════════════════ */
const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

function StatusPill({ status }){
  const opt = STATUS_BY_ID[status] || STATUS_OPTS[0];
  return <span className={`status-pill s-${status}`}>{opt.label}</span>;
}

function AuthorChip({ author, showName = true }){
  return (
    <span className="author-chip">
      <span className={`ini ${author}`}>{author}</span>
      {showName && <span>by {AUTHOR_LABEL[author]}</span>}
    </span>
  );
}

function StatusSelect({ value, onChange }){
  return (
    <select className={`d-status-select s-${value}`}
            value={value} onChange={e => onChange(e.target.value)}
            onClick={e => e.stopPropagation()}>
      {STATUS_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

/* ─── Auto-sized textarea ─── */
function AutoTextarea({ value, onChange, placeholder, className, rows = 1, readOnly, onDoubleClick, autoFocus }){
  const ref = useRefC(null);
  useEffectC(() => {
    if(ref.current){
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value, readOnly]);
  useEffectC(() => {
    if(autoFocus && ref.current && !readOnly){
      ref.current.focus();
      const len = (value || '').length;
      try { ref.current.setSelectionRange(len, len); } catch(_){}
    }
  }, [autoFocus, readOnly]);
  return (
    <textarea ref={ref} className={className} placeholder={placeholder} rows={rows}
              readOnly={readOnly} onDoubleClick={onDoubleClick}
              value={value || ''} onChange={e => onChange(e.target.value)}/>
  );
}

/* ─── Tag autocomplete input ─── */
function TagInput({ onAdd, suggestions, existingTags }){
  const [value, setValue] = useStateC('');
  const [activeIdx, setActiveIdx] = useStateC(0);
  const [open, setOpen] = useStateC(false);
  const inputRef = useRefC(null);

  const filtered = value.trim().length > 0
    ? suggestions
        .filter(t => !existingTags.includes(t) && t.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 6)
    : [];

  function submit(tag){
    const t = (tag || value).trim();
    if(!t) return;
    onAdd(t);
    setValue(''); setOpen(false); setActiveIdx(0);
  }

  return (
    <div className="d-tag-input-wrap">
      <input
        ref={inputRef}
        className="d-tag-input"
        placeholder="+ add tag"
        value={value}
        onChange={e => { setValue(e.target.value); setOpen(true); setActiveIdx(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if(e.key === 'Enter'){
            e.preventDefault();
            if(filtered.length > 0 && activeIdx < filtered.length) submit(filtered[activeIdx]);
            else submit();
          } else if(e.key === 'ArrowDown'){
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
          } else if(e.key === 'ArrowUp'){
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, 0));
          } else if(e.key === 'Escape'){
            setValue(''); setOpen(false);
          }
        }}
      />
      {open && filtered.length > 0 && (
        <div className="d-tag-suggest">
          {filtered.map((t, i) => (
            <button key={t}
                    className={`d-tag-suggest-item ${i === activeIdx ? 'active' : ''}`}
                    onMouseDown={() => submit(t)}>{t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Active-filters bar (shows current selections + clear) ─── */
function ActiveFilters({ statusFilters, tagFilters, authorFilter, search, onClear }){
  const items = [];
  statusFilters.forEach(s => items.push({
    key: 's-' + s, label: STATUS_BY_ID[s]?.label,
    clear: () => onClear('status', s)
  }));
  tagFilters.forEach(t => items.push({
    key: 't-' + t, label: '#' + t,
    clear: () => onClear('tag', t)
  }));
  if(authorFilter) items.push({
    key: 'a-' + authorFilter, label: 'by ' + AUTHOR_LABEL[authorFilter],
    clear: () => onClear('author', authorFilter)
  });
  if(search) items.push({
    key: 'q', label: 'search: "' + search + '"',
    clear: () => onClear('search')
  });

  if(items.length === 0) return null;

  return (
    <div className="active-filters">
      <span className="af-label">Filtering by</span>
      {items.map(it => (
        <span key={it.key} className="af-chip">
          {it.label}
          <button className="af-chip-x" onClick={it.clear} title="Remove">×</button>
        </span>
      ))}
      <button className="af-chip" style={{background:'transparent',color:'var(--soft)',border:'1px dashed var(--line)'}}
              onClick={() => onClear('all')}>Clear all</button>
    </div>
  );
}

/* ─── File drop on idea cards ─── */
function useCardFileDrop(onFiles){
  const [dragOver, setDragOver] = useStateC(false);
  const depth = useRefC(0);

  function onDragEnter(e){
    if(!hasFileTransfer(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current += 1;
    setDragOver(true);
  }
  function onDragLeave(e){
    if(!hasFileTransfer(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current -= 1;
    if(depth.current <= 0){ depth.current = 0; setDragOver(false); }
  }
  function onDragOver(e){
    if(!hasFileTransfer(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }
  async function onDrop(e){
    if(!hasFileTransfer(e) || !e.dataTransfer.files?.length) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current = 0;
    setDragOver(false);
    await onFiles(e.dataTransfer.files);
  }

  return { dragOver, dropHandlers: { onDragEnter, onDragLeave, onDragOver, onDrop } };
}

function IdeaAttachmentStat({ attachments }){
  const list = attachments || [];
  if(!list.length) return null;
  const label = list.length === 1
    ? list[0].name
    : list.length + ' files';
  return (
    <span className="idea-attach-stat" title={list.map(a => a.name).join('\n')}>
      <span style={{fontStyle:'normal'}}>📎</span> {label}
    </span>
  );
}

function IdeaAttachmentsList({ attachments, editing, onRemove }){
  const list = attachments || [];
  if(!list.length) return null;
  return (
    <div className="idea-attachments">
      {list.map(att => (
        <span key={att.id} className="idea-attach-chip">
          <button type="button" className="idea-attach-open"
                  title={formatFileSize(att.size) + ' · click to open'}
                  onClick={e => { e.stopPropagation(); openIdeaAttachment(att); }}>
            📎 {att.name}
          </button>
          {editing && (
            <button type="button" className="idea-attach-rm"
                    title="Remove attachment"
                    onClick={e => { e.stopPropagation(); onRemove(att.id); }}>×</button>
          )}
        </span>
      ))}
    </div>
  );
}

function IdeasToast({ message }){
  if(!message) return null;
  return <div className="ideas-toast" role="status">{message}</div>;
}

/* ─── Empty state ─── */
function EmptyState({ icon = '∅', title, text, action }){
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-text">{text}</div>
      {action}
    </div>
  );
}

/* ─── Sidebar ─── */
function Sidebar({
  ideas, filteredCount, statusFilters, tagFilters, authorFilter,
  onToggleStatus, onToggleTag, onToggleAuthor, onClearAll, onNew,
  allTags,
}){
  const counts = useMemo(() => {
    const c = {};
    STATUS_OPTS.forEach(s => c[s.id] = 0);
    ideas.forEach(i => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [ideas]);

  const authorCounts = useMemo(() => ({
    AS: ideas.filter(i => i.author === 'AS').length,
    BS: ideas.filter(i => i.author === 'BS').length,
  }), [ideas]);

  return (
    <aside className="sidebar">
      <div className="sb-section">
        <button className="new-btn" onClick={onNew}>
          <span className="plus">+</span> New idea
        </button>
      </div>

      <div className="sb-section">
        <div className="sb-label">Showing</div>
        <div style={{fontSize:'24px',fontFamily:"'Playfair Display',serif",fontWeight:700,color:'var(--graphite)',lineHeight:1}}>
          {filteredCount} <span style={{fontSize:'13px',fontStyle:'italic',color:'var(--soft)',fontWeight:400}}>of {ideas.length}</span>
        </div>
      </div>

      <div className="sb-section">
        <div className="sb-label">Status</div>
        <div className="sb-filter-list">
          {STATUS_OPTS.map(s => (
            <button key={s.id}
                    className={`sb-filter ${statusFilters.includes(s.id) ? 'active' : ''}`}
                    onClick={() => onToggleStatus(s.id)}>
              <span style={{display:'inline-flex',alignItems:'center',gap:'8px'}}>
                <span className={`sb-stat-dot s-${s.id}`}></span>
                {s.label}
              </span>
              <span className="sb-filter-count">{counts[s.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sb-section">
        <div className="sb-label">Author</div>
        <div className="sb-filter-list">
          <button className={`sb-filter ${authorFilter === 'AS' ? 'active' : ''}`}
                  onClick={() => onToggleAuthor('AS')}>
            <span style={{display:'inline-flex',alignItems:'center',gap:'8px'}}>
              <span className="as-ini-sm AS">AS</span>
              Prof. Abdullah
            </span>
            <span className="sb-filter-count">{authorCounts.AS}</span>
          </button>
          <button className={`sb-filter ${authorFilter === 'BS' ? 'active' : ''}`}
                  onClick={() => onToggleAuthor('BS')}>
            <span style={{display:'inline-flex',alignItems:'center',gap:'8px'}}>
              <span className="as-ini-sm BS">BS</span>
              Dr. Bader
            </span>
            <span className="sb-filter-count">{authorCounts.BS}</span>
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="sb-section">
          <div className="sb-label">Tags</div>
          <div className="sb-tag-cloud">
            {allTags.map(t => (
              <button key={t}
                      className={`sb-tag ${tagFilters.includes(t) ? 'active' : ''}`}
                      onClick={() => onToggleTag(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {(statusFilters.length + tagFilters.length + (authorFilter ? 1 : 0)) > 0 && (
        <div className="sb-section">
          <button className="sb-clear" onClick={onClearAll}>Clear all filters</button>
        </div>
      )}
    </aside>
  );
}

/* ─── Keyboard shortcuts overlay ─── */
function ShortcutsOverlay({ onClose }){
  return (
    <div className="kbd-overlay" onClick={onClose}>
      <div className="kbd-modal" onClick={e => e.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        <div className="kbd-row">
          <span>New idea</span>
          <div className="kbd-keys"><span className="kbd-key">N</span></div>
        </div>
        <div className="kbd-row">
          <span>Focus search</span>
          <div className="kbd-keys"><span className="kbd-key">/</span></div>
        </div>
        <div className="kbd-row">
          <span>List view</span>
          <div className="kbd-keys"><span className="kbd-key">1</span></div>
        </div>
        <div className="kbd-row">
          <span>Kanban view</span>
          <div className="kbd-keys"><span className="kbd-key">2</span></div>
        </div>
        <div className="kbd-row">
          <span>Timeline view</span>
          <div className="kbd-keys"><span className="kbd-key">3</span></div>
        </div>
        <div className="kbd-row">
          <span>Compare mode</span>
          <div className="kbd-keys"><span className="kbd-key">C</span></div>
        </div>
        <div className="kbd-row">
          <span>Close panel / Cancel</span>
          <div className="kbd-keys"><span className="kbd-key">Esc</span></div>
        </div>
        <div className="kbd-row">
          <span>Show this help</span>
          <div className="kbd-keys"><span className="kbd-key">?</span></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  StatusPill, AuthorChip, StatusSelect, AutoTextarea, TagInput,
  useCardFileDrop, IdeaAttachmentStat, IdeaAttachmentsList, IdeasToast,
  ActiveFilters, EmptyState, Sidebar, ShortcutsOverlay,
});
