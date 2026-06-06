(function initSabtanAssistant() {
  if (window.__sabtanAssistantInit) return;
  window.__sabtanAssistantInit = true;

  var STORAGE_KEY_RESEARCH = 'najd-research-ideas-react-v1';
  var STORAGE_KEY_APP = 'najd-app-ideas-react-v1';
  var AUTHOR_KEY = 'najd-ideas-active-author';
  var PENDING_OPEN_KEY = 'sabtan-assistant-open-idea';
  var THREAD_KEY = 'sabtan-assistant-thread-id';
  var HISTORY_KEY = 'sabtan-assistant-history';
  var PANEL_OPEN_KEY = 'sabtan-assistant-panel-open';
  var SETTINGS_KEY = 'sabtan-assistant-settings';
  var IDEAS_ACTIVITY_KEY = 'sabtan-ideas-activity-v1';
  var IDEAS_BASELINE_KEY = 'sabtan-assistant-ideas-baseline';
  var DOCK_WIDTH_DEFAULT = 420;
  var DOCK_WIDTH_MIN = 320;
  var DOCK_WIDTH_MAX = 720;
  var MAX_HISTORY = 80;
  var WELCOME_MESSAGE =
    'I can help you navigate the vault, explain the Najd programme, and capture ideas. Attach a PDF or document with 📎 or drag it onto this window. Use Dock for a side panel. Try: “Open research ideas”.';
  var MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
  var ACCEPT_ATTACHMENTS = '.pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif';
  var PANEL_PRESETS = {
    s: { w: 320, h: 420 },
    m: { w: 380, h: 520 },
    l: { w: 480, h: 640 },
  };
  var FONT_SCALES = [0.85, 1, 1.15, 1.3];

  function readSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      var cfg = raw ? JSON.parse(raw) : {};
      return {
        panelW: cfg.panelW || PANEL_PRESETS.m.w,
        panelH: cfg.panelH || PANEL_PRESETS.m.h,
        fontScale: cfg.fontScale || 1,
        sizePreset: cfg.sizePreset || 'm',
        dockMode: !!cfg.dockMode,
        dockW: cfg.dockW || DOCK_WIDTH_DEFAULT,
      };
    } catch (e) {
      return { panelW: PANEL_PRESETS.m.w, panelH: PANEL_PRESETS.m.h, fontScale: 1, sizePreset: 'm', dockMode: false, dockW: DOCK_WIDTH_DEFAULT };
    }
  }

  function writeSettings(cfg) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
    } catch (e) {}
  }

  function nearestFontScale(value) {
    var best = FONT_SCALES[0];
    FONT_SCALES.forEach(function (s) {
      if (Math.abs(s - value) < Math.abs(best - value)) best = s;
    });
    return best;
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () { reject(new Error('Could not read file.')); };
      reader.readAsDataURL(file);
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getPagePath() {
    var path = window.location.pathname.replace(/^\//, '');
    var qs = window.location.search || '';
    return (path || 'index.html') + qs;
  }

  function getIdeasCategory() {
    try {
      var v = new URLSearchParams(window.location.search).get('view');
      if (v === 'app' || v === 'research') return v;
    } catch (e) {}
    return 'research';
  }

  function isAtlasPage() {
    if (/atlas/i.test(window.location.pathname)) return true;
    return !!document.getElementById('minimap');
  }

  function getIdeasPrefillHint() {
    return [
      'IDEA CAPTURE (prefill_idea_draft): The Ideas form has 7 text fields — title, summary, motivation (required), trigger, data, methods, effort.',
      'When importing from an uploaded file or long user message, map the source into ALL applicable fields; never send only title+summary.',
      'Research category: summary=core idea, motivation=gap/why us, trigger=spark, data=datasets/fieldwork, methods=approach, effort=timeline/outcome.',
      'App category: same keys; labels differ (problem/gap, scope, implementation sketch, ship criteria).',
      'See ideas-workspace-guide.md for examples. Use category matching ideas_category when on the Ideas page.',
    ].join(' ');
  }

  function getAtlasPrefillHint() {
    return [
      'ATLAS (atlas_action): Infinite canvas research table. Use atlas_action when user is on atlas.html.',
      'Actions: add_note {title, html}, open_item {id}, recall_collection {name}.',
      'Library item IDs: nfs-roadmap, nfs-dash, nfs-phase1, nfs-p1guide, gs-main, ri-app, lib-profile, etc. — see atlas-workspace-guide.md.',
      'Chat attachments on Atlas auto-import to canvas on send (PDF/images/Word). Distinct from Ideas card attachments.',
      'Deep links: atlas.html?open=nfs-roadmap&recall=Najd Fault System',
    ].join(' ');
  }

  function getWebsiteContext() {
    if (isAtlasPage()) return getAtlasPrefillHint();
    return getIdeasPrefillHint();
  }

  function getAtlasWorkspaceContext() {
    if (!isAtlasPage()) return '';
    var lines = [
      'ATLAS WORKSPACE (live from this browser — infinite canvas research table):',
      'When the user is on Atlas, use the atlas_action client tool to add notes, open library items, or recall collections.',
      'Atlas chat attachments (PDF, images, Word) auto-import to the canvas when the user sends a message — not idea-card attachments.',
    ];

    try {
      var pendingRaw = sessionStorage.getItem('sabtan-atlas-pending-import');
      if (pendingRaw) {
        var pending = JSON.parse(pendingRaw);
        if (pending && pending.name) {
          lines.push('', 'Recent chat attachment auto-imported to canvas: ' + pending.name);
        }
      }
    } catch (e) {}

    if (!window.SabtanAtlas) {
      lines.push('', 'SabtanAtlas API not ready — retry after page load.');
      return lines.join('\n');
    }

    var summary = window.SabtanAtlas.getBoardSummary();
    lines.push(
      '',
      'Current board: ' + (summary.boardName || 'Board') + ' — ' + (summary.totalObjects || 0) + ' object(s).',
      'Objects: notes=' + (summary.objectCounts.note || 0) +
        ', embeds=' + (summary.objectCounts.embed || 0) +
        ', pdfs=' + (summary.objectCounts.pdf || 0) +
        ', images=' + (summary.objectCounts.image || 0) +
        ', other=' + (summary.objectCounts.other || 0) + '.'
    );

    var lib = window.SabtanAtlas.listLibrary();
    if (lib && lib.length) {
      lines.push('', 'Library catalog (id | title | collection):');
      lib.forEach(function (folder) {
        (folder.items || []).forEach(function (it) {
          lines.push('- ' + it.id + ' | ' + it.title + ' | ' + folder.folder);
        });
      });
    }

    return lines.join('\n');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes < 1024) return (bytes || 0) + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatWhen(ts) {
    if (!ts) return 'unknown time';
    try {
      return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return String(ts);
    }
  }

  function loadIdeasList(storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.ideas)) return parsed.ideas;
    } catch (e) {}
    return [];
  }

  function summarizeIdeaForAssistant(idea) {
    var attachments = idea.attachments || [];
    var lastAtt = null;
    attachments.forEach(function (att) {
      if (!lastAtt || (att.added || 0) > (lastAtt.added || 0)) lastAtt = att;
    });
    return {
      id: idea.id,
      updated: idea.updated || idea.created || 0,
      created: idea.created || 0,
      title: String(idea.title || '').trim() || 'Untitled idea',
      status: idea.status || 'halfbaked',
      tags: (idea.tags || []).slice(),
      attachmentCount: attachments.length,
      lastAttachmentName: lastAtt ? lastAtt.name : '',
      lastAttachmentAdded: lastAtt ? lastAtt.added : 0,
      summary: String(idea.summary || '').trim(),
      motivation: String(idea.motivation || '').trim(),
    };
  }

  function buildIdeasSnapshot(researchIdeas, appIdeas) {
    var snap = { capturedAt: Date.now(), research: {}, app: {} };
    researchIdeas.forEach(function (i) {
      snap.research[i.id] = summarizeIdeaForAssistant(i);
    });
    appIdeas.forEach(function (i) {
      snap.app[i.id] = summarizeIdeaForAssistant(i);
    });
    return snap;
  }

  function readIdeasBaseline() {
    try {
      var raw = sessionStorage.getItem(IDEAS_BASELINE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeIdeasBaseline(snapshot) {
    try {
      sessionStorage.setItem(IDEAS_BASELINE_KEY, JSON.stringify(snapshot));
    } catch (e) {}
  }

  function clearIdeasBaseline() {
    try {
      sessionStorage.removeItem(IDEAS_BASELINE_KEY);
    } catch (e) {}
  }

  function findGlobalLastIdeaAttachment(researchIdeas, appIdeas) {
    var best = null;
    function scan(ideas, category) {
      ideas.forEach(function (idea) {
        (idea.attachments || []).forEach(function (att) {
          if (!best || (att.added || 0) > (best.added || 0)) {
            best = {
              name: att.name,
              size: att.size,
              mimeType: att.mimeType,
              added: att.added,
              addedBy: att.addedBy,
              category: category,
              ideaId: idea.id,
              ideaTitle: String(idea.title || '').trim() || 'Untitled idea',
            };
          }
        });
      });
    }
    scan(researchIdeas, 'research');
    scan(appIdeas, 'app');
    return best;
  }

  function readIdeasActivityLog() {
    try {
      var raw = localStorage.getItem(IDEAS_ACTIVITY_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.slice(-20) : [];
    } catch (e) {
      return [];
    }
  }

  function appendIdeasActivity(entry) {
    try {
      var list = readIdeasActivityLog();
      list.push(Object.assign({ t: Date.now() }, entry));
      localStorage.setItem(IDEAS_ACTIVITY_KEY, JSON.stringify(list.slice(-40)));
    } catch (e) {}
  }

  function diffIdeasSnapshots(baseline, current) {
    if (!baseline) return [];
    var changes = [];
    ['research', 'app'].forEach(function (cat) {
      var prev = baseline[cat] || {};
      var cur = current[cat] || {};
      Object.keys(cur).forEach(function (id) {
        var c = cur[id];
        var p = prev[id];
        if (!p) {
          changes.push({
            type: 'new',
            category: cat,
            title: c.title,
            status: c.status,
            updated: c.updated,
          });
          return;
        }
        if (c.updated > p.updated) {
          var detail = [];
          if (c.title !== p.title) detail.push('title');
          if (c.summary !== p.summary) detail.push('summary');
          if (c.motivation !== p.motivation) detail.push('motivation');
          if (c.status !== p.status) detail.push('status → ' + c.status);
          if (c.attachmentCount > p.attachmentCount) {
            detail.push('+' + (c.attachmentCount - p.attachmentCount) + ' attachment(s)');
            if (c.lastAttachmentName) detail.push('latest file: ' + c.lastAttachmentName);
          }
          if (c.tags.join(',') !== p.tags.join(',')) detail.push('tags');
          changes.push({
            type: 'updated',
            category: cat,
            title: c.title,
            ideaId: id,
            updated: c.updated,
            changedFields: detail.length ? detail : ['edited'],
          });
        }
      });
    });
    changes.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
    return changes;
  }

  function getIdeasWorkspaceContext() {
    var research = loadIdeasList(STORAGE_KEY_RESEARCH);
    var app = loadIdeasList(STORAGE_KEY_APP);
    var snapshot = buildIdeasSnapshot(research, app);
    var baseline = readIdeasBaseline();
    var cardChanges = diffIdeasSnapshots(baseline, snapshot);
    var lastAtt = findGlobalLastIdeaAttachment(research, app);
    var activity = readIdeasActivityLog();
    var lines = [
      'IDEAS WORKSPACE (live from this browser — research + app idea cards in localStorage):',
      'When the user asks about uploads or card changes, use this section. Idea-card attachments are separate from files attached to the assistant chat widget.',
    ];

    if (lastAtt) {
      lines.push(
        '',
        'Last document attached to an idea card:',
        '- file: ' + lastAtt.name,
        '- when: ' + formatWhen(lastAtt.added),
        '- size: ' + formatBytes(lastAtt.size),
        '- idea: "' + lastAtt.ideaTitle + '" (' + lastAtt.category + ' ideas, id ' + lastAtt.ideaId + ')',
        '- attached by: ' + (lastAtt.addedBy || 'unknown')
      );
    } else {
      lines.push('', 'Last document on idea cards: none yet.');
    }

    if (cardChanges.length) {
      lines.push('', 'Card changes since the user\'s previous assistant message:');
      cardChanges.slice(0, 10).forEach(function (ch) {
        if (ch.type === 'new') {
          lines.push('- NEW ' + ch.category + ' card: "' + ch.title + '" (status: ' + ch.status + ', ' + formatWhen(ch.updated) + ')');
        } else {
          lines.push('- UPDATED ' + ch.category + ' card: "' + ch.title + '" — ' + ch.changedFields.join(', ') + ' (' + formatWhen(ch.updated) + ')');
        }
      });
      if (cardChanges.length > 10) lines.push('- …and ' + (cardChanges.length - 10) + ' more change(s)');
    } else if (baseline) {
      lines.push('', 'Card changes since previous assistant message: none detected.');
    } else {
      lines.push('', 'Card change tracking: baseline will be set after this message (first message in session).');
    }

    var recentEvents = activity.slice(-6);
    if (recentEvents.length) {
      lines.push('', 'Recent idea workspace events:');
      recentEvents.forEach(function (ev) {
        if (ev.type === 'attachment_added') {
          lines.push('- ' + formatWhen(ev.t) + ': attached "' + ev.fileName + '" to "' + ev.ideaTitle + '" (' + ev.category + ')');
        } else if (ev.type === 'idea_created') {
          lines.push('- ' + formatWhen(ev.t) + ': new ' + ev.category + ' card created');
        } else if (ev.type === 'status_changed') {
          lines.push('- ' + formatWhen(ev.t) + ': "' + ev.ideaTitle + '" (' + ev.category + ') status → ' + ev.status);
        } else if (ev.type === 'idea_deleted') {
          lines.push('- ' + formatWhen(ev.t) + ': deleted "' + ev.ideaTitle + '" (' + ev.category + ')');
        }
      });
    }

    lines.push(
      '',
      'Totals: ' + research.length + ' research ideas, ' + app.length + ' app ideas.',
      'User is currently viewing ideas_category: ' + getIdeasCategory() + '.'
    );

    return lines.join('\n');
  }

  function captureIdeasBaseline() {
    var research = loadIdeasList(STORAGE_KEY_RESEARCH);
    var app = loadIdeasList(STORAGE_KEY_APP);
    writeIdeasBaseline(buildIdeasSnapshot(research, app));
  }

  function getVariables() {
    var vars = {
      current_page: getPagePath(),
      ideas_category: getIdeasCategory(),
      user_role: 'Prof. Abdullah',
      vault_root: 'https://asabtan.sa',
      uploaded_file_name: '',
      website_context: getWebsiteContext(),
      ideas_workspace_context: getIdeasWorkspaceContext(),
    };
    if (isAtlasPage()) vars.atlas_workspace_context = getAtlasWorkspaceContext();
    return vars;
  }

  var IDEA_OPTIONAL_KEYS = ['trigger', 'data', 'methods', 'effort'];

  function pickIdeaField(args, key) {
    if (args == null) return '';
    if (args[key] != null && args[key] !== '') return String(args[key]).trim();
    if (args.fields && args.fields[key] != null) return String(args.fields[key]).trim();
    return '';
  }

  function computeHiddenSections(args) {
    if (Array.isArray(args.hidden_sections)) return args.hidden_sections;
    return IDEA_OPTIONAL_KEYS.filter(function (key) {
      return !pickIdeaField(args, key);
    });
  }

  function chatEndpoint() {
    if (window.SABTAN_ASSISTANT_ENDPOINT) return window.SABTAN_ASSISTANT_ENDPOINT;
    return '/.netlify/functions/chat';
  }

  function readHistory() {
    try {
      var raw = sessionStorage.getItem(HISTORY_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeHistory(list) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-MAX_HISTORY)));
    } catch (e) {}
  }

  function readPanelOpen() {
    try {
      return sessionStorage.getItem(PANEL_OPEN_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writePanelOpen(open) {
    try {
      sessionStorage.setItem(PANEL_OPEN_KEY, open ? '1' : '0');
    } catch (e) {}
  }

  function readThreadId() {
    try {
      return sessionStorage.getItem(THREAD_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function writeThreadId(id) {
    try {
      if (id) sessionStorage.setItem(THREAD_KEY, id);
      else sessionStorage.removeItem(THREAD_KEY);
    } catch (e) {}
  }

  function renderMessageEl(role, text, attachmentName) {
    var el = document.createElement('div');
    el.className = 'sabtan-assistant-msg ' + role;
    el.textContent = text;
    if (attachmentName) {
      var tag = document.createElement('span');
      tag.className = 'sabtan-assistant-attach-tag';
      tag.textContent = '📎 ' + attachmentName;
      el.appendChild(document.createElement('br'));
      el.appendChild(tag);
    }
    return el;
  }

  function appendMessage(log, role, text, attachmentName) {
    var el = renderMessageEl(role, text, attachmentName);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  var THINKING_ID = 'sabtan-assistant-thinking';

  function showThinking(log, toggleEl) {
    hideThinking(toggleEl);
    var el = document.createElement('div');
    el.className = 'sabtan-assistant-msg bot sabtan-assistant-thinking';
    el.id = THINKING_ID;
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-busy', 'true');
    el.innerHTML =
      '<span class="sabtan-assistant-thinking-icon" aria-hidden="true">✦</span>' +
      '<span class="sabtan-assistant-thinking-body">' +
        '<span class="sabtan-assistant-thinking-dots" aria-hidden="true">' +
          '<span></span><span></span><span></span>' +
        '</span>' +
        '<span class="sabtan-assistant-thinking-label">Thinking…</span>' +
      '</span>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    if (toggleEl) toggleEl.classList.add('is-thinking');
  }

  function hideThinking(toggleEl) {
    var el = document.getElementById(THINKING_ID);
    if (el) el.remove();
    if (toggleEl) toggleEl.classList.remove('is-thinking');
  }

  function navigateToPage(args) {
    if (trySamePageVaultAction(args)) return;

    var href = buildNavHref(args);
    if (!href) return;
    if (/^https?:\/\//i.test(href)) {
      window.location.href = href;
      return;
    }
    if (href.charAt(0) !== '/') href = '/' + href;
    window.location.href = href;
  }

  function buildNavHref(args) {
    var path = String(args.path || '').trim();
    if (!path) return '';

    var section = args.section ? String(args.section).trim().toLowerCase().replace(/\s+/g, '-') : '';
    var open = args.open ? String(args.open).trim() : '';
    var recall = args.recall ? String(args.recall).trim() : '';

    if (/^https?:\/\//i.test(path)) {
      try {
        var abs = new URL(path);
        if (section) abs.searchParams.set('section', section);
        if (open) abs.searchParams.set('open', open);
        if (recall) abs.searchParams.set('recall', recall);
        return abs.href;
      } catch (e) {
        return path;
      }
    }

    var split = path.split('?');
    var base = split[0];
    var params = new URLSearchParams(split[1] || '');
    if (section) params.set('section', section);
    if (open) params.set('open', open);
    if (recall) params.set('recall', recall);
    if (base.charAt(0) !== '/') base = '/' + base;
    var qs = params.toString();
    return qs ? base + '?' + qs : base;
  }

  function pathsMatch(currentPath, targetPath) {
    var cur = String(currentPath || '').replace(/^\//, '').split('?')[0].toLowerCase();
    var tgt = String(targetPath || '').replace(/^\//, '').split('?')[0].toLowerCase();
    return cur === tgt || cur.endsWith('/' + tgt) || tgt.endsWith('/' + cur);
  }

  function trySamePageVaultAction(args) {
    var path = String(args.path || '').trim().split('?')[0];
    if (!pathsMatch(window.location.pathname, path)) return false;

    if (args.section && window.SabtanPaper1Guide && typeof window.SabtanPaper1Guide.openSection === 'function') {
      window.SabtanPaper1Guide.openSection(args.section);
      return true;
    }

    if (args.open && /research-ideas/i.test(window.location.pathname)) {
      window.dispatchEvent(new CustomEvent('sabtan-assistant-vault-open', {
        detail: {
          open: String(args.open),
          category: getIdeasCategory(),
        },
      }));
      return true;
    }

    if (isAtlasPage() && window.SabtanAtlas) {
      if (args.open && typeof window.SabtanAtlas.openItem === 'function') {
        window.SabtanAtlas.openItem(String(args.open));
        return true;
      }
      if (args.recall && typeof window.SabtanAtlas.recallCollection === 'function') {
        String(args.recall).split(',').filter(Boolean).forEach(function (name) {
          window.SabtanAtlas.recallCollection(name.trim());
        });
        return true;
      }
    }

    return false;
  }

  function executeAtlasAction(args) {
    if (!window.SabtanAtlas) return false;
    var action = String(args.action || '').trim();
    if (action === 'add_note') {
      window.SabtanAtlas.addNote({
        title: String(args.title || 'Note'),
        html: String(args.html || args.body || ''),
      });
      return true;
    }
    if (action === 'open_item' && args.id) {
      window.SabtanAtlas.openItem(String(args.id));
      return true;
    }
    if (action === 'recall_collection' && args.name) {
      window.SabtanAtlas.recallCollection(String(args.name));
      return true;
    }
    if (action === 'import_chat_attachment') {
      return true;
    }
    return false;
  }

  function prefillIdeaDraft(args) {
    var category = args.category === 'app' ? 'app' : 'research';
    var storageKey = category === 'app' ? STORAGE_KEY_APP : STORAGE_KEY_RESEARCH;
    var state;

    try {
      state = JSON.parse(localStorage.getItem(storageKey) || '');
    } catch (e) {
      state = null;
    }
    if (!state || !Array.isArray(state.ideas)) state = { ideas: [] };

    var fields = {
      title: pickIdeaField(args, 'title'),
      summary: pickIdeaField(args, 'summary'),
      motivation: pickIdeaField(args, 'motivation'),
      trigger: pickIdeaField(args, 'trigger'),
      data: pickIdeaField(args, 'data'),
      methods: pickIdeaField(args, 'methods'),
      effort: pickIdeaField(args, 'effort'),
    };

    var hidden = computeHiddenSections(args);
    var tags = Array.isArray(args.tags)
      ? args.tags.map(function (t) { return String(t).trim(); }).filter(Boolean)
      : [];

    var idea = {
      id: uid(),
      title: fields.title,
      summary: fields.summary,
      motivation: fields.motivation,
      trigger: fields.trigger,
      data: fields.data,
      methods: fields.methods,
      effort: fields.effort,
      status: 'halfbaked',
      author: localStorage.getItem(AUTHOR_KEY) || 'AS',
      tags: tags,
      comments: [],
      hiddenSections: hidden,
      assistantPrefill: true,
      created: Date.now(),
      updated: Date.now(),
    };

    state.ideas.unshift(idea);
    localStorage.setItem(storageKey, JSON.stringify(state));
    appendIdeasActivity({
      type: 'idea_created',
      category: category,
      ideaId: idea.id,
      ideaTitle: fields.title || 'Untitled idea',
      status: idea.status,
      source: 'assistant_prefill',
    });
    sessionStorage.setItem(PENDING_OPEN_KEY, JSON.stringify({ id: idea.id, category: category }));

    var onIdeas = /research-ideas/i.test(window.location.pathname);
    var currentCat = getIdeasCategory();

    if (onIdeas && currentCat === category) {
      window.location.reload();
      return;
    }

    window.location.href = '/research-ideas.html?view=' + category + '&open=' + encodeURIComponent(idea.id);
  }

  function executeToolCalls(toolCalls, log, addMessageFn) {
    if (!toolCalls || !toolCalls.length) return;
    var add = addMessageFn || appendMessage;
    toolCalls.forEach(function (tc) {
      if (tc.name === 'navigate_to_page') {
        var navLabel = tc.arguments.label || tc.arguments.path || 'page';
        if (tc.arguments.section) navLabel += ' → ' + tc.arguments.section;
        if (tc.arguments.open === 'new') navLabel += ' (new idea panel)';
        add(log, 'system', 'Opening ' + navLabel + '…');
        setTimeout(function () { navigateToPage(tc.arguments); }, 400);
      } else if (tc.name === 'prefill_idea_draft') {
        add(log, 'system', 'Creating idea draft…');
        setTimeout(function () { prefillIdeaDraft(tc.arguments); }, 400);
      } else if (tc.name === 'atlas_action') {
        var atlasLabel = tc.arguments.action || 'atlas action';
        if (tc.arguments.id) atlasLabel += ' → ' + tc.arguments.id;
        if (tc.arguments.name) atlasLabel += ' → ' + tc.arguments.name;
        add(log, 'system', 'Atlas: ' + atlasLabel + '…');
        setTimeout(function () { executeAtlasAction(tc.arguments); }, 400);
      }
    });
  }

  function isVaultHomePage() {
    var path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (!path || path === 'index.html') return true;
    if (path === 'index.html' || path === '/') return true;
    return false;
  }

  function mountNavDesignSwitch(anchorRoot) {
    if (isVaultHomePage() || isAtlasPage() || document.getElementById('sabtan-nav-design')) return;
    if (!document.getElementById('navstrip-shell')) return;

    var wrap = document.createElement('div');
    wrap.className = 'sabtan-nav-design';
    wrap.id = 'sabtan-nav-design';
    wrap.setAttribute('aria-label', 'Navigation bar style');
    wrap.innerHTML =
      '<span class="sabtan-nav-design-label">Nav style</span>' +
      '<div class="sabtan-nav-design-toggle" role="group" aria-label="Nav style">' +
        '<button type="button" class="sabtan-nav-design-btn" data-design="classic">Classic</button>' +
        '<button type="button" class="sabtan-nav-design-btn" data-design="editorial">Editorial</button>' +
        '<button type="button" class="sabtan-nav-design-btn" data-design="disc">Disc</button>' +
      '</div>';

    anchorRoot.appendChild(wrap);

    var buttons = wrap.querySelectorAll('.sabtan-nav-design-btn');

    function syncButtons(design) {
      buttons.forEach(function (btn) {
        var on = btn.dataset.design === design;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function currentDesign() {
      if (typeof window.getNavbarDesign === 'function') return window.getNavbarDesign();
      return 'classic';
    }

    syncButtons(currentDesign());

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var next = btn.dataset.design;
        if (typeof window.setNavbarDesign === 'function') {
          window.setNavbarDesign(next);
        }
        syncButtons(next);
      });
    });

    document.addEventListener('sabtan-navbar-design-changed', function (e) {
      if (e.detail && e.detail.design) syncButtons(e.detail.design);
    });
  }

  function tryMountNavDesignSwitch(anchorRoot) {
    if (isVaultHomePage() || isAtlasPage()) return;
    mountNavDesignSwitch(anchorRoot);
    if (!document.getElementById('sabtan-nav-design') && document.getElementById('navstrip-shell') === null) {
      document.addEventListener('sabtan-navstrip-mounted', function onNavMounted() {
        document.removeEventListener('sabtan-navstrip-mounted', onNavMounted);
        mountNavDesignSwitch(anchorRoot);
      });
    }
  }

  function bindAtlasAssistantAnchor(root) {
    if (!isAtlasPage() || !root) return;

    var gap = 56;

    function syncAtlasFab() {
      var minimap = document.getElementById('minimap');
      var mmToggle = document.getElementById('mmToggle');
      var toggle = root.querySelector('.sabtan-assistant-toggle');
      var fabH = toggle ? toggle.offsetHeight : 52;
      var anchor = null;

      if (minimap && !minimap.classList.contains('hidden')) {
        anchor = minimap;
      } else if (mmToggle && mmToggle.style.display !== 'none') {
        anchor = mmToggle;
      }

      if (anchor) {
        var rect = anchor.getBoundingClientRect();
        var top = rect.top - gap - fabH;
        root.style.setProperty('top', Math.max(12, top) + 'px', 'important');
        root.style.setProperty('bottom', 'auto', 'important');
        root.style.setProperty('right', Math.max(12, window.innerWidth - rect.right) + 'px', 'important');
      } else {
        root.style.setProperty('top', 'auto', 'important');
        root.style.setProperty('bottom', '18px', 'important');
        root.style.setProperty('right', '18px', 'important');
      }
    }

    syncAtlasFab();
    requestAnimationFrame(function () {
      requestAnimationFrame(syncAtlasFab);
    });
    window.addEventListener('resize', syncAtlasFab);
    window.addEventListener('sabtan-atlas-ready', syncAtlasFab);

    var minimap = document.getElementById('minimap');
    if (minimap) {
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(syncAtlasFab).observe(minimap);
      }
      new MutationObserver(syncAtlasFab).observe(minimap, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }

    var mmToggle = document.getElementById('mmToggle');
    var mmX = document.getElementById('mmX');
    if (mmToggle) mmToggle.addEventListener('click', function () { setTimeout(syncAtlasFab, 0); });
    if (mmX) mmX.addEventListener('click', function () { setTimeout(syncAtlasFab, 0); });
  }

  function mountUI() {
    var settings = readSettings();
    var pendingAttachment = null;
    var chatHistory = readHistory();
    var threadId = readThreadId();

    function addMessage(log, role, text, attachmentName, persist) {
      if (persist !== false) {
        chatHistory.push({
          role: role,
          text: text,
          attachmentName: attachmentName || null,
        });
        writeHistory(chatHistory);
      }
      return appendMessage(log, role, text, attachmentName);
    }

    function restoreHistory(log) {
      chatHistory.forEach(function (entry) {
        appendMessage(log, entry.role, entry.text, entry.attachmentName);
      });
    }

    var root = document.createElement('div');
    root.className = 'sabtan-assistant-root' + (isAtlasPage() ? ' sabtan-assistant-on-atlas' : '');
    root.style.setProperty('--sa-panel-w', settings.panelW + 'px');
    root.style.setProperty('--sa-panel-h', settings.panelH + 'px');
    root.style.setProperty('--sa-font-scale', String(settings.fontScale));
    root.innerHTML =
      '<div class="sabtan-assistant-panel" id="sabtan-assistant-panel" hidden>' +
        '<button type="button" class="sabtan-assistant-resize" id="sabtan-assistant-resize" title="Drag to resize" aria-label="Resize assistant window"></button>' +
        '<div class="sabtan-assistant-head">' +
          '<div class="sabtan-assistant-head-main">' +
            '<h2>Vault assistant</h2>' +
            '<p>Sabtan Knowledge Base</p>' +
          '</div>' +
          '<div class="sabtan-assistant-toolbar" aria-label="Assistant display options">' +
            '<div class="sabtan-assistant-toolgroup" role="group" aria-label="Text size">' +
              '<button type="button" class="sabtan-assistant-toolbtn" id="sabtan-assistant-font-down" title="Smaller text">A−</button>' +
              '<button type="button" class="sabtan-assistant-toolbtn" id="sabtan-assistant-font-up" title="Larger text">A+</button>' +
            '</div>' +
            '<div class="sabtan-assistant-toolgroup" role="group" aria-label="Window size">' +
              '<button type="button" class="sabtan-assistant-toolbtn" data-size="s" title="Small window">S</button>' +
              '<button type="button" class="sabtan-assistant-toolbtn" data-size="m" title="Medium window">M</button>' +
              '<button type="button" class="sabtan-assistant-toolbtn" data-size="l" title="Large window">L</button>' +
            '</div>' +
            '<button type="button" class="sabtan-assistant-toolbtn" id="sabtan-assistant-dock" title="Dock to side">Dock</button>' +
            '<button type="button" class="sabtan-assistant-toolbtn sabtan-assistant-newchat" id="sabtan-assistant-newchat" title="Start new chat">New</button>' +
          '</div>' +
        '</div>' +
        '<div class="sabtan-assistant-dropzone" id="sabtan-assistant-dropzone" hidden aria-hidden="true">' +
          '<span class="sabtan-assistant-dropzone-label">Drop file to attach</span>' +
        '</div>' +
        '<button type="button" class="sabtan-assistant-dock-resize" id="sabtan-assistant-dock-resize" title="Drag to resize dock" aria-label="Resize docked panel" hidden></button>' +
        '<div class="sabtan-assistant-log" id="sabtan-assistant-log"></div>' +
        '<div class="sabtan-assistant-pending" id="sabtan-assistant-pending">' +
          '<span>Attached:</span>' +
          '<span class="sabtan-assistant-pending-name" id="sabtan-assistant-pending-name"></span>' +
          '<button type="button" class="sabtan-assistant-pending-clear" id="sabtan-assistant-pending-clear">Remove</button>' +
        '</div>' +
        '<form class="sabtan-assistant-form" id="sabtan-assistant-form">' +
          '<input type="file" id="sabtan-assistant-file" accept="' + ACCEPT_ATTACHMENTS + '" hidden />' +
          '<button type="button" class="sabtan-assistant-attach" id="sabtan-assistant-attach" title="Attach file">📎</button>' +
          '<input class="sabtan-assistant-input" id="sabtan-assistant-input" type="text" placeholder="Ask, navigate, or attach a file…" autocomplete="off" />' +
          '<button class="sabtan-assistant-send" type="submit">Send</button>' +
        '</form>' +
      '</div>' +
      '<div class="sabtan-assistant-fab-col">' +
        '<button type="button" class="sabtan-assistant-toggle" id="sabtan-assistant-toggle" aria-expanded="false" title="Vault assistant">✦</button>' +
      '</div>';

    document.body.appendChild(root);
    tryMountNavDesignSwitch(root.querySelector('.sabtan-assistant-fab-col'));
    bindAtlasAssistantAnchor(root);

    var toggle = document.getElementById('sabtan-assistant-toggle');
    var panel = document.getElementById('sabtan-assistant-panel');
    var log = document.getElementById('sabtan-assistant-log');
    var form = document.getElementById('sabtan-assistant-form');
    var input = document.getElementById('sabtan-assistant-input');
    var sendBtn = form.querySelector('.sabtan-assistant-send');
    var attachBtn = document.getElementById('sabtan-assistant-attach');
    var fileInput = document.getElementById('sabtan-assistant-file');
    var pendingRow = document.getElementById('sabtan-assistant-pending');
    var pendingName = document.getElementById('sabtan-assistant-pending-name');
    var pendingClear = document.getElementById('sabtan-assistant-pending-clear');
    var resizeHandle = document.getElementById('sabtan-assistant-resize');
    var fontDown = document.getElementById('sabtan-assistant-font-down');
    var fontUp = document.getElementById('sabtan-assistant-font-up');
    var newChatBtn = document.getElementById('sabtan-assistant-newchat');
    var dockBtn = document.getElementById('sabtan-assistant-dock');
    var dockResize = document.getElementById('sabtan-assistant-dock-resize');
    var dropzone = document.getElementById('sabtan-assistant-dropzone');
    var sizeButtons = panel.querySelectorAll('[data-size]');
    var dragDepth = 0;

    function persistSettings() {
      writeSettings({
        panelW: settings.panelW,
        panelH: settings.panelH,
        fontScale: settings.fontScale,
        sizePreset: settings.sizePreset,
        dockMode: settings.dockMode,
        dockW: settings.dockW,
      });
    }

    function applyDockLayout() {
      var docked = settings.dockMode;
      root.classList.toggle('is-docked', docked);
      document.body.classList.toggle('sabtan-assistant-page-docked', docked);
      root.style.setProperty('--sa-dock-w', settings.dockW + 'px');
      document.documentElement.style.setProperty(
        '--sa-body-dock-inset',
        docked ? settings.dockW + 'px' : '0px'
      );
      dockBtn.textContent = docked ? 'Float' : 'Dock';
      dockBtn.title = docked ? 'Return to floating window' : 'Dock to side of screen';
      dockBtn.classList.toggle('is-active', docked);
      dockBtn.setAttribute('aria-pressed', docked ? 'true' : 'false');
      dockResize.hidden = !docked;

      if (docked) {
        panel.classList.add('open');
        panel.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        writePanelOpen(true);
      }
    }

    function setDockMode(on) {
      settings.dockMode = !!on;
      applyDockLayout();
      persistSettings();
      if (!settings.dockMode) input.focus();
    }

    function isAcceptedFile(file) {
      if (!file) return false;
      var name = String(file.name || '').toLowerCase();
      var accept = ACCEPT_ATTACHMENTS.split(',').map(function (s) { return s.trim().toLowerCase(); });
      return accept.some(function (ext) {
        if (ext.charAt(0) === '.') return name.endsWith(ext);
        return false;
      });
    }

    function queueAttachment(file, logEl) {
      if (!file) return;
      if (!isAcceptedFile(file)) {
        addMessage(logEl, 'error', 'Unsupported file type. Use PDF, text, Word, or image.');
        return;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        addMessage(logEl, 'error', 'File too large (max 10 MB).');
        return;
      }
      setPendingAttachment(file);
    }

    function showDropzone(active) {
      if (!dropzone) return;
      dropzone.hidden = !active;
      dropzone.setAttribute('aria-hidden', active ? 'false' : 'true');
      panel.classList.toggle('is-dragover', active);
    }

    function applyPanelSize() {
      root.style.setProperty('--sa-panel-w', settings.panelW + 'px');
      root.style.setProperty('--sa-panel-h', settings.panelH + 'px');
    }

    function applyFontScale() {
      root.style.setProperty('--sa-font-scale', String(settings.fontScale));
      fontDown.setAttribute('aria-disabled', settings.fontScale <= FONT_SCALES[0] ? 'true' : 'false');
      fontUp.setAttribute('aria-disabled', settings.fontScale >= FONT_SCALES[FONT_SCALES.length - 1] ? 'true' : 'false');
    }

    function syncSizeButtons() {
      sizeButtons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn.dataset.size === settings.sizePreset);
      });
    }

    function setPendingAttachment(file) {
      pendingAttachment = file || null;
      if (pendingAttachment) {
        pendingRow.classList.add('visible');
        pendingName.textContent = pendingAttachment.name;
      } else {
        pendingRow.classList.remove('visible');
        pendingName.textContent = '';
        fileInput.value = '';
      }
    }

    applyPanelSize();
    applyFontScale();
    syncSizeButtons();
    applyDockLayout();

    fontDown.addEventListener('click', function () {
      var idx = FONT_SCALES.indexOf(settings.fontScale);
      if (idx <= 0) idx = FONT_SCALES.indexOf(nearestFontScale(settings.fontScale));
      if (idx > 0) settings.fontScale = FONT_SCALES[idx - 1];
      applyFontScale();
      persistSettings();
    });

    fontUp.addEventListener('click', function () {
      var idx = FONT_SCALES.indexOf(settings.fontScale);
      if (idx < 0) idx = FONT_SCALES.indexOf(nearestFontScale(settings.fontScale));
      if (idx < FONT_SCALES.length - 1) settings.fontScale = FONT_SCALES[idx + 1];
      applyFontScale();
      persistSettings();
    });

    sizeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = PANEL_PRESETS[btn.dataset.size];
        if (!preset) return;
        settings.sizePreset = btn.dataset.size;
        settings.panelW = preset.w;
        settings.panelH = preset.h;
        applyPanelSize();
        syncSizeButtons();
        persistSettings();
      });
    });

    attachBtn.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      queueAttachment(file, log);
    });

    pendingClear.addEventListener('click', function () {
      setPendingAttachment(null);
    });

    dockBtn.addEventListener('click', function () {
      setDockMode(!settings.dockMode);
    });

    (function bindDragDrop() {
      function hasFiles(e) {
        var types = e.dataTransfer && e.dataTransfer.types;
        return types && (types.indexOf ? types.indexOf('Files') !== -1 : Array.prototype.indexOf.call(types, 'Files') !== -1);
      }

      function panelOpen() {
        return panel.classList.contains('open') && !panel.hidden;
      }

      function onDragEnter(e) {
        if (!panelOpen() || !hasFiles(e)) return;
        e.preventDefault();
        dragDepth += 1;
        showDropzone(true);
      }

      function onDragLeave(e) {
        if (!hasFiles(e)) return;
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0 || !panel.contains(e.relatedTarget)) {
          dragDepth = 0;
          showDropzone(false);
        }
      }

      function onDragOver(e) {
        if (!panelOpen() || !hasFiles(e)) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      }

      function onDrop(e) {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth = 0;
        showDropzone(false);
        var file = e.dataTransfer.files && e.dataTransfer.files[0];
        queueAttachment(file, log);
      }

      function onDragEnd() {
        dragDepth = 0;
        showDropzone(false);
      }

      panel.addEventListener('dragenter', onDragEnter);
      panel.addEventListener('dragleave', onDragLeave);
      panel.addEventListener('dragover', onDragOver);
      panel.addEventListener('drop', onDrop);
      window.addEventListener('dragend', onDragEnd);
    })();

    (function bindResize() {
      var dragging = false;
      var startX = 0;
      var startY = 0;
      var startW = 0;
      var startH = 0;

      function onMove(e) {
        if (!dragging) return;
        var dx = startX - e.clientX;
        var dy = startY - e.clientY;
        settings.panelW = Math.min(Math.max(startW + dx, 280), window.innerWidth - 24);
        settings.panelH = Math.min(Math.max(startH + dy, 320), window.innerHeight - 100);
        settings.sizePreset = 'custom';
        applyPanelSize();
        syncSizeButtons();
      }

      function onUp() {
        if (!dragging) return;
        dragging = false;
        panel.classList.remove('is-resizing');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        persistSettings();
      }

      resizeHandle.addEventListener('mousedown', function (e) {
        if (settings.dockMode) return;
        e.preventDefault();
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = settings.panelW;
        startH = settings.panelH;
        panel.classList.add('is-resizing');
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    })();

    (function bindDockResize() {
      var dragging = false;
      var startX = 0;
      var startW = 0;

      function onMove(e) {
        if (!dragging) return;
        var dx = startX - e.clientX;
        settings.dockW = Math.min(Math.max(startW + dx, DOCK_WIDTH_MIN), DOCK_WIDTH_MAX);
        applyDockLayout();
      }

      function onUp() {
        if (!dragging) return;
        dragging = false;
        panel.classList.remove('is-resizing');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        persistSettings();
      }

      dockResize.addEventListener('mousedown', function (e) {
        if (!settings.dockMode) return;
        e.preventDefault();
        dragging = true;
        startX = e.clientX;
        startW = settings.dockW;
        panel.classList.add('is-resizing');
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    })();

    log.innerHTML = '';
    if (chatHistory.length) {
      restoreHistory(log);
    } else {
      addMessage(log, 'bot', WELCOME_MESSAGE);
    }

    if (readPanelOpen()) {
      panel.classList.add('open');
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }

    newChatBtn.addEventListener('click', function () {
      chatHistory = [];
      writeHistory(chatHistory);
      writeThreadId(null);
      threadId = null;
      clearIdeasBaseline();
      log.innerHTML = '';
      addMessage(log, 'bot', WELCOME_MESSAGE);
      input.focus();
    });

    toggle.addEventListener('click', function () {
      if (settings.dockMode) {
        setDockMode(false);
        return;
      }
      var open = panel.classList.toggle('open');
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      writePanelOpen(open);
      if (open) input.focus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var message = input.value.trim();
      var attachmentFile = pendingAttachment;
      if (!message && !attachmentFile) return;

      addMessage(log, 'user', message || '(attached file)', attachmentFile ? attachmentFile.name : null);

      if (isAtlasPage() && attachmentFile) {
        try {
          sessionStorage.setItem('sabtan-atlas-pending-import', JSON.stringify({
            name: attachmentFile.name,
            at: Date.now(),
          }));
        } catch (e) {}
        if (window.SabtanAtlas && typeof window.SabtanAtlas.importFile === 'function') {
          window.SabtanAtlas.importFile(attachmentFile);
          addMessage(log, 'system', 'Imported ' + attachmentFile.name + ' to Atlas canvas');
        }
      }

      input.value = '';
      setPendingAttachment(null);
      sendBtn.disabled = true;
      showThinking(log, toggle);

      var payload = {
        message: message,
        threadId: threadId,
        variables: getVariables(),
      };

      var sendRequest = attachmentFile
        ? readFileAsBase64(attachmentFile).then(function (dataBase64) {
            payload.attachments = [{
              name: attachmentFile.name,
              mimeType: attachmentFile.type || 'application/octet-stream',
              dataBase64: dataBase64,
            }];
            payload.variables = Object.assign({}, payload.variables, {
              uploaded_file_name: attachmentFile.name,
            });
          })
        : Promise.resolve();

      sendRequest
        .then(function () {
          return fetch(chatEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return data;
          });
        })
        .then(function (data) {
          if (data.threadId) {
            threadId = data.threadId;
            writeThreadId(threadId);
          }
          if (data.text) addMessage(log, 'bot', data.text);
          executeToolCalls(data.toolCalls, log, addMessage);
          captureIdeasBaseline();
        })
        .catch(function (err) {
          var msg = err.message || 'Could not reach assistant.';
          if (/Missing OPENAI/i.test(msg)) {
            msg += ' Add OPENAI_API_KEY and OPENAI_ASSISTANT_ID in Netlify, then redeploy.';
          } else if (/Failed to fetch|NetworkError/i.test(msg)) {
            msg = 'Assistant unavailable on this server. Deploy to Netlify (or run netlify dev) to enable the API.';
          }
          addMessage(log, 'error', msg);
        })
        .finally(function () {
          hideThinking(toggle);
          sendBtn.disabled = false;
          input.focus();
        });
    });
  }

  function injectStyles() {
    if (document.querySelector('link[data-sabtan-assistant-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/shared/assistant-chat.css';
    link.setAttribute('data-sabtan-assistant-css', '1');
    document.head.appendChild(link);
  }

  window.SabtanAssistant = {
    navigateToPage: navigateToPage,
    prefillIdeaDraft: prefillIdeaDraft,
    executeAtlasAction: executeAtlasAction,
    getPendingOpenIdea: function () {
      try {
        var raw = sessionStorage.getItem(PENDING_OPEN_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(PENDING_OPEN_KEY);
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },
  };

  injectStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI);
  } else {
    mountUI();
  }
})();
