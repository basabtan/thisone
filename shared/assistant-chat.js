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

  function getVariables() {
    return {
      current_page: getPagePath(),
      ideas_category: getIdeasCategory(),
      user_role: 'Prof. Abdullah',
      vault_root: 'https://asabtan.sa',
      uploaded_file_name: '',
      website_context: '',
    };
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
    var path = String(args.path || '').trim();
    if (!path) return;
    if (/^https?:\/\//i.test(path)) {
      window.location.href = path;
      return;
    }
    if (path.charAt(0) !== '/') path = '/' + path;
    window.location.href = path;
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

    var hidden = Array.isArray(args.hidden_sections)
      ? args.hidden_sections
      : ['trigger', 'data', 'methods', 'effort'];

    var idea = {
      id: uid(),
      title: args.title || '',
      summary: args.summary || '',
      motivation: args.motivation || '',
      trigger: args.trigger || '',
      data: args.data || '',
      methods: args.methods || '',
      effort: args.effort || '',
      status: 'halfbaked',
      author: localStorage.getItem(AUTHOR_KEY) || 'AS',
      tags: [],
      comments: [],
      hiddenSections: hidden,
      created: Date.now(),
      updated: Date.now(),
    };

    state.ideas.unshift(idea);
    localStorage.setItem(storageKey, JSON.stringify(state));
    sessionStorage.setItem(PENDING_OPEN_KEY, JSON.stringify({ id: idea.id, category: category }));

    var onIdeas = /research-ideas/i.test(window.location.pathname);
    var currentCat = getIdeasCategory();

    if (onIdeas && currentCat === category) {
      window.location.reload();
      return;
    }

    window.location.href = '/research-ideas.html?view=' + category;
  }

  function executeToolCalls(toolCalls, log, addMessageFn) {
    if (!toolCalls || !toolCalls.length) return;
    var add = addMessageFn || appendMessage;
    toolCalls.forEach(function (tc) {
      if (tc.name === 'navigate_to_page') {
        add(log, 'system', 'Opening ' + (tc.arguments.label || tc.arguments.path || 'page') + '…');
        setTimeout(function () { navigateToPage(tc.arguments); }, 400);
      } else if (tc.name === 'prefill_idea_draft') {
        add(log, 'system', 'Creating idea draft…');
        setTimeout(function () { prefillIdeaDraft(tc.arguments); }, 400);
      }
    });
  }

  function isVaultHomePage() {
    var path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (!path || path === 'index.html') return true;
    if (path === 'Sabtan Knowledge Base/index.html') return true;
    return false;
  }

  function mountNavDesignSwitch(anchorRoot) {
    if (isVaultHomePage() || document.getElementById('sabtan-nav-design')) return;
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
    if (isVaultHomePage()) return;
    mountNavDesignSwitch(anchorRoot);
    if (!document.getElementById('sabtan-nav-design') && document.getElementById('navstrip-shell') === null) {
      document.addEventListener('sabtan-navstrip-mounted', function onNavMounted() {
        document.removeEventListener('sabtan-navstrip-mounted', onNavMounted);
        mountNavDesignSwitch(anchorRoot);
      });
    }
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
    root.className = 'sabtan-assistant-root';
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
