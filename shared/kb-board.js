/**
 * Sabtan Knowledge Base — layout, favorites, user edits (localStorage).
 */
(function (global) {
  var FAV_KEY = "sabtan-kb-favorites";
  var LAYOUT_KEY = "sabtan-kb-layout";

  var COLUMNS = [
    {
      id: "profile",
      title: "Profile & Leadership",
      subtitle: "Executive positioning · SSM",
      accent: "#a5643a",
      bg: "rgba(165, 100, 58, 0.08)",
    },
    {
      id: "research",
      title: "Projects & Research",
      subtitle: "Programmes · tools · pipelines",
      accent: "#2f5367",
      bg: "rgba(47, 83, 103, 0.08)",
    },
    {
      id: "urgent",
      title: "Immediate Priority",
      subtitle: "Active now · due soon",
      accent: "#a5643a",
      bg: "rgba(165, 100, 58, 0.06)",
    },
  ];

  var DEFAULT_SECTIONS = [
    { id: "sec-prof", columnId: "profile", title: "Executive", builtin: true },
    { id: "sec-prog", columnId: "research", title: "Programmes", builtin: true },
    { id: "sec-tools", columnId: "research", title: "Tools & analytics", builtin: true },
    { id: "sec-urg-now", columnId: "urgent", title: "Active this week", builtin: true },
    { id: "sec-urg-queue", columnId: "urgent", title: "Up next", builtin: true },
  ];

  var DEFAULT_ITEMS = [
    {
      id: "profile",
      sectionId: "sec-prof",
      title: "Executive Profile",
      hint: "SSM role, expertise, Vision 2030",
      href: "profile.html",
      builtin: true,
    },
    {
      id: "roadmap",
      sectionId: "sec-prog",
      title: "Programme Roadmap",
      hint: "All phases, papers, timeline",
      href: "najd-roadmap.html",
      builtin: true,
    },
    {
      id: "phase1",
      sectionId: "sec-prog",
      title: "Phase I Papers",
      hint: "Paper 1 & 2 — author view",
      href: "phase-1-papers.html",
      builtin: true,
    },
    {
      id: "dashboard",
      sectionId: "sec-tools",
      title: "Structural Dashboard",
      hint: "Slope data and analytics",
      href: "Najd Fault System Dashboard.html",
      builtin: true,
    },
    {
      id: "ideas",
      sectionId: "sec-tools",
      title: "Research Ideas",
      hint: "Brainstorm and compare",
      href: "research-ideas.html",
      builtin: true,
    },
    {
      id: "atlas",
      sectionId: "sec-tools",
      title: "Atlas — Research Table",
      hint: "Infinite-canvas knowledge workspace",
      href: "atlas.html",
      builtin: true,
    },
    {
      id: "p1-guide",
      sectionId: "sec-urg-now",
      title: "Paper 1 — Author Guide",
      hint: "Visual drafting guide",
      href: "paper-1-guide.html",
      builtin: true,
    },
    {
      id: "p1-companion",
      sectionId: "sec-urg-now",
      title: "Paper 1 — Companion",
      hint: "Reference and notes",
      href: "Paper 1/drafts/p1/p - guide .html",
      builtin: true,
    },
    {
      id: "archive",
      sectionId: "sec-urg-queue",
      title: "Earlier Overview",
      hint: "Archive programme view",
      href: "najd1.html",
      builtin: true,
    },
  ];

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function readLayout() {
    try {
      var raw = localStorage.getItem(LAYOUT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeLayout(data) {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(data));
    try {
      global.dispatchEvent(new CustomEvent("sabtan-kb-layout-changed"));
    } catch (e) {}
  }

  function defaultLayoutState() {
    return {
      colExpanded: { profile: true, research: true, urgent: true },
      secExpanded: {},
      hiddenItems: [],
      hiddenSections: [],
      customSections: [],
      customItems: [],
    };
  }

  function getLayoutState() {
    var saved = readLayout();
    var base = defaultLayoutState();
    if (!saved) return base;
    return {
      colExpanded: Object.assign({}, base.colExpanded, saved.colExpanded || {}),
      secExpanded: saved.secExpanded || {},
      hiddenItems: saved.hiddenItems || [],
      hiddenSections: saved.hiddenSections || [],
      customSections: saved.customSections || [],
      customItems: saved.customItems || [],
    };
  }

  function saveLayoutState(patch) {
    var cur = getLayoutState();
    writeLayout(Object.assign({}, cur, patch));
  }

  function allSections() {
    var st = getLayoutState();
    return DEFAULT_SECTIONS.concat(st.customSections).filter(function (s) {
      return st.hiddenSections.indexOf(s.id) === -1;
    });
  }

  function allItems() {
    var st = getLayoutState();
    return DEFAULT_ITEMS.concat(st.customItems).filter(function (it) {
      return st.hiddenItems.indexOf(it.id) === -1;
    });
  }

  function sectionsForColumn(columnId) {
    return allSections().filter(function (s) {
      return s.columnId === columnId;
    });
  }

  function itemsForSection(sectionId) {
    return allItems().filter(function (it) {
      return it.sectionId === sectionId;
    });
  }

  function toggleColExpanded(columnId) {
    var st = getLayoutState();
    st.colExpanded[columnId] = !st.colExpanded[columnId];
    saveLayoutState(st);
    return st.colExpanded[columnId];
  }

  function toggleSecExpanded(sectionId) {
    var st = getLayoutState();
    st.secExpanded[sectionId] = !(st.secExpanded[sectionId] !== false);
    saveLayoutState(st);
    return st.secExpanded[sectionId] !== false;
  }

  function isColExpanded(columnId) {
    return getLayoutState().colExpanded[columnId] !== false;
  }

  function isSecExpanded(sectionId) {
    return getLayoutState().secExpanded[sectionId] !== false;
  }

  function addSection(columnId, title) {
    var st = getLayoutState();
    var sec = { id: uid("sec"), columnId: columnId, title: title || "New section", builtin: false };
    st.customSections.push(sec);
    st.secExpanded[sec.id] = true;
    saveLayoutState(st);
    return sec;
  }

  function addItem(sectionId, data) {
    var st = getLayoutState();
    var it = {
      id: uid("item"),
      sectionId: sectionId,
      title: data.title || "New link",
      hint: data.hint || "",
      href: data.href || "#",
      builtin: false,
    };
    st.customItems.push(it);
    saveLayoutState(st);
    return it;
  }

  function removeSection(sectionId) {
    var st = getLayoutState();
    var sec = DEFAULT_SECTIONS.find(function (s) {
      return s.id === sectionId;
    });
    if (sec && sec.builtin) {
      st.hiddenSections.push(sectionId);
    } else {
      st.customSections = st.customSections.filter(function (s) {
        return s.id !== sectionId;
      });
      st.customItems = st.customItems.filter(function (it) {
        return it.sectionId !== sectionId;
      });
    }
    saveLayoutState(st);
  }

  function removeItem(itemId) {
    var st = getLayoutState();
    var it = DEFAULT_ITEMS.find(function (x) {
      return x.id === itemId;
    });
    if (it && it.builtin) {
      if (st.hiddenItems.indexOf(itemId) === -1) st.hiddenItems.push(itemId);
    } else {
      st.customItems = st.customItems.filter(function (x) {
        return x.id !== itemId;
      });
    }
    saveLayoutState(st);
  }

  function restoreItem(itemId) {
    var st = getLayoutState();
    st.hiddenItems = st.hiddenItems.filter(function (id) {
      return id !== itemId;
    });
    saveLayoutState(st);
  }

  function readFavSet() {
    try {
      var raw = localStorage.getItem(FAV_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      return new Set();
    }
  }

  function writeFavSet(set) {
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(set)));
    try {
      global.dispatchEvent(new CustomEvent("sabtan-kb-favorites-changed"));
    } catch (e) {}
  }

  function getFavorites() {
    var set = readFavSet();
    return allItems().filter(function (p) {
      return set.has(p.id);
    });
  }

  function isFavorite(id) {
    return readFavSet().has(id);
  }

  function toggleFavorite(id) {
    var set = readFavSet();
    if (set.has(id)) set.delete(id);
    else set.add(id);
    writeFavSet(set);
    return set.has(id);
  }

  function getProject(id) {
    var items = DEFAULT_ITEMS.concat(getLayoutState().customItems);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function searchItems(query) {
    var q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return allItems().filter(function (it) {
      return (
        it.title.toLowerCase().indexOf(q) !== -1 ||
        (it.hint && it.hint.toLowerCase().indexOf(q) !== -1)
      );
    });
  }

  global.SabtanKB = {
    FAV_KEY: FAV_KEY,
    LAYOUT_KEY: LAYOUT_KEY,
    COLUMNS: COLUMNS,
    DEFAULT_ITEMS: DEFAULT_ITEMS,
    getLayoutState: getLayoutState,
    allSections: allSections,
    allItems: allItems,
    sectionsForColumn: sectionsForColumn,
    itemsForSection: itemsForSection,
    toggleColExpanded: toggleColExpanded,
    toggleSecExpanded: toggleSecExpanded,
    isColExpanded: isColExpanded,
    isSecExpanded: isSecExpanded,
    addSection: addSection,
    addItem: addItem,
    removeSection: removeSection,
    removeItem: removeItem,
    restoreItem: restoreItem,
    getFavorites: getFavorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    getProject: getProject,
    searchItems: searchItems,
    PROJECTS: DEFAULT_ITEMS,
  };
})(typeof window !== "undefined" ? window : globalThis);
