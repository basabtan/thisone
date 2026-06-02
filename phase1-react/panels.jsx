/* Author contribution panel — morph expand from card (same pattern as Research Ideas) */
const { useState, useEffect, useMemo } = React;

function rectFromElement(el) {
  if (!el || !el.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function AuthorExpandPanel({ author, paperLabel, open, originRect, getOriginRect, onClose, reducedMotion }) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rect, setRect] = useState(null);

  const finalRect = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(720, vw * 0.92);
    const h = Math.min(Math.max(340, (author.items.length * 56) + 160), vh * 0.88, vh - 48);
    return {
      top: (vh - h) / 2,
      left: (vw - w) / 2,
      width: w,
      height: h,
    };
  }, [open, expanded, author.items.length]);

  useEffect(() => {
    let timer;
    if (open && originRect) {
      setRect(originRect);
      setMounted(true);
      setExpanded(false);
      if (reducedMotion) {
        setExpanded(true);
      } else {
        timer = setTimeout(() => setExpanded(true), 20);
      }
    } else if (!open && mounted) {
      const fresh = (getOriginRect && getOriginRect()) || rect;
      if (fresh) setRect(fresh);
      setExpanded(false);
      timer = setTimeout(() => setMounted(false), reducedMotion ? 0 : 500);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [open, originRect, reducedMotion]);

  useEffect(() => {
    if (!mounted) return undefined;
    document.body.classList.add('author-panel-open');
    return () => document.body.classList.remove('author-panel-open');
  }, [mounted]);

  if (!mounted || !author) return null;

  const target = (expanded && finalRect) ? finalRect : rect;
  const panelStyle = target ? {
    top: `${target.top}px`,
    left: `${target.left}px`,
    width: `${target.width}px`,
    height: `${target.height}px`,
    borderRadius: expanded ? '20px' : '16px',
  } : { display: 'none' };

  return ReactDOM.createPortal(
    (
      <>
        <div className={`author-panel-overlay ${expanded ? 'open' : ''}`} onClick={onClose} />
        <aside className={`author-detail-panel ${expanded ? 'open' : ''}`} style={panelStyle} role="dialog" aria-modal="true">
          <div className="author-panel-head">
            <div className="author-panel-meta">
              <span className="author-panel-paper">{paperLabel}</span>
              <div className={`ac-ini ini-${author.theme}`}>{author.ini}</div>
              <div>
                <div className="ac-name">{author.name}</div>
                <div className="ac-role">{author.role}</div>
              </div>
            </div>
            <button type="button" className="author-panel-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="author-panel-body">
            <p className="author-panel-intro">Author contributions for this paper</p>
            <ul className="ac-items visible author-panel-items">
              {author.items.map((text, i) => (
                <li
                  key={i}
                  className="ac-item"
                  style={reducedMotion ? undefined : { animationDelay: `${160 + i * 55}ms` }}
                >
                  <span className={`ac-dot dot-${author.theme === 'teal' ? 'teal' : 'amber'}`} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="author-panel-foot">
            <span>Click outside or × to collapse back into the card</span>
          </div>
        </aside>
      </>
    ),
    document.body,
  );
}

Object.assign(window, { AuthorExpandPanel, rectFromElement });
