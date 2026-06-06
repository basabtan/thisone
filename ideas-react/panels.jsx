/* ════════════════════════════════════════════════════════════════
   PANELS — DetailPanel (slide-in edit) + CompareModal
   ════════════════════════════════════════════════════════════════ */
const { useState: useStateP, useEffect: useEffectP, useMemo: useMemoP, useRef: useRefP } = React;

function fallbackPanelOrigin(){
  if(typeof window === 'undefined') return { top: 120, left: 80, width: 280, height: 72 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(320, vw * 0.42);
  return {
    top: Math.max(96, vh * 0.28),
    left: (vw - w) / 2,
    width: w,
    height: 72,
  };
}

function fieldPreview(text, maxLen){
  const t = (text || '').trim().replace(/\s+/g, ' ');
  if(!t) return '';
  return t.length > maxLen ? t.slice(0, maxLen) + '…' : t;
}

function IdeaFieldSection({
  field, value, editing, collapsed, onCollapse, onExpand,
  updateField, enterEdit, focusField, summaryQuality,
}){
  const hasContent = !!(value || '').trim();
  const isOptional = !!field.optional;
  const isExpanded = !isOptional || !collapsed;

  function toggleCard(){
    if(!isOptional) return;
    if(isExpanded) onCollapse();
    else onExpand(editing);
  }

  function handleHeadKeyDown(e){
    if(!isOptional) return;
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      toggleCard();
    }
  }

  return (
    <div className={[
      'd-field-card',
      isOptional ? 'optional' : 'required',
      isExpanded ? 'expanded' : 'collapsed',
      hasContent ? 'has-content' : '',
      editing ? 'is-editing' : '',
    ].filter(Boolean).join(' ')}>
      <div className="d-field-card-head"
           role={isOptional ? 'button' : undefined}
           tabIndex={isOptional ? 0 : undefined}
           aria-expanded={isOptional ? isExpanded : undefined}
           onClick={isOptional ? toggleCard : undefined}
           onKeyDown={handleHeadKeyDown}>
        {isOptional && (
          <span className="d-field-card-chevron" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
        )}
        <span className="d-field-card-label">{field.label}</span>
        {isOptional && <span className="opt">optional</span>}
        {field.key === 'summary' && summaryQuality && isExpanded && (
          <span className={`quality ${summaryQuality.good ? 'good' : ''}`}>
            · {summaryQuality.label} ({(value || '').trim().length})
          </span>
        )}
        {isOptional && !isExpanded && hasContent && (
          <span className="d-field-card-preview">{fieldPreview(value, 56)}</span>
        )}
        {isOptional && !isExpanded && !hasContent && (
          <span className="d-field-card-hint">{editing ? 'Click to fill' : 'Collapsed'}</span>
        )}
      </div>

      <div className="d-field-card-body">
        <div className="d-field-card-body-inner">
          <div className="d-prompt">{field.prompt}</div>
          <AutoTextarea className="d-text"
                        placeholder={editing ? field.editPlaceholder : field.emptyLabel}
                        readOnly={!editing}
                        autoFocus={editing && focusField === field.key}
                        onDoubleClick={() => enterEdit(field.key)}
                        onClick={e => e.stopPropagation()}
                        value={value}
                        onChange={v => updateField(field.key, v)}/>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  idea, open, originRect, getOriginRect, onClose, activeAuthor, category,
  onPatch, onDelete, onAddComment, onRemoveComment, onAddTag, onRemoveTag,
  onAttachFiles, onRemoveAttachment, allTags,
}){
  const fileInputRef = useRefP(null);
  const { dragOver, dropHandlers } = useCardFileDrop(files => onAttachFiles(idea?.id, files));
  // Local draft state for fields, to keep edits buttery + dispatch on change
  const [draft, setDraft] = useStateP({});
  useEffectP(() => {
    if(idea) setDraft({
      title: idea.title || '', summary: idea.summary || '',
      motivation: idea.motivation || '', trigger: idea.trigger || '',
      data: idea.data || '', methods: idea.methods || '', effort: idea.effort || '',
    });
  }, [idea?.id]);

  const [commentText, setCommentText] = useStateP('');

  // Read mode by default — but a brand-new idea (empty title + summary)
  // opens directly into edit mode with the title focused, so capture is one click.
  const [editing, setEditing] = useStateP(false);
  const [focusField, setFocusField] = useStateP(null); // field key to auto-focus when entering edit
  useEffectP(() => {
    if(!idea){ setEditing(false); setFocusField(null); return; }
    if(idea.assistantPrefill){
      setEditing(true);
      setFocusField(null);
      var collapseEmpty = ['trigger', 'data', 'methods', 'effort'].filter(function (key) {
        return !(idea[key] || '').trim();
      });
      onPatch(idea.id, { assistantPrefill: false, hiddenSections: collapseEmpty });
      return;
    }
    const blank = !(idea.title || '').trim() && !(idea.summary || '').trim();
    setEditing(blank);
    setFocusField(blank ? 'title' : null);
  }, [idea?.id]);

  const template = useMemoP(() => getIdeaTemplate(category), [category]);
  const hiddenSections = useMemoP(() => getHiddenSections(idea), [idea?.hiddenSections, idea?.id]);

  // New fill phase: tuck empty optional cards away so title + core fields stay in focus.
  useEffectP(() => {
    if(!idea) return;
    const blank = !(idea.title || '').trim() && !(idea.summary || '').trim();
    if(!blank) return;
    if(getHiddenSections(idea).length > 0) return;
    const emptyOptional = template.fields
      .filter(f => f.optional && !(idea[f.key] || '').trim())
      .map(f => f.key);
    if(emptyOptional.length){
      onPatch(idea.id, { hiddenSections: emptyOptional });
    }
  }, [idea?.id, category]);

  useEffectP(() => {
    if(!idea || !focusField) return;
    if(!hiddenSections.includes(focusField)) return;
    onPatch(idea.id, {
      hiddenSections: hiddenSections.filter(k => k !== focusField),
    });
  }, [focusField, idea?.id]);

  function enterEdit(field){
    setEditing(true);
    if(field) setFocusField(field);
  }

  function setSectionHidden(key, hidden){
    const current = getHiddenSections(idea);
    const next = hidden
      ? [...new Set([...current, key])]
      : current.filter(k => k !== key);
    onPatch(idea.id, { hiddenSections: next });
  }

  // Morph state: mounted = in DOM, expanded = at final position
  const [mounted, setMounted] = useStateP(false);
  const [expanded, setExpanded] = useStateP(false);
  const [rect, setRect] = useStateP(null);  // currently-displayed origin rect

  // Compute the final (open) rect each render — centered modal, clear of bottom nav strip
  const finalRect = useMemoP(() => {
    if(typeof window === 'undefined') return null;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(820, vw * 0.92);
    const navClearance = (typeof document !== 'undefined' && document.body.classList.contains('has-nav-strip'))
      ? (document.body.classList.contains('ns-nav-collapsed') ? 56 : 96)
      : 28;
    const h = Math.min(vh * 0.88, vh - 32 - navClearance);
    const top = Math.max(16, (vh - h - navClearance * 0.4) / 2);
    return {
      top,
      left: (vw - w) / 2,
      width: w,
      height: h,
    };
  }, [open, expanded]);

  // Drive open / close phases. We need the browser to paint the origin rect
  // *before* we flip to final, so the CSS transition can interpolate.
  // setTimeout(0/20) is more reliable than RAF here — RAF callbacks can be
  // batched with React 18 commits and the expand setState then gets lost.
  useEffectP(() => {
    let timer;
    if(open){
      const start = originRect
        || (typeof getOriginRect === 'function' ? getOriginRect() : null)
        || fallbackPanelOrigin();
      setRect(start);
      setMounted(true);
      setExpanded(false);
      timer = setTimeout(() => setExpanded(true), 20);
    } else if(!open && mounted){
      // refresh origin: card may have scrolled since open
      const fresh = (getOriginRect && getOriginRect()) || rect;
      if(fresh) setRect(fresh);
      setExpanded(false);
      timer = setTimeout(() => setMounted(false), 500);
    }
    return () => { if(timer) clearTimeout(timer); };
  }, [open, originRect]);

  // Live "quality" indicator for the core idea field — must be called BEFORE
  // any conditional return to keep the hook order stable across renders.
  const summaryQuality = useMemoP(() => {
    const len = (draft.summary || '').trim().length;
    if(len === 0) return null;
    if(len < 80) return { label: 'A bit thin', good: false };
    if(len < 200) return { label: 'Getting there', good: false };
    if(len > 600) return { label: 'Long — consider tightening', good: false };
    return { label: 'Good length', good: true };
  }, [draft.summary]);

  if(!mounted || !idea) return null;

  const target = (expanded && finalRect) ? finalRect : rect;
  const panelStyle = target ? {
    top: target.top + 'px',
    left: target.left + 'px',
    width: target.width + 'px',
    height: target.height + 'px',
    borderRadius: expanded ? '20px' : '18px',
  } : { display: 'none' };

  function updateField(key, val){
    setDraft(d => ({ ...d, [key]: val }));
    onPatch(idea.id, { [key]: val });
  }

  function postComment(){
    const t = commentText.trim();
    if(!t) return;
    onAddComment(idea.id, activeAuthor, t);
    setCommentText('');
  }

  const showDiscussion = (draft.title || '').trim().length > 0 || (idea.comments || []).length > 0;
  const hiddenOptionalFields = template.fields.filter(f => f.optional && hiddenSections.includes(f.key));
  const hiddenEmptyCount = hiddenOptionalFields.filter(f => !(draft[f.key] || '').trim()).length;

  return (
    <>
      <div className={`panel-overlay ${expanded ? 'open' : ''}`} onClick={onClose}/>
      <aside className={`detail-panel ${expanded ? 'open' : ''} ${editing ? 'editing' : ''} ${dragOver ? 'panel-drop-over' : ''}`}
             style={panelStyle}
             {...dropHandlers}>
        {dragOver && <div className="panel-drop-hint">Drop files to attach</div>}
        <div className="panel-head">
          <div className="panel-head-meta">
            {editing
              ? <StatusSelect value={idea.status} onChange={v => onPatch(idea.id, { status: v })}/>
              : <StatusPill status={idea.status}/>}
            <AuthorChip author={idea.author}/>
            <span style={{fontSize:'10px',color:'var(--soft)',fontStyle:'italic'}}>
              created {fullDate(idea.created)} · last edited {relTime(idea.updated)}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <button className={`edit-toggle ${editing ? 'on' : ''}`}
                    onClick={() => setEditing(e => !e)}
                    title={editing ? 'Finish editing (Esc)' : 'Edit this idea'}>
              {editing ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg> Edit</>
              )}
            </button>
            <button className="panel-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="panel-body">
          <AutoTextarea className={`d-title ${editing ? 'editing' : ''}`}
                        placeholder={editing ? template.titlePlaceholder : 'Untitled idea'}
                        readOnly={!editing}
                        autoFocus={editing && focusField === 'title'}
                        onDoubleClick={() => enterEdit('title')}
                        value={draft.title} onChange={v => updateField('title', v)}/>

          <div className="d-tag-bar">
            {(idea.tags || []).map(t => (
              <span key={t} className="d-tag">
                {t}
                {editing && <span className="d-tag-x" onClick={() => onRemoveTag(idea.id, t)}>×</span>}
              </span>
            ))}
            {editing
              ? <TagInput
                  onAdd={t => onAddTag(idea.id, t)}
                  suggestions={allTags}
                  existingTags={idea.tags || []}/>
              : (idea.tags || []).length === 0 && <span className="d-tag-empty">no tags</span>}
          </div>

          <div className="d-attachments-bar">
            <IdeaAttachmentsList attachments={idea.attachments}
                                 editing={editing}
                                 onRemove={aid => onRemoveAttachment(idea.id, aid)}/>
            <input ref={fileInputRef} type="file" multiple className="d-attach-input"
                   onChange={e => {
                     if(e.target.files?.length) onAttachFiles(idea.id, e.target.files);
                     e.target.value = '';
                   }}/>
            <button type="button" className="d-attach-btn"
                    onClick={() => fileInputRef.current?.click()}>
              📎 Attach document
            </button>
            <span className="d-attach-hint">or drag a file onto this card</span>
          </div>

          {template.fields.map(field => (
            <IdeaFieldSection key={field.key}
                              field={field}
                              value={draft[field.key] || ''}
                              editing={editing}
                              collapsed={!!field.optional && hiddenSections.includes(field.key)}
                              onCollapse={() => setSectionHidden(field.key, true)}
                              onExpand={(focus) => {
                                setSectionHidden(field.key, false);
                                if(focus){
                                  if(!editing) setEditing(true);
                                  setFocusField(field.key);
                                }
                              }}
                              updateField={updateField}
                              enterEdit={enterEdit}
                              focusField={focusField}
                              summaryQuality={field.key === 'summary' ? summaryQuality : null}/>
          ))}

          {hiddenOptionalFields.length > 0 && (
            <div className="d-hidden-bar">
              <span className="d-hidden-bar-text">
                {hiddenOptionalFields.length} optional section{hiddenOptionalFields.length === 1 ? '' : 's'} hidden
                {hiddenEmptyCount > 0 && ` · ${hiddenEmptyCount} empty`}
              </span>
              <button type="button" className="d-hidden-bar-show"
                      onClick={() => onPatch(idea.id, { hiddenSections: [] })}>
                Show all
              </button>
            </div>
          )}

          {showDiscussion && (
            <div className="d-comments">
              <div className="d-comments-label">
                <span>Discussion</span>
                <span style={{fontSize:'10px',fontStyle:'italic',fontWeight:500,textTransform:'none',letterSpacing:0,color:'var(--muted)'}}>
                  {(idea.comments || []).length} comment{(idea.comments || []).length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="d-thread">
                {(idea.comments || []).length === 0 ? (
                  <div className="d-comment-empty">
                    No comments yet. Leave a question or response below — you're posting as {AUTHOR_LABEL[activeAuthor]}.
                  </div>
                ) : idea.comments.map(c => (
                  <div key={c.id} className={`d-comment ${c.who}`}>
                    <div className={`d-comment-ini ${c.who}`}>{c.who}</div>
                    <div className="d-comment-bubble">
                      <div className="d-comment-meta">
                        <span className="d-comment-author">{AUTHOR_LABEL[c.who]}</span>
                        <span className="d-comment-time">{relTime(c.t)}</span>
                        {editing && c.who === activeAuthor && (
                        <button className="d-comment-del"
                                  onClick={() => { if(confirm('Delete this comment?')) onRemoveComment(idea.id, c.id); }}>×</button>
                      )}
                      </div>
                      <div className="d-comment-text">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="d-comment-form">
                <div className={`d-comment-ini ${activeAuthor}`}>{activeAuthor}</div>
                <div>
                  <textarea className="d-comment-input"
                            placeholder="Leave a question, suggestion, or response…"
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => {
                              if((e.metaKey || e.ctrlKey) && e.key === 'Enter') postComment();
                            }}/>
                  <div className="d-comment-form-row">
                    <button className="d-comment-send" disabled={!commentText.trim()}
                            onClick={postComment}>Post comment</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="panel-foot">
          <span>
            {editing
              ? 'Editing — changes save locally as you type'
              : 'Read-only · click “Edit” or double-click any field to make changes'}
          </span>
          <button className="del-btn"
                  onClick={() => {
                    const name = (idea.title || 'this untitled idea');
                    if(confirm('Delete "' + (name.length > 60 ? name.slice(0,60)+'…' : name) + '"?')) {
                      onDelete(idea.id);
                      onClose();
                    }
                  }}>
            Delete this idea
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── COMPARE MODAL ─── */
function CompareModal({ ideas, onClose, category }){
  if(!ideas || ideas.length !== 2) return null;
  const [a, b] = ideas;
  const template = getIdeaTemplate(category);
  const ROWS = template.fields.map(f => ({ key: f.key, label: f.label }));

  return (
    <div className="compare-overlay" onClick={onClose}>
      <div className="compare-modal" onClick={e => e.stopPropagation()}>
        <div className="compare-head">
          <h2>Side-by-side comparison</h2>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <div className="compare-body">
          {[a, b].map(idea => (
            <div key={idea.id} className="compare-col">
              <div className="compare-col-meta">
                <StatusPill status={idea.status}/>
                <AuthorChip author={idea.author}/>
              </div>
              <div className="compare-col-title">{idea.title || 'Untitled'}</div>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'14px'}}>
                {(idea.tags || []).map(t => (
                  <span key={t} className="ic-tag">{t}</span>
                ))}
              </div>
              {ROWS.map(r => (
                <div key={r.key} className="compare-row">
                  <div className="compare-row-label">{r.label}</div>
                  <div className={`compare-row-text ${!idea[r.key] ? 'empty' : ''}`}>
                    {idea[r.key] || template.fields.find(f => f.key === r.key)?.emptyLabel || '— not specified —'}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { IdeaFieldSection, DetailPanel, CompareModal });
