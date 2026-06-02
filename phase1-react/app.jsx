const { useState, useMemo } = React;

function resolveInitialPaperId() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const legacy = { pc1: 'p1', pc2: 'p2' };
  return legacy[raw] || raw;
}

function App() {
  const [globalAuthorFilter, setGlobalAuthorFilter] = useState(null);
  const reducedMotion = usePrefersReducedMotion();
  const initialPaperId = useMemo(() => resolveInitialPaperId(), []);

  return (
    <>
      <header className="topbar">
        <a className="tb-brand" href="Sabtan Knowledge Base/index.html">
          Sabtan Knowledge Base
          <span className="react-badge">React</span>
        </a>
        <span className="tb-center">Phase I · Paper cards</span>
        <a className="tb-link" href="najd-roadmap.html">Full roadmap →</a>
      </header>

      <main className={`phx-wrap ${reducedMotion ? 'reduce-motion' : ''}`}>
        <PhaseHero />
        <AuthorFilterBar activeAuthor={globalAuthorFilter} onSelect={setGlobalAuthorFilter} />

        <div className="phx-papers">
          {PHASE1_PAPERS.map((paper, i) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              globalAuthorFilter={globalAuthorFilter}
              reducedMotion={reducedMotion}
              initialOpen={paper.id === initialPaperId}
            />
          ))}
        </div>

        <footer className="phx-bottom">
          <a className="nav-btn back" href="najd-roadmap.html?layer=overview">← Back to full roadmap</a>
          <span className="phx-hint">Click an author card to expand · same morph as Research Ideas</span>
        </footer>
      </main>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
