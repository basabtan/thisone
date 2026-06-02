/* ════════════════════════════════════════════════════════════════
   STATE — schema, seeds, localStorage hooks
   ════════════════════════════════════════════════════════════════ */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const STORAGE_KEY = 'najd-research-ideas-react-v1';
const APP_STORAGE_KEY = 'najd-app-ideas-react-v1';
const AUTHOR_KEY = 'najd-ideas-active-author';

const STATUS_OPTS = [
  { id:'halfbaked', label:'Half-baked'        },
  { id:'discuss',   label:'Worth discussing'  },
  { id:'plan',      label:'Ready to plan'     },
  { id:'approved',  label:'Approved'          },
  { id:'parked',    label:'Parked'            },
];

const STATUS_BY_ID = Object.fromEntries(STATUS_OPTS.map(s => [s.id, s]));
const AUTHOR_LABEL = { AS: 'Prof. Abdullah', BS: 'Dr. Bader' };

const IDEA_FIELD_KEYS = ['summary', 'motivation', 'trigger', 'data', 'methods', 'effort'];

const IDEA_TEMPLATES = {
  research: {
    id: 'research',
    titlePlaceholder: 'Working title for this idea…',
    fields: [
      {
        key: 'summary',
        label: 'The core idea',
        prompt: 'In 2–3 sentences: what is the central question or hypothesis?',
        editPlaceholder: 'e.g. Joint roughness coefficients could be a non-destructive proxy for…',
        emptyLabel: '— not yet written —',
      },
      {
        key: 'motivation',
        label: 'Why now / why us',
        prompt: 'What\'s the gap or motivation? Why is this worth pursuing?',
        editPlaceholder: 'No published work has measured… we have the only existing dataset that could…',
        emptyLabel: '— not yet written —',
      },
      {
        key: 'trigger',
        label: 'Triggered by',
        optional: true,
        prompt: 'A paper, observation, conversation…',
        editPlaceholder: 'Reading Hoek & Bray 2018 — they note that…',
        emptyLabel: '— not specified —',
      },
      {
        key: 'data',
        label: 'Data we\'d need',
        optional: true,
        prompt: 'Existing dataset, new fieldwork, third-party data…',
        editPlaceholder: 'Schmidt rebound measurements at the 5 sites + drone photogrammetry…',
        emptyLabel: '— not specified —',
      },
      {
        key: 'methods',
        label: 'Methods envisioned',
        optional: true,
        prompt: 'Field, lab, statistical, computational…',
        editPlaceholder: 'JRC profiling, image analysis, regression against…',
        emptyLabel: '— not specified —',
      },
      {
        key: 'effort',
        label: 'Effort & outcomes',
        optional: true,
        prompt: 'Rough scale (quick paper / 6-month / multi-year) and what success looks like.',
        editPlaceholder: '6-month side project · single methodological paper for…',
        emptyLabel: '— not specified —',
      },
    ],
  },
  app: {
    id: 'app',
    titlePlaceholder: 'Feature or change name…',
    fields: [
      {
        key: 'summary',
        label: 'What we\'re building',
        prompt: 'In 2–3 sentences: what should exist when this ships?',
        editPlaceholder: 'e.g. A collapsible nav strip with a fixed crystal toggle that never covers links…',
        emptyLabel: '— not yet written —',
      },
      {
        key: 'motivation',
        label: 'Problem / gap',
        prompt: 'What friction or missing capability does this remove?',
        editPlaceholder: 'Navigation hides content on small screens and there is no way to recall it without scrolling…',
        emptyLabel: '— not yet written —',
      },
      {
        key: 'trigger',
        label: 'Spark / origin',
        optional: true,
        prompt: 'User request, design review, bug report, or inspiration…',
        editPlaceholder: 'Design review of the home hub and bottom nav bar, May 2026.',
        emptyLabel: '— not specified —',
      },
      {
        key: 'data',
        label: 'Scope & touchpoints',
        optional: true,
        prompt: 'Pages, components, data stores, shared scripts…',
        editPlaceholder: 'shared/nav-strip.css · index.html hub · localStorage preference key…',
        emptyLabel: '— not specified —',
      },
      {
        key: 'methods',
        label: 'Implementation sketch',
        optional: true,
        prompt: 'React module, CSS pattern, storage, integration point…',
        editPlaceholder: 'Fixed shell header + sliding panel; reuse kb-board collapse pattern…',
        emptyLabel: '— not specified —',
      },
      {
        key: 'effort',
        label: 'Effort & ship criteria',
        optional: true,
        prompt: 'Rough sessions to ship and what “done” looks like.',
        editPlaceholder: '1–2 sessions · consistent across every vault page · mobile wrap tested.',
        emptyLabel: '— not specified —',
      },
    ],
  },
};

function getIdeaTemplate(category){
  return IDEA_TEMPLATES[category] || IDEA_TEMPLATES.research;
}

function getHiddenSections(idea){
  return Array.isArray(idea?.hiddenSections) ? idea.hiddenSections : [];
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function escapeRegex(s){
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query){
  if(!query || !text) return text;
  const q = query.trim();
  if(q.length < 2) return text;
  const parts = String(text).split(new RegExp('(' + escapeRegex(q) + ')', 'ig'));
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase()
      ? <mark key={i} className="hi">{p}</mark>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

function relTime(t){
  if(!t) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if(s < 60) return 'just now';
  if(s < 3600) return Math.floor(s/60) + 'm ago';
  if(s < 86400) return Math.floor(s/3600) + 'h ago';
  const d = Math.floor(s/86400);
  if(d < 7) return d + 'd ago';
  return new Date(t).toLocaleDateString();
}

function fullDate(t){
  if(!t) return '';
  return new Date(t).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'});
}

function timeGroup(t){
  const s = Math.floor((Date.now() - t) / 1000);
  if(s < 86400) return 'Today';
  if(s < 86400 * 2) return 'Yesterday';
  if(s < 86400 * 7) return 'This week';
  if(s < 86400 * 30) return 'This month';
  return 'Earlier';
}

/* ─── SEEDS ─── */
const JRC_SEED = {
  id: 'seed-jrc-najd',
  title: 'Joint roughness coefficients as a non-destructive proxy for Najd cataclasis',
  summary: 'Could JRC profiles measured along scanlines at our existing 5 granodiorite sites correlate with the degree of Najd-related cataclastic overprint? If so, JRC becomes a low-cost field proxy that complements the NII without requiring laboratory work.',
  motivation: 'No published study has tested JRC as a Najd-overprint indicator. We have the only existing structural dataset for these sites, so the marginal cost of adding JRC measurements on a return visit is small relative to the analytical payoff.',
  trigger: 'Discussion at the Saudi Geological Survey workshop, March — they asked whether rapid field methods could pre-screen sites before full geotechnical campaigns.',
  data: '5 existing sites · scanline JRC profiles (combs + reference comparators) · revisit ~4 days. No new lab work.',
  methods: 'JRC measurement per Barton-Choubey · paired against existing Najd %, Schmidt R, and field GSI · simple linear regression to start.',
  effort: '6-month side project · single short paper for Engineering Geology, or as a methods section of Paper 2 if results are weak.',
  status: 'discuss',
  author: 'AS',
  tags: ['fieldwork', 'low-cost', 'methods'],
  comments: [
    { id:'seed-jrc-c1', who:'BS',
      text:'Interesting — could we use the JRC data as a 6th NII input rather than a standalone study? Might strengthen Paper 2 without burning a separate slot.',
      t: Date.now() - 1000 * 60 * 60 * 24 * 2 }
  ],
  created: Date.now() - 1000 * 60 * 60 * 24 * 3,
  updated: Date.now() - 1000 * 60 * 60 * 24 * 2,
};

const CORROSION_SEED = {
  id: 'seed-corrosion-2025',
  title: 'Corrosion sources in problematic soils — comparative aggressiveness of sabkha, calcareous, acidic sulfate, industrial, and organic reducing environments',
  summary: 'Soil-induced corrosion is governed by corrosive species and exposure conditions, not by soil name alone. This paper proposes a source-based comparative framework across five environments and ranks their aggressiveness for buried steel and reinforced concrete. Sabkha emerges as the most aggressive natural environment.',
  motivation: 'No published framework consolidates these five corrosion-source environments under one comparative lens, despite all five co-occurring in Saudi infrastructure corridors. SBC 303 is written by lithology, but Saudi sites routinely show mixed corrosion drivers.',
  trigger: 'Hakami et al. (2022) integrated assessment of Jizan sabkha + the recurring gap in KSA durability reviews.',
  data: 'Existing literature compilation. Strongest quantitative dataset is for sabkha (Cl up to 19,688 mg/kg, resistivity commonly <1,000–4,000 Ω·cm). Other four need harmonized multi-site data.',
  methods: 'Mixed-evidence comparative review. Quantitative analysis for sabkha + classification-based for the others. Four summary tables. Practical mapping to ground investigation and SBC 303.',
  effort: '6–9 month review paper · AS + BS · target Construction & Building Materials, Engineering Geology, or Arabian J. Geosciences.',
  status: 'discuss',
  author: 'AS',
  tags: ['corrosion', 'sabkha', 'durability', 'review-paper', 'Saudi-infrastructure'],
  comments: [],
  created: Date.now() - 1000 * 60 * 60 * 5,
  updated: Date.now() - 1000 * 60 * 60 * 5,
};

const DRONE_SEED = {
  id: 'seed-drone-photogrammetry',
  title: 'Drone photogrammetry for rapid characterisation of weathered road cuts',
  summary: 'Use UAV-based SfM photogrammetry to generate dense point clouds of road cut faces, then extract joint orientations, spacing, and persistence automatically. Compare against manual scanline data we already have.',
  motivation: 'Manual scanline surveys are slow and limited to accessible parts of the face. Drone surveys can cover entire cuts in minutes and capture areas humans can\'t safely reach.',
  trigger: '',
  data: 'Same 5 sites where we have ground-truth scanline data — plus 2–3 new sites where access was limited last time.',
  methods: '',
  effort: '',
  status: 'halfbaked',
  author: 'BS',
  tags: ['drones', 'remote-sensing', 'methods', 'fieldwork'],
  comments: [],
  created: Date.now() - 1000 * 60 * 60 * 24 * 8,
  updated: Date.now() - 1000 * 60 * 60 * 24 * 8,
};

const SLOPE_SEED = {
  id: 'seed-slope-monitoring',
  title: 'Continuous monitoring of Najd-affected slopes using low-cost MEMS tilt sensors',
  summary: 'Deploy a small network of MEMS inclinometers on a high-risk slope to detect sub-millimetre creep that precedes failure. Pair with rainfall and temperature data.',
  motivation: 'Geotechnical monitoring is expensive and rarely deployed on roadside cuts. Low-cost sensor networks could close this gap, especially for the Hajj-period high-traffic months.',
  trigger: 'Read a 2024 Geotechnical Frontiers paper on Raspberry Pi-based slope monitors deployed in Norway.',
  data: 'Need partner site (Min. of Transport?). One full instrumented slope, 12+ months continuous data.',
  methods: 'MEMS tilt sensors · LoRaWAN gateway · threshold-based alerting.',
  effort: '12–18 months · could be a PhD project rather than just a paper.',
  status: 'plan',
  author: 'AS',
  tags: ['monitoring', 'sensors', 'slope-stability', 'long-term'],
  comments: [
    { id:'seed-slope-c1', who:'BS', text:'I like this. Should we pitch it to KAUST as a joint? They have the LoRa expertise.', t: Date.now() - 1000 * 60 * 60 * 24 * 1 },
    { id:'seed-slope-c2', who:'AS', text:'Yes — let me draft a one-pager next week.', t: Date.now() - 1000 * 60 * 60 * 12 },
  ],
  created: Date.now() - 1000 * 60 * 60 * 24 * 14,
  updated: Date.now() - 1000 * 60 * 60 * 12,
};

const ARCHIVE_SEED = {
  id: 'seed-archive-sgs',
  title: 'Digitising legacy SGS slope failure database for ML risk modelling',
  summary: 'The Saudi Geological Survey holds ~30 years of slope failure records, currently in paper files. Digitise + clean + use as training data.',
  motivation: '',
  trigger: 'Conversation with Dr. K. at SGS workshop.',
  data: '',
  methods: '',
  effort: '',
  status: 'parked',
  author: 'AS',
  tags: ['ML', 'archive', 'long-shot'],
  comments: [],
  created: Date.now() - 1000 * 60 * 60 * 24 * 45,
  updated: Date.now() - 1000 * 60 * 60 * 24 * 45,
};

const SEED_IDEAS = [CORROSION_SEED, SLOPE_SEED, JRC_SEED, DRONE_SEED, ARCHIVE_SEED];

const APP_KB_NAV_SEED = {
  id: 'seed-app-kb-nav',
  title: 'Knowledge Base navigation crystal and collapsible strip',
  summary: 'Ruby crystal toggle centred in the nav bar with a reserved gap so links are never covered. The bar slides away while the crystal stays fixed.',
  motivation: 'Navigation should feel like part of the vault product — visible by default, hideable without losing the control, and consistent across every page.',
  trigger: 'Design review of the home hub and bottom navigation bar, May 2026.',
  data: 'Shared nav-strip.css / nav-strip.js across vault HTML pages.',
  methods: 'Fixed shell header + sliding panel; localStorage for collapse preference.',
  effort: 'Shipped in vault shell — iterate on crystal styling and mobile wrap.',
  status: 'approved',
  author: 'BS',
  tags: ['navigation', 'vault-ui', 'design'],
  comments: [],
  created: Date.now() - 1000 * 60 * 60 * 24 * 2,
  updated: Date.now() - 1000 * 60 * 60 * 24 * 1,
};

const APP_HUB_EXPLORE_SEED = {
  id: 'seed-app-hub-explore',
  title: 'Home Explore hub — metallic discs and Add shortcuts',
  summary: 'Landing page Explore menu with Najd, Profile, and Ideas discs plus an Add picker for custom shortcuts stored in localStorage.',
  motivation: 'The vault entry point should be tactile and fast — one click to programmes, profile views, or the ideas workspace.',
  trigger: 'Consolidation of the Sabtan Knowledge Base Vault HTML folder.',
  data: 'index.html hub JS · sabtan-hub-shortcuts key.',
  methods: 'CSS metallic discs · progressive open state · page picker.',
  effort: 'Ongoing polish on spacing, profile sub-panel, and Ideas category switch.',
  status: 'plan',
  author: 'BS',
  tags: ['home', 'hub', 'shortcuts'],
  comments: [],
  created: Date.now() - 1000 * 60 * 60 * 24 * 4,
  updated: Date.now() - 1000 * 60 * 60 * 24 * 3,
};

const APP_IDEAS_SWITCH_SEED = {
  id: 'seed-app-ideas-switch',
  title: 'Ideas workspace — Research vs App category switch',
  summary: 'Single Ideas page with a fixed header and flip switch. The research pipeline panel swaps with an app/vault ideas panel without moving the header.',
  motivation: 'Research paper ideas and product/vault ideas share a workflow but not the same audience or storage — one page, two windows.',
  trigger: 'User request for Research Ideas and App Ideas on the same page with a stable header.',
  data: 'ideas-react app shell · separate localStorage keys per category.',
  methods: 'Sticky ideas-shell-header · conditional workspace mount.',
  effort: '1–2 sessions — extend App Ideas seeds as vault features land.',
  status: 'discuss',
  author: 'BS',
  tags: ['ideas', 'react', 'vault-ui'],
  comments: [],
  created: Date.now() - 1000 * 60 * 60 * 12,
  updated: Date.now() - 1000 * 60 * 60 * 6,
};

const APP_SEED_IDEAS = [APP_IDEAS_SWITCH_SEED, APP_KB_NAV_SEED, APP_HUB_EXPLORE_SEED];

function loadInitialState(storageKey, seedIdeas){
  try{
    const raw = localStorage.getItem(storageKey);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && Array.isArray(parsed.ideas)) return parsed;
    }
  }catch(e){}
  return { ideas: seedIdeas };
}

/* ─── Main hook: ideas with persistence ─── */
function createUseIdeas(storageKey, seedIdeas){
  return function useIdeas(){
    const [state, setState] = useState(() => loadInitialState(storageKey, seedIdeas));

  useEffect(() => {
    try{ localStorage.setItem(storageKey, JSON.stringify(state)); }catch(e){}
  }, [state, storageKey]);

  const update = useCallback(fn => setState(s => ({ ...s, ideas: fn(s.ideas) })), []);

  const addIdea = useCallback((author) => {
    const idea = {
      id: uid(),
      title: '', summary: '', motivation: '', trigger: '',
      data: '', methods: '', effort: '',
      status: 'halfbaked',
      author,
      tags: [], comments: [],
      hiddenSections: ['trigger', 'data', 'methods', 'effort'],
      created: Date.now(), updated: Date.now(),
    };
    update(ideas => [idea, ...ideas]);
    return idea.id;
  }, [update]);

  const patchIdea = useCallback((id, patch) => {
    update(ideas => ideas.map(i => i.id === id ? { ...i, ...patch, updated: Date.now() } : i));
  }, [update]);

  const moveStatus = useCallback((id, status) => {
    update(ideas => ideas.map(i => i.id === id ? { ...i, status, updated: Date.now() } : i));
  }, [update]);

  const deleteIdea = useCallback((id) => {
    update(ideas => ideas.filter(i => i.id !== id));
  }, [update]);

  const addComment = useCallback((id, who, text) => {
    update(ideas => ideas.map(i => i.id !== id ? i : {
      ...i, comments: [...(i.comments||[]), { id: uid(), who, text, t: Date.now() }],
      updated: Date.now(),
    }));
  }, [update]);

  const removeComment = useCallback((id, cid) => {
    update(ideas => ideas.map(i => i.id !== id ? i : {
      ...i, comments: (i.comments||[]).filter(c => c.id !== cid),
      updated: Date.now(),
    }));
  }, [update]);

  const addTag = useCallback((id, tag) => {
    update(ideas => ideas.map(i => {
      if(i.id !== id) return i;
      const tags = i.tags || [];
      if(tags.includes(tag)) return i;
      return { ...i, tags: [...tags, tag], updated: Date.now() };
    }));
  }, [update]);

  const removeTag = useCallback((id, tag) => {
    update(ideas => ideas.map(i => i.id !== id ? i
      : { ...i, tags: (i.tags||[]).filter(t => t !== tag), updated: Date.now() }));
  }, [update]);

  return {
    ideas: state.ideas,
    addIdea, patchIdea, moveStatus, deleteIdea,
    addComment, removeComment, addTag,     removeTag,
  };
  };
}

const useResearchIdeas = createUseIdeas(STORAGE_KEY, SEED_IDEAS);
const useAppIdeas = createUseIdeas(APP_STORAGE_KEY, APP_SEED_IDEAS);

function useIdeas(){
  return useResearchIdeas();
}

/* ─── Active author hook ─── */
function useActiveAuthor(){
  const [author, setAuthor] = useState(() => localStorage.getItem(AUTHOR_KEY) || 'AS');
  useEffect(() => {
    try{ localStorage.setItem(AUTHOR_KEY, author); }catch(e){}
  }, [author]);
  return [author, setAuthor];
}

Object.assign(window, {
  STATUS_OPTS, STATUS_BY_ID, AUTHOR_LABEL,
  IDEA_FIELD_KEYS, IDEA_TEMPLATES, getIdeaTemplate, getHiddenSections,
  uid, escapeRegex, highlightText, relTime, fullDate, timeGroup,
  useIdeas, useResearchIdeas, useAppIdeas, useActiveAuthor,
});
