/* Phase I paper content — Papers 1 & 2 */
const PHASE1_META = {
  kicker: 'Phase I of III — Field Characterisation',
  title: 'Structural Characterisation & Index Development',
  badges: ['Months 0–6', '2 papers', '330 joints · 5 sites', 'Granodiorite · Makkah region'],
  description:
    'Establishes the bimodal Najd/Red Sea joint signature statistically and formalises the first measurable Najd Intensity Index. Both papers can proceed to submission immediately using data already collected.',
};

const AUTHORS = {
  AS: {
    id: 'AS',
    name: 'Prof. Abdullah Sabtan',
    ini: 'AS',
    theme: 'teal',
  },
  BS: {
    id: 'BS',
    name: 'Dr. Bader Sabtan',
    ini: 'BS',
    theme: 'amber',
  },
};

const PHASE1_PAPERS = [
  {
    id: 'p1',
    num: 'Paper 1',
    color: 'blue',
    title: 'Bimodal joint population characterisation at Najd-affected road cuts, Makkah region',
    tags: ['Structural geology', 'Circular statistics', 'Field data'],
    meta: {
      journal: 'Journal of Structural Geology',
      journalAlts: ['Engineering Geology', 'Arabian Journal of Geosciences', 'J. Geophysical Research – Solid Earth', 'Tectonophysics'],
      dataStatus: 'Complete — 5 sites, 330 joints',
      timeline: '3–5 months to submission',
    },
    description:
      'Two statistically distinct joint families co-exist at all 5 sites — Najd (NW–SE, R̄≈0.98–1.00) and Red Sea (NE–SW). Site 2 shows Red Sea more coherent than Najd, indicating overprinting. Site 5 is a three-way mixture: Najd 39%, Red Sea 18%, unclassified 42%.',
    guideHref: '/Paper 1/drafts/p1/G -p1 - guide .html',
    guideLabel: 'Open Paper 1 Writing Guide →',
    authors: [
      {
        ...AUTHORS.AS,
        role: 'Lead · geological interpretation',
        items: [
          'Led all field data collection at 5 granodiorite outcrops along Makkah region road cuts — dip and dip direction recorded per joint plane',
          'Identified and interpreted the bimodal joint fabric as evidence of two distinct tectonic episodes separated by ~600 Ma',
          'Established the geological argument for Site 2 overprinting: Cenozoic Red Sea rifting reactivating older Najd joint planes',
          'Provided regional structural context linking joint orientations to the Najd shear corridor and Precambrian basement fabric',
        ],
      },
      {
        ...AUTHORS.BS,
        role: 'Co-author · circular statistics',
        items: [
          'Applied Rayleigh test and V-test to all 330 measurements — confirmed non-uniform distribution at 4 of 5 sites (p < 0.05)',
          'Fitted von Mises distributions to each joint family, computing mean direction μ and concentration κ per population per site',
          "Decomposed Site 5's apparent randomness: Najd 39% (R̄=0.99), Red Sea 18% (R̄=0.43), unclassified 42% — explaining pooled Rayleigh p=0.228",
          'Computed R̄ values ranging 0.07–1.00, identifying the Najd family as more concentrated across all sites',
        ],
      },
    ],
    detailTags: [
      { author: 'BS', label: 'Rayleigh test', tip: 'Tests for preferred direction. Z-statistic from R̄. Low p < 0.05 = significant preferred direction.' },
      { author: 'BS', label: 'Von Mises fitting', tip: 'Circular normal per joint family. Estimates μ and κ. Higher κ = tighter cluster.' },
      { author: 'AS', label: 'Rose diagrams', tip: 'Circular frequency plots in 10° bins, one per site, colour-coded by family.' },
      { author: 'AS', label: 'Bimodal mixture', tip: 'Najd (110–165°) vs Red Sea (030–075°) decomposition at each outcrop.' },
      { author: 'BS', label: 'R̄ values', tip: 'Mean resultant length 0–1. R̄≈0.99 = very tight; R̄≈0.07 = scattered.', tipRight: true },
      { author: 'AS', label: '5 sites · 330 joints', tip: 'Scanline surveys across 5 granodiorite outcrops. Dip angle and direction recorded per joint plane.', tipRight: true },
    ],
  },
  {
    id: 'p2',
    num: 'Paper 2',
    color: 'blue',
    title: 'Najd Intensity Index (NII): a composite quantitative index linking structural fabric to rock mass quality',
    tags: ['Engineering geology', 'Index development', 'IE methods'],
    meta: {
      journal: 'Engineering Geology',
      journalAlts: ['Rock Mechanics and Rock Engineering', 'Intl. J. Rock Mechanics & Mining Sciences', 'Geomechanics and Geoengineering', 'Geotechnical and Geological Engineering'],
      dataStatus: 'Paper 1 results + Schmidt + GSI/RMR',
      timeline: '4–6 months (after Paper 1)',
    },
    description:
      'Formally defines the NII as a weighted composite of R̄, %Najd joints, joint frequency, Schmidt hammer R, and weathering grade W. Calibrates NII against GSI/RMR across 5 sites — filling the field\'s biggest gap: "Najd intensity" used qualitatively everywhere but never formally measured.',
    authors: [
      {
        ...AUTHORS.AS,
        role: 'Co-author · geological interpretation',
        items: [
          'Provided geological constraints bounding NII weight ranges — preventing combinations inconsistent with Najd fault mechanics and field observation',
          'Validated index outputs against field rock mass assessments at all 5 sites, flagging cases where NII conflicted with observed conditions',
          'Interpreted the GSI/RMR gradient across sites as a proxy for proximity to active Najd shear zones and degree of cataclastic overprinting',
        ],
      },
      {
        ...AUTHORS.BS,
        role: 'Lead · index development',
        items: [
          'Designed the NII formula: NII = w₁·R̄ + w₂·%Najd + w₃·JF + w₄·R_schmidt + w₅·W_grade',
          'Built Pearson correlation matrix identifying R̄ and %Najd as dominant predictors and Schmidt R and weathering grade as complementary inputs',
          'Ran constrained regression of NII against GSI and RMR across 5 sites, achieving R² > 0.85 within geologically bounded weight ranges',
          'Converted Schmidt rebound R to UCS via Deere-Miller chart (mean R=46–49 → UCS≈80–110 MPa)',
        ],
      },
    ],
    detailTags: [
      { author: 'BS', label: 'NII formula', tip: 'NII = w₁·R̄ + w₂·%Najd + w₃·JF + w₄·R_schmidt + w₅·W_grade. Weights optimised by regression against GSI.' },
      { author: 'BS', label: 'Schmidt → UCS', tip: 'R converted via Deere-Miller chart. Mean R=46–49 gives UCS≈80–110 MPa.' },
      { author: 'BS', label: 'GSI/RMR regression', tip: 'Pearson regression of NII against field GSI and RMR. Target R²>0.85 for validation.' },
      { author: 'BS', label: 'Pearson correlation', tip: 'Full matrix across all parameters. Identifies redundant inputs before weight optimisation.', tipRight: true },
      { author: 'AS', label: 'Weight optimisation', tip: 'Geological judgement constrains weight ranges — prevents NII inconsistent with Najd mechanics.', tipRight: true },
    ],
  },
];
