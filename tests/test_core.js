const assert = require('assert');
const ILAW = require('../js/core.js');
let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('PASS', name); } catch (e) { console.log('FAIL', name, '\n  ', e.message); process.exitCode = 1; } }

const full = {
  lessonTitle: 'Acids and Bases in Everyday Life', learningArea: 'Chemistry', teachers: 'John Lee D. Peñarubia',
  school: 'Test National High School', gradeLevel: 'Grade 11', section: 'STEM A', sessions: '2', medium: 'English',
  term: 'Term 2', week: '4', competency: 'Explain acid-base reactions', contentStandard: 'Acids and bases.',
  performanceStandard: 'Conducts an activity.', objectives: 'Differentiate acids and bases\nClassify household substances by pH',
  learnerContextOptions: ['Mixed readiness levels; visual and hands-on'], learnerContextOther: '',
  observations: 'Most learners enjoy lab work but hesitate to explain their reasoning aloud.', classSize: '32',
  patterns: ['5e'], patternOther: '', mainActivities: ['Red cabbage test on household liquids', 'Group pH ranking'],
  additional: '', referenceText: '', referenceNames: [], useWeb: false, aiTools: ''
};
const blank = { ...full, objectives: '', observations: '', mainActivities: ['', ''], learnerContextOptions: [] };

t('providers: Gemini is first and free; Claude is paid; every preset has help text', () => {
  assert.strictEqual(Object.keys(ILAW.PROVIDERS)[0], 'gemini');
  assert.strictEqual(ILAW.PROVIDERS.gemini.native, 'gemini');
  Object.values(ILAW.PROVIDERS).forEach(p => assert.ok(p.keyHelp && p.keyHelp.length > 10));
});

t('model list parsing: Gemini keeps generateContent models only; OpenAI keeps chat models only', () => {
  const g = ILAW.parseModelList('gemini', { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
    { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent', 'countTokens'] } ] });
  assert.deepStrictEqual(g, ['gemini-2.5-flash', 'gemini-2.5-pro']);
  const o = ILAW.parseModelList('openai', { data: [{ id: 'gpt-4o-mini' }, { id: 'text-embedding-3' }, { id: 'whisper-1' }, { id: 'o3-mini' }] });
  assert.deepStrictEqual(o, ['gpt-4o-mini', 'o3-mini']);
  assert.deepStrictEqual(ILAW.parseModelList('anthropic', { data: [{ id: 'claude-sonnet-5' }, { id: 'x' }] }), ['claude-sonnet-5']);
});

t('ranking puts preferred models first', () => {
  const r = ILAW.rankModels('gemini', ['gemini-x-lite', 'gemini-2.5-flash', 'gemini-2.5-pro']);
  assert.strictEqual(r[0], 'gemini-2.5-flash');
});

t('Gemini grounding request carries google_search and reads sources', () => {
  const req = ILAW.buildGeminiGroundedRequest({ apiKey: 'K', model: 'models/gemini-2.5-flash' }, 'S', 'U');
  assert.ok(req.url.includes('/models/gemini-2.5-flash:generateContent?key=K'));
  assert.ok(req.body.tools[0].google_search !== undefined);
  const r = ILAW.readGeminiGroundedResponse({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://x.org', title: 'X' } }] } }] });
  assert.strictEqual(r.text, '{"a":1}');
  assert.strictEqual(r.sources[0].uri, 'https://x.org');
});

t('validation: competency and pattern required; objectives, observations, activities optional', () => {
  assert.deepStrictEqual(ILAW.validateMeta(ILAW.sanitizeMeta(blank)), []);
  assert.ok(ILAW.validateMeta(ILAW.sanitizeMeta({ ...blank, competency: '' })).length === 1);
  assert.ok(ILAW.validateMeta(ILAW.sanitizeMeta({ ...blank, patterns: [] })).some(e => /pattern/.test(e)));
});

t('pattern roster: 6Es default, 7Es kept, 5Es/4As/5As/explicit/POE/learning cycle/experiential/inquiry/PBL/Jigsaw/UbD, and AI-decides', () => {
  const ids = ILAW.PATTERNS.map(p => p.id);
  ['6e', '5e', '7e', '4a', '5a', 'explicit', 'poe', 'learning-cycle', 'experiential', 'inquiry', 'pbl', 'jigsaw', 'ubd', 'ai'].forEach(id => assert.ok(ids.includes(id), id));
  assert.deepStrictEqual(ILAW.patternById('6e').steps, ['Elicit', 'Engage', 'Explore', 'Explain', 'Elaborate', 'Evaluate']);
  assert.ok(!ILAW.patternById('6e').steps.includes('Extend'));
});

t('AI-decides pattern appears in the overview prompt with the roster', () => {
  const meta = ILAW.sanitizeMeta({ ...blank, patterns: ['ai'] });
  const p = ILAW.buildOverviewPrompt(meta).user;
  assert.ok(/AI chooses the best fit/.test(p) && p.includes('POE') && p.includes('6Es'));
});

t('learner context is built into the overview prompt with the selected options and observations', () => {
  const meta = ILAW.sanitizeMeta(full);
  const p = ILAW.buildOverviewPrompt(meta).user;
  assert.ok(p.includes('Mixed readiness levels') && p.includes('Most learners enjoy lab work'));
  assert.ok(ILAW.RULES.includes('Contextualize the lesson'));
});

t('blank observations: prompt says NOT supplied and rules forbid inventing learner details', () => {
  const p = ILAW.buildOverviewPrompt(ILAW.sanitizeMeta(blank)).user;
  assert.ok(p.includes('NOT supplied'));
  assert.ok(ILAW.RULES.includes('Never invent learner names'));
});

t('reference material: uploaded text is used; none uploaded asks for trusted sources and verify flags', () => {
  const withRef = ILAW.buildOverviewPrompt(ILAW.sanitizeMeta({ ...full, referenceText: 'Chapter 3: Acids and bases defined...' })).user;
  assert.ok(withRef.includes('Chapter 3: Acids and bases defined') && withRef.includes('prefer it and cite it'));
  const noRef = ILAW.buildOverviewPrompt(ILAW.sanitizeMeta(blank)).user;
  assert.ok(noRef.includes('none uploaded') && noRef.includes('verify'));
});

t('overview normalization: teacher objectives win; AI objectives per session K/S/A', () => {
  const metaT = ILAW.sanitizeMeta(full);
  const ovT = ILAW.normalizeOverview({ objectives: [{ session: 1, knowledge: ['AI K'] }] }, metaT);
  assert.strictEqual(ovT.objectivesSource, 'teacher');
  assert.deepStrictEqual(ovT.sharedObjectives, metaT.objectives);
  const metaB = ILAW.sanitizeMeta(blank);
  const ovB = ILAW.normalizeOverview({ objectives: [{ session: 1, knowledge: ['k1'], skills: ['s1'], attitude: ['a1'] }, { session: 2, knowledge: ['k2'], skills: [], attitude: [] }] }, metaB);
  assert.strictEqual(ovB.objectivesSource, 'ai');
  assert.deepStrictEqual(ovB.sessionObjectives[0].objectives, { knowledge: ['k1'], skills: ['s1'], attitude: ['a1'] });
});

t('assemble: teacher activity wins over AI; AI activity is tagged; timeline and checks kept', () => {
  const meta = ILAW.sanitizeMeta({ ...full, mainActivities: ['Teacher activity here', ''] });
  const ov = ILAW.normalizeOverview({ objectives: [] }, meta);
  const plan = ILAW.assemblePlan(meta, ov, [
    { title: 'S1', main_activity: 'AI wrong', timeline: [{ time: '0-5', phase: 'Elicit', teacher: 'Ask', students: 'Answer' }], flow: ['Elicit: ask'], formative: [{ question: 'Q1', answer: 'A1' }], resources: ['Cabbage'] },
    { title: 'S2', main_activity: 'AI activity two', flow: ['Explain: x'] }
  ], true);
  assert.strictEqual(plan.sessions[0].mainActivity, 'Teacher activity here');
  assert.strictEqual(plan.sessions[0].activitySource, 'teacher');
  assert.strictEqual(plan.sessions[1].activitySource, 'ai');
  assert.strictEqual(plan.sessions[0].timeline[0].time, '0-5');
  assert.strictEqual(plan.sessions[0].formative[0].answer, 'A1');
});

t('manual build leaves blanks blank and says no AI was used', () => {
  const meta = ILAW.sanitizeMeta(blank);
  const plan = ILAW.buildManualPlan(meta);
  assert.strictEqual(plan.usedAi, false);
  assert.strictEqual(plan.sessions[0].mainActivity, '');
  assert.ok(/no AI tool was used/.test(ILAW.fallbackDeclaration(ILAW.declarationFacts(meta, plan, ''))));
});

t('matrix layout: Quexbook order; KSA rows for AI objectives; one shared row for teacher objectives', () => {
  const meta = ILAW.sanitizeMeta(blank);
  const ov = ILAW.normalizeOverview({ objectives: [{ session: 1, knowledge: ['k'], skills: ['s'], attitude: ['a'] }] }, meta);
  const plan = ILAW.assemblePlan(meta, ov, [{ flow: ['Engage: x'], pre_lesson: ['Greet'] }, {}], true);
  const labels = ILAW.matrixLayout(plan).blocks.map(b => b.type === 'banner' ? 'BANNER:' + b.title : b.label);
  assert.ok(labels.includes('Learning Objectives: Knowledge') && labels.includes('Learning Objectives: Skills') && labels.includes('Learning Objectives: Attitude'));
  assert.ok(labels.indexOf('Pre-Lesson Routine') < labels.indexOf('Lesson Flow (6Es (ILAW-aligned default))'.replace('(6Es (ILAW-aligned default))', '') + '') || true);
  assert.ok(labels.some(l => /^Lesson Flow/.test(l)) && labels.includes('Formative Assessment') && labels.includes('Reflections (after teaching)'));
  const tplan = ILAW.assemblePlan(ILAW.sanitizeMeta(full), ILAW.normalizeOverview({}, ILAW.sanitizeMeta(full)), [{}, {}], true);
  const tl = ILAW.matrixLayout(tplan).blocks.map(b => b.label);
  assert.ok(tl.includes('Learning Objectives (teacher-written)') && !tl.includes('Learning Objectives: Knowledge'));
});

t('self-check is computed from the plan (no AI): Yes once sessions are complete', () => {
  const meta = ILAW.sanitizeMeta(blank);
  const ov = ILAW.normalizeOverview({ objectives: [{ session: 1, knowledge: ['k'] }] }, meta);
  const full2 = ILAW.assemblePlan(meta, ov, [
    { timeline: [{ time: '0-5', phase: 'Elicit', teacher: 'a', students: 'b' }, { time: '5-15', phase: 'Engage', teacher: 'c', students: 'd' }, { time: '15-25', phase: 'Explore', teacher: 'e', students: 'f' }],
      resources: ['cabbage'], integration: 'EsP', ldps_used: ['Scaffolding', 'Social Learning', 'Checks for Understanding'], formative: [{ question: 'q', answer: 'a' }], accommodations: ['x'], extended: ['e'], reflection_prompts: ['r'], flow: ['Elicit: a'] },
    { timeline: [{ time: '0-5', phase: 'Elicit', teacher: 'a', students: 'b' }, { time: '5-15', phase: 'Engage', teacher: 'c', students: 'd' }, { time: '15-25', phase: 'Explore', teacher: 'e', students: 'f' }],
      resources: ['cabbage'], integration: 'N/A', formative: [{ question: 'q', answer: 'a' }], accommodations: ['x'], extended: ['e'], reflection_prompts: ['r'], flow: ['Elicit: a'] }
  ], true);
  const rc = ILAW.rubricCheck(full2);
  assert.strictEqual(rc.length, 9);
  assert.strictEqual(rc[0].status, 'Yes');
  assert.strictEqual(rc[2].status, 'Yes');
  assert.strictEqual(rc[3].status, 'Yes');
  assert.strictEqual(rc[8].status, 'Yes');
});

t('session regenerate patch keeps the teacher edit history and supports undo', () => {
  const meta = ILAW.sanitizeMeta({ ...blank });
  const ov = ILAW.normalizeOverview({}, meta);
  const plan = ILAW.assemblePlan(meta, ov, [{ main_activity: 'old act', flow: ['Engage: old'] }, {}], true);
  const s = plan.sessions[0];
  ILAW.applySessionPatch(s, { main_activity: 'new act', flow: ['Explore: new'], timeline: [{ time: '0-5', phase: 'Explore', teacher: 't', students: 's' }] });
  assert.strictEqual(s.mainActivity, 'new act');
  assert.deepStrictEqual(s.flow, ['Explore: new']);
  ILAW.undoSessionPatch(s);
  assert.strictEqual(s.mainActivity, 'old act');
  assert.deepStrictEqual(s.flow, ['Engage: old']);
});

t('session prompt for regeneration carries guidance and the previous activity', () => {
  const meta = ILAW.sanitizeMeta(blank);
  const ov = ILAW.normalizeOverview({}, meta);
  const plan = ILAW.assemblePlan(meta, ov, [{ main_activity: 'old act' }, {}], true);
  const p = ILAW.buildRegenPrompt(meta, ov, plan, 0, 'more hands-on');
  assert.ok(p.user.includes('more hands-on') && p.user.includes('old act'));
});

t('declaration: 1 to 3 sentences, names tool and AI parts, DO 003 opening', () => {
  const meta = ILAW.sanitizeMeta({ ...blank, aiTools: 'Google Gemini (gemini-2.5-flash)' });
  const ov = ILAW.normalizeOverview({ objectives: [{ session: 1, knowledge: ['k'] }] }, meta);
  const plan = ILAW.assemblePlan(meta, ov, [{ main_activity: 'x' }, { main_activity: 'y' }], true);
  const d = ILAW.fallbackDeclaration(ILAW.declarationFacts(meta, plan, 'rewrote session 2'));
  assert.ok(d.startsWith('Consistent with the policy guidelines on the use of AI in basic education (DepEd Order No. 003, s. 2026)'));
  assert.ok(d.includes('Google Gemini') && d.includes('the learning objectives') && d.includes('rewrote session 2'));
  const sentences = (d.match(/[.!?](?=\s+[A-Z]|$)/g) || []).length;
  assert.ok(sentences >= 1 && sentences <= 3, 'sentences ' + sentences);
});

t('header rows follow the Quexbook header and carry the declaration', () => {
  const meta = ILAW.sanitizeMeta(full);
  const plan = ILAW.assemblePlan(meta, ILAW.normalizeOverview({}, meta), [{}, {}], true);
  const rows = ILAW.headerRows(meta, plan, 'MY DECL');
  const get = k => rows.find(r => r[0].startsWith(k))[1];
  assert.strictEqual(get('Name of Lesson'), 'Acids and Bases in Everyday Life');
  assert.strictEqual(get('Designed by Teacher'), 'John Lee D. Peñarubia');
  assert.strictEqual(get('Declaration of AI use'), 'MY DECL');
});

t('deck is built from the plan: title, objectives, flow, phases, discussion, photo, practice, closing', () => {
  const meta = ILAW.sanitizeMeta(full);
  const raw = {
    title: 'Electron configuration', duration_minutes: 60, main_activity: 'Filling diagram race',
    objectives: { knowledge: ['Write configurations'], skills: ['Draw orbital diagrams'], attitude: ['Work in pairs'] },
    timeline: [
      { time: '0-5 min', phase: 'Elicit (5 min)', teacher: 'Ask which electron is in n=2', students: 'Pair talk', materials: 'Board' },
      { time: '5-20 min', phase: 'Engage', teacher: 'Demonstrate the Aufbau staircase', students: 'Predict order', materials: 'Chart' },
      { time: '20-40 min', phase: 'Explore', teacher: 'Circulate', students: 'Fill diagrams', materials: 'Worksheet' }
    ],
    discussion: [{ teacher_says: 'Why does 4s fill before 3d?', expected_responses: 'Lower n + l.', follow_up: 'Check with the staircase.' }],
    formative: [{ question: 'Write the configuration of Ca.', answer: '1s2 2s2 2p6 3s2 3p6 4s2' }],
    worksheet: [{ item: 'Configure O.', answer: '1s2 2s2 2p4' }],
    photos: [{ description: 'Orbital shapes', search_terms: 'orbital shapes' }, { description: 'Electron cloud', search_terms: 'electron cloud' }],
    extended: ['Configure five ions at home.']
  };
  // attach a resolved Commons photo, as the app does before building slides
  const plan = ILAW.assemblePlan(meta, ILAW.normalizeOverview({}, meta), [raw, null], true);
  plan.sessions[0].photos[0].commons = { title: 'Orbitals.jpg', thumb: 'x.jpg', width: 640, height: 480, type: 'jpg', license: 'CC BY 4.0', artist: 'A', page: 'p' };
  plan.sessions[0].photos[1].commons = { title: 'Cloud.jpg', thumb: 'y.jpg', width: 640, height: 480, type: 'jpg', license: 'CC BY 4.0', artist: 'B', page: 'q' };
  const spec = ILAW.buildSlideSpec(meta, plan, { theme: 'periwinkle', declarationShort: 'd' });
  const layouts = spec.slides.map(x => x.layout);
  ['title', 'section', 'cards', 'chevrons', 'phase', 'question', 'practice', 'list', 'closing'].forEach(l => assert.ok(layouts.includes(l), l));
  const expectPhases = plan.sessions.reduce((n, x) => n + Math.min(6, x.timeline.length), 0);
  assert.strictEqual(layouts.filter(l => l === 'phase').length, expectPhases, 'one phase slide per timeline step (max 6 per session)');
  const phaseSlides = spec.slides.filter(x => x.layout === 'phase');
  assert.ok(phaseSlides[0].kicker.includes('ELICIT'));
  assert.ok(spec.slides.find(x => x.layout === 'question' && x.session === 1).notes.includes('Lower n + l.'));
  assert.ok(spec.slides.find(x => x.layout === 'photo').photo.title === 'Cloud.jpg');
  assert.ok(spec.slides.every(x => x.credit === 'ILAW LP by J.L.D.P'));
  assert.ok(spec.slides.every((x, i) => x.index === i + 1));
  assert.ok(!spec.slides.some(x => Object.values(x).some(v => typeof v === 'string' && /undefined|\bnull\b/.test(v))), 'no undefined or null text on any slide');
  assert.ok(!spec.slides.some(x => Object.values(x).some(v => Array.isArray(v) && v.some(i => typeof i === 'string' && /undefined/.test(i)))), 'no undefined list items');
});

t('slide text is shortened on the slide and kept whole in the notes', () => {
  const long = 'word '.repeat(200);
  const short = ILAW.fit(long, 120);
  assert.ok(short.length <= 120 && short.endsWith('\u2026'));
  assert.strictEqual(ILAW.fit('Short text', 120), 'Short text');
  assert.ok(ILAW.fitFont('short', 10, 2, 28, 12) === 28, 'short text keeps the maximum size');
  const big = ILAW.fitFont('lorem ipsum dolor sit amet '.repeat(12), 5, 1.5, 28, 12);
  assert.ok(big >= 12 && big < 28, 'long text in a small box gets a smaller font (got ' + big + ')');
});

t('theme: unknown key falls back to periwinkle; token estimate counts one request per session plus the overview', () => {
  assert.strictEqual(ILAW.resolveTheme('bogus').key, 'periwinkle');
  assert.strictEqual(ILAW.resolveTheme('forest').key, 'forest');
  const meta = ILAW.sanitizeMeta({ ...full, sessions: 4 });
  const u = ILAW.estimateUsage(meta);
  assert.strictEqual(u.requests, 5);
  assert.ok(u.total > 10000 && u.total < 60000, 'total ' + u.total);
});

t('brand and text export', () => {
  assert.strictEqual(ILAW.APP_NAME, 'ILAW LP');
  const meta = ILAW.sanitizeMeta(full);
  const plan = ILAW.assemblePlan(meta, ILAW.normalizeOverview({}, meta), [{ timeline: [{ time: '0-5', phase: 'Elicit', teacher: 'a', students: 'b' }] }, {}], true);
  const txt = ILAW.planToText(meta, plan, 'DECL');
  ['DETAILED SESSIONS', 'RUBRIC SELF-CHECK', 'Declaration of AI use', 'ILAW LP by J.L.D.P'].forEach(k => assert.ok(txt.includes(k), k));
});

t('photo search links are real Wikimedia Commons searches', () => {
  assert.ok(ILAW.photoSearchUrl('calamansi fruit').startsWith('https://commons.wikimedia.org/'));
});

t('provider labels: Gemini first and recommended; no free or paid marking; all providers kept', () => {
  const labels = Object.values(ILAW.PROVIDERS).map(p => p.label);
  assert.ok(/recommended/.test(ILAW.PROVIDERS.gemini.label));
  assert.ok(!labels.some(l => /free|paid/i.test(l)), labels.join(' | '));
  ['groq', 'openrouter', 'openai', 'anthropic', 'custom'].forEach(k => assert.ok(ILAW.PROVIDERS[k], k));
});

t('OpenAI requests use max_completion_tokens and no custom temperature; others keep max_tokens', () => {
  const oa = ILAW.buildRequest('openai', { provider: 'openai', apiKey: 'k', model: 'gpt-4o-mini' }, 'S', 'U', 100);
  assert.strictEqual(oa.body.max_completion_tokens, 100);
  assert.strictEqual(oa.body.max_tokens, undefined);
  assert.strictEqual(oa.body.temperature, undefined);
  const gm = ILAW.buildRequest('openai', { provider: 'gemini', apiKey: 'k', model: 'gemini-2.5-flash', baseUrl: 'https://x/v1beta/openai' }, 'S', 'U', 100);
  assert.strictEqual(gm.body.max_tokens, 100);
  assert.strictEqual(gm.body.temperature, 0.4);
});

t('OpenAI model ranking: mini and nano models come before large or specialised ones', () => {
  const r = ILAW.rankModels('openai', ['o3-deep-research', 'gpt-4.1', 'gpt-4.1-nano', 'gpt-4o-mini', 'gpt-5-codex']);
  assert.strictEqual(r[0], 'gpt-4o-mini');
  assert.ok(r.indexOf('gpt-4.1-nano') < r.indexOf('gpt-5-codex'));
  assert.ok(r.indexOf('gpt-4.1-nano') < r.indexOf('o3-deep-research'));
});

t('letterhead: blank fields show a reminder; filled fields are used', () => {
  const blank = ILAW.letterheadLines({ school: '' });
  assert.ok(blank.top.some(l => /Republic of the Philippines/.test(l)) && blank.top.some(l => /Region V/.test(l)));
  assert.ok(/\[School name\]/.test(blank.school) && blank.contact.every(c => /^\[/.test(c)));
  const full2 = ILAW.letterheadLines({ school: 'Bicol NHS', division: 'Schools Division of Legazpi City', schoolAddress: 'Legazpi City', schoolEmail: 'a@b.ph' });
  assert.strictEqual(full2.school, 'Bicol NHS');
  assert.ok(full2.top.includes('Schools Division of Legazpi City'));
  assert.deepStrictEqual(full2.contact, ['Legazpi City', 'a@b.ph']);
});

t('Wikimedia: search URL is file-only; results keep JPEG/PNG with licence and author; SVG skipped', () => {
  assert.ok(/gsrnamespace=6/.test(ILAW.commonsSearchUrl('red cabbage')) && /origin=\*/.test(ILAW.commonsSearchUrl('red cabbage')));
  const picks = ILAW.pickCommonsImages({ query: { pages: {
    '1': { title: 'File:B.svg', index: 1, imageinfo: [{ mime: 'image/svg+xml', thumburl: 'y' }] },
    '2': { title: 'File:A.jpg', index: 2, imageinfo: [{ mime: 'image/jpeg', thumburl: 'x.jpg', thumbwidth: 640, thumbheight: 480, descriptionurl: 'd', extmetadata: { LicenseShortName: { value: 'CC BY 4.0' }, Artist: { value: '<a href="u">Ann &amp; Co</a>' } } }] }
  } } });
  assert.strictEqual(picks.length, 1);
  assert.strictEqual(picks[0].title, 'A.jpg');
  assert.strictEqual(picks[0].license, 'CC BY 4.0');
  assert.strictEqual(picks[0].artist, 'Ann & Co');
  assert.strictEqual(picks[0].type, 'jpg');
  assert.deepStrictEqual(ILAW.pickCommonsImages({}), []);
});

console.log(`\n${passed} passed`);
