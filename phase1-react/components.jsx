const { useState, useEffect, useRef, useCallback } = React;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

function AuthorFilterBar({ activeAuthor, onSelect }) {
  return (
    <div className="author-filter-bar">
      <span className="af-label">Filter by author</span>
      {['AS', 'BS'].map((id) => {
        const author = AUTHORS[id];
        const active = activeAuthor === id;
        const inactive = activeAuthor && !active;
        return (
          <button
            key={id}
            type="button"
            className={`af-btn ${active ? `active-${author.theme}` : ''} ${inactive ? 'inactive' : ''}`}
            onClick={() => onSelect(active ? null : id)}
          >
            <div className={`af-ini ini-${author.theme}`}>{author.ini}</div>
            <span className="af-name">{author.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function DetailTags({ tags, filterAuthor }) {
  return (
    <div className="detail-tags-row">
      {tags.map((tag, i) => {
        const hi = filterAuthor && tag.author === filterAuthor;
        const dim = filterAuthor && tag.author !== filterAuthor;
        return (
          <span
            key={i}
            className={`dtag ${hi ? 'hi' : ''} ${dim ? 'dim' : ''}`}
            data-author={tag.author}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className={`dtag-ini dtag-${tag.author === 'AS' ? 'teal' : 'amber'}`}>{tag.author}</span>
            {tag.label}
            <div className={`tip-box ${tag.tipRight ? 'right' : ''}`}>{tag.tip}</div>
          </span>
        );
      })}
    </div>
  );
}

function AuthorColumn({ author, paperId, panelAuthorId, panelOpen, onOpenAuthor }) {
  const sourceId = `${paperId}-${author.id}`;
  const isSource = panelOpen && panelAuthorId === author.id;
  const isDimmed = panelOpen && panelAuthorId !== author.id;

  return (
    <div
      className={`author-col col-${author.id} ${isDimmed ? 'dimmed' : ''}`}
      data-author-panel-source={sourceId}
    >
      <div className={`author-col-inner ${isSource ? 'morph-source' : ''}`}>
        <button
          type="button"
          className="ac-header"
          onClick={(e) => onOpenAuthor(author.id, e)}
          aria-expanded={isSource}
        >
          <div className={`ac-ini ini-${author.theme}`}>{author.ini}</div>
          <div className="ac-header-text">
            <div className="ac-name">{author.name}</div>
            <div className="ac-role">{author.role}</div>
          </div>
          <span className="ac-toggle">{isSource ? 'open' : 'expand'}</span>
        </button>
        <ul className="ac-items visible preview-items" aria-hidden={isSource}>
          {author.items.slice(0, 2).map((text, i) => (
            <li key={i} className="ac-item preview-item">
              <span className={`ac-dot dot-${author.theme === 'teal' ? 'teal' : 'amber'}`} />
              {text}
            </li>
          ))}
          {author.items.length > 2 && (
            <li className="ac-item preview-more">+ {author.items.length - 2} more — click to expand</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function AuthorColumns({ paperId, paperLabel, authors, panelAuthorId, panelOpen, onOpenAuthor, onClosePanel, originRect, reducedMotion }) {
  const panelAuthor = authors.find((a) => a.id === panelAuthorId);

  const getOriginRect = useCallback(() => {
    if (!panelAuthorId) return originRect;
    const el = document.querySelector(`[data-author-panel-source="${paperId}-${panelAuthorId}"] .author-col-inner`);
    return rectFromElement(el) || originRect;
  }, [paperId, panelAuthorId, originRect]);

  return (
    <>
      <div className={`author-cols ${panelOpen ? 'panel-active' : ''}`}>
        {authors.map((author) => (
          <AuthorColumn
            key={author.id}
            author={author}
            paperId={paperId}
            panelAuthorId={panelAuthorId}
            panelOpen={panelOpen}
            onOpenAuthor={onOpenAuthor}
          />
        ))}
      </div>
      {panelAuthor && (
        <AuthorExpandPanel
          author={panelAuthor}
          paperLabel={paperLabel}
          open={panelOpen}
          originRect={originRect}
          getOriginRect={getOriginRect}
          onClose={onClosePanel}
          reducedMotion={reducedMotion}
        />
      )}
    </>
  );
}

function PaperCard({ paper, globalAuthorFilter, reducedMotion, initialOpen }) {
  const [open, setOpen] = useState(!!initialOpen);
  const [panelAuthorId, setPanelAuthorId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [originRect, setOriginRect] = useState(null);

  useEffect(() => {
    if (!initialOpen) return undefined;
    const timer = setTimeout(() => {
      document.getElementById(`pc-${paper.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => clearTimeout(timer);
  }, [initialOpen, paper.id]);

  const toggleOpen = () => setOpen((v) => !v);

  const openAuthorPanel = (authorId, event) => {
    if (panelOpen && panelAuthorId === authorId) {
      closeAuthorPanel();
      return;
    }
    const inner = event.currentTarget.closest('.author-col-inner');
    const rect = rectFromElement(inner);
    setOriginRect(rect);
    setPanelAuthorId(authorId);
    setPanelOpen(true);
  };

  const closeAuthorPanel = () => {
    setPanelOpen(false);
    setTimeout(() => {
      setPanelAuthorId(null);
      setOriginRect(null);
    }, reducedMotion ? 0 : 500);
  };

  return (
    <article className={`paper-card ${paper.color} ${open ? 'open' : ''} ${panelOpen ? 'author-panel-open' : ''}`} id={`pc-${paper.id}`}>
      <button type="button" className="pc-top" onClick={toggleOpen} aria-expanded={open}>
        <div className={`pc-num ${paper.color}`}>{paper.num}</div>
        <div className="pc-top-main">
          <h3 className="pc-title">{paper.title}</h3>
          <div className="pc-tags">
            {paper.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        </div>
        <div className="pc-chev" aria-hidden>⌄</div>
      </button>

      <div className={`pc-body-wrap ${open ? 'open' : ''}`}>
        <div className="pc-body">
          <div className={`pc-body-inner ${open ? 'revealed' : ''}`}>
            <div className="pc-meta">
              <div>
                <div className="pc-meta-label">Target journal</div>
                <div className="journal-wrap">
                  <div className="pc-meta-val">{paper.meta.journal}</div>
                  <div className="tip-box">
                    <div className="tip-title">Alternatives</div>
                    {paper.meta.journalAlts.map((alt) => (
                      <div key={alt} className="tip-alt">{alt}</div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="pc-meta-label">Data status</div>
                <div className="pc-meta-val">{paper.meta.dataStatus}</div>
              </div>
              <div>
                <div className="pc-meta-label">Timeline</div>
                <div className="pc-meta-val">{paper.meta.timeline}</div>
              </div>
            </div>

            <div className="pc-divider" />
            <p className="pc-desc">{paper.description}</p>

            {paper.guideHref && (
              <a className="pc-ask-btn" href={paper.guideHref}>
                {paper.guideLabel}
              </a>
            )}

            <div className="pc-divider" />
            <div className="author-section-header">Author contributions — click a name to expand</div>

            <AuthorColumns
              paperId={paper.id}
              paperLabel={paper.num}
              authors={paper.authors}
              panelAuthorId={panelAuthorId}
              panelOpen={panelOpen}
              onOpenAuthor={openAuthorPanel}
              onClosePanel={closeAuthorPanel}
              originRect={originRect}
              reducedMotion={reducedMotion}
            />

            <DetailTags tags={paper.detailTags} filterAuthor={globalAuthorFilter} />
          </div>
        </div>
      </div>
    </article>
  );
}

function PhaseHero() {
  return (
    <header className="phx-hero blue">
      <div className="phx-watermark blue">I</div>
      <div className="phx-kicker blue">{PHASE1_META.kicker}</div>
      <h1 className="phx-title">{PHASE1_META.title}</h1>
      <div className="phx-badges">
        {PHASE1_META.badges.map((b) => (
          <span key={b} className="badge">{b}</span>
        ))}
      </div>
      <p className="phx-desc">{PHASE1_META.description}</p>
    </header>
  );
}
