(function initSabtanAssistant() {
  if (window.__sabtanAssistantInit) return;
  window.__sabtanAssistantInit = true;

  var STORAGE_KEY_RESEARCH = 'najd-research-ideas-react-v1';
  var STORAGE_KEY_APP = 'najd-app-ideas-react-v1';
  var AUTHOR_KEY = 'najd-ideas-active-author';
  var PENDING_OPEN_KEY = 'sabtan-assistant-open-idea';
  var THREAD_KEY = 'sabtan-assistant-thread-id';

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

  function appendMessage(log, role, text) {
    var el = document.createElement('div');
    el.className = 'sabtan-assistant-msg ' + role;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
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

  function executeToolCalls(toolCalls, log) {
    if (!toolCalls || !toolCalls.length) return;
    toolCalls.forEach(function (tc) {
      if (tc.name === 'navigate_to_page') {
        appendMessage(log, 'system', 'Opening ' + (tc.arguments.label || tc.arguments.path || 'page') + '…');
        setTimeout(function () { navigateToPage(tc.arguments); }, 400);
      } else if (tc.name === 'prefill_idea_draft') {
        appendMessage(log, 'system', 'Creating idea draft…');
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
    var root = document.createElement('div');
    root.className = 'sabtan-assistant-root';
    root.innerHTML =
      '<div class="sabtan-assistant-panel" id="sabtan-assistant-panel" hidden>' +
        '<div class="sabtan-assistant-head">' +
          '<div><h2>Vault assistant</h2><p>Sabtan Knowledge Base</p></div>' +
        '</div>' +
        '<div class="sabtan-assistant-log" id="sabtan-assistant-log"></div>' +
        '<form class="sabtan-assistant-form" id="sabtan-assistant-form">' +
          '<input class="sabtan-assistant-input" id="sabtan-assistant-input" type="text" placeholder="Ask or navigate…" autocomplete="off" />' +
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
    var threadId = null;

    try {
      threadId = sessionStorage.getItem(THREAD_KEY);
    } catch (e) {}

    appendMessage(
      log,
      'bot',
      'I can help you navigate the vault, explain the Najd programme, and capture ideas. Try: “Open research ideas” or “Draft an idea about …”.'
    );

    toggle.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) input.focus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var message = input.value.trim();
      if (!message) return;

      appendMessage(log, 'user', message);
      input.value = '';
      sendBtn.disabled = true;

      fetch(chatEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          threadId: threadId,
          variables: getVariables(),
        }),
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
            try {
              sessionStorage.setItem(THREAD_KEY, threadId);
            } catch (e) {}
          }
          if (data.text) appendMessage(log, 'bot', data.text);
          executeToolCalls(data.toolCalls, log);
        })
        .catch(function (err) {
          var msg = err.message || 'Could not reach assistant.';
          if (/Missing OPENAI/i.test(msg)) {
            msg += ' Add OPENAI_API_KEY and OPENAI_ASSISTANT_ID in Netlify, then redeploy.';
          } else if (/Failed to fetch|NetworkError/i.test(msg)) {
            msg = 'Assistant unavailable on this server. Deploy to Netlify (or run netlify dev) to enable the API.';
          }
          appendMessage(log, 'error', msg);
        })
        .finally(function () {
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
