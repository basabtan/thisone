/* ════════════════════════════════════════════════════════════════
   VIEWS — List, Kanban, Timeline
   ════════════════════════════════════════════════════════════════ */
const { useState: useStateV, useRef: useRefV, useMemo: useMemoV } = React;

/* ─── LIST VIEW ─── */
function ListView({ ideas, search, onOpen, compareMode, selectedIds, onToggleSelect, onAttachFiles }){
  if(ideas.length === 0){
    return <EmptyState title="No ideas match" icon="∅"
              text="Try removing a filter or clearing the search."/>;
  }
  return (
    <div className="list-view">
      {ideas.map(idea => (
        <IdeaListCard key={idea.id} idea={idea} search={search}
                      onOpen={(e) => onOpen(idea.id, e)}
                      compareMode={compareMode}
                      selected={selectedIds.includes(idea.id)}
                      onToggleSelect={() => onToggleSelect(idea.id)}
                      onAttachFiles={onAttachFiles}/>
      ))}
    </div>
  );
}

function IdeaListCard({ idea, search, onOpen, compareMode, selected, onToggleSelect, onAttachFiles }){
  const { dragOver, dropHandlers } = useCardFileDrop(files => onAttachFiles(idea.id, files));

  return (
    <article className={`ic s-${idea.status} ${selected ? 'selected' : ''} ${dragOver ? 'ic-drop-over' : ''}`}
             data-idea-id={idea.id}
             onClick={onOpen}
             {...dropHandlers}>
      {dragOver && <div className="ic-drop-hint">Drop to attach</div>}
      <div className="ic-bar"></div>
      {compareMode && (
        <div className={`ic-checkbox ${selected ? 'checked' : ''}`}
             onClick={e => { e.stopPropagation(); onToggleSelect(); }}></div>
      )}
      <div className="ic-meta">
        <StatusPill status={idea.status}/>
        <AuthorChip author={idea.author}/>
        <span className="meta-sep">·</span>
        <span className="ic-date">{fullDate(idea.created)}</span>
        {idea.updated && idea.updated !== idea.created && (
          <>
            <span className="meta-sep">·</span>
            <span className="ic-date">edited {relTime(idea.updated)}</span>
          </>
        )}
      </div>
      <h2 className="ic-title">
        {idea.title
          ? highlightText(idea.title, search)
          : <em style={{color:'var(--soft)',fontStyle:'italic'}}>Untitled idea</em>}
      </h2>
      <div className="ic-summary">
        {idea.summary
          ? highlightText(idea.summary, search)
          : <em style={{color:'var(--soft)',fontStyle:'italic'}}>No description yet — click to expand.</em>}
      </div>
      <div className="ic-foot">
        <div className="ic-tags">
          {(idea.tags || []).map(t => {
            const matches = search && t.toLowerCase().includes(search.toLowerCase().trim()) && search.trim().length >= 2;
            return <span key={t} className={`ic-tag ${matches ? 'match' : ''}`}>{t}</span>;
          })}
        </div>
        <div className="ic-stats">
          <IdeaAttachmentStat attachments={idea.attachments}/>
          {idea.comments && idea.comments.length > 0 && (
            <span><span style={{fontStyle:'normal'}}>💬</span> {idea.comments.length}</span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── KANBAN VIEW ─── */
function KanbanView({ ideas, search, onOpen, onMoveStatus, onAttachFiles }){
  const [draggingId, setDraggingId] = useStateV(null);
  const [overCol, setOverCol] = useStateV(null);

  const byStatus = useMemoV(() => {
    const m = {};
    STATUS_OPTS.forEach(s => m[s.id] = []);
    ideas.forEach(i => { if(m[i.status]) m[i.status].push(i); });
    return m;
  }, [ideas]);

  function handleDragStart(e, id){
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    try{ e.dataTransfer.setData('text/plain', id); }catch(_){}
  }
  function handleDragOver(e, status){
    if(hasFileTransfer(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if(overCol !== status) setOverCol(status);
  }
  function handleDragLeave(e, status){
    if(overCol === status) setOverCol(null);
  }
  function handleDrop(e, status){
    if(hasFileTransfer(e)) return;
    e.preventDefault();
    if(draggingId) onMoveStatus(draggingId, status);
    setDraggingId(null); setOverCol(null);
  }
  function handleDragEnd(){ setDraggingId(null); setOverCol(null); }

  return (
    <div className="kanban">
      {STATUS_OPTS.map(s => (
        <div key={s.id}
             className={`kc ${overCol === s.id ? 'drop-target' : ''}`}
             onDragOver={e => handleDragOver(e, s.id)}
             onDragLeave={e => handleDragLeave(e, s.id)}
             onDrop={e => handleDrop(e, s.id)}>
          <div className="kc-head">
            <span className={`kc-title s-${s.id}`}>
              <span className="kc-title-dot"></span>
              {s.label}
            </span>
            <span className="kc-count">{byStatus[s.id].length}</span>
          </div>
          <div className="kc-body">
            {byStatus[s.id].length === 0 ? (
              <div className="kc-empty">{overCol === s.id ? 'Drop here' : 'Empty'}</div>
            ) : byStatus[s.id].map(idea => (
              <KanbanCard key={idea.id} idea={idea} search={search}
                          dragging={draggingId === idea.id}
                          onOpen={(e) => onOpen(idea.id, e)}
                          onAttachFiles={onAttachFiles}
                          onDragStart={e => handleDragStart(e, idea.id)}
                          onDragEnd={handleDragEnd}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ idea, search, dragging, onOpen, onAttachFiles, onDragStart, onDragEnd }){
  const { dragOver, dropHandlers } = useCardFileDrop(files => onAttachFiles(idea.id, files));

  return (
    <div className={`kc-card ${dragging ? 'dragging' : ''} ${dragOver ? 'kc-drop-over' : ''}`}
         data-idea-id={idea.id}
         draggable
         onDragStart={onDragStart}
         onDragEnd={onDragEnd}
         onClick={onOpen}
         {...dropHandlers}>
      {dragOver && <div className="ic-drop-hint">Drop to attach</div>}
      <div className="kc-card-title">
        {idea.title
          ? highlightText(idea.title, search)
          : <em style={{color:'var(--soft)',fontStyle:'italic'}}>Untitled</em>}
      </div>
      {idea.tags && idea.tags.length > 0 && (
        <div className="kc-card-tags">
          {idea.tags.slice(0, 3).map(t => <span key={t} className="kc-card-tag">{t}</span>)}
          {idea.tags.length > 3 && <span className="kc-card-tag">+{idea.tags.length - 3}</span>}
        </div>
      )}
      <div className="kc-card-foot">
        <AuthorChip author={idea.author} showName={false}/>
        <IdeaAttachmentStat attachments={idea.attachments}/>
        {idea.comments && idea.comments.length > 0 && (
          <span className="kc-card-comments">💬 {idea.comments.length}</span>
        )}
      </div>
    </div>
  );
}

/* ─── TIMELINE VIEW ─── */
function TimelineView({ ideas, search, onOpen, onAttachFiles }){
  // Group ideas by relative time
  const grouped = useMemoV(() => {
    const map = {};
    const order = ['Today','Yesterday','This week','This month','Earlier'];
    const sorted = [...ideas].sort((a,b) => (b.updated || b.created) - (a.updated || a.created));
    sorted.forEach(i => {
      const g = timeGroup(i.updated || i.created);
      if(!map[g]) map[g] = [];
      map[g].push(i);
    });
    return order.filter(g => map[g]).map(g => ({ label: g, items: map[g] }));
  }, [ideas]);

  if(ideas.length === 0){
    return <EmptyState title="Nothing on the timeline" icon="◌"
              text="Adjust filters to see ideas here."/>;
  }

  return (
    <div className="timeline">
      {grouped.map(g => (
        <div key={g.label} className="tl-group">
          <div className="tl-group-label">{g.label}</div>
          {g.items.map(idea => (
            <TimelineCard key={idea.id} idea={idea} search={search}
                          onOpen={(e) => onOpen(idea.id, e)}
                          onAttachFiles={onAttachFiles}/>
          ))}
        </div>
      ))}
    </div>
  );
}

function TimelineCard({ idea, search, onOpen, onAttachFiles }){
  const { dragOver, dropHandlers } = useCardFileDrop(files => onAttachFiles(idea.id, files));

  return (
    <div className={`tl-item s-${idea.status}`}>
      <div className="tl-dot"></div>
      <div className={`tl-card ${dragOver ? 'ic-drop-over' : ''}`}
           data-idea-id={idea.id}
           onClick={onOpen}
           {...dropHandlers}>
        {dragOver && <div className="ic-drop-hint">Drop to attach</div>}
        <div className="tl-time">
          {relTime(idea.updated || idea.created)} ·
          {idea.updated && idea.updated !== idea.created ? ' edited' : ' created'}
        </div>
        <div className="tl-title">
          {idea.title
            ? highlightText(idea.title, search)
            : <em style={{color:'var(--soft)',fontStyle:'italic'}}>Untitled idea</em>}
        </div>
        {idea.summary && (
          <div className="tl-summary">{highlightText(idea.summary, search)}</div>
        )}
        <div className="tl-meta">
          <StatusPill status={idea.status}/>
          <AuthorChip author={idea.author}/>
          <IdeaAttachmentStat attachments={idea.attachments}/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ListView, KanbanView, TimelineView });
