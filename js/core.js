/*
 * ILAW LP: core logic (pure functions, no DOM).
 * Format follows the official ILAW template (DO 016 s. 2026, Annex B) and the detailed
 * Quexbook-style layout the teacher chose: session columns, Knowledge/Skills/Attitude objectives,
 * pre-lesson routine, 6E lesson flow, resources, integration, formative checks, extended learning, reflections.
 * Website and generator design: John Lee D. Peñarubia (J.L.D.P).
 */
var ILAW = (function () {
  "use strict";

  var APP_NAME = "ILAW LP";
  var CREDIT_LINE = "ILAW LP by J.L.D.P";
  var CREDIT = "Website and generator design: John Lee D. Peñarubia (J.L.D.P)";

  var GRADES = ["Kindergarten"].concat(Array.from({ length: 12 }, function (_, i) { return "Grade " + (i + 1); }));
  var TERMS = ["Term 1", "Term 2", "Term 3"];

  // Pattern roster. 7Es is kept for the teacher's demo model; 6Es is the ILAW-aligned default
  // because Extend belongs in Ways Forward. Sources: 5E (BSCS), 4As/5As (Philippine teacher education),
  // Gradual release (Pearson & Gallagher, 1983), POE (White & Gunstone, 1992), 3-phase learning cycle
  // (Karplus & Thier), Kolb's experiential cycle (1984), Jigsaw (Aronson, 1978), PBL (Barrows),
  // Backward design (Wiggins & McTighe, 2005). Verify citations before publishing.
  var PATTERNS = [
    { id: "6e", label: "6Es (ILAW-aligned default)", steps: ["Elicit", "Engage", "Explore", "Explain", "Elaborate", "Evaluate"], note: "Extend moves to Ways Forward." },
    { id: "5e", label: "5Es (BSCS inquiry)", steps: ["Engage", "Explore", "Explain", "Elaborate", "Evaluate"], note: "Common in science." },
    { id: "7e", label: "7Es (teacher's demo model)", steps: ["Elicit", "Engage", "Explore", "Explain", "Elaborate", "Evaluate", "Extend"], note: "Use when Extend is taught in class." },
    { id: "4a", label: "4As (Activity, Analysis, Abstraction, Application)", steps: ["Activity", "Analysis", "Abstraction", "Application"], note: "Experience first, then concepts." },
    { id: "5a", label: "5As (4As plus Assessment)", steps: ["Activity", "Analysis", "Abstraction", "Application", "Assessment"], note: "Confirm steps with the TCP handout." },
    { id: "explicit", label: "Explicit Instruction (gradual release)", steps: ["Model (I do)", "Guided practice (we do)", "Independent practice (you do)", "Check"], note: "For procedures and skills." },
    { id: "poe", label: "Predict-Observe-Explain (POE)", steps: ["Predict", "Observe", "Explain"], note: "For misconceptions and demonstrations." },
    { id: "learning-cycle", label: "3-Phase Learning Cycle", steps: ["Exploration", "Concept introduction", "Concept application"], note: "Discovery first, then terms." },
    { id: "experiential", label: "Experiential Learning (Kolb cycle)", steps: ["Concrete experience", "Reflective observation", "Abstract conceptualization", "Active experimentation"], note: "Lab and field work." },
    { id: "inquiry", label: "Inquiry-based", steps: ["Question", "Investigate", "Analyze and explain", "Communicate and evaluate", "Reflect"], note: "Open or guided investigation." },
    { id: "pbl", label: "Problem-based learning", steps: ["Present the problem", "Inquire and research", "Develop solutions", "Present and reflect"], note: "Real problems, group work." },
    { id: "jigsaw", label: "Cooperative learning (Jigsaw)", steps: ["Expert groups", "Home groups", "Share and assess"], note: "Positive interdependence." },
    { id: "ubd", label: "Backward design (Understanding by Design)", steps: ["Desired results", "Evidence of learning", "Learning plan"], note: "Plan the assessment first." },
    { id: "ai", label: "Let the AI decide from this roster", steps: [], note: "The AI picks the best fit and gives a reason." }
  ];

  var LEARNER_CONTEXT_OPTIONS = [
    "Mixed readiness levels; visual and hands-on",
    "Highly engaged / fast learners",
    "Requires scaffolding / struggles with reading",
    "Active / social learners (group-oriented)",
    "Inclusive / diverse learning needs",
    "Short attention spans (needs chunking)",
    "Tech-savvy / motivated by multimedia",
    "Quiet / reserved (needs encouragement)"
  ];

  var RUBRIC_ITEMS = [
      "Intentions are clearly stated, with appropriate learning competencies articulated.",
      "Intentions are evident across all sections, so there is coherence.",
      "Learning experience is clear: another teacher can implement the lesson without additional explanation.",
      "Learning experience is well designed, with intentionally embedded Learning Design Principles.",
      "Learning experience maximizes opportunities for integration and contextualization.",
      "Learning experience is inclusive and supports learners with disabilities, barriers, and unique contexts.",
      "Assessment strategies are integrated throughout the session to see progress or need for support.",
      "Assessment strategies generate evidence of whether learning succeeded.",
      "Ways forward and interventions are actionable, extending or adjusting learning based on reflections."
    ];

  var THEME_PRESETS = {
    "periwinkle": { label: "Periwinkle (like the demo deck)", primary: "4B52C4", secondary: "E6E8F7", accent: "E9675D", text: "1E2240", muted: "5A5F85" },
    "lab-blue": { label: "Lab Blue", primary: "1F4E79", secondary: "DDEBF7", accent: "F4B183", text: "1D2433", muted: "5B6474" },
    "forest": { label: "Forest Green", primary: "1E5631", secondary: "E2F0D9", accent: "FFC000", text: "1D2433", muted: "5B6474" },
    "sunrise": { label: "Sunrise", primary: "C55A11", secondary: "FBE5D6", accent: "FFD966", text: "1D2433", muted: "5B6474" },
    "violet": { label: "Violet Night", primary: "3B1F5C", secondary: "EDE7F6", accent: "F06292", text: "1D2433", muted: "5B6474" },
    "mono": { label: "Clean Mono", primary: "262626", secondary: "F2F2F2", accent: "2E75B6", text: "1D2433", muted: "5B6474" }
  };

  // Voice: the teacher's own writing (DLP "Learner Context", old DLL teacher and student activity columns,
  // reflection essays) combined with the clearest parts of the official sample and Quexbook layout.
  var STYLE_GUIDE = [
    "VOICE (write like the teacher, not like a brochure):",
    "- Plain, concrete, and analytical. Describe what learners do and what the teacher says, in short active sentences.",
    "- Explain with everyday Filipino contexts: sari-sari store, carinderia, tricycle fare, fiesta seating, calamansi, palengke prices, barangay health workers. Use one or two per session, not more.",
    "- Teacher's classroom language is warm and direct: 'Stop and jot', 'Think-pair-share', 'Let us check', 'Why do you think...?'.",
    "- Each reflection prompt is a real question the teacher can answer in writing, not a generic 'what did you learn?'.",
    "- Honest about difficulty: name the likely misconception and the fix (for example, 'learners often think 4s fills after 3d because n is larger; show the staircase first').",
    "- Chemistry and science metaphors only when they explain something (catalyst lowers the activation energy barrier; it does not do the reaction).",
    "- Avoid: leverage, synergy, delve, tapestry, game-changer, unlock your potential, empty hedges, stacked adjectives, emojis, and brochure phrases.",
    "- Medium sentences (about 18 to 22 words). Em dashes only for asides.",
    "- Clean, correct grammar in every field, even if the teacher's own notes are rough.",
    "Tone reference (the teacher's own sentences; match tone, do not copy):",
    "  \"Learners in Grade 11-A exhibit a wide spectrum of conceptual and mathematical readiness. A notable strength is their enthusiasm for tangible, collaborative tasks and visual representations.\"",
    "  \"In chemistry, a catalyst is not the dictator of reaction, nor does it overshadow the reactants; instead, it lowers the (activation energy) barriers for efficient (reaction) transformation.\""
  ].join("\n");

  function trim(v) { return (v == null ? "" : String(v)).trim(); }
  function listFromText(text) { return trim(text).split(/\r?\n/).map(trim).filter(function (x) { return x.length > 0; }); }
  function asArray(v) {
    if (Array.isArray(v)) return v.filter(function (x) { return x != null && (typeof x === "object" || trim(x) !== ""); }).map(function (x) { return typeof x === "string" ? trim(x) : x; });
    if (typeof v === "string") return listFromText(v);
    return [];
  }
  function strArr(v) { return asArray(v).map(function (x) { return typeof x === "string" ? x : (x.text || x.item || x.question || JSON.stringify(x)); }); }
  function patternById(id) { return PATTERNS.filter(function (x) { return x.id === id; })[0] || null; }
  function patternLabel(id) { var p = patternById(id); return p ? p.label : id; }

  /* ---------- Intake ---------- */

  function sanitizeMeta(form) {
    var n = parseInt(form.sessions, 10);
    n = isNaN(n) ? 0 : n;
    var acts = Array.isArray(form.mainActivities) ? form.mainActivities.map(trim) : [];
    while (acts.length < n) acts.push("");
    acts = acts.slice(0, n);
    var objectives = listFromText(form.objectives);
    var observations = trim(form.observations);
    var patterns = Array.isArray(form.patterns) ? form.patterns.slice() : [];
    var meta = {
      lessonTitle: trim(form.lessonTitle),
      learningArea: trim(form.learningArea),
      teachers: trim(form.teachers),
      school: trim(form.school),
      division: trim(form.division),
      schoolAddress: trim(form.schoolAddress),
      schoolEmail: trim(form.schoolEmail),
      gradeLevel: trim(form.gradeLevel),
      section: trim(form.section),
      sessions: n,
      medium: trim(form.medium) || "English",
      term: trim(form.term) || "Term 2",
      week: trim(form.week),
      competency: trim(form.competency),
      contentStandard: trim(form.contentStandard),
      performanceStandard: trim(form.performanceStandard),
      objectives: objectives,
      learnerContextOptions: Array.isArray(form.learnerContextOptions) ? form.learnerContextOptions.slice() : [],
      learnerContextOther: trim(form.learnerContextOther),
      observations: observations,
      classSize: trim(form.classSize),
      patterns: patterns,
      patternOther: trim(form.patternOther),
      mainActivities: acts,
      additional: trim(form.additional),
      referenceText: trim(form.referenceText).slice(0, 30000),
      referenceNames: Array.isArray(form.referenceNames) ? form.referenceNames.slice() : [],
      useWeb: !!form.useWeb,
      aiTools: trim(form.aiTools)
    };
    meta.provided = {
      objectives: objectives.length > 0,
      observations: observations.length > 0,
      activities: acts.map(function (a) { return a.length > 0; })
    };
    return meta;
  }

  function validateMeta(meta) {
    var errors = [];
    if (!meta.teachers) errors.push("Teacher name(s) is required.");
    if (!meta.school) errors.push("School is required.");
    if (!meta.learningArea) errors.push("Learning area / subject is required.");
    if (!meta.gradeLevel) errors.push("Grade level is required.");
    if (!(meta.sessions >= 1 && meta.sessions <= 5)) errors.push("Number of sessions must be between 1 and 5.");
    if (!meta.competency) errors.push("Learning competency is required. It is the source for the objectives.");
    if (meta.patterns.length === 0) errors.push("Select at least one lesson design pattern (or the AI-decides option).");
    if (meta.patterns.indexOf("mixed") !== -1 && !meta.patternOther) errors.push("Describe the 'Mixed / Other' pattern.");
    meta.mainActivities.forEach(function (a, i) {
      if (a && a.length < 5) errors.push("Main activity for session " + (i + 1) + " is too short. Leave it blank for the AI, or write a full sentence.");
    });
    return errors;
  }

  function aiDraftedParts(meta) {
    return {
      objectives: !meta.provided.objectives,
      activities: meta.provided.activities.map(function (p) { return !p; }),
      observations: !meta.provided.observations
    };
  }

  function patternLine(meta) {
    if (meta.patterns.indexOf("ai") !== -1) return "The AI chooses the best fit from this roster and states the reason: " + PATTERNS.filter(function (p) { return p.id !== "ai"; }).map(function (p) { return p.label + " [" + p.steps.join(" > ") + "]"; }).join("; ");
    return meta.patterns.map(function (id) {
      if (id === "mixed") return "Other: " + meta.patternOther;
      var p = patternById(id);
      return p ? p.label + " (steps: " + p.steps.join(" > ") + ")" : id;
    }).join(" | ");
  }

  function learnerContextBrief(meta) {
    var ctx = meta.learnerContextOptions.slice();
    if (meta.learnerContextOther) ctx.push("Other: " + meta.learnerContextOther);
    return {
      selected: ctx,
      observations: meta.provided.observations ? meta.observations : "",
      classSize: meta.classSize
    };
  }

  /* ---------- Prompts ---------- */

  var RULES = [
    "RULES:",
    "1. Teacher decides the core. Use the teacher's competency, standards, objectives, and main activities exactly as given (grammar fixes only).",
    "2. Objectives you draft: write them as Knowledge, Skills, and Attitude for each session, observable and specific. Two to four per domain per session.",
    "3. Learner context: build a 3 to 5 sentence contextualized profile from the teacher's selected options and real observations. If no observations were given, use only the selected options and say so. Never invent learner names, grades, or personal details.",
    "4. Contextualize the lesson: use the learner profile to choose examples, groupings, scaffolds, visuals, pacing, and accommodations. State how in the teacher notes.",
    "5. Lesson flow follows the chosen pattern's step names in order. Each flow step starts with its step name.",
    "6. Use at least three of the eight Learning Design Principles across the plan: Clear Goals and Teaching; Scaffolding; Checks for Understanding; Active Retrieval and Spacing; Self-awareness and Metacognition; Social Learning; Values and Purpose Integration; Inclusion.",
    "7. Formative checks in every session, each with a model answer. Include worksheet or quiz items with answers when the lesson needs them.",
    "8. Photos: suggest real, relevant images with search terms (for example Wikimedia Commons). Do not invent image URLs.",
    "9. Write all plan text in the teacher's medium (English, Filipino, or Mixed); keep English technical terms.",
    "10. Never write a declaration of AI use. The app does that. Never write slides; the app builds them from the plan."
  ].join("\n");

  function overviewSchema() {
    return [
      "OUTPUT: ONE JSON object, no text before or after:",
      "{",
      '  "lesson_title": string,',
      '  "competency": string, "content_standard": string, "performance_standard": string,',
      '  "pattern": {"id": string, "label": string, "reason": string},',
      '  "learner_context": string,',
      '  "objectives": [ {"session": number, "knowledge": [string], "skills": [string], "attitude": [string]} ],',
      '  "references": [ {"apa": string, "use": string} ],',
      '  "key_terms": [string]',
      "}",
      "pattern.id must be one of: 6e, 5e, 7e, 4a, 5a, explicit, poe, learning-cycle, experiential, inquiry, pbl, jigsaw, ubd, mixed."
    ].join("\n");
  }

  function referenceBlock(meta) {
    if (!meta.referenceText) {
      return "REFERENCE MATERIAL: none uploaded. Draw on your knowledge of standard textbooks, the DepEd curriculum guide and lesson exemplars for this subject and grade, DepEd resources, and reputable educational sites. Cite only sources you are confident exist, and mark each reference 'verify' if unsure.";
    }
    return "REFERENCE MATERIAL (uploaded by the teacher; prefer it and cite it):\n" + meta.referenceText;
  }

  function buildOverviewPrompt(meta) {
    var brief = learnerContextBrief(meta);
    var objLine = meta.provided.objectives
      ? "Learning objectives (teacher-written, keep exactly; put them in every session):\n" + meta.objectives.map(function (o) { return "  * " + o; }).join("\n")
      : "Learning objectives: NOT supplied. Draft Knowledge, Skills, and Attitude objectives per session (rule 2).";
    var system = [
      "You plan the overview of an ILAW lesson plan for Philippine public schools (DepEd Order No. 016, s. 2026).",
      RULES,
      "",
      STYLE_GUIDE,
      "",
      overviewSchema()
    ].join("\n");
    var user = [
      "TEACHER INPUT",
      "- Lesson title: " + (meta.lessonTitle || "(not given; propose one)"),
      "- Subject: " + meta.learningArea,
      "- Grade and section: " + meta.gradeLevel + (meta.section ? ", " + meta.section : ""),
      "- Number of sessions: " + meta.sessions + " (each about 60 minutes unless the teacher says otherwise)",
      "- Term and week: " + meta.term + (meta.week ? ", week " + meta.week : ""),
      "- Medium: " + meta.medium,
      "- Competency: " + meta.competency,
      "- Content standard: " + (meta.contentStandard || "(not given)"),
      "- Performance standard: " + (meta.performanceStandard || "(not given)"),
      objLine,
      "- Learner context options selected: " + (brief.selected.length ? brief.selected.join("; ") : "none"),
      "- Teacher's real observations: " + (brief.observations || "NOT supplied"),
      "- Class size: " + (brief.classSize || "25 to 35"),
      "- Pattern choice: " + patternLine(meta),
      "- Additional instructions: " + (meta.additional || "(none)"),
      "",
      referenceBlock(meta),
      "",
      meta.useWeb ? "Search the web for current, trustworthy sources for the references list, and cite what you found." : ""
    ].join("\n");
    return { system: system, user: user };
  }

  function sessionSchema() {
    return [
      "OUTPUT: ONE JSON object for this one session, no text before or after:",
      "{",
      '  "title": string,',
      '  "main_activity": string,',
      '  "duration_minutes": number,',
      '  "objectives": {"knowledge": [string], "skills": [string], "attitude": [string]},',
      '  "pre_lesson": [string],',
      '  "timeline": [ {"time": string, "phase": string, "teacher": string, "students": string, "materials": string} ],',
      '  "discussion": [ {"teacher_says": string, "expected_responses": string, "follow_up": string} ],',
      '  "flow": [string],',
      '  "ldps_used": [string],',
      '  "resources": [string],',
      '  "integration": string,',
      '  "formative": [ {"question": string, "answer": string} ],',
      '  "worksheet": [ {"item": string, "answer": string} ],',
      '  "assessment": {"type": string, "criteria": [string]},',
      '  "accommodations": [string],',
      '  "extended": [string],',
      '  "reflection_prompts": [string],',
      '  "photos": [ {"description": string, "search_terms": string} ],',
      '  "teacher_notes": string',
      "}",
      "timeline must cover the full session in order with minute ranges that add up to the duration. flow is the short summary of the timeline phases, each starting with its pattern step name."
    ].join("\n");
  }

  function buildSessionPrompt(meta, overview, index, priorTitles) {
    var s = overview.sessionObjectives[index] || {};
    var sessionNo = index + 1;
    var system = [
      "You write ONE detailed session of an ILAW lesson plan (DepEd Order No. 016, s. 2026). The detail must be enough for another teacher to teach it without asking questions.",
      RULES,
      "",
      STYLE_GUIDE,
      "",
      sessionSchema()
    ].join("\n");
    var user = [
      "LESSON: " + overview.lessonTitle + " | " + meta.learningArea + " | " + meta.gradeLevel + (meta.section ? " " + meta.section : "") + " | " + meta.term,
      "Competency: " + overview.competency,
      "Content standard: " + overview.contentStandard,
      "Performance standard: " + overview.performanceStandard,
      "Pattern: " + overview.pattern.label + " (steps: " + ((patternById(overview.pattern.id) || { steps: [] }).steps.join(" > ") || "use the pattern's own steps") + ")",
      "Learner context (contextualized): " + overview.learnerContext,
      "Session " + sessionNo + " of " + meta.sessions + ". Earlier sessions: " + (priorTitles.length ? priorTitles.join(" | ") : "none (this is the first)") + ".",
      "Objectives for this session: " + JSON.stringify(s.objectives || {}),
      "Main activity supplied by the teacher for this session: " + (meta.provided.activities[index] ? meta.mainActivities[index] : "(blank: design the core activity yourself, marked as AI-drafted)"),
      "Teacher's real observations: " + (meta.provided.observations ? meta.observations : "NOT supplied; do not assume"),
      "Additional instructions: " + (meta.additional || "(none)"),
      "Key terms: " + (overview.keyTerms.join(", ") || "(derive from the competency)"),
      "Make the timeline concrete (what the teacher says and does, what learners do, what materials are used). Use Filipino everyday contexts where they fit."
    ].join("\n");
    return { system: system, user: user };
  }

  function buildRegenPrompt(meta, overview, plan, index, guidance) {
    var base = buildSessionPrompt(meta, overview, index, plan.sessions.slice(0, index).map(function (x) { return x.title; }));
    base.user += "\n\nREGENERATE this session's activities only. Keep the objectives and pattern. The teacher's guidance: " + (trim(guidance) || "(none; surprise me within the pattern)") + ".\nPrevious activity (replace it): " + ((plan.sessions[index] || {}).mainActivity || "(none)");
    return base;
  }

  /* ---------- Parsing ---------- */

  function extractJson(text) {
    var s = String(text || "");
    var start = s.indexOf("{");
    var end = s.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return { ok: false, error: "No JSON object found in the AI reply." };
    try { return { ok: true, data: JSON.parse(s.slice(start, end + 1)) }; }
    catch (e) { return { ok: false, error: "The AI reply was not valid JSON (" + e.message + "). Try again, or try a stronger model." }; }
  }

  function pickStrings(v) { return strArr(v).filter(Boolean); }

  function normalizeOverview(raw, meta) {
    raw = raw || {};
    var objSource = meta.provided.objectives ? "teacher" : "ai";
    var sessions = [];
    for (var i = 0; i < meta.sessions; i++) {
      var found = (Array.isArray(raw.objectives) ? raw.objectives : []).filter(function (o) { return Number(o && o.session) === i + 1; })[0] || {};
      var k = pickStrings(found.knowledge), sk = pickStrings(found.skills), a = pickStrings(found.attitude);
      sessions.push({
        number: i + 1,
        objectives: meta.provided.objectives ? null : { knowledge: k, skills: sk, attitude: a }
      });
    }
    var pat = raw.pattern || {};
    var patId = patternById(pat.id) ? pat.id : (meta.patterns.indexOf("ai") !== -1 ? "6e" : (meta.patterns[0] || "6e"));
    var chosen = patternById(patId);
    return {
      lessonTitle: trim(raw.lesson_title) || meta.lessonTitle || (meta.learningArea + " lesson"),
      competency: trim(raw.competency) || meta.competency,
      contentStandard: trim(raw.content_standard) || meta.contentStandard,
      performanceStandard: trim(raw.performance_standard) || meta.performanceStandard,
      pattern: { id: chosen ? chosen.id : patId, label: chosen ? chosen.label : patternLabel(patId), reason: trim(pat.reason) || (meta.patterns.indexOf("ai") !== -1 ? "" : "Chosen by the teacher.") },
      learnerContext: trim(raw.learner_context) || (meta.provided.observations ? meta.observations : "Not provided by the teacher."),
      objectivesSource: objSource,
      sharedObjectives: meta.provided.objectives ? meta.objectives.slice() : [],
      sessionObjectives: sessions,
      references: (Array.isArray(raw.references) ? raw.references : []).map(function (r) { return typeof r === "string" ? { apa: r, use: "" } : { apa: trim(r.apa), use: trim(r.use) }; }).filter(function (r) { return r.apa; }),
      keyTerms: pickStrings(raw.key_terms)
    };
  }

  function normalizeSession(raw, index, meta, overview) {
    raw = raw || {};
    var teacherAct = meta.provided.activities[index];
    var obj = overview.sessionObjectives[index].objectives;
    var sharedK = meta.provided.objectives ? meta.objectives : null;
    var timeline = (Array.isArray(raw.timeline) ? raw.timeline : []).map(function (t) {
      return { time: trim(t.time), phase: trim(t.phase), teacher: trim(t.teacher), students: trim(t.students), materials: trim(t.materials) };
    }).filter(function (t) { return t.time || t.phase || t.teacher || t.students; });
    var discussion = (Array.isArray(raw.discussion) ? raw.discussion : []).map(function (d) {
      return { teacher: trim(d.teacher_says), expected: trim(d.expected_responses), follow: trim(d.follow_up) };
    }).filter(function (d) { return d.teacher; });
    var formative = (Array.isArray(raw.formative) ? raw.formative : []).map(function (f) {
      return typeof f === "string" ? { question: f, answer: "" } : { question: trim(f.question), answer: trim(f.answer) };
    }).filter(function (f) { return f.question; });
    var worksheet = (Array.isArray(raw.worksheet) ? raw.worksheet : []).map(function (w) {
      return { item: trim(w.item), answer: trim(w.answer) };
    }).filter(function (w) { return w.item; });
    var slides = []; // slides are built from the plan by buildSlideSpec, not written by the AI
    var photos = (Array.isArray(raw.photos) ? raw.photos : []).map(function (p) {
      return { description: trim(p.description), search: trim(p.search_terms) };
    }).filter(function (p) { return p.description || p.search; });
    var assessment = raw.assessment || {};
    var mainAct = teacherAct ? meta.mainActivities[index] : trim(raw.main_activity || (timeline.find(function (t) { return /activity|explore|elaborate/i.test(t.phase); }) || {}).phase || "");
    return {
      number: index + 1,
      title: trim(raw.title) || ("Session " + (index + 1)),
      duration: Number(raw.duration_minutes) || 60,
      objectives: obj || null,
      sharedObjectives: sharedK,
      mainActivity: mainAct || "",
      activitySource: teacherAct ? "teacher" : "ai",
      pre_lesson: strArr(raw.pre_lesson),
      timeline: timeline,
      discussion: discussion,
      flow: strArr(raw.flow),
      ldpsUsed: pickStrings(raw.ldps_used),
      resources: pickStrings(raw.resources),
      integration: trim(raw.integration) || "N/A",
      formative: formative,
      worksheet: worksheet,
      assessment: { type: trim(assessment.type), criteria: pickStrings(assessment.criteria) },
      accommodations: pickStrings(raw.accommodations),
      extended: pickStrings(raw.extended),
      reflectionPrompts: pickStrings(raw.reflection_prompts),
      reflections: "",
      slides: slides,
      photos: photos,
      teacherNotes: trim(raw.teacher_notes),
      reviewed: false,
      prev: null
    };
  }

  // Build a full plan from an overview and session results. Missing parts stay blank.
  function assemblePlan(meta, overview, sessionRaws, usedAi) {
    var sessions = [];
    for (var i = 0; i < meta.sessions; i++) sessions.push(normalizeSession(sessionRaws[i] || null, i, meta, overview));
    return {
      lessonTitle: overview.lessonTitle,
      learningArea: meta.learningArea,
      competency: overview.competency,
      contentStandard: overview.contentStandard,
      performanceStandard: overview.performanceStandard,
      pattern: overview.pattern,
      learnerContext: overview.learnerContext,
      objectivesSource: usedAi ? overview.objectivesSource : (meta.provided.objectives ? "teacher" : "blank"),
      sharedObjectives: overview.sharedObjectives,
      references: overview.references,
      keyTerms: overview.keyTerms,
      sessions: sessions,
      usedAi: !!usedAi,
      drafted: aiDraftedParts(meta),
      generatedAt: new Date().toISOString()
    };
  }

  function buildManualPlan(meta) {
    var overview = normalizeOverview({}, meta);
    if (meta.patterns.length && meta.patterns.indexOf("ai") === -1 && meta.patterns[0] !== "mixed") {
      overview.pattern = { id: meta.patterns[0], label: patternLabel(meta.patterns[0]), reason: "Chosen by the teacher." };
    }
    overview.sessions = [];
    var plan = assemblePlan(meta, overview, [], false);
    plan.sessions.forEach(function (s, i) {
      if (meta.provided.activities[i]) { s.mainActivity = meta.mainActivities[i]; }
    });
    return plan;
  }

  // Rebuild a plan for one session with regenerated activities. Teacher edits are not touched.
  function applySessionPatch(session, raw) {
    raw = raw || {};
    session.prev = {
      mainActivity: session.mainActivity, pre_lesson: session.pre_lesson.slice(), timeline: session.timeline.slice(),
      discussion: session.discussion.slice(), flow: session.flow.slice(), formative: session.formative.slice(),
      worksheet: session.worksheet.slice(), extended: session.extended.slice(), reflectionPrompts: session.reflectionPrompts.slice(),
      slides: session.slides.slice(), photos: session.photos.slice(), resources: session.resources.slice(), accommodations: session.accommodations.slice(), integration: session.integration
    };
    var fakeMeta = { provided: { objectives: false, activities: [false] }, mainActivities: [""], objectives: [] };
    var fakeOverview = { sessionObjectives: [{ objectives: session.objectives }] };
    var fresh = normalizeSession(raw, session.number - 1, fakeMeta, fakeOverview);
    session.mainActivity = fresh.mainActivity || session.mainActivity;
    session.activitySource = "ai";
    ["pre_lesson", "timeline", "discussion", "flow", "formative", "worksheet", "extended", "resources", "accommodations", "slides", "photos"].forEach(function (k) {
      if (fresh[k] && fresh[k].length) session[k] = fresh[k];
    });
    if (fresh.reflectionPrompts.length) session.reflectionPrompts = fresh.reflectionPrompts;
    if (fresh.integration && fresh.integration !== "N/A") session.integration = fresh.integration;
    session.assessment = fresh.assessment.type ? fresh.assessment : session.assessment;
    return session;
  }

  function undoSessionPatch(session) {
    if (!session.prev) return session;
    Object.assign(session, session.prev, { prev: null });
    return session;
  }

  /* ---------- Official template layout (screen, Word, print) ---------- */

  function objectiveCells(plan, domain) {
    return plan.sessions.map(function (s) {
      return (s.objectives && s.objectives[domain]) ? s.objectives[domain] : [];
    });
  }

  function matrixLayout(plan) {
    var cols = plan.sessions.map(function (s) { return "Session " + s.number; });
    var blocks = [
      { type: "banner", title: "Intentions", text: "Meaningful learning experiences are anchored in how we frame them. Start by deciding what you want learners to master by the end of the lesson." },
      { type: "row", kind: "shared", label: "Learning Competency and Curriculum Standards", value: [plan.competency, plan.contentStandard ? "Content standard: " + plan.contentStandard : "", plan.performanceStandard ? "Performance standard: " + plan.performanceStandard : ""].filter(Boolean).join("\n") },
      { type: "row", kind: "shared", label: "Learner Context", value: plan.learnerContext },
      plan.objectivesSource === "teacher"
        ? { type: "row", kind: "shared", label: "Learning Objectives (teacher-written)", value: plan.sharedObjectives.map(function (o) { return "• " + o; }).join("\n") }
        : { type: "row", kind: "session", label: "Learning Objectives: Knowledge", cells: objectiveCells(plan, "knowledge").map(function (a) { return a.map(function (x) { return "• " + x; }).join("\n"); }) },
      plan.objectivesSource === "teacher" ? null : { type: "row", kind: "session", label: "Learning Objectives: Skills", cells: objectiveCells(plan, "skills").map(function (a) { return a.map(function (x) { return "• " + x; }).join("\n"); }) },
      plan.objectivesSource === "teacher" ? null : { type: "row", kind: "session", label: "Learning Objectives: Attitude", cells: objectiveCells(plan, "attitude").map(function (a) { return a.map(function (x) { return "• " + x; }).join("\n"); }) },
      { type: "banner", title: "Learning Experience", text: "A learning experience is like a thoughtfully designed journey. Each activity and interaction builds towards meaningful understanding and growth." },
      { type: "row", kind: "session", label: "Pre-Lesson Routine", cells: plan.sessions.map(function (s) { return s.pre_lesson.map(function (x) { return "• " + x; }).join("\n"); }) },
      { type: "row", kind: "session", label: "Lesson Flow (" + plan.pattern.label + ")", cells: plan.sessions.map(function (s) { return s.flow.map(function (x) { return "• " + x; }).join("\n"); }) },
      { type: "row", kind: "session", label: "Learning Resources", cells: plan.sessions.map(function (s) { return s.resources.map(function (x) { return "• " + x; }).join("\n"); }) },
      { type: "row", kind: "session", label: "Opportunities for Integration", cells: plan.sessions.map(function (s) { return s.integration; }) },
      { type: "banner", title: "Assessing Learning", text: "Assessments reveal what learners have gained and what they still need help with, to guide future instruction." },
      { type: "row", kind: "session", label: "Formative Assessment", cells: plan.sessions.map(function (s) { return s.formative.map(function (f, i) { return (i + 1) + ". " + f.question + (f.answer ? "\n   Answer: " + f.answer : ""); }).join("\n"); }) },
      { type: "row", kind: "session", label: "Accommodations", cells: plan.sessions.map(function (s) { return s.accommodations.map(function (x) { return "• " + x; }).join("\n"); }) },
      { type: "banner", title: "Ways Forward", text: "Meaningful learning can also happen beyond the classroom, for both the learners and the teacher." },
      { type: "row", kind: "session", label: "Extended Learning", cells: plan.sessions.map(function (s) { return s.extended.map(function (x) { return "• " + x; }).join("\n"); }) },
      { type: "row", kind: "session", label: "Reflections (after teaching)", cells: plan.sessions.map(function (s) { return s.reflections || ""; }), guide: plan.sessions.map(function (s) { return s.reflectionPrompts.join(" | "); }) }
    ];
    blocks = blocks.filter(Boolean);
    return { columns: cols, blocks: blocks, sessions: plan.sessions.length };
  }

  function headerRows(meta, plan, declarationText) {
    return [
      ["Name of Lesson", plan.lessonTitle],
      ["Learning Area/s", plan.learningArea],
      ["Designed by Teacher/s", meta.teachers],
      ["School", meta.school],
      ["Designed for which Grade Level and Section", meta.gradeLevel + (meta.section ? ", " + meta.section : "")],
      ["Term", meta.term + (meta.week ? ", Week " + meta.week : "")],
      ["No. of Sessions", String(meta.sessions) + (meta.sessions === 1 ? " Session" : " Sessions") + " (about 60 minutes each)"],
      ["References (books, websites, toolkits, etc.)", plan.references.map(function (r) { return r.apa; }).join("\n") || "(teacher to add and verify)"],
      ["Declaration of AI use", declarationText || "Cite how AI was used in the formulation of the lesson plan. See DO 003 s. 2026 Annex A."]
    ];
  }

  // DepEd-style letterhead for the Word file only. Blank fields show a bracketed reminder to fill in.
  function letterheadLines(meta) {
    var or = function (v, ph) { return trim(v) || "[" + ph + "]"; };
    return {
      top: ["Republic of the Philippines", "Department of Education", "Region V (Bicol Region)", or(meta.division, "Schools Division: add your division")],
      school: or(meta.school, "School name"),
      contact: [or(meta.schoolAddress, "School address"), or(meta.schoolEmail, "School email")]
    };
  }

  /* ---------- Self-check (computed from the plan, no AI needed) ---------- */

  function rubricCheck(plan) {
    var S = plan.sessions, n = S.length;
    var allHave = function (fn) { return S.every(fn); };
    var ldpCount = {}; S.forEach(function (s) { s.ldpsUsed.forEach(function (l) { ldpCount[l] = 1; }); });
    var ldpTotal = Object.keys(ldpCount).length;
    var integ = S.some(function (s) { return s.integration && s.integration !== "N/A"; });
    var checks = [
      [RUBRIC_ITEMS[0], !!plan.competency && (plan.sharedObjectives.length > 0 || S.every(function (s) { return s.objectives; })), "Add objectives, or let the AI draft them."],
      [RUBRIC_ITEMS[1], allHave(function (s) { return s.objectives || plan.sharedObjectives.length; }) && allHave(function (s) { return s.flow.length; }) && allHave(function (s) { return s.formative.length; }), "Every session needs objectives, a flow, and a check."],
      [RUBRIC_ITEMS[2], allHave(function (s) { return s.timeline.length >= 3 && s.resources.length; }), "Each session needs a timeline (3 or more steps) and resources."],
      [RUBRIC_ITEMS[3], ldpTotal >= 3, "Use at least three Learning Design Principles across the plan."],
      [RUBRIC_ITEMS[4], integ, "Add one integration link, or mark N/A where none fits."],
      [RUBRIC_ITEMS[5], allHave(function (s) { return s.accommodations.length; }), "Add accommodations to each session."],
      [RUBRIC_ITEMS[6], allHave(function (s) { return s.formative.length || s.timeline.some(function (t) { return /check|evaluate|exit/i.test(t.phase + " " + t.teacher); }); }), "Add a formative check to each session."],
      [RUBRIC_ITEMS[7], allHave(function (s) { return s.formative.some(function (f) { return f.answer; }) || s.assessment.criteria.length; }), "Give each check an answer or criteria."],
      [RUBRIC_ITEMS[8], allHave(function (s) { return s.extended.length && s.reflectionPrompts.length; }), "Add extended learning and reflection prompts to each session."]
    ];
    return checks.map(function (c, i) { return { item: c[0], status: c[1] ? "Yes" : "Not Yet", note: c[1] ? "" : c[2] }; });
  }

  /* ---------- Declaration ---------- */

  function declarationFacts(meta, plan, changes) {
    var aiParts = [];
    if (plan.usedAi) {
      if (plan.objectivesSource === "ai") aiParts.push("the learning objectives");
      var acts = plan.sessions.filter(function (s) { return s.activitySource === "ai"; }).map(function (s) { return s.number; });
      if (acts.length) aiParts.push("the main activities for session" + (acts.length > 1 ? "s " : " ") + acts.join(", "));
      aiParts.push("the lesson flow, assessments, and extended learning drafts");
      if (plan.references.length) aiParts.push("the reference list (to be verified)");
    }
    return {
      teacher: meta.teachers,
      tool: meta.aiTools || (plan.usedAi ? "an AI model" : ""),
      usedAi: plan.usedAi,
      aiParts: aiParts,
      teacherChanges: trim(changes),
      patterns: plan.pattern.label
    };
  }

  function declarationPrompt(facts) {
    return [
      "Draft the declaration of AI use for a lesson plan. ONE to THREE sentences, plain, honest, first person as the teacher.",
      "Begin: \"Consistent with the policy guidelines on the use of AI in basic education (DepEd Order No. 003, s. 2026),\".",
      "Name the tool, state what AI drafted, and say the teacher reviewed, edited, and validated it. Add nothing that is not in the facts.",
      "Style reference (the teacher's own declaration, for tone only): \"I used AI to organize my text and check my grammar after I had completely planned the ILAW Framework myself. I carefully reviewed and edited all AI suggestions to ensure they align with my teaching goals.\"",
      "Facts:",
      "- Tool: " + (facts.tool || "(not named)"),
      "- AI drafted: " + (facts.aiParts.length ? facts.aiParts.join("; ") : "nothing; the teacher wrote the plan"),
      "- Teacher's changes or rejections: " + (facts.teacherChanges || "(none given)"),
      "Return ONLY the declaration text."
    ].join("\n");
  }

  function fallbackDeclaration(facts) {
    var tool = facts.tool || "an AI tool";
    if (!facts.usedAi) {
      return "Consistent with the policy guidelines on the use of AI in basic education (DepEd Order No. 003, s. 2026), I, " + (facts.teacher || "[teacher name]") + ", declare that no AI tool was used in formulating this lesson plan.";
    }
    var line1 = "Consistent with the policy guidelines on the use of AI in basic education (DepEd Order No. 003, s. 2026), I, " + (facts.teacher || "[teacher name]") + ", used " + tool + " to draft " + (facts.aiParts.length ? facts.aiParts.join(", ") : "parts of this plan") + ".";
    var line2 = "I reviewed, edited, and validated all AI-assisted content" + (facts.teacherChanges ? "; " + facts.teacherChanges.replace(/\.$/, "") + "." : " to align with my teaching goals and the needs of my learners.");
    return line1 + " " + line2;
  }

  /* ---------- Plain-text export ---------- */

  function planToText(meta, plan, declarationText) {
    var out = [APP_NAME, ""];
    headerRows(meta, plan, declarationText).forEach(function (r) { out.push(r[0] + ": " + r[1]); });
    out.push("");
    var lay = matrixLayout(plan);
    lay.blocks.forEach(function (b) {
      if (b.type === "banner") { out.push("== " + b.title.toUpperCase() + " =="); return; }
      if (b.kind === "shared") { out.push(b.label + ":\n" + (b.value || "")); return; }
      out.push(b.label + ":");
      b.cells.forEach(function (c, i) { out.push("  " + lay.columns[i] + ": " + (c || "").replace(/\n/g, " / ")); });
    });
    out.push("");
    out.push("== DETAILED SESSIONS ==");
    plan.sessions.forEach(function (s) {
      out.push("--- Session " + s.number + ": " + s.title + " (" + s.duration + " min) ---");
      s.timeline.forEach(function (t) { out.push(t.time + " | " + t.phase + "\n  Teacher: " + t.teacher + "\n  Students: " + t.students + (t.materials ? "\n  Materials: " + t.materials : "")); });
      if (s.discussion.length) { out.push("Discussion:"); s.discussion.forEach(function (d) { out.push("  T: " + d.teacher + "\n  Expected: " + d.expected + (d.follow ? "\n  Follow-up: " + d.follow : "")); }); }
      if (s.formative.length) { out.push("Formative checks:"); s.formative.forEach(function (f, i) { out.push("  " + (i + 1) + ". " + f.question + (f.answer ? " | Answer: " + f.answer : "")); }); }
      if (s.worksheet.length) { out.push("Worksheet:"); s.worksheet.forEach(function (w, i) { out.push("  " + (i + 1) + ". " + w.item + (w.answer ? " | Answer: " + w.answer : "")); }); }
      out.push("");
    });
    out.push("== RUBRIC SELF-CHECK (Annex A) ==");
    rubricCheck(plan).forEach(function (r, i) { out.push((i + 1) + ". [" + r.status + "] " + r.item + (r.note ? " " + r.note : "")); });
    out.push("");
    out.push("Declaration of AI use: " + declarationText);
    out.push("");
    out.push(CREDIT_LINE);
    return out.join("\n");
  }

  /* ---------- Slides: built from the plan itself (no extra AI requests) ---------- */

  function resolveTheme(themeKey) {
    var key = THEME_PRESETS[themeKey] ? themeKey : "periwinkle";
    var p = THEME_PRESETS[key];
    return { key: key, label: p.label, primary: p.primary, secondary: p.secondary, accent: p.accent, text: p.text, muted: p.muted };
  }

  // Shortens text at a word boundary. The full text goes into the speaker notes.
  function fit(text, max) {
    var t = trim(text).replace(/\s+/g, " ");
    if (t.length <= max) return t;
    return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "\u2026";
  }

  // Largest font size (pt) whose estimated line count fits the box. Calibri-like glyphs average about half an em.
  function fitFont(text, widthIn, heightIn, maxPt, minPt, glyphEm) {
    var g = glyphEm || 0.5;
    for (var pt = maxPt; pt > minPt; pt -= 1) {
      var perLine = Math.max(6, Math.floor(widthIn * 72 / (pt * g)));
      var lines = String(text || "").split("\n").reduce(function (n, para) { return n + Math.max(1, Math.ceil(para.length / perLine)); }, 0);
      if (lines * pt * 1.25 / 72 <= heightIn) return pt;
    }
    return minPt;
  }

  function phaseLabel(p) {
    var w = String(p || "").replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] || "STEP";
    return w.toUpperCase().slice(0, 14);
  }

  function sessionPhotoObjects(s) {
    return (s.photos || []).filter(function (p) { return p.commons; });
  }

  function sessionObjectiveCards(plan, s) {
    var out = [];
    if (s.objectives) {
      [["knowledge", "K", "Knowledge"], ["skills", "S", "Skills"], ["attitude", "A", "Attitude"]].forEach(function (k) {
        (s.objectives[k[0]] || []).forEach(function (t) { out.push({ badge: k[1], head: k[2], text: fit(t, 200) }); });
      });
    } else {
      (plan.sharedObjectives || []).forEach(function (t) { out.push({ badge: "K", head: "Knowledge", text: fit(t, 200) }); });
    }
    return out;
  }

  // Each slide has a layout and the text for it. Long text is shortened on the slide and kept in full in the notes.
  function buildSlideSpec(meta, plan, opts) {
    opts = opts || {};
    var theme = resolveTheme(opts.theme || "periwinkle");
    var credit = CREDIT_LINE, slides = [];
    var sub = [plan.learningArea, (meta.gradeLevel || "") + (meta.section ? " " + meta.section : ""), meta.term].filter(Boolean).join(" | ");
    var firstPhoto = null;
    plan.sessions.forEach(function (s) { if (!firstPhoto && sessionPhotoObjects(s).length) firstPhoto = sessionPhotoObjects(s)[0].commons; });
    slides.push({ layout: "title", session: 0, title: plan.lessonTitle || "Lesson", subtitle: sub, footer: [meta.teachers, meta.school].filter(Boolean).join(" | "), photo: firstPhoto, credit: credit,
      notes: "Lesson at a glance: " + plan.sessions.length + " session(s). Pattern: " + plan.pattern.label + ". Competency: " + (plan.competency || "") });
    if (opts.hook) slides.push({ layout: "question", session: 0, title: "Let's start", question: fit(opts.hook, 200), hint: "", credit: credit, notes: "Opening question. Let learners answer before you explain." });

    plan.sessions.forEach(function (s) {
      var n = s.number, photos = sessionPhotoObjects(s), act = fit(s.mainActivity, 220);
      slides.push({ layout: "section", session: n, title: "Session " + n + ": " + s.title, subtitle: s.duration + " minutes \u00b7 " + plan.pattern.label,
        footer: act ? "Main activity: " + act : "", photo: photos[0] ? photos[0].commons : null, credit: credit,
        notes: (s.pre_lesson || []).length ? "Pre-lesson routine: " + s.pre_lesson.join("; ") : "" });
      var objs = sessionObjectiveCards(plan, s);
      if (objs.length) slides.push({ layout: "cards", session: n, title: "Learning objectives \u00b7 Session " + n, items: objs.slice(0, 5), credit: credit,
        notes: "Read each objective aloud. Ask one learner to restate the first one in their own words." });
      var steps = (s.timeline || []).slice(0, 8).map(function (t) { return { label: phaseLabel(t.phase), sub: fit(t.time, 24) }; });
      if (steps.length) slides.push({ layout: "chevrons", session: n, title: "Lesson flow \u00b7 Session " + n, steps: steps, footer: act, credit: credit, notes: (s.flow || []).join("\n") });
      (s.timeline || []).slice(0, 6).forEach(function (t) {
        slides.push({ layout: "phase", session: n, kicker: fit(t.time, 30) + " \u00b7 " + phaseLabel(t.phase), title: fit(t.phase, 60),
          teacher: fit(t.teacher, 320), students: fit(t.students, 260), materials: fit(t.materials, 160), credit: credit,
          notes: "TEACHER: " + (t.teacher || "") + "\nLEARNERS: " + (t.students || "") + "\nMATERIALS: " + (t.materials || "") });
      });
      (s.discussion || []).slice(0, 2).forEach(function (d, i) {
        slides.push({ layout: "question", session: n, title: "Discussion " + (i + 1) + " \u00b7 Session " + n, question: fit(d.teacher, 220), hint: fit(d.follow, 140), credit: credit,
          notes: "Expected responses: " + (d.expected || "(teacher to note)") + (d.follow ? "\nFollow-up: " + d.follow : "") });
      });
      if (photos[1]) slides.push({ layout: "photo", session: n, title: fit(photos[1].description, 70) || "Look closely", caption: fit(photos[1].description, 240), photo: photos[1].commons, credit: credit,
        notes: "Ask learners what they notice before you explain. Search term used: " + (photos[1].search || "") });
      var fz = (s.formative || []).slice(0, 3);
      if (fz.length) slides.push({ layout: "practice", session: n, title: "Check for understanding \u00b7 Session " + n, items: fz.map(function (f, i) { return { badge: "Q" + (i + 1), text: fit(f.question, 220) }; }), credit: credit,
        notes: fz.map(function (f, i) { return "Q" + (i + 1) + " answer: " + (f.answer || ""); }).join("\n") });
      var ws = (s.worksheet || []).slice(0, 4);
      if (ws.length) slides.push({ layout: "practice", session: n, title: "Worksheet \u00b7 Session " + n, items: ws.map(function (w, i) { return { badge: String(i + 1), text: fit(w.item, 220) }; }), credit: credit,
        notes: ws.map(function (w, i) { return (i + 1) + ". " + (w.answer || ""); }).join("\n") });
    });

    if (opts.includeWaysForward !== false) {
      var wf = []; plan.sessions.forEach(function (s) { (s.extended || []).forEach(function (e) { wf.push("Session " + s.number + ": " + e); }); });
      slides.push({ layout: "list", session: 0, title: "Ways forward", items: (wf.length ? wf : ["Extended learning: teacher to add"]).slice(0, 6).map(function (x) { return fit(x, 160); }), credit: credit,
        notes: "Extended learning is for learners who finish early or need more practice." });
    }
    if (opts.includeReferences !== false && plan.references.length) {
      slides.push({ layout: "list", session: 0, title: "References", items: plan.references.slice(0, 8).map(function (r) { return fit(r.apa, 220); }), small: true, credit: credit,
        notes: "Verify every reference before use." });
    }
    if (opts.includeDeclaration !== false) slides.push({ layout: "list", session: 0, title: "Declaration of AI use", items: [fit(opts.declarationShort || "See the lesson plan declaration.", 400)], credit: credit, notes: "The full declaration is in the lesson plan." });
    slides.push({ layout: "closing", session: 0, title: "Thank you", subtitle: "Questions and discussion", credit: credit, notes: "" });
    slides.forEach(function (x, i) { x.index = i + 1; });
    return { theme: theme, slides: slides, credit: credit };
  }

  // Rough token estimate for one plan (input from the real prompts; output from typical sizes). Shown before generating.
  var OVERVIEW_OUTPUT_TOKENS = 1200, SESSION_OUTPUT_TOKENS = 3000;
  function estimateUsage(meta) {
    var n = meta.sessions || 1;
    var ov = { lessonTitle: meta.lessonTitle || "", competency: meta.competency || "", contentStandard: "", performanceStandard: "", pattern: { id: "", label: "", reason: "" }, learnerContext: "", keyTerms: [], sessionObjectives: [] };
    var o = buildOverviewPrompt(meta), se = buildSessionPrompt(meta, ov, 0, []);
    var inTokens = Math.round(((o.system + o.user).length + n * (se.system + se.user).length) / 4);
    var outTokens = OVERVIEW_OUTPUT_TOKENS + n * SESSION_OUTPUT_TOKENS;
    var round = function (x) { return Math.round(x / 500) * 500; };
    return { requests: n + 1, inputTokens: round(inTokens), outputTokens: round(outTokens), total: round(inTokens + outTokens) };
  }

  /* ---------- Providers, model lists, grounding ---------- */

  // testLimit: how many listed models the "Find working models" check actually calls.
  // 0 means every listed model (used for OpenAI). Gemini is kept low to protect the daily allowance.
  var PROVIDERS = {
    gemini: {
      label: "Google Gemini (recommended)",
      kind: "openai", native: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      keyHelp: "Get a key: sign in at aistudio.google.com, then choose Get API key. Google may use data sent through its free tier to improve its products, so do not enter learner personal data.",
      preferred: ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
      defaultModel: "gemini-2.5-flash",
      testLimit: 4
    },
    groq: {
      label: "Groq",
      kind: "openai",
      baseUrl: "https://api.groq.com/openai/v1",
      keyHelp: "Get a key: sign in at console.groq.com and create an API key. Request limits apply.",
      preferred: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
      defaultModel: "openai/gpt-oss-120b",
      testLimit: 12
    },
    openrouter: {
      label: "OpenRouter (many models)",
      kind: "openai",
      baseUrl: "https://openrouter.ai/api/v1",
      keyHelp: "Get a key: sign in at openrouter.ai and create an API key. Model names ending in :free are listed first. Request limits apply.",
      preferred: ["google/gemma-4-31b-it:free", "qwen/qwen3.8-27b:free", "nvidia/nemotron-3-super-120b-a12b:free"],
      defaultModel: "google/gemma-4-31b-it:free",
      testLimit: 8
    },
    openai: {
      label: "OpenAI (ChatGPT)",
      kind: "openai",
      baseUrl: "https://api.openai.com/v1",
      keyHelp: "Create a key at platform.openai.com. Every chat model listed for your key is tested; the working ones are listed first in the dropdown.",
      preferred: ["gpt-4o-mini", "gpt-4o"],
      defaultModel: "gpt-4o-mini",
      testLimit: 0
    },
    anthropic: {
      label: "Anthropic (Claude)",
      kind: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      keyHelp: "Create a key at console.anthropic.com. Check the console for current access and billing details.",
      preferred: ["claude-sonnet-5", "claude-opus-5-5", "claude-haiku-4-5"],
      defaultModel: "claude-sonnet-5",
      testLimit: 12
    },
    custom: {
      label: "Custom OpenAI-compatible endpoint",
      kind: "openai", baseUrl: "",
      keyHelp: "Enter the base URL your provider gives you.",
      preferred: [], defaultModel: "",
      testLimit: 12
    }
  };

  function buildRequest(provider, cfg, system, user, maxTokens) {
    var mt = maxTokens || 12000;
    if (provider === "anthropic") {
      return {
        url: (cfg.baseUrl || "https://api.anthropic.com/v1").replace(/\/$/, "") + "/messages",
        headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: { model: cfg.model, max_tokens: mt, system: system, messages: [{ role: "user", content: user }] }
      };
    }
    var messages = [{ role: "system", content: system }, { role: "user", content: user }];
    var isOpenAI = !!(cfg && cfg.provider === "openai");
    return {
      url: (cfg.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions",
      headers: { "content-type": "application/json", "authorization": "Bearer " + cfg.apiKey },
      // Newer OpenAI models reject max_tokens and non-default temperature, so OpenAI gets its own body.
      body: isOpenAI
        ? { model: cfg.model, max_completion_tokens: mt, messages: messages }
        : { model: cfg.model, temperature: 0.4, max_tokens: mt, messages: messages }
    };
  }

  function readResponse(provider, json) {
    if (provider === "anthropic") return ((json && json.content) || []).map(function (p) { return p.text || ""; }).join("");
    var c = json && json.choices && json.choices[0];
    return (c && c.message && c.message.content) || "";
  }

  // Native Gemini call with Google Search grounding (sources come back in groundingMetadata).
  function buildGeminiGroundedRequest(cfg, system, user, maxTokens) {
    var model = String(cfg.model || "").replace(/^models\//, "");
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(cfg.apiKey),
      headers: { "content-type": "application/json" },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens || 8000 }
      }
    };
  }

  function readGeminiGroundedResponse(json) {
    var cand = (json && json.candidates && json.candidates[0]) || {};
    var text = ((cand.content && cand.content.parts) || []).map(function (p) { return p.text || ""; }).join("");
    var chunks = (cand.groundingMetadata && cand.groundingMetadata.groundingChunks) || [];
    var sources = chunks.map(function (c) { return c.web ? { title: c.web.title || c.web.uri, uri: c.web.uri } : null; }).filter(Boolean);
    return { text: text, sources: sources };
  }

  // Model listing: each provider has its own endpoint and filter.
  function buildListRequest(provider, cfg) {
    if (provider === "gemini") return { url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=" + encodeURIComponent(cfg.apiKey), headers: {} };
    if (provider === "anthropic") return { url: (cfg.baseUrl || "https://api.anthropic.com/v1").replace(/\/$/, "") + "/models?limit=100", headers: { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } };
    if (provider === "openrouter") return { url: "https://openrouter.ai/api/v1/models", headers: {} };
    return { url: (cfg.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "") + "/models", headers: { "authorization": "Bearer " + cfg.apiKey } };
  }

  function parseModelList(provider, json) {
    if (provider === "gemini") {
      return ((json && json.models) || []).filter(function (m) {
        return (m.supportedGenerationMethods || []).indexOf("generateContent") !== -1 && /gemini/i.test(m.name || "");
      }).map(function (m) { return String(m.name).replace(/^models\//, ""); });
    }
    var data = (json && (json.data || json.models)) || [];
    var ids = data.map(function (m) { return typeof m === "string" ? m : (m.id || m.name || ""); }).filter(Boolean);
    if (provider === "anthropic") return ids.filter(function (id) { return /claude/i.test(id); });
    if (provider === "openrouter") return ids;
    if (provider === "groq") return ids.filter(function (id) { return !/whisper|tts|embed|guard|orpheus/i.test(id); });
    return ids.filter(function (id) { return /^(gpt-|o\d|chatgpt-)/i.test(id) && !/audio|realtime|tts|transcribe|image|embedding|moderation|search|whisper|dall|vision-preview/i.test(id); });
  }

  // Order models: preferred first, then newest-looking names. Free OpenRouter models first.
  function rankModels(provider, ids) {
    var pref = (PROVIDERS[provider] || {}).preferred || [];
    var score = function (id) {
      var p = pref.indexOf(id);
      if (p !== -1) return -1000 + p;
      var s = 0;
      if (provider === "openai") {
        if (/nano|mini/.test(id)) s -= 4;
        if (/pro|deep-research|codex|instruct|realtime|audio|search/.test(id)) s += 4;
        return s;
      }
      if (/preview|latest/.test(id)) s -= 5;
      if (/pro|opus|sonnet|gpt-4o|120b|large|ultra/.test(id)) s -= 3;
      if (/lite|mini|nano|haiku|small/.test(id)) s -= 1;
      if (/:free$/.test(id)) s -= 2;
      return s;
    };
    return ids.slice().sort(function (a, b) { return score(a) - score(b) || a.localeCompare(b); });
  }

  function testRequest(provider, cfg) {
    return buildRequest(provider, cfg, "Reply with the single word OK.", "Connection test.", 16);
  }

  // Wikimedia Commons search (files only), returning thumbnails with licence and author data.
  function commonsSearchUrl(term) {
    return "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" + encodeURIComponent(String(term || "")) + "&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=640&format=json&origin=*";
  }

  function plainText(x) {
    return String(x || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }

  // Keeps only JPEG and PNG results, in the order Commons returned them.
  function pickCommonsImages(json) {
    var pages = (json && json.query && json.query.pages) || {};
    return Object.keys(pages).map(function (k) { return pages[k]; })
      .sort(function (a, b) { return (a.index || 0) - (b.index || 0); })
      .map(function (p) {
        var ii = (p.imageinfo && p.imageinfo[0]) || null;
        if (!ii || !/^image\/(jpeg|png)$/.test(ii.mime || "") || !(ii.thumburl || ii.url)) return null;
        var em = ii.extmetadata || {};
        var val = function (k) { return em[k] && em[k].value ? plainText(em[k].value) : ""; };
        return {
          title: String(p.title || "").replace(/^File:/, ""),
          thumb: ii.thumburl || ii.url,
          width: ii.thumbwidth || ii.width || 640,
          height: ii.thumbheight || ii.height || 480,
          type: ii.mime === "image/png" ? "png" : "jpg",
          license: val("LicenseShortName"),
          artist: val("Artist"),
          page: ii.descriptionurl || ""
        };
      }).filter(Boolean);
  }

  function photoSearchUrl(term) {
    return "https://commons.wikimedia.org/w/index.php?search=" + encodeURIComponent(term || "") + "&title=Special:MediaSearch&type=image";
  }

  return {
    APP_NAME: APP_NAME, CREDIT_LINE: CREDIT_LINE, CREDIT: CREDIT,
    GRADES: GRADES, TERMS: TERMS, PATTERNS: PATTERNS, LEARNER_CONTEXT_OPTIONS: LEARNER_CONTEXT_OPTIONS,
    THEME_PRESETS: THEME_PRESETS, STYLE_GUIDE: STYLE_GUIDE, PROVIDERS: PROVIDERS, RULES: RULES,
    RUBRIC_ITEMS: RUBRIC_ITEMS,
    sanitizeMeta: sanitizeMeta, validateMeta: validateMeta, aiDraftedParts: aiDraftedParts,
    buildOverviewPrompt: buildOverviewPrompt, buildSessionPrompt: buildSessionPrompt, buildRegenPrompt: buildRegenPrompt,
    extractJson: extractJson, normalizeOverview: normalizeOverview, assemblePlan: assemblePlan, buildManualPlan: buildManualPlan,
    applySessionPatch: applySessionPatch, undoSessionPatch: undoSessionPatch,
    matrixLayout: matrixLayout, headerRows: headerRows, rubricCheck: rubricCheck,
    declarationFacts: declarationFacts, declarationPrompt: declarationPrompt, fallbackDeclaration: fallbackDeclaration,
    planToText: planToText, resolveTheme: resolveTheme, buildSlideSpec: buildSlideSpec, fit: fit, fitFont: fitFont, estimateUsage: estimateUsage,
    buildRequest: buildRequest, readResponse: readResponse, buildGeminiGroundedRequest: buildGeminiGroundedRequest,
    readGeminiGroundedResponse: readGeminiGroundedResponse, buildListRequest: buildListRequest, parseModelList: parseModelList,
    rankModels: rankModels, testRequest: testRequest, photoSearchUrl: photoSearchUrl,
    letterheadLines: letterheadLines, commonsSearchUrl: commonsSearchUrl, pickCommonsImages: pickCommonsImages,
    patternLabel: patternLabel, patternById: patternById, listFromText: listFromText
  };
})();

if (typeof module !== "undefined" && module.exports) { module.exports = ILAW; }
