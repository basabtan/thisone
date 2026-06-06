/**
 * Vault nav strip (bottom “Go to” bar on main pages).
 * Alias: navbar — when users or agents say “navbar”, they mean this strip, not arbitrary <nav> markup.
 * DOM: #navstrip-shell (mount shell), #navstrip (button row; created by this script).
 * Styles: shared/nav-strip.css
 */
(function initVaultNavStrip() {
  var NAV_CONFIG_KEY = "sabtan-nav-config";
  var DESIGN_CLASSIC = "classic";
  var DESIGN_EDITORIAL = "editorial";
  var DESIGN_DISC = "disc";
  var NAVDISC_PAIR = ["ideas", "landing"];
  var EDITORIAL_ORDER = [
    "landing",
    "atlas",
    "overview",
    "phase1",
    "ideas",
    "paper1guide",
  ];

  function normalizeDesign(d) {
    if (d === DESIGN_EDITORIAL || d === "unified") return DESIGN_EDITORIAL;
    if (d === DESIGN_DISC || d === "navdisc") return DESIGN_DISC;
    return DESIGN_CLASSIC;
  }

  function applyNavbarDesign(design, shell) {
    design = normalizeDesign(design);
    var root = document.documentElement;
    root.classList.remove(
      "navbar-design-classic",
      "navbar-design-editorial",
      "navbar-design-disc"
    );
    root.classList.add("navbar-design-" + design);
    var el = shell || document.getElementById("navstrip-shell");
    if (el) {
      el.classList.remove(
        "navbar-design-classic",
        "navbar-design-editorial",
        "navbar-design-disc"
      );
      el.classList.add("navbar-design-" + design);
    }
    if (typeof window.__syncNavdiscChrome === "function") {
      window.__syncNavdiscChrome(design);
    }
  }

  (function applyNavbarDesignEarly() {
    try {
      var raw = localStorage.getItem(NAV_CONFIG_KEY);
      var cfg = raw ? JSON.parse(raw) : {};
      applyNavbarDesign(cfg.design);
    } catch (e) {
      applyNavbarDesign(DESIGN_CLASSIC);
    }
  })();

  function readNavConfig() {
    try {
      var raw = localStorage.getItem(NAV_CONFIG_KEY);
      var cfg = raw ? JSON.parse(raw) : { hidden: [], collapsed: false };
      cfg.hidden = cfg.hidden || [];
      if (cfg.collapsed === undefined) cfg.collapsed = false;
      cfg.design = normalizeDesign(cfg.design);
      return cfg;
    } catch (e) {
      return { hidden: [], collapsed: false, design: DESIGN_CLASSIC };
    }
  }

  function writeNavConfig(cfg) {
    localStorage.setItem(NAV_CONFIG_KEY, JSON.stringify(cfg));
  }

  function isHidden(id) {
    var cfg = readNavConfig();
    return cfg.hidden && cfg.hidden.indexOf(id) !== -1;
  }

  function toggleNavItem(id, visible) {
    var cfg = readNavConfig();
    cfg.hidden = cfg.hidden || [];
    var i = cfg.hidden.indexOf(id);
    if (visible && i !== -1) cfg.hidden.splice(i, 1);
    if (!visible && i === -1) cfg.hidden.push(id);
    writeNavConfig(cfg);
    applyNavVisibility();
  }

  function setNavActive(id) {
    var strip = document.getElementById("navstrip");
    if (!strip) {
      window.__pendingNavActive = id;
      return;
    }
    strip.querySelectorAll(".ns-btn[data-nav-id]").forEach(function (el) {
      el.classList.toggle("ns-active", !!id && el.dataset.navId === id);
    });
    document.querySelectorAll(".ns-card[data-nav-id]").forEach(function (el) {
      var on = !!id && el.dataset.navId === id;
      el.classList.toggle("is-active", on);
      if (on) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    document.querySelectorAll(".ns-navdisc-disc[data-nav-id]").forEach(function (el) {
      el.classList.toggle("ns-active", !!id && el.dataset.navId === id);
    });
    delete window.__pendingNavActive;
  }

  window.setNavActive = setNavActive;

  function setNavbarDesign(design) {
    var cfg = readNavConfig();
    cfg.design = normalizeDesign(design);
    writeNavConfig(cfg);
    applyNavbarDesign(cfg.design);
    try {
      document.dispatchEvent(
        new CustomEvent("sabtan-navbar-design-changed", { detail: { design: cfg.design } })
      );
    } catch (e) {}
    return cfg.design;
  }

  function getNavbarDesign() {
    return readNavConfig().design;
  }

  window.setNavbarDesign = setNavbarDesign;
  window.getNavbarDesign = getNavbarDesign;

  function padEditorialNum(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function editorialCardLabel(item) {
    var labels = {
      ideas: "Ideas",
      landing: "Home",
      overview: "Overview",
      phase1: "Phase I",
      paper1guide: "P1 Guide",
    };
    return labels[item.id] || item.label.replace(/\s*→\s*$/, "").trim();
  }

  function icoEditorialHome() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>'
    );
  }
  function icoEditorialRoute() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/>' +
      '<path d="M8 18h6a3 3 0 0 0 3-3V9"/></svg>'
    );
  }
  function icoEditorialLayers() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>'
    );
  }
  function icoEditorialBulb() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M9 18h6"/><path d="M10 21h4"/>' +
      '<path d="M8 11a4 4 0 1 1 8 0c0 2-2 3-2 5h-4c0-2-2-3-2-5z"/></svg>'
    );
  }
  function icoEditorialGrid() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>' +
      '<rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'
    );
  }
  function icoEditorialGuide() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M6 4h11a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2z"/></svg>'
    );
  }

  function editorialIconFor(id) {
    var map = {
      landing: icoEditorialHome,
      overview: icoEditorialRoute,
      phase1: icoEditorialLayers,
      ideas: icoEditorialBulb,
      paper1guide: icoEditorialGuide,
    };
    return (map[id] || icoEditorialRoute)();
  }

  function crystalSvg(uid) {
    uid = uid || "main";
    var gid = "nsCrystalGrad-" + uid;
    var sid = "nsCrystalShine-" + uid;

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 40 44");
    svg.setAttribute("aria-hidden", "true");
    svg.style.filter = "drop-shadow(0 2px 6px rgba(90, 15, 35, 0.45))";
    svg.innerHTML =
      "<defs>" +
      '<linearGradient id="' + gid + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#6b0f2a"/>' +
      '<stop offset="45%" stop-color="#c41e3a"/>' +
      '<stop offset="100%" stop-color="#8b1538"/>' +
      "</linearGradient>" +
      '<linearGradient id="' + sid + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
      '<stop offset="0%" stop-color="#ffb3c6" stop-opacity="0.85"/>' +
      '<stop offset="100%" stop-color="#6b0f2a" stop-opacity="0.15"/>' +
      "</linearGradient>" +
      "</defs>" +
      '<path d="M20 2 L34 14 L20 42 L6 14 Z" fill="url(#' + gid + ')" stroke="#4a0818" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M20 2 L27 14 L20 42 L13 14 Z" fill="url(#' + sid + ')" opacity="0.55"/>' +
      '<path d="M20 2 L34 14 L20 22 L6 14 Z" fill="rgba(255,255,255,0.12)"/>';
    return svg;
  }

  function mount() {
    if (document.getElementById("navstrip-shell")) return;

    var script = document.currentScript;
    if (!script) {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("nav-strip.js") !== -1) {
          script = scripts[i];
          break;
        }
      }
    }
    if (!script) return;

    function sep() {
      var s = document.createElement("div");
      s.className = "ns-sep";
      s.setAttribute("aria-hidden", "true");
      return s;
    }

    var active = (script.dataset && script.dataset.navActive) || "";
    var root = new URL("/shared/", script.src);

    function link(path) {
      return new URL("../" + path.replace(/^\//, ""), root).href;
    }

    var navItems = [
      { id: "ideas", label: "Ideas \u2192", href: link("research-ideas.html?view=research"), external: true, configurable: true },
      { id: "landing", label: "Home", href: link("index.html"), configurable: true },
      { id: "atlas", label: "Atlas", href: link("atlas.html"), configurable: true },
      { id: "overview", label: "Overview", href: link("najd-roadmap.html?layer=overview"), configurable: true },
      { id: "phase1", label: "Phase I", href: link("phase-1-papers.html"), configurable: true },
      { id: "paper1guide", label: "P1 Guide", href: link("paper-1-guide.html"), configurable: true },
    ];

    var najdMenuItems = [
      { label: "Phase I", href: link("phase-1-papers.html") },
      { label: "P1 Guide", href: link("paper-1-guide.html") },
    ];

    var strip = document.createElement("nav");
    strip.id = "navstrip";
    strip.setAttribute("aria-label", "Programme navigation");

    var barLeft = document.createElement("div");
    barLeft.className = "ns-bar-part ns-bar-left";

    var label = document.createElement("span");
    label.className = "ns-label";
    label.textContent = "Go to";
    barLeft.appendChild(label);
    barLeft.appendChild(sep());

    var searchBox = document.createElement("div");
    searchBox.className = "ns-search-box";
    var searchWrap = document.createElement("div");
    searchWrap.className = "ns-search-wrap";
    var searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "ns-search";
    searchInput.placeholder = "Search…";
    searchInput.setAttribute("aria-label", "Search navigation and projects");
    var searchResults = document.createElement("div");
    searchResults.className = "ns-search-results";
    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(searchResults);
    searchBox.appendChild(searchWrap);

    var navLinks = {};
    var splitAt = Math.ceil(navItems.length / 2);

    navItems.forEach(function (item, idx) {
      var el = document.createElement("a");
      el.className = "ns-btn" + (item.external ? " ns-external" : "");
      el.href = item.href;
      el.textContent = item.label;
      el.dataset.navId = item.id;
      if (item.id === active) el.classList.add("ns-active");
      if (isHidden(item.id)) el.classList.add("ns-hidden-nav");
      navLinks[item.id] = el;
      if (idx < splitAt) {
        barLeft.appendChild(el);
      }
    });

    var crystalGap = document.createElement("div");
    crystalGap.className = "ns-crystal-gap";
    crystalGap.id = "ns-crystal-gap";
    crystalGap.setAttribute("aria-hidden", "true");

    var barRight = document.createElement("div");
    barRight.className = "ns-bar-part ns-bar-right";

    navItems.forEach(function (item, idx) {
      if (idx >= splitAt) {
        barRight.appendChild(navLinks[item.id]);
      }
    });

    barRight.appendChild(sep());

    var najdDrop = document.createElement("div");
    najdDrop.className = "ns-dropdown";
    var najdBtn = document.createElement("button");
    najdBtn.type = "button";
    najdBtn.className = "ns-btn ns-menu-trigger";
    najdBtn.textContent = "Najd \u25B4";
    najdBtn.setAttribute("aria-expanded", "false");
    var najdPop = document.createElement("div");
    najdPop.className = "ns-popover";
    najdMenuItems.forEach(function (mi) {
      var a = document.createElement("a");
      a.href = mi.href;
      a.textContent = mi.label;
      najdPop.appendChild(a);
    });
    najdDrop.appendChild(najdBtn);
    najdDrop.appendChild(najdPop);
    barRight.appendChild(najdDrop);

    barRight.appendChild(sep());

    var gearWrap = document.createElement("div");
    gearWrap.className = "ns-gear-wrap";
    var gearBtn = document.createElement("button");
    gearBtn.type = "button";
    gearBtn.className = "ns-gear";
    gearBtn.title = "Customize navigation bar";
    gearBtn.setAttribute("aria-label", "Customize navigation");
    gearBtn.textContent = "\u2699";
    var configPanel = document.createElement("div");
    configPanel.className = "ns-config-panel";
    configPanel.innerHTML = "<h4>Show in navigation bar</h4>";
    navItems.forEach(function (item) {
      if (!item.configurable) return;
      var lab = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !isHidden(item.id);
      cb.dataset.navToggle = item.id;
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(item.label));
      configPanel.appendChild(lab);
    });
    gearWrap.appendChild(gearBtn);
    gearWrap.appendChild(configPanel);
    barRight.appendChild(gearWrap);

    strip.appendChild(barLeft);
    strip.appendChild(crystalGap);
    strip.appendChild(barRight);

    var crystalBtn = document.createElement("button");
    crystalBtn.type = "button";
    crystalBtn.className = "ns-crystal";
    crystalBtn.id = "ns-crystal-toggle";
    crystalBtn.setAttribute("aria-label", "Show or hide navigation");
    crystalBtn.setAttribute("aria-expanded", "true");

    var bubble = document.createElement("span");
    bubble.className = "ns-crystal-bubble";
    bubble.innerHTML = "show/hide<br>navigation";
    crystalBtn.appendChild(bubble);
    var gemWrap = document.createElement("span");
    gemWrap.className = "ns-crystal-gem";
    gemWrap.appendChild(crystalSvg("main"));
    crystalBtn.appendChild(gemWrap);

    function createNavdiscDisc(item, side) {
      var a = document.createElement("a");
      a.className =
        "ns-navdisc-disc ns-disc-metal ns-navdisc-disc-" +
        side +
        (item.external ? " ns-external" : "");
      a.href = item.href;
      a.dataset.navId = item.id;
      var roll = document.createElement("span");
      roll.className = "ns-navdisc-disc-roll";
      var labelEl = document.createElement("span");
      labelEl.className = "ns-navdisc-disc-label";
      labelEl.textContent = item.label;
      roll.appendChild(labelEl);
      a.appendChild(roll);
      if (item.id === active) a.classList.add("ns-active");
      if (isHidden(item.id)) a.classList.add("ns-hidden-nav");
      return a;
    }

    var discItems = NAVDISC_PAIR.map(function (id) {
      return navItems.filter(function (it) {
        return it.id === id;
      })[0];
    }).filter(Boolean);

    var navdiscWrap = document.createElement("div");
    navdiscWrap.className = "ns-navdisc";
    navdiscWrap.setAttribute("aria-hidden", "true");

    var navdiscStage = document.createElement("div");
    navdiscStage.className = "ns-navdisc-stage";

    var navdiscDiscEls = {};
    discItems.forEach(function (item, idx) {
      var side = idx === 0 ? "left" : "right";
      var a = createNavdiscDisc(item, side);
      navdiscDiscEls[item.id] = a;
      navdiscStage.appendChild(a);
    });

    var navdiscBtn = document.createElement("button");
    navdiscBtn.type = "button";
    navdiscBtn.className = "ns-navdisc-box";
    navdiscBtn.id = "ns-navdisc-toggle";
    navdiscBtn.setAttribute("aria-label", "Open navigation discs");
    navdiscBtn.setAttribute("aria-expanded", "false");
    navdiscBtn.setAttribute("aria-controls", "ns-navdisc-stage");
    var navdiscStar = document.createElement("span");
    navdiscStar.className = "ns-navdisc-box-star";
    navdiscStar.setAttribute("aria-hidden", "true");
    navdiscStar.textContent = "\u2726";
    navdiscBtn.appendChild(navdiscStar);
    navdiscStage.appendChild(navdiscBtn);
    navdiscStage.id = "ns-navdisc-stage";
    navdiscWrap.appendChild(navdiscStage);

    var editorialStrip = document.createElement("nav");
    editorialStrip.id = "navstrip-editorial";
    editorialStrip.className = "ns-editorial-strip";
    editorialStrip.setAttribute("aria-label", "Go to");

    var editorialCaption = document.createElement("div");
    editorialCaption.className = "ns-caption";
    editorialCaption.innerHTML =
      '<span class="ns-go">Go to</span><span class="ns-tick" aria-hidden="true"></span>';
    editorialStrip.appendChild(editorialCaption);

    var editorialCardsWrap = document.createElement("div");
    editorialCardsWrap.className = "ns-cards";

    var editorialCards = {};
    var editorialById = {};
    navItems.forEach(function (item) {
      editorialById[item.id] = item;
    });
    var cardIndex = 0;
    EDITORIAL_ORDER.forEach(function (id) {
      var item = editorialById[id];
      if (!item) return;
      cardIndex += 1;
      var isActive = item.id === active;
      var card = document.createElement("a");
      card.className =
        "ns-card" +
        (isActive ? " is-active" : "") +
        (item.external ? " ns-external" : "") +
        (isHidden(item.id) ? " ns-hidden-nav" : "");
      card.href = item.href;
      card.setAttribute("aria-current", isActive ? "page" : "false");
      card.dataset.navId = item.id;
      card.innerHTML =
        '<span class="ns-num">' +
        padEditorialNum(cardIndex) +
        "</span>" +
        '<span class="ns-ico">' +
        editorialIconFor(item.id) +
        "</span>" +
        '<span class="ns-lbl">' +
        editorialCardLabel(item) +
        "</span>" +
        '<span class="ns-rule" aria-hidden="true"></span>';
      card.addEventListener("click", function (e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var href = card.getAttribute("href");
        if (!href) return;
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(href);
      });
      editorialCards[item.id] = card;
      editorialCardsWrap.appendChild(card);
    });
    editorialStrip.appendChild(editorialCardsWrap);

    var editorialGearWrap = document.createElement("div");
    editorialGearWrap.className = "ns-gear-wrap ns-editorial-gear";
    var editorialGearBtn = document.createElement("button");
    editorialGearBtn.type = "button";
    editorialGearBtn.className = "ns-gear";
    editorialGearBtn.title = "Customize navigation bar";
    editorialGearBtn.setAttribute("aria-label", "Customize navigation");
    editorialGearBtn.textContent = "\u2699";
    var editorialConfigPanel = document.createElement("div");
    editorialConfigPanel.className = "ns-config-panel";
    editorialConfigPanel.innerHTML = "<h4>Show in navigation bar</h4>";
    navItems.forEach(function (item) {
      if (!item.configurable) return;
      var lab = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !isHidden(item.id);
      cb.dataset.navToggle = item.id;
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(editorialCardLabel(item)));
      editorialConfigPanel.appendChild(lab);
    });
    editorialGearWrap.appendChild(editorialGearBtn);
    editorialGearWrap.appendChild(editorialConfigPanel);
    editorialStrip.appendChild(editorialGearWrap);
    editorialGearWrap.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    var navCluster = document.createElement("div");
    navCluster.className = "ns-nav-cluster";
    navCluster.appendChild(strip);
    navCluster.appendChild(crystalBtn);
    navCluster.appendChild(navdiscWrap);

    var shell = document.createElement("div");
    shell.id = "navstrip-shell";
    shell.appendChild(searchBox);
    shell.appendChild(editorialStrip);
    shell.appendChild(navCluster);
    applyNavbarDesign(readNavConfig().design, shell);

    function setNavdiscExpanded(expanded) {
      var on = !!expanded;
      shell.classList.toggle("ns-navdisc-expanded", on);
      navdiscBtn.setAttribute("aria-expanded", on ? "true" : "false");
      navdiscBtn.setAttribute(
        "aria-label",
        on ? "Close navigation discs" : "Open navigation discs"
      );
    }

    function syncNavdiscChrome(design) {
      design = normalizeDesign(design || readNavConfig().design);
      var isDisc = design === DESIGN_DISC;
      var isEditorial = design === DESIGN_EDITORIAL;
      navdiscWrap.setAttribute("aria-hidden", isDisc ? "false" : "true");
      if (isEditorial && shell.classList.contains("ns-collapsed")) {
        setNavCollapsed(false);
      }
      if (!isDisc) {
        setNavdiscExpanded(false);
        if (!isEditorial && shell.classList.contains("ns-collapsed")) {
          document.body.classList.add("ns-nav-collapsed");
        }
      } else if (shell.classList.contains("ns-collapsed")) {
        setNavCollapsed(false);
      }
    }

    window.__syncNavdiscChrome = syncNavdiscChrome;
    syncNavdiscChrome(readNavConfig().design);

    document.body.classList.add("has-nav-strip");
    document.body.appendChild(shell);

    requestAnimationFrame(function () {
      shell.classList.add("ns-editorial-ready");
    });

    try {
      document.dispatchEvent(new CustomEvent("sabtan-navstrip-mounted"));
    } catch (e) {}

    function setNavCollapsed(collapsed) {
      var cfg = readNavConfig();
      cfg.collapsed = !!collapsed;
      writeNavConfig(cfg);
      shell.classList.toggle("ns-collapsed", cfg.collapsed);
      document.body.classList.toggle("ns-nav-collapsed", cfg.collapsed);
      crystalBtn.setAttribute("aria-expanded", cfg.collapsed ? "false" : "true");
      crystalBtn.style.left = "";
      crystalBtn.style.top = "";
    }

    if (normalizeDesign(readNavConfig().design) === DESIGN_EDITORIAL && shell.classList.contains("ns-collapsed")) {
      setNavCollapsed(false);
    }

    if (window.__pendingNavActive !== undefined) {
      setNavActive(window.__pendingNavActive);
    }

    function applyNavVisibility() {
      navItems.forEach(function (item) {
        var el = navLinks[item.id];
        if (!el) return;
        el.classList.toggle("ns-hidden-nav", isHidden(item.id));
      });
      NAVDISC_PAIR.forEach(function (id) {
        var el = navdiscDiscEls[id];
        if (el) el.classList.toggle("ns-hidden-nav", isHidden(id));
      });
      EDITORIAL_ORDER.forEach(function (id) {
        var card = editorialCards[id];
        if (card) card.classList.toggle("ns-hidden-nav", isHidden(id));
      });
      configPanel.querySelectorAll("input[data-nav-toggle]").forEach(function (cb) {
        cb.checked = !isHidden(cb.dataset.navToggle);
      });
      editorialConfigPanel.querySelectorAll("input[data-nav-toggle]").forEach(function (cb) {
        cb.checked = !isHidden(cb.dataset.navToggle);
      });
    }

    window.applyNavVisibility = applyNavVisibility;

    function closeAllPopovers() {
      najdPop.classList.remove("open");
      najdBtn.classList.remove("open");
      najdBtn.setAttribute("aria-expanded", "false");
      configPanel.classList.remove("open");
      editorialConfigPanel.classList.remove("open");
      searchResults.classList.remove("open");
      if (shell.classList.contains("ns-navdisc-expanded")) {
        setNavdiscExpanded(false);
      }
    }

    crystalBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var willCollapse = !shell.classList.contains("ns-collapsed");
      setNavCollapsed(willCollapse);
      if (willCollapse) closeAllPopovers();
    });

    navdiscBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (normalizeDesign(readNavConfig().design) !== DESIGN_DISC) return;
      setNavdiscExpanded(!shell.classList.contains("ns-navdisc-expanded"));
    });

    document.addEventListener("sabtan-navbar-design-changed", function (e) {
      if (e.detail && e.detail.design) {
        var d = normalizeDesign(e.detail.design);
        if (d === DESIGN_EDITORIAL && shell.classList.contains("ns-collapsed")) {
          setNavCollapsed(false);
        }
        syncNavdiscChrome(d);
      }
    });

    najdBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = najdPop.classList.toggle("open");
      najdBtn.classList.toggle("open", open);
      najdBtn.setAttribute("aria-expanded", open ? "true" : "false");
      configPanel.classList.remove("open");
      searchResults.classList.remove("open");
    });

    gearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      configPanel.classList.toggle("open");
      najdPop.classList.remove("open");
      searchResults.classList.remove("open");
    });

    function onConfigPanelChange(e) {
      var t = e.target;
      if (t && t.dataset && t.dataset.navToggle) {
        toggleNavItem(t.dataset.navToggle, t.checked);
      }
    }

    configPanel.addEventListener("change", onConfigPanelChange);
    editorialConfigPanel.addEventListener("change", onConfigPanelChange);

    editorialGearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      editorialConfigPanel.classList.toggle("open");
      configPanel.classList.remove("open");
      searchResults.classList.remove("open");
      najdPop.classList.remove("open");
    });

    function collectSearchEntries() {
      var entries = [];
      navItems.forEach(function (item) {
        entries.push({ title: item.label, hint: "Navigation", href: item.href });
      });
      najdMenuItems.forEach(function (mi) {
        entries.push({ title: mi.label, hint: "Najd programme", href: mi.href });
      });
      if (window.SabtanKB && window.SabtanKB.allItems) {
        window.SabtanKB.allItems().forEach(function (it) {
          entries.push({
            title: it.title,
            hint: it.hint || "Knowledge Base",
            href: link(it.href),
          });
        });
      }
      return entries;
    }

    function runSearch(q) {
      q = (q || "").trim().toLowerCase();
      searchResults.innerHTML = "";
      if (!q) {
        searchResults.classList.remove("open");
        return;
      }
      var matches = collectSearchEntries().filter(function (e) {
        return (
          e.title.toLowerCase().indexOf(q) !== -1 ||
          (e.hint && e.hint.toLowerCase().indexOf(q) !== -1)
        );
      });
      if (!matches.length) {
        searchResults.innerHTML = '<div class="ns-search-empty">No matches</div>';
      } else {
        matches.slice(0, 12).forEach(function (m) {
          var a = document.createElement("a");
          a.href = m.href;
          a.innerHTML =
            '<div class="sr-title">' + m.title + "</div>" +
            (m.hint ? '<div class="sr-hint">' + m.hint + "</div>" : "");
          searchResults.appendChild(a);
        });
      }
      searchResults.classList.add("open");
      najdPop.classList.remove("open");
      configPanel.classList.remove("open");
    }

    searchInput.addEventListener("input", function () {
      runSearch(searchInput.value);
    });

    searchInput.addEventListener("focus", function () {
      if (searchInput.value.trim()) runSearch(searchInput.value);
    });

    document.addEventListener("click", closeAllPopovers);
    strip.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    navdiscWrap.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    searchBox.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAllPopovers();
    });
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
