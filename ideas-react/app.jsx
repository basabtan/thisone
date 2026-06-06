/* ════════════════════════════════════════════════════════════════
   APP — top-level wiring
   ════════════════════════════════════════════════════════════════ */
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useRef: useRefA, useCallback: useCallbackA } = React;

function getInitialCategory(){
  try {
    var p = new URLSearchParams(window.location.search).get('view');
    if (p === 'app') return 'app';
    if (p === 'research') return 'research';
  } catch (e) {}
  return 'research';
}

function rectFromElement(el){
  if(!el || !el.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function rectFromIdeaId(id){
  return rectFromElement(document.querySelector('[data-idea-id="' + id + '"]'));
}

function fallbackOriginRect(){
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

function resolveOriginRect(id, event){
  return rectFromEvent(event) || (id ? rectFromIdeaId(id) : null) || fallbackOriginRect();
}

function rectFromEvent(event){
  const el = event && event.currentTarget;
  return rectFromElement(el);
}

function IdeasCategorySwitch({ category, onCategoryChange }){
  const [spotlight, setSpotlight] = useStateA(function(){
    try { return localStorage.getItem('ideas-category-switch-seen') !== '1'; } catch (e) { return true; }
  });

  function handleChange(next){
    onCategoryChange(next);
    if(spotlight){
      setSpotlight(false);
      try { localStorage.setItem('ideas-category-switch-seen', '1'); } catch (e) {}
    }
  }

  return (
    <div className={'ideas-category-switch' + (spotlight ? ' ideas-category-switch--spotlight' : '')}
         role="tablist" aria-label="Ideas category">
      {spotlight && <span className="ideas-category-new">New</span>}
      <button type="button" role="tab"
              aria-selected={category === 'research'}
              className={'ideas-category-btn' + (category === 'research' ? ' active' : '')}
              onClick={() => handleChange('research')}>
        Research Ideas
      </button>
      <button type="button" role="tab"
              aria-selected={category === 'app'}
              className={'ideas-category-btn' + (category === 'app' ? ' active' : '')}
              onClick={() => handleChange('app')}>
        App Ideas
      </button>
    </div>
  );
}

function IdeasWorkspace({ useIdeasHook, meta, category, onCategoryChange }){
  const {
    ideas, addIdea, patchIdea, moveStatus, deleteIdea,
    addComment, removeComment, addTag, removeTag,
    addAttachments, removeAttachment,
  } = useIdeasHook();
  const [activeAuthor, setActiveAuthor] = useActiveAuthor();

  const [view, setView] = useStateA('list');
  const [search, setSearch] = useStateA('');
  const [statusFilters, setStatusFilters] = useStateA([]);
  const [tagFilters, setTagFilters] = useStateA([]);
  const [authorFilter, setAuthorFilter] = useStateA('');
  const [sort, setSort] = useStateA('updated');

  const [openId, setOpenId] = useStateA(null);
  const [panelOpen, setPanelOpen] = useStateA(false);
  const [originRect, setOriginRect] = useStateA(null);

  const [compareMode, setCompareMode] = useStateA(false);
  const [selectedIds, setSelectedIds] = useStateA([]);
  const [compareOpen, setCompareOpen] = useStateA(false);

  const [showShortcuts, setShowShortcuts] = useStateA(false);
  const [showTip, setShowTip] = useStateA(true);
  const [toast, setToast] = useStateA('');

  const searchInputRef = useRefA(null);

  useEffectA(() => {
    if(!toast) return;
    const t = setTimeout(() => setToast(''), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const attachFilesToIdea = useCallbackA(async (ideaId, fileList) => {
    if(!ideaId || !fileList?.length) return;
    try {
      const attachments = await readFilesAsAttachments(fileList, activeAuthor);
      if(!attachments.length) return;
      addAttachments(ideaId, attachments);
      setToast(attachments.length === 1
        ? 'Attached “' + attachments[0].name + '”'
        : 'Attached ' + attachments.length + ' documents');
    } catch (err) {
      setToast(err?.message || 'Could not attach file');
    }
  }, [activeAuthor, addAttachments]);

  const allTags = useMemoA(() => {
    const set = new Set();
    ideas.forEach(i => (i.tags || []).forEach(t => set.add(t)));
    return [...set].sort();
  }, [ideas]);

  const filtered = useMemoA(() => {
    const q = search.trim().toLowerCase();
    return ideas
      .filter(i => {
        if(statusFilters.length && !statusFilters.includes(i.status)) return false;
        if(authorFilter && i.author !== authorFilter) return false;
        if(tagFilters.length && !tagFilters.every(t => (i.tags || []).includes(t))) return false;
        if(q){
          const hay = [
            i.title, i.summary, i.motivation, i.trigger, i.data, i.methods, i.effort,
            ...(i.tags || []),
            ...((i.attachments || []).map(a => a.name)),
          ].join(' ').toLowerCase();
          if(!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if(sort === 'created') return b.created - a.created;
        if(sort === 'comments') return (b.comments?.length || 0) - (a.comments?.length || 0);
        return (b.updated || b.created) - (a.updated || b.created);
      });
  }, [ideas, search, statusFilters, tagFilters, authorFilter, sort]);

  const openIdea = useCallbackA((id, event) => {
    if(compareMode){
      toggleSelect(id);
      return;
    }
    setOriginRect(resolveOriginRect(id, event));
    setOpenId(id);
    setPanelOpen(true);
  }, [compareMode]);

  const getOriginRect = useCallbackA(() => {
    if(!openId) return null;
    const el = document.querySelector('[data-idea-id="' + openId + '"]');
    if(!el) return originRect;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }, [openId, originRect]);

  const closePanel = useCallbackA(() => {
    setPanelOpen(false);
    setTimeout(() => { setOpenId(null); setOriginRect(null); }, 500);
  }, []);

  function onNew(event){
    const id = addIdea(activeAuthor);
    setOriginRect(resolveOriginRect(id, event));
    setOpenId(id);
    setPanelOpen(true);
  }

  const openIdeaById = useCallbackA((id) => {
    const run = () => {
      setOriginRect(rectFromIdeaId(id) || fallbackOriginRect());
      setOpenId(id);
      setPanelOpen(true);
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  function toggleSelect(id){
    setSelectedIds(prev => {
      if(prev.includes(id)) return prev.filter(x => x !== id);
      if(prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  function toggleStatusFilter(s){
    setStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }
  function toggleTagFilter(t){
    setTagFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function toggleAuthorFilter(a){
    setAuthorFilter(prev => prev === a ? '' : a);
  }
  function clearOne(kind, val){
    if(kind === 'all'){
      setStatusFilters([]); setTagFilters([]); setAuthorFilter(''); setSearch('');
    } else if(kind === 'status') setStatusFilters(p => p.filter(x => x !== val));
    else if(kind === 'tag') setTagFilters(p => p.filter(x => x !== val));
    else if(kind === 'author') setAuthorFilter('');
    else if(kind === 'search') setSearch('');
  }
  function clearAllFilters(){ clearOne('all'); }

  useEffectA(() => {
    function onKey(e){
      const inField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      if(e.key === 'Escape'){
        if(showShortcuts) setShowShortcuts(false);
        else if(compareOpen) setCompareOpen(false);
        else if(panelOpen) closePanel();
        else if(compareMode){ setCompareMode(false); setSelectedIds([]); }
        return;
      }
      if(inField) return;
      if(panelOpen) return;
      if(e.key === '/'){
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if(e.key.toLowerCase() === 'n'){
        e.preventDefault(); onNew();
      } else if(e.key === '1'){ setView('list'); }
      else if(e.key === '2'){ setView('kanban'); }
      else if(e.key === '3'){ setView('timeline'); }
      else if(e.key.toLowerCase() === 'c'){
        setCompareMode(v => { if(v) setSelectedIds([]); return !v; });
      } else if(e.key === '?' || (e.shiftKey && e.key === '/')){
        e.preventDefault(); setShowShortcuts(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, compareOpen, compareMode, showShortcuts, closePanel]);

  useEffectA(() => {
    const t = setTimeout(() => setShowTip(false), 12000);
    return () => clearTimeout(t);
  }, []);

  const deepLinkHandled = useRefA(false);

  useEffectA(() => {
    function stripOpenParam(){
      try {
        var url = new URL(window.location.href);
        if (!url.searchParams.has('open')) return;
        url.searchParams.delete('open');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      } catch (e) {}
    }

    function applyPending(pending, fromSession){
      if (!pending) return;
      if (pending.category && pending.category !== category) {
        if (fromSession) {
          onCategoryChange(pending.category);
        }
        return;
      }
      if (pending.open === 'new') {
        deepLinkHandled.current = true;
        stripOpenParam();
        if (fromSession) sessionStorage.removeItem('sabtan-assistant-open-idea');
        onNew();
        return;
      }
      if (!pending.id) return;
      if (!ideas.some(function (i) { return i.id === pending.id; })) return;
      deepLinkHandled.current = true;
      stripOpenParam();
      if (fromSession) sessionStorage.removeItem('sabtan-assistant-open-idea');
      openIdeaById(pending.id);
    }

    if (deepLinkHandled.current) return;

    try {
      var raw = sessionStorage.getItem('sabtan-assistant-open-idea');
      if (raw) {
        applyPending(JSON.parse(raw), true);
        return;
      }
    } catch (e) {}

    try {
      var openParam = new URLSearchParams(window.location.search).get('open');
      if (!openParam) return;
      applyPending(
        openParam === 'new'
          ? { open: 'new', category: category }
          : { id: openParam, category: category },
        false
      );
    } catch (e) {}
  }, [ideas, category, onCategoryChange, openIdeaById]);

  useEffectA(() => {
    function onAssistantOpen(e){
      var detail = e && e.detail;
      if (!detail) return;
      if (detail.category && detail.category !== category) {
        onCategoryChange(detail.category);
        return;
      }
      if (detail.open === 'new') {
        onNew();
        return;
      }
      if (detail.id && ideas.some(function (i) { return i.id === detail.id; })) {
        openIdeaById(detail.id);
      }
    }
    window.addEventListener('sabtan-assistant-vault-open', onAssistantOpen);
    return () => window.removeEventListener('sabtan-assistant-vault-open', onAssistantOpen);
  }, [ideas, category, onCategoryChange, openIdeaById]);

  const currentIdea = ideas.find(i => i.id === openId);
  const selectedIdeaObjects = selectedIds.map(id => ideas.find(i => i.id === id)).filter(Boolean);

  return (
    <>
      <header className="topbar">
        <a className="tb-brand" href="Sabtan Knowledge Base/index.html">
          Sabtan Knowledge Base
        </a>
        <div className="tb-spacer"/>

        <div className="tb-search">
          <span className="tb-search-icon">⌕</span>
          <input ref={searchInputRef}
                 placeholder={'Search ' + meta.searchLabel + '… (press /)'}
                 value={search}
                 onChange={e => setSearch(e.target.value)}/>
          {search && (
            <button onClick={() => setSearch('')} style={{background:'none',border:'none',color:'var(--soft)',cursor:'pointer',fontSize:'13px'}}>×</button>
          )}
          {!search && <kbd>/</kbd>}
        </div>

        <IdeasCategorySwitch category={category} onCategoryChange={onCategoryChange} />
        <span className="react-badge">React</span>

        <div className="view-switch">
          <button className={'view-switch-btn' + (view === 'list' ? ' active' : '')}
                  onClick={() => setView('list')}>
            <span className="vs-icon">≡</span> List
          </button>
          <button className={'view-switch-btn' + (view === 'kanban' ? ' active' : '')}
                  onClick={() => setView('kanban')}>
            <span className="vs-icon">⊞</span> Board
          </button>
          <button className={'view-switch-btn' + (view === 'timeline' ? ' active' : '')}
                  onClick={() => setView('timeline')}>
            <span className="vs-icon">◷</span> Timeline
          </button>
        </div>

        <div className="as-toggle">
          <div className={'as-toggle-pill AS' + (activeAuthor === 'AS' ? ' active' : '')}
               onClick={() => setActiveAuthor('AS')}>
            <span className="as-ini-sm AS">AS</span>
          </div>
          <div className={'as-toggle-pill BS' + (activeAuthor === 'BS' ? ' active' : '')}
               onClick={() => setActiveAuthor('BS')}>
            <span className="as-ini-sm BS">BS</span>
          </div>
        </div>

        <button className="tb-icon-btn" title="Keyboard shortcuts (?)"
                onClick={() => setShowShortcuts(true)}>?</button>

        <a className="tb-link" href="najd-roadmap.html">Najd Roadmap →</a>
      </header>

      <div className="layout">
        <Sidebar
          ideas={ideas}
          filteredCount={filtered.length}
          statusFilters={statusFilters}
          tagFilters={tagFilters}
          authorFilter={authorFilter}
          allTags={allTags}
          onToggleStatus={toggleStatusFilter}
          onToggleTag={toggleTagFilter}
          onToggleAuthor={toggleAuthorFilter}
          onClearAll={clearAllFilters}
          onNew={onNew}
        />

        <main className="main">
          <div className="main-header main-header--workspace">
            <div className="main-header-text">
              <div className="workspace-label">{meta.workspaceLabel}</div>
              <div className="sub">{meta.subtitle}</div>
            </div>
            <div className="main-controls">
              <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="updated">Sort: recently edited</option>
                <option value="created">Sort: newest first</option>
                <option value="comments">Sort: most discussed</option>
              </select>
              <button className={'compare-btn' + (compareMode ? ' active' : '')}
                      onClick={() => { setCompareMode(v => !v); setSelectedIds([]); }}>
                {compareMode ? '✓ Compare mode' : '⇆ Compare'}
              </button>
            </div>
          </div>

          <ActiveFilters
            statusFilters={statusFilters}
            tagFilters={tagFilters}
            authorFilter={authorFilter}
            search={search}
            onClear={clearOne}
          />

          {filtered.length === 0 && ideas.length === 0 ? (
            <EmptyState icon="✦"
                        title={meta.emptyTitle}
                        text={meta.emptyText}
                        action={<button className="new-btn" style={{maxWidth:280,margin:'0 auto'}} onClick={onNew}><span className="plus">+</span>{meta.emptyAction}</button>}/>
          ) : view === 'list' ? (
            <ListView ideas={filtered} search={search} onOpen={openIdea}
                      compareMode={compareMode} selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onAttachFiles={attachFilesToIdea}/>
          ) : view === 'kanban' ? (
            <KanbanView ideas={filtered} search={search} onOpen={openIdea}
                        onMoveStatus={moveStatus}
                        onAttachFiles={attachFilesToIdea}/>
          ) : (
            <TimelineView ideas={filtered} search={search} onOpen={openIdea}
                          onAttachFiles={attachFilesToIdea}/>
          )}
        </main>
      </div>

      <DetailPanel
        idea={currentIdea}
        open={panelOpen}
        originRect={originRect}
        getOriginRect={getOriginRect}
        onClose={closePanel}
        activeAuthor={activeAuthor}
        category={category}
        onPatch={patchIdea}
        onDelete={deleteIdea}
        onAddComment={addComment}
        onRemoveComment={removeComment}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onAttachFiles={attachFilesToIdea}
        onRemoveAttachment={removeAttachment}
        allTags={allTags}
      />

      {compareMode && (
        <div className="compare-bar">
          <span className="compare-bar-text">
            {selectedIds.length === 0 ? 'Select 2 ideas to compare'
              : selectedIds.length === 1 ? '1 selected · pick one more'
              : '2 selected'}
          </span>
          <button className="compare-bar-btn"
                  disabled={selectedIds.length !== 2}
                  onClick={() => setCompareOpen(true)}>
            Compare →
          </button>
          <button className="compare-bar-clear"
                  onClick={() => { setCompareMode(false); setSelectedIds([]); }}>Cancel</button>
        </div>
      )}
      {compareOpen && (
        <CompareModal ideas={selectedIdeaObjects} onClose={() => setCompareOpen(false)} category={category}/>
      )}

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)}/>}
      <IdeasToast message={toast}/>

      {showTip && (
        <div className="react-feature-tip">
          <button className="tip-close" onClick={() => setShowTip(false)}>×</button>
          <div className="tip-label">⚛ React features to try</div>
          <div>Search instantly · switch views (1/2/3) · drag cards on the Board · turn on Compare mode · press <strong>?</strong> for all shortcuts</div>
        </div>
      )}
    </>
  );
}

const WORKSPACE_META = {
  research: {
    workspaceLabel: 'Research pipeline',
    subtitle: 'New research project ideas — capture, articulate, discuss',
    searchLabel: 'research ideas',
    emptyTitle: 'No research ideas yet',
    emptyText: 'When inspiration strikes — a paper, a field observation, a conversation — capture it here. You can come back and shape it later.',
    emptyAction: 'Capture your first idea',
  },
  app: {
    workspaceLabel: 'Vault & application',
    subtitle: 'Product, UI, and workflow ideas for the Knowledge Base vault',
    searchLabel: 'app ideas',
    emptyTitle: 'No app ideas yet',
    emptyText: 'Track vault features, navigation patterns, hub layouts, and tooling improvements here — separate from the research paper pipeline.',
    emptyAction: 'Capture your first app idea',
  },
};

function App(){
  const [category, setCategory] = useStateA(getInitialCategory);

  useEffectA(() => {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('view', category);
      window.history.replaceState({}, '', url);
    } catch (e) {}
  }, [category]);

  const meta = WORKSPACE_META[category];
  const ideasHook = category === 'app' ? useAppIdeas : useResearchIdeas;

  return (
    <IdeasWorkspace key={category}
                    category={category}
                    onCategoryChange={setCategory}
                    useIdeasHook={ideasHook}
                    meta={meta} />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
