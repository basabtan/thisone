/* ============================================================
   Sabtan Knowledge Base — nav-strip.js
   Injects the editorial "Sharp Card" Go-to nav on main pages.
   Auto-hides on welcome (index.html) and the KB hub.
   Preference stored in localStorage key `sabtan-nav-config`.
   Public API: setNavbarDesign(d), getNavbarDesign()
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "sabtan-nav-config";
  var DEFAULT_DESIGN = "editorial";

  /* ---- canonical destinations (index order = card number) ---- */
  var DESTINATIONS = [
    { id: "home",    file: "index.html",                    label: "Home",    icon: icoHome },
    { id: "roadmap", file: "najd-roadmap.html",             label: "Roadmap", icon: icoRoute },
    { id: "phase1",  file: "phase-1-papers.html",           label: "Phase I", icon: icoLayers },
    { id: "ideas",   file: "research-ideas.html",           label: "Ideas",   icon: icoBulb },
    { id: "hub",     file: "Sabtan Knowledge Base/index.html", label: "Hub",  icon: icoGrid }
  ];

  /* ---- legacy filenames → canonical (so active-state still works) ---- */
  var LEGACY = {
    "najd roadmap v2.html":            "najd-roadmap.html",
    "phase 1 (react).html":            "phase-1-papers.html",
    "research ideas.html":             "research-ideas.html",
    "research ideas - standalone.html":"research-ideas.html",
    "research ideas (react).html":     "research-ideas-dev.html"
  };

  /* ---- where the strip must NOT appear ---- */
  function isHiddenPage(path) {
    var p = decodeURIComponent(path).toLowerCase();
    var inHub = p.indexOf("sabtan knowledge base/") !== -1;
    var file  = currentFile(p);
    // hub index = hidden; root welcome index = hidden
    if (inHub && file === "index.html") return true;          // KB hub
    if (!inHub && (file === "index.html" || file === "")) return true; // welcome
    return false;
  }

  function currentFile(path) {
    var p = decodeURIComponent(path).toLowerCase();
    var seg = p.split("?")[0].split("#")[0];
    var name = seg.substring(seg.lastIndexOf("/") + 1);
    return LEGACY[name] || name;
  }

  /* ---- config ---- */
  function readConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.design) return o; }
    } catch (e) {}
    return { design: DEFAULT_DESIGN };
  }
  function writeConfig(cfg) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  /* ---- public API ---- */
  window.getNavbarDesign = function () { return readConfig().design; };
  window.setNavbarDesign = function (design) {
    var cfg = readConfig(); cfg.design = design; writeConfig(cfg);
    document.querySelectorAll(".ns-opt").forEach(function (el) {
      el.classList.toggle("sel", el.getAttribute("data-design") === design);
    });
    // This build renders the editorial strip. Other designs (classic / unified /
    // disc) are handled by your existing nav code, which reads the same key.
    return design;
  };

  /* ---- icons (inline SVG) ---- */
  function icoHome()  { return '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>'; }
  function icoRoute() { return '<svg viewBox="0 0 24 24"><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M8 18h6a3 3 0 0 0 3-3V9"/></svg>'; }
  function icoLayers(){ return '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>'; }
  function icoBulb()  { return '<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M8 11a4 4 0 1 1 8 0c0 2-2 3-2 5h-4c0-2-2-3-2-5z"/></svg>'; }
  function icoGrid()  { return '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'; }

  /* ---- build ---- */
  function build() {
    if (isHiddenPage(location.pathname)) return;
    if (document.getElementById("navstrip-shell")) return;

    var active = currentFile(location.pathname);

    var shell = document.createElement("div");
    shell.id = "navstrip-shell";

    var strip = document.createElement("nav");
    strip.id = "navstrip";
    strip.setAttribute("aria-label", "Go to");

    /* caption */
    var cap = document.createElement("div");
    cap.className = "ns-caption";
    cap.innerHTML = '<span class="ns-go">Go to</span><span class="ns-tick"></span>';
    strip.appendChild(cap);

    /* cards */
    var wrap = document.createElement("div");
    wrap.className = "ns-cards";
    DESTINATIONS.forEach(function (d, i) {
      var isActive = (d.file.toLowerCase().split("/").pop() === active);
      var card = document.createElement(isActive ? "div" : "a");
      card.className = "ns-card" + (isActive ? " is-active" : "");
      if (!isActive) { card.href = relHref(d.file); }
      if (isActive) { card.setAttribute("aria-current", "page"); }
      card.innerHTML =
        '<span class="ns-num">' + pad(i + 1) + '</span>' +
        '<span class="ns-ico">' + d.icon() + '</span>' +
        '<span class="ns-lbl">' + d.label + '</span>' +
        '<span class="ns-rule"></span>';
      wrap.appendChild(card);
    });
    strip.appendChild(wrap);

    /* ✦ assistant toggle + popover */
    var fx = document.createElement("button");
    fx.className = "ns-fx"; fx.type = "button";
    fx.setAttribute("aria-label", "Navigation style");
    fx.textContent = "✦";

    var pop = document.createElement("div");
    pop.className = "ns-pop";
    pop.innerHTML =
      '<h4>Nav style</h4>' +
      opt("editorial", "Editorial") +
      opt("disc",      "Disc") +
      opt("unified",   "Unified") +
      opt("classic",   "Classic") +
      '<div class="ns-note">Editorial renders here; other styles load from your existing nav code via the same preference.</div>';

    fx.addEventListener("click", function (e) {
      e.stopPropagation();
      pop.classList.toggle("open");
    });
    pop.addEventListener("click", function (e) {
      var o = e.target.closest(".ns-opt");
      if (!o) return;
      window.setNavbarDesign(o.getAttribute("data-design"));
    });
    document.addEventListener("click", function () { pop.classList.remove("open"); });

    fx.appendChild(pop);
    strip.appendChild(fx);

    shell.appendChild(strip);
    document.body.appendChild(shell);

    /* reflect current selection */
    var current = readConfig().design;
    pop.querySelectorAll(".ns-opt").forEach(function (el) {
      el.classList.toggle("sel", el.getAttribute("data-design") === current);
    });

    requestAnimationFrame(function () { shell.classList.add("ready"); });
  }

  function opt(id, label) {
    return '<div class="ns-opt" data-design="' + id + '"><span class="dot"></span>' + label + '</div>';
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  /* relative href: pages live at vault root; hub sits one level down */
  function relHref(file) {
    var inHubNow = decodeURIComponent(location.pathname).toLowerCase()
                    .indexOf("sabtan knowledge base/") !== -1;
    if (inHubNow) {
      // currently inside the hub folder → step up for root pages
      return file.indexOf("Sabtan Knowledge Base/") === 0
        ? file.split("/").pop()
        : "../" + file;
    }
    return file; // at vault root
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
