/* ILAW LP: page logic. Depends on js/core.js (ILAW) and the vendored libraries. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var PROFILE_KEY = "ilaw_lp_profile";
  var SETTINGS_KEY = "ilaw_lp_settings";
  var FORM_KEY = "ilaw_lp_form";
  var MODELS_KEY = "ilaw_lp_models_";

  var state = { meta: null, overview: null, plan: null, declaration: "", refs: [], modelCache: {}, view: "overview", listedAll: [] };

  /* ---------- small UI helpers ---------- */

  function el(tag, props, children) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "class") n.className = props[k];
      else if (k === "text") n.textContent = props[k];
      else if (k === "html") n.innerHTML = props[k];
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), props[k]);
      else if (props[k] !== undefined && props[k] !== null) n.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function busy(on, msg) {
    $("busy").hidden = !on;
    if (msg) $("busyText").textContent = msg;
    if (!on) $("busyBar").style.width = "0%";
  }
  function progress(pct, msg) { $("busyBar").style.width = Math.max(0, Math.min(100, pct)) + "%"; if (msg) $("busyText").textContent = msg; }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 3800);
  }
  function setStep(n) {
    document.querySelectorAll(".step").forEach(function (s, i) { s.classList.toggle("done", i < n - 1); s.classList.toggle("active", i === n - 1); });
  }
  function fillSelect(sel, options, selected) {
    sel.innerHTML = "";
    options.forEach(function (o) { sel.appendChild(el("option", { value: o, text: o, selected: o === selected ? "selected" : null })); });
  }

  /* ---------- Setup: chips, grades, providers ---------- */

  function chip(group, value, label, extra) {
    var input = el("input", { type: "checkbox", value: value, "data-group": group });
    var c = el("label", { class: "chip" + (extra ? " " + extra : "") }, [input, el("span", { text: label })]);
    input.addEventListener("change", function () { c.classList.toggle("on", input.checked); onChipChange(group, input); });
    return c;
  }

  function onChipChange(group, input) {
    if (group === "pattern" && input.value === "ai" && input.checked) {
      document.querySelectorAll('input[data-group="pattern"]').forEach(function (i) { if (i !== input) { i.checked = false; i.parentNode.classList.remove("on"); } });
    } else if (group === "pattern" && input.checked) {
      var ai = document.querySelector('input[data-group="pattern"][value="ai"]');
      if (ai && ai.checked) { ai.checked = false; ai.parentNode.classList.remove("on"); }
    }
  }

  function checkedValues(group) {
    return Array.prototype.slice.call(document.querySelectorAll('input[data-group="' + group + '"]:checked')).map(function (i) { return i.value; });
  }

  function buildSetup() {
    fillSelect($("gradeLevel"), ILAW.GRADES, "Grade 11");
    fillSelect($("term"), ILAW.TERMS, "Term 2");

    var prov = $("provider");
    prov.innerHTML = "";
    Object.keys(ILAW.PROVIDERS).forEach(function (k) { prov.appendChild(el("option", { value: k, text: ILAW.PROVIDERS[k].label })); });

    var ctx = $("ctxChips");
    ILAW.LEARNER_CONTEXT_OPTIONS.forEach(function (o) { ctx.appendChild(chip("learnerContext", o, o)); });
    var pat = $("patternChips");
    ILAW.PATTERNS.forEach(function (p) { pat.appendChild(chip("pattern", p.id, p.label, p.id === "ai" ? "ai-chip" : "")); });
    setChecked("pattern", "ai", true);

    $("sessions").addEventListener("change", renderSessionActivities);
    renderSessionActivities();

    prov.addEventListener("change", function () { applyProvider(prov.value, true); });
    $("modelSelect").addEventListener("change", onModelChange);
    $("btnCheckModels").addEventListener("click", onCheckModels);
    $("showAllModels").addEventListener("change", function () { populateModels(); });
    $("btnTest").addEventListener("click", onTest);
    $("btnForget").addEventListener("click", onForget);
    $("rememberKey").addEventListener("change", saveSettings);
    $("apiKey").addEventListener("input", saveSettings);
    $("modelCustom").addEventListener("input", saveSettings);
    $("baseUrl").addEventListener("input", saveSettings);
    $("rememberProfile").addEventListener("change", onProfileRemember);
    $("teachers").addEventListener("input", saveProfile);
    $("school").addEventListener("input", saveProfile);
    ["division", "schoolAddress", "schoolEmail"].forEach(function (id) { $(id).addEventListener("input", saveProfile); });
    $("refFile").addEventListener("change", onRefFiles);
    $("refClear").addEventListener("click", function () { state.refs = []; renderRefs(); });

    $("btnGenerate").addEventListener("click", onGenerate);
    $("btnManual").addEventListener("click", onManual);
    $("viewOverview").addEventListener("click", function () { setView("overview"); });
    $("viewDetailed").addEventListener("click", function () { setView("detailed"); });
    $("btnDeclAi").addEventListener("click", onDeclAi);
    $("btnDeclPlain").addEventListener("click", function () { if (state.plan) setDeclarationDefault(); });
    $("btnDocx").addEventListener("click", exportDocx);
    $("btnPdf").addEventListener("click", exportPdf);
    $("btnCopy").addEventListener("click", copyText);
    $("btnJson").addEventListener("click", exportJson);
    $("fileJson").addEventListener("change", importJson);
    $("btnPpt").addEventListener("click", onPpt);

    loadProfile();
    loadSettings();
    loadForm();
    var deb = null;
    $("sec-setup").addEventListener("input", function () { if (!$("rememberForm").checked) return; clearTimeout(deb); deb = setTimeout(saveForm, 400); });
    $("sec-setup").addEventListener("change", function () { if ($("rememberForm").checked) saveForm(); });
    $("rememberForm").addEventListener("change", function () { if ($("rememberForm").checked) saveForm(); else clearFormStore(); });
    onProviderUi();
    setStep(1);
  }

  function renderSessionActivities() {
    var n = parseInt($("sessions").value, 10) || 1;
    var box = $("sessionActivities");
    var prev = Array.prototype.slice.call(box.querySelectorAll("textarea")).map(function (t) { return t.value; });
    box.innerHTML = "";
    for (var i = 0; i < n; i++) {
      box.appendChild(el("label", { class: "field" }, [
        "Session " + (i + 1) + " main activity (optional)",
        el("textarea", { class: "act", rows: "2", placeholder: "Blank = the AI designs one. Or describe what learners will do.", text: prev[i] || "" })
      ]));
    }
  }

  function readForm() {
    var v = function (id) { return $(id).value; };
    return {
      lessonTitle: v("lessonTitle"), learningArea: v("learningArea"), teachers: v("teachers"), school: v("school"),
      division: v("division"), schoolAddress: v("schoolAddress"), schoolEmail: v("schoolEmail"),
      gradeLevel: v("gradeLevel"), section: v("section"), sessions: v("sessions"), medium: v("medium"),
      term: v("term"), week: v("week"), competency: v("competency"), contentStandard: v("contentStandard"),
      performanceStandard: v("performanceStandard"), objectives: v("objectives"),
      learnerContextOptions: checkedValues("learnerContext"), learnerContextOther: v("learnerContextOther"),
      observations: v("observations"), classSize: v("classSize"),
      patterns: checkedValues("pattern"), patternOther: v("patternOther"),
      mainActivities: Array.prototype.slice.call(document.querySelectorAll("#sessionActivities textarea.act")).map(function (t) { return t.value; }),
      additional: v("additional"),
      referenceText: state.refs.map(function (r) { return "--- " + r.name + " ---\n" + r.text; }).join("\n\n"),
      referenceNames: state.refs.map(function (r) { return r.name; }),
      useWeb: $("useWeb").checked && $("provider").value === "gemini",
      aiTools: ""
    };
  }

  function writeForm(f) {
    var set = function (id, val) { if (val !== undefined && $(id)) $(id).value = val; };
    ["lessonTitle", "learningArea", "gradeLevel", "section", "sessions", "medium", "term", "week", "competency", "contentStandard", "performanceStandard", "objectives", "learnerContextOther", "observations", "classSize", "patternOther", "additional", "division", "schoolAddress", "schoolEmail"].forEach(function (k) { set(k, f[k]); });
    (f.learnerContextOptions || []).forEach(function (o) { setChecked("learnerContext", o, true); });
    if (Array.isArray(f.patterns)) {
      document.querySelectorAll('input[data-group="pattern"]').forEach(function (i) { i.checked = false; i.parentNode.classList.remove("on"); });
      f.patterns.forEach(function (o) { setChecked("pattern", o, true); });
    }
    renderSessionActivities();
    (f.mainActivities || []).forEach(function (a, i) { var t = document.querySelectorAll("#sessionActivities textarea.act")[i]; if (t) t.value = a; });
  }

  function setChecked(group, value, on) {
    document.querySelectorAll('input[data-group="' + group + '"]').forEach(function (i) {
      if (i.value === value) { i.checked = on; i.parentNode.classList.toggle("on", on); }
    });
  }

  function saveForm() {
    if (!$("rememberForm").checked) return;
    var f = readForm(); delete f.referenceText;
    try { localStorage.setItem(FORM_KEY, JSON.stringify(f)); } catch (e) { /* blocked */ }
  }
  function loadForm() {
    var raw = null; try { raw = localStorage.getItem(FORM_KEY); } catch (e) { raw = null; }
    if (!raw) return;
    try { writeForm(JSON.parse(raw)); $("rememberForm").checked = true; } catch (e) { /* ignore */ }
  }
  function clearFormStore() { try { localStorage.removeItem(FORM_KEY); } catch (e) { /* ignore */ } }

  /* ---------- Profile (teacher and school names) ---------- */

  function saveProfile() {
    if (!$("rememberProfile").checked) return;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ teachers: $("teachers").value, school: $("school").value, division: $("division").value, schoolAddress: $("schoolAddress").value, schoolEmail: $("schoolEmail").value })); } catch (e) { /* blocked */ }
  }
  function loadProfile() {
    var raw = null; try { raw = localStorage.getItem(PROFILE_KEY); } catch (e) { raw = null; }
    if (!raw) return;
    try {
      var p = JSON.parse(raw);
      $("teachers").value = p.teachers || ""; $("school").value = p.school || "";
      $("division").value = p.division || ""; $("schoolAddress").value = p.schoolAddress || ""; $("schoolEmail").value = p.schoolEmail || "";
      $("rememberProfile").checked = true;
    } catch (e) { /* ignore */ }
  }
  function onProfileRemember() {
    if ($("rememberProfile").checked) saveProfile();
    else { try { localStorage.removeItem(PROFILE_KEY); } catch (e) { /* ignore */ } }
  }

  /* ---------- Providers and models ---------- */

  function applyProvider(key, resetModel) {
    var p = ILAW.PROVIDERS[key] || ILAW.PROVIDERS.gemini;
    $("provider").value = key;
    $("baseUrl").value = p.baseUrl;
    $("keyHelp").textContent = p.keyHelp || "";
    $("useWebRow").hidden = key !== "gemini";
    populateModels(resetModel);
    onProviderUi();
  }

  function onProviderUi() { $("useWebRow").hidden = $("provider").value !== "gemini"; }

  function cachedModels(provider) {
    try { return JSON.parse(localStorage.getItem(MODELS_KEY + provider) || "null"); } catch (e) { return null; }
  }

  // Builds the dropdown. Working models (from the last check) come first. Unchecked models appear only when asked.
  function populateModels(resetModel) {
    var key = $("provider").value;
    var p = ILAW.PROVIDERS[key] || ILAW.PROVIDERS.gemini;
    var cache = cachedModels(key);
    var sel = $("modelSelect");
    var prevValue = sel.value;
    sel.innerHTML = "";
    var showAll = $("showAllModels").checked;
    var entries = [];
    if (cache && cache.working && cache.working.length) {
      cache.working.forEach(function (m) { entries.push({ id: m, label: "✓ " + m + " (tested working)" }); });
      if (showAll && cache.failed) cache.failed.forEach(function (f) { entries.push({ id: f.id, label: "✗ " + f.id + " (" + f.reason + ")" }); });
      if (showAll && cache.untested) cache.untested.forEach(function (m) { entries.push({ id: m, label: "? " + m + " (not tested)" }); });
    } else if (cache && cache.untested) {
      cache.untested.forEach(function (m) { entries.push({ id: m, label: m + " (listed, not tested)" }); });
    } else {
      p.preferred.forEach(function (m) { entries.push({ id: m, label: m + " (suggested; run Find working models)" }); });
    }
    entries.forEach(function (e) { sel.appendChild(el("option", { value: e.id, text: e.label })); });
    sel.appendChild(el("option", { value: "__other", text: "Other: type a model name" }));
    if (resetModel || !entries.some(function (e) { return e.id === prevValue; })) {
      sel.value = entries.length ? (cache && cache.working && cache.working.length ? cache.working[0] : (p.defaultModel || entries[0].id)) : "__other";
      if (!entries.some(function (e) { return e.id === sel.value; })) sel.value = entries.length ? entries[0].id : "__other";
    } else {
      sel.value = prevValue;
    }
    if (!entries.length) sel.value = "__other";
    onModelChange();
  }

  function onModelChange() {
    $("modelCustomWrap").hidden = $("modelSelect").value !== "__other";
    saveSettings();
  }

  function currentModel() {
    var v = $("modelSelect").value;
    return v === "__other" ? $("modelCustom").value.trim() : v;
  }

  function readSettings() {
    var key = $("provider").value;
    var p = ILAW.PROVIDERS[key] || ILAW.PROVIDERS.gemini;
    return { provider: key, kind: p.kind, native: p.native, baseUrl: $("baseUrl").value.trim(), model: currentModel(), apiKey: $("apiKey").value.trim() };
  }

  function saveSettings() {
    var s = readSettings();
    var payload = JSON.stringify({ provider: s.provider, baseUrl: s.baseUrl, model: $("modelSelect").value, modelCustom: $("modelCustom").value, apiKey: s.apiKey, remember: $("rememberKey").checked });
    try {
      if ($("rememberKey").checked) { localStorage.setItem(SETTINGS_KEY, payload); sessionStorage.removeItem(SETTINGS_KEY); }
      else { sessionStorage.setItem(SETTINGS_KEY, payload); localStorage.removeItem(SETTINGS_KEY); }
    } catch (e) { /* blocked */ }
  }

  function loadSettings() {
    var raw = null; try { raw = localStorage.getItem(SETTINGS_KEY) || sessionStorage.getItem(SETTINGS_KEY); } catch (e) { raw = null; }
    var s = null; if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
    applyProvider(s && ILAW.PROVIDERS[s.provider] ? s.provider : "gemini", !(s && s.model));
    if (s) {
      if (s.baseUrl) $("baseUrl").value = s.baseUrl;
      if (s.modelCustom) $("modelCustom").value = s.modelCustom;
      if (s.model) {
        var found = Array.prototype.some.call($("modelSelect").options, function (o) { return o.value === s.model; });
        $("modelSelect").value = found ? s.model : "__other";
        if (!found) $("modelCustom").value = s.model;
      }
      onModelChange();
      if (s.apiKey) $("apiKey").value = s.apiKey;
      $("rememberKey").checked = !!s.remember;
    }
  }

  function onForget() {
    try { localStorage.removeItem(SETTINGS_KEY); localStorage.removeItem(FORM_KEY); localStorage.removeItem(PROFILE_KEY); sessionStorage.removeItem(SETTINGS_KEY); } catch (e) { /* ignore */ }
    $("rememberKey").checked = false; $("rememberForm").checked = false; $("rememberProfile").checked = false;
    $("apiKey").value = "";
    toast("Saved key, profile, and lesson inputs were removed from this browser.");
  }

  // Fetch with a timeout so one slow model cannot hang the check.
  async function fetchWithTimeout(url, opts, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 25000) : null;
    try {
      var res = await fetch(url, Object.assign({}, opts, ctrl ? { signal: ctrl.signal } : {}));
      var text = await res.text();
      return { ok: res.ok, status: res.status, text: text };
    } finally { if (timer) clearTimeout(timer); }
  }

  async function onCheckModels() {
    var s = readSettings();
    if (!s.apiKey) { toast("Paste your API key first (section 1)."); return; }
    saveSettings();
    busy(true, "Listing models for " + (ILAW.PROVIDERS[s.provider].label) + "…");
    try {
      var lr = ILAW.buildListRequest(s.provider, s);
      var res = await fetchWithTimeout(lr.url, { method: "GET", headers: lr.headers }, 20000);
      if (!res.ok) throw new Error("The provider replied HTTP " + res.status + " when listing models. Check the key. " + res.text.slice(0, 160));
      var ids = ILAW.rankModels(s.provider, ILAW.parseModelList(s.provider, JSON.parse(res.text)));
      if (!ids.length) throw new Error("No chat models were returned for this key.");
      var limit = (ILAW.PROVIDERS[s.provider] || {}).testLimit || 0;
      var cap = s.provider === "openrouter" ? ids.filter(function (x) { return /:free$/.test(x); }).slice(0, limit || 8) : (limit > 0 ? ids.slice(0, limit) : ids.slice());
      var working = [], failed = [];
      for (var i = 0; i < cap.length; i++) {
        progress(Math.round(((i + 1) / cap.length) * 100), "Testing " + cap[i] + " (" + (i + 1) + " of " + cap.length + ")…");
        var tr = ILAW.testRequest(s.kind === "anthropic" ? "anthropic" : "openai", Object.assign({}, s, { model: cap[i] }));
        try {
          var t = await fetchWithTimeout(tr.url, { method: "POST", headers: tr.headers, body: JSON.stringify(tr.body) }, 25000);
          if (t.ok) working.push(cap[i]);
          else failed.push({ id: cap[i], reason: "HTTP " + t.status + (t.status === 429 ? " quota" : t.status === 404 ? " not found" : "") });
        } catch (e) { failed.push({ id: cap[i], reason: "no reply in time" }); }
      }
      var untested = ids.filter(function (x) { return cap.indexOf(x) === -1; });
      state.modelCache[s.provider] = { working: working, failed: failed, untested: untested };
      try { localStorage.setItem(MODELS_KEY + s.provider, JSON.stringify(state.modelCache[s.provider])); } catch (e) { /* blocked */ }
      populateModels(false);
      $("modelStatus").textContent = working.length ? (working.length + " working model(s) found. Pick one in the dropdown.") : "None of the tested models replied. Tick 'Show all listed models' and try another, or check your key and quota.";
    } catch (err) {
      $("modelStatus").textContent = err.message;
    } finally { busy(false); }
  }

  async function onTest() {
    var s = readSettings();
    if (!s.apiKey) { toast("Paste your API key first."); return; }
    if (!s.model) { toast("Choose a model first."); return; }
    saveSettings();
    $("testStatus").textContent = "Testing…";
    try {
      var tr = ILAW.testRequest(s.kind === "anthropic" ? "anthropic" : "openai", s);
      var t = await fetchWithTimeout(tr.url, { method: "POST", headers: tr.headers, body: JSON.stringify(tr.body) }, 25000);
      if (!t.ok) throw new Error("HTTP " + t.status + ": " + t.text.slice(0, 200));
      $("testStatus").textContent = "Connected. " + s.model + " replied.";
    } catch (e) { $("testStatus").textContent = "Test failed: " + e.message; }
  }

  // One AI call through the selected provider. Gemini uses the native endpoint when grounding is requested.
  async function callAI(system, user, opts) {
    opts = opts || {};
    var s = readSettings();
    if (!s.apiKey) throw new Error("No API key yet. Paste one in section 1, or use Build plan (no AI).");
    if (!s.model) throw new Error("Choose a model in section 1.");
    var res, text;
    if (opts.grounded && s.provider === "gemini") {
      var gr = ILAW.buildGeminiGroundedRequest(s, system, user, 8000);
      res = await fetchWithTimeout(gr.url, { method: "POST", headers: gr.headers, body: JSON.stringify(gr.body) }, 120000);
      if (!res.ok) throw new Error("Gemini replied HTTP " + res.status + ": " + res.text.slice(0, 200));
      var g = ILAW.readGeminiGroundedResponse(JSON.parse(res.text));
      return { text: g.text, sources: g.sources };
    }
    var req = ILAW.buildRequest(s.kind === "anthropic" ? "anthropic" : "openai", { provider: s.provider, baseUrl: s.baseUrl, apiKey: s.apiKey, model: s.model }, system, user, opts.maxTokens || 12000);
    res = await fetchWithTimeout(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(req.body) }, 150000);
    if (!res.ok) throw new Error("The provider replied HTTP " + res.status + ": " + res.text.slice(0, 220));
    try { text = ILAW.readResponse(s.kind === "anthropic" ? "anthropic" : "openai", JSON.parse(res.text)); }
    catch (e) { throw new Error("Unexpected reply from the provider."); }
    return { text: text, sources: [] };
  }

  /* ---------- Photos from Wikimedia Commons (real, licensed images) ---------- */

  var photoCache = {};

  // One search per term, cached. Returns the first JPEG/PNG result, or null.
  function resolvePhoto(term) {
    var key = String(term || "").trim().toLowerCase();
    if (!key) return Promise.resolve(null);
    if (!photoCache[key]) {
      photoCache[key] = (async function () {
        var img = null;
        try {
          var r = await fetchWithTimeout(ILAW.commonsSearchUrl(term), { method: "GET" }, 15000);
          if (r.ok) img = ILAW.pickCommonsImages(JSON.parse(r.text))[0] || null;
        } catch (e) { img = null; }
        if (!img) delete photoCache[key];   // misses are retried later, not remembered
        return img;
      })();
    }
    return photoCache[key];
  }

  async function resolvePlanPhotos() {
    if (!state.plan) return;
    for (var i = 0; i < state.plan.sessions.length; i++) {
      var ph = state.plan.sessions[i].photos;
      for (var j = 0; j < ph.length; j++) ph[j].commons = await resolvePhoto(ph[j].search || ph[j].description);
    }
  }

  async function imageBytes(url) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    try {
      var res = await fetch(url, ctrl ? { signal: ctrl.signal } : {});
      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch (e) { return null; }
    finally { if (timer) clearTimeout(timer); }
  }

  function commonsFigure(img) {
    return el("figure", { class: "commons" }, [
      el("img", { src: img.thumb, alt: img.title, loading: "lazy" }),
      el("figcaption", { text: "Wikimedia Commons: " + img.title + (img.license ? " · " + img.license : "") + (img.artist ? " · " + img.artist : "") })
    ]);
  }

  /* ---------- Generation pipeline ---------- */

  function showErrors(list) {
    var ul = $("errors");
    ul.innerHTML = "";
    list.forEach(function (e) { ul.appendChild(el("li", { text: e })); });
    ul.hidden = list.length === 0;
  }

  function revealPlan() {
    ["sec-plan", "sec-decl", "sec-export", "sec-ppt"].forEach(function (id) { $(id).hidden = false; });
    setStep(3);
  }

  async function onGenerate() {
    var meta = ILAW.sanitizeMeta(readForm());
    meta.aiTools = $("provider").selectedOptions[0].textContent + ", model " + currentModel();
    var errs = ILAW.validateMeta(meta);
    if (errs.length) { showErrors(errs); return; }
    if (!readSettings().apiKey) { showErrors(["No API key yet. Paste one in section 1 to draft with AI, or use Build plan (no AI)."]); return; }
    showErrors([]);
    var btn = $("btnGenerate");
    btn.disabled = true;
    state.meta = meta;
    var total = meta.sessions + 1;
    try {
      busy(true, "Planning the overview (objectives, learner context, pattern, references)…");
      progress(Math.round(100 / (total + 1)));
      var ov = ILAW.buildOverviewPrompt(meta);
      var ovRes = await callAI(ov.system, ov.user, { grounded: meta.useWeb, maxTokens: 8000 });
      var ovParsed = ILAW.extractJson(ovRes.text);
      if (!ovParsed.ok) throw new Error(ovParsed.error);
      state.overview = ILAW.normalizeOverview(ovParsed.data, meta);
      state.overview.webSources = ovRes.sources || [];
      var raws = [];
      var failures = [];
      for (var i = 0; i < meta.sessions; i++) {
        progress(Math.round(((i + 2) / (total + 1)) * 100), "Designing detailed Session " + (i + 1) + " of " + meta.sessions + "…");
        var sp = ILAW.buildSessionPrompt(meta, state.overview, i, raws.slice(0, i).map(function (r) { return r && r.title ? r.title : "Session " + (i + 1); }));
        try {
          var sr = await callAI(sp.system, sp.user, { maxTokens: 12000 });
          var sj = ILAW.extractJson(sr.text);
          if (!sj.ok) throw new Error(sj.error);
          raws.push(sj.data);
        } catch (e) { raws.push(null); failures.push("Session " + (i + 1) + ": " + e.message + " Use Regenerate activities on that session to try again."); }
      }
      progress(100, "Assembling the plan…");
      state.plan = ILAW.assemblePlan(meta, state.overview, raws, true);
      state.plan.pattern.reason = state.plan.pattern.reason || "";
      revealPlan();
      setDeclarationDefault();
      setView("overview");
      if (failures.length) showErrors(failures);
      toast("Draft ready. Review and edit below.");
      if ($("sec-plan").scrollIntoView) $("sec-plan").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      showErrors([err.message]);
    } finally {
      busy(false);
      btn.disabled = false;
    }
  }

  function onManual() {
    var meta = ILAW.sanitizeMeta(readForm());
    var errs = ILAW.validateMeta(meta);
    if (errs.length) { showErrors(errs); return; }
    showErrors([]);
    state.meta = meta;
    state.overview = ILAW.normalizeOverview({}, meta);
    state.plan = ILAW.buildManualPlan(meta);
    revealPlan();
    setDeclarationDefault();
    setView("overview");
    toast("Template built without AI. Fill in the blanks.");
  }

  /* ---------- Views ---------- */

  function setView(v) {
    state.view = v;
    $("viewOverview").classList.toggle("active", v === "overview");
    $("viewDetailed").classList.toggle("active", v === "detailed");
    renderPlan();
  }

  function renderPlan() {
    var box = $("planView");
    box.innerHTML = "";
    if (!state.plan) return;
    if (state.overview && state.overview.webSources && state.overview.webSources.length) {
      box.appendChild(el("div", { class: "sources" }, [
        el("strong", { text: "Sources the AI found on the web (verify before citing):" }),
        el("ul", null, state.overview.webSources.map(function (s) { return el("li", null, [el("a", { href: s.uri, target: "_blank", rel: "noopener", text: s.title || s.uri })]); }))
      ]));
    }
    box.appendChild(state.view === "overview" ? overviewTable() : detailedView());
    renderRubric();
    renderSlidePreview();
  }

  function fieldTA(value, onInput, rows, ph) { return el("textarea", { rows: String(rows || 2), placeholder: ph || "", text: value || "", oninput: function (e) { onInput(e.target.value); } }); }
  function fieldList(arr, onInput, rows) { return fieldTA((arr || []).join("\n"), function (v) { onInput(ILAW.listFromText(v)); }, rows || 3); }

  function regenBtn(s) {
    var wrap = el("span", { class: "regen" });
    var b = el("button", { type: "button", class: "small-btn", text: "Regenerate activities", title: "The AI redesigns this session's activities, keeping objectives and pattern.", onclick: function () { regenerateSession(s.number - 1); } });
    if (!state.plan.usedAi) b.disabled = true;
    wrap.appendChild(b);
    if (s.prev) wrap.appendChild(el("button", { type: "button", class: "small-btn ghost", text: "Undo", onclick: function () { ILAW.undoSessionPatch(s); renderPlan(); } }));
    return wrap;
  }

  function overviewTable() {
    var plan = state.plan, meta = state.meta, n = plan.sessions.length;
    var tbl = el("table", { class: "official" });
    var add = function (cells) { tbl.appendChild(el("tr", null, cells)); };
    ILAW.headerRows(meta, plan, state.declaration).forEach(function (r) {
      var val;
      if (r[0] === "Name of Lesson") val = el("input", { type: "text", value: plan.lessonTitle, oninput: function (e) { plan.lessonTitle = e.target.value; } });
      else if (r[0].indexOf("References") === 0) val = fieldList(plan.references.map(function (x) { return x.apa; }), function (arr) { plan.references = arr.map(function (x) { return { apa: x, use: "" }; }); }, 3);
      else if (r[0] === "Declaration of AI use") val = el("span", { text: state.declaration });
      else val = el("span", { text: r[1] });
      add([el("td", { class: "lab", text: r[0] }), el("td", { colspan: String(n) }, [val])]);
    });
    add([el("th", { text: "ILAW element" })].concat(plan.sessions.map(function (s) { return el("th", null, [el("div", { text: "Session " + s.number }), regenBtn(s)]); })));

    var banner = function (title, text) { add([el("td", { class: "banner", colspan: String(n + 1) }, [title, el("small", { text: text })])]); };
    var lay = ILAW.matrixLayout(plan);
    lay.blocks.forEach(function (b) {
      if (b.type === "banner") return banner(b.title, b.text);
      if (b.kind === "shared") {
        var val = (b.label.indexOf("Competency") === 0)
          ? competencyBlock()
          : (b.label === "Learner Context" ? fieldTA(plan.learnerContext, function (v) { plan.learnerContext = v; }, 3) : el("span", { text: b.value }));
        return add([el("td", { class: "lab", text: b.label }), el("td", { colspan: String(n) }, [val])]);
      }
      var cells = plan.sessions.map(function (s, i) {
        var cell = el("td");
        var text = b.cells[i] || "";
        var rowKey = b.label;
        var editor = fieldTA(text, function (v) { applyOverviewEdit(rowKey, s, v); }, 4);
        cell.appendChild(editor);
        if (rowKey === "Learning Objectives: Knowledge" && plan.objectivesSource === "ai") cell.appendChild(el("span", { class: "badge", text: "AI draft: review" }));
        if (rowKey === "Lesson Flow (" + plan.pattern.label + ")" && s.activitySource === "ai") cell.appendChild(el("span", { class: "badge", text: "AI draft" }));
        if (b.guide) cell.appendChild(el("div", { class: "rowguide", text: "Prompts: " + (b.guide[i] || "") }));
        return cell;
      });
      add([el("td", { class: "lab", text: b.label })].concat(cells));
    });
    var wrap = el("div", { class: "table-wrap" }, [tbl]);
    wrap.appendChild(el("p", { class: "muted small", text: "Every cell is editable. The detailed view has the full minute-by-minute plan for each session." }));
    return wrap;
  }

  function competencyBlock() {
    var plan = state.plan;
    return el("div", null, [
      el("label", { class: "field" }, ["Competency", fieldTA(plan.competency, function (v) { plan.competency = v; state.meta.competency = v; }, 2)]),
      el("label", { class: "field" }, ["Content standard", fieldTA(plan.contentStandard, function (v) { plan.contentStandard = v; }, 2)]),
      el("label", { class: "field" }, ["Performance standard", fieldTA(plan.performanceStandard, function (v) { plan.performanceStandard = v; }, 2)])
    ]);
  }

  // Routes an overview-table edit back to the session data.
  function applyOverviewEdit(label, s, v) {
    if (label === "Main Activity") s.mainActivity = v;
    else if (label === "Pre-Lesson Routine") s.pre_lesson = ILAW.listFromText(v);
    else if (label.indexOf("Lesson Flow") === 0) s.flow = ILAW.listFromText(v);
    else if (label === "Learning Resources") s.resources = ILAW.listFromText(v);
    else if (label === "Opportunities for Integration") s.integration = v;
    else if (label === "Formative Assessment") s.formative = ILAW.listFromText(v).map(function (q) { return { question: q, answer: "" }; });
    else if (label === "Accommodations") s.accommodations = ILAW.listFromText(v);
    else if (label === "Extended Learning") s.extended = ILAW.listFromText(v);
    else if (label.indexOf("Reflections") === 0) s.reflections = v;
    else if (label === "Learning Objectives: Knowledge") { s.objectives = s.objectives || { knowledge: [], skills: [], attitude: [] }; s.objectives.knowledge = ILAW.listFromText(v); }
    else if (label === "Learning Objectives: Skills") { s.objectives = s.objectives || { knowledge: [], skills: [], attitude: [] }; s.objectives.skills = ILAW.listFromText(v); }
    else if (label === "Learning Objectives: Attitude") { s.objectives = s.objectives || { knowledge: [], skills: [], attitude: [] }; s.objectives.attitude = ILAW.listFromText(v); }
  }

  function detailedView() {
    var wrap = el("div", { class: "detail-wrap" });
    state.plan.sessions.forEach(function (s) { wrap.appendChild(sessionDetail(s)); });
    return wrap;
  }

  function sessionDetail(s) {
    var card = el("article", { class: "session-card" });
    card.appendChild(el("header", { class: "session-head" }, [
      el("div", null, [el("div", { class: "kicker", text: "Session " + s.number + " · " + s.duration + " minutes" }), el("h3", { text: s.title })]),
      regenBtn(s)
    ]));
    if (s.activitySource === "ai") card.appendChild(el("div", { class: "badge", text: "Activities drafted by AI: review and adapt" }));

    var obj = s.objectives || { knowledge: state.plan.sharedObjectives || [], skills: [], attitude: [] };
    card.appendChild(group("Learning objectives", [
      el("div", { class: "kv" }, [el("b", { text: "Knowledge: " }), document.createTextNode((obj.knowledge || []).join(" · ") || "(shared; see the overview)")]),
      el("div", { class: "kv" }, [el("b", { text: "Skills: " }), document.createTextNode((obj.skills || []).join(" · ") || "-")]),
      el("div", { class: "kv" }, [el("b", { text: "Attitude: " }), document.createTextNode((obj.attitude || []).join(" · ") || "-")])
    ]));

    card.appendChild(group("Pre-lesson routine", [fieldList(s.pre_lesson, function (a) { s.pre_lesson = a; }, 3)]));

    var tl = el("table", { class: "timeline" });
    tl.appendChild(el("tr", null, [el("th", { text: "Time" }), el("th", { text: "Phase" }), el("th", { text: "What the teacher does" }), el("th", { text: "What learners do" }), el("th", { text: "Materials" })]));
    s.timeline.forEach(function (row, idx) {
      var mk = function (k, rows) { return el("td", null, [fieldTA(row[k], function (v) { row[k] = v; }, rows || 2)]); };
      tl.appendChild(el("tr", null, [mk("time", 1), mk("phase", 1), mk("teacher", 4), mk("students", 4), mk("materials", 3)]));
    });
    card.appendChild(group("Minute-by-minute plan", [tl, el("button", { type: "button", class: "small-btn ghost", text: "Add a row", onclick: function () { s.timeline.push({ time: "", phase: "", teacher: "", students: "", materials: "" }); renderPlan(); } })]));

    card.appendChild(group("Lesson flow (pattern steps)", [fieldList(s.flow, function (a) { s.flow = a; }, 4)]));

    var disc = el("div", { class: "discussion" });
    s.discussion.forEach(function (d) {
      disc.appendChild(el("div", { class: "qa" }, [
        el("div", { class: "q", text: "Teacher says: " + d.teacher }),
        el("div", { class: "a", text: "Expected responses: " + d.expected }),
        d.follow ? el("div", { class: "f", text: "Follow-up: " + d.follow }) : null
      ]));
    });
    if (s.discussion.length) card.appendChild(group("Teacher's discussion flow", [disc]));

    card.appendChild(group("Learning resources", [fieldList(s.resources, function (a) { s.resources = a; }, 3)]));
    card.appendChild(group("Integration and contextualization", [fieldTA(s.integration, function (v) { s.integration = v; }, 2)]));

    var fz = el("div", { class: "checks-list" });
    s.formative.forEach(function (f, idx) {
      fz.appendChild(el("div", { class: "qa" }, [
        fieldTA(f.question, function (v) { f.question = v; }, 2, "Question"),
        fieldTA(f.answer, function (v) { f.answer = v; }, 2, "Model answer / criteria")
      ]));
    });
    card.appendChild(group("Formative assessment (with answers)", [fz, el("button", { type: "button", class: "small-btn ghost", text: "Add a check", onclick: function () { s.formative.push({ question: "", answer: "" }); renderPlan(); } })]));

    if (s.worksheet.length) {
      var ws = el("ol", { class: "worksheet" });
      s.worksheet.forEach(function (w) {
        ws.appendChild(el("li", null, [el("div", { text: w.item }), el("div", { class: "muted small", text: "Answer: " + w.answer })]));
      });
      card.appendChild(group("Worksheet or quiz (answer key included)", [ws]));
    }
    if (s.assessment.type || s.assessment.criteria.length) {
      card.appendChild(group("Assessment", [el("div", { text: (s.assessment.type ? s.assessment.type + ". " : "") + (s.assessment.criteria.length ? "Criteria: " + s.assessment.criteria.join("; ") : "") })]));
    }
    card.appendChild(group("Accommodations", [fieldList(s.accommodations, function (a) { s.accommodations = a; }, 2)]));

    if (s.photos.length) {
      var ph = el("div", { class: "photos" });
      s.photos.forEach(function (p) {
        var box = el("div", { class: "photo" }, [
          el("div", { text: p.description }),
          el("a", { href: ILAW.photoSearchUrl(p.search || p.description), target: "_blank", rel: "noopener", text: "Search more photos: " + (p.search || p.description) })
        ]);
        ph.appendChild(box);
        resolvePhoto(p.search || p.description).then(function (img) {
          if (img) { p.commons = img; box.insertBefore(commonsFigure(img), box.firstChild); }
        });
      });
      card.appendChild(group("Photos (real, licensed images from Wikimedia Commons; check before use)", [ph]));
    }

    var outline = sessionOutline(s.number);
    if (outline.length) {
      var sl = el("div", { class: "slide-grid" });
      outline.forEach(function (x) {
        sl.appendChild(el("div", { class: "slide-thumb" }, [
          el("div", { class: "slide-no", text: String(x.index) }),
          el("div", { class: "slide-title", text: x.title }),
          el("div", { class: "muted small", text: x.layout })
        ]));
      });
      card.appendChild(group("Slides for this session (" + outline.length + " editable slides, built from this plan)", [sl]));
    }

    card.appendChild(group("Extended learning", [fieldList(s.extended, function (a) { s.extended = a; }, 3)]));
    card.appendChild(group("Reflections (write after teaching)", [
      el("div", { class: "muted small", text: "Guide questions: " + s.reflectionPrompts.join(" | ") }),
      fieldTA(s.reflections, function (v) { s.reflections = v; }, 3, "Your reflection after teaching")
    ]));
    if (s.teacherNotes) card.appendChild(group("Notes for the teacher", [el("div", { text: s.teacherNotes })]));

    var rv = el("label", { class: "reviewed" }, [el("input", { type: "checkbox", checked: s.reviewed ? "checked" : null, onchange: function (e) { s.reviewed = e.target.checked; } }), " I have reviewed and adapted this session."]);
    card.appendChild(rv);
    return card;
  }

  function group(title, children) {
    return el("section", { class: "group" }, [el("h4", { text: title })].concat(children));
  }

  function renderRubric() {
    var box = $("rubric");
    box.innerHTML = "";
    if (!state.plan) return;
    ILAW.rubricCheck(state.plan).forEach(function (r, i) {
      box.appendChild(el("div", { class: "rubric-row" }, [
        el("div", { text: String(i + 1) + "." }),
        el("div", null, [el("div", { text: r.item }), r.note ? el("div", { class: "muted small", text: r.note }) : null]),
        el("div", { class: r.status === "Yes" ? "st-yes" : "st-no", text: r.status })
      ]));
    });
  }

  /* ---------- Regenerate one session ---------- */

  async function regenerateSession(index) {
    if (!state.plan || !state.plan.usedAi) return;
    var guidance = window.prompt("Optional guidance for Session " + (index + 1) + " (leave blank to let the AI decide):", "");
    if (guidance === null) return;
    var p = ILAW.buildRegenPrompt(state.meta, state.overview, state.plan, index, guidance);
    busy(true, "Redesigning Session " + (index + 1) + "…");
    try {
      var r = await callAI(p.system, p.user, { maxTokens: 12000 });
      var j = ILAW.extractJson(r.text);
      if (!j.ok) throw new Error(j.error);
      ILAW.applySessionPatch(state.plan.sessions[index], j.data);
      renderPlan();
      toast("Session " + (index + 1) + " redesigned. Use Undo to go back.");
    } catch (err) { toast("Could not redesign: " + err.message); }
    finally { busy(false); }
  }

  /* ---------- Declaration ---------- */

  function setDeclarationDefault() {
    var facts = ILAW.declarationFacts(state.meta, state.plan, $("declChanges").value);
    state.declaration = ILAW.fallbackDeclaration(facts);
    $("declText").value = state.declaration;
  }

  async function onDeclAi() {
    if (!state.plan) return;
    var facts = ILAW.declarationFacts(state.meta, state.plan, $("declChanges").value);
    busy(true, "Drafting the declaration…");
    try {
      var r = await callAI("You write short, honest declarations of AI use for teachers. Output only the declaration text.", ILAW.declarationPrompt(facts), { maxTokens: 400 });
      $("declText").value = r.text.trim();
      state.declaration = $("declText").value;
      toast("Declaration drafted. Check it before you use it.");
    } catch (err) { toast("Could not draft with AI: " + err.message); }
    finally { busy(false); }
  }

  function syncDeclaration() { state.declaration = $("declText").value || state.declaration; }

  /* ---------- Downloads: every file also gets a visible link (works even when auto-download is blocked) ---------- */

  function offerFile(blob, name, label) {
    var url = URL.createObjectURL(blob);
    var a = el("a", { class: "dl-btn", href: url, download: name, text: label || ("Download " + name) });
    var box = $("downloads");
    box.hidden = false;
    box.appendChild(a);
    try { a.click(); } catch (e) { /* the link above still works */ }
    setTimeout(function () { URL.revokeObjectURL(url); }, 600000);
    toast("File ready. If it did not start, click the button under Downloads.");
    return a;
  }

  function safeName(s) { return String(s || "ilaw-lp").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "_").slice(0, 60) || "ilaw-lp"; }

  function copyText() {
    if (!state.plan) return;
    syncDeclaration();
    var txt = ILAW.planToText(state.meta, state.plan, state.declaration);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast("Copied the plan as text."); }, function () { offerFile(new Blob([txt], { type: "text/plain" }), "ilaw-lp.txt", "Download text file"); });
    } else {
      offerFile(new Blob([txt], { type: "text/plain" }), "ilaw-lp.txt", "Download text file");
    }
  }

  function exportJson() {
    if (!state.plan) return;
    syncDeclaration();
    var data = JSON.stringify({ app: ILAW.APP_NAME, meta: Object.assign({}, state.meta, { referenceText: "" }), overview: state.overview, plan: state.plan, declaration: state.declaration }, null, 2);
    offerFile(new Blob([data], { type: "application/json" }), safeName(state.plan.lessonTitle) + ".ilaw.json", "Download saved plan (JSON)");
  }

  function importJson(e) {
    var f = e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        if (!d.plan || !d.meta) throw new Error("Not an ILAW LP file.");
        state.meta = d.meta; state.overview = d.overview || null; state.plan = d.plan; state.declaration = d.declaration || "";
        revealPlan();
        $("declText").value = state.declaration;
        setView("overview");
        toast("Plan opened.");
      } catch (err) { toast("Could not open that file: " + err.message); }
    };
    reader.readAsText(f);
  }

  // Word document: header block, official matrix, detailed session pages, rubric, declaration.
  async function exportDocx() {
    if (!state.plan) return;
    if (typeof docx === "undefined") { toast("The Word library did not load. Check the vendor folder."); return; }
    syncDeclaration();
    busy(true, "Preparing the Word file…");
    try {
      var D = docx, plan = state.plan, n = plan.sessions.length;
      var P = function (text, opts) { return new D.Paragraph(Object.assign({ children: [new D.TextRun({ text: String(text == null ? "" : text), size: 18 })], spacing: { after: 40 } }, opts || {})); };
      var lines = function (t) { return String(t || "").split("\n").map(function (x) { return P(x); }); };
      var cell = function (content, opts) { return new D.TableCell(Object.assign({ children: Array.isArray(content) ? content : [P(content)] }, opts || {})); };
      var pct = function (w) { return { size: w, type: D.WidthType.PERCENTAGE }; };
      var H = function (t, lvl) { return new D.Paragraph({ heading: lvl === 3 ? D.HeadingLevel.HEADING_3 : D.HeadingLevel.HEADING_2, children: [new D.TextRun({ text: t, bold: true, color: "1F4E79" })], spacing: { before: 200, after: 100 } }); };
      var children = [
        new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: plan.lessonTitle, bold: true, size: 30 })] }),
        new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: ILAW.CREDIT_LINE, size: 16, color: "5B6474" })], spacing: { after: 160 } })
      ];
      var lh = ILAW.letterheadLines(state.meta);
      var NB = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
      var lhRight = lh.top.map(function (t) { return new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 0 }, children: [new D.TextRun({ text: t, size: 18 })] }); });
      lhRight.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 60, after: 0 }, children: [new D.TextRun({ text: lh.school, bold: true, size: 26, color: "1F4E79" })] }));
      lh.contact.forEach(function (t) { lhRight.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 0 }, children: [new D.TextRun({ text: t, size: 18 })] })); });
      var lhTable = new D.Table({
        width: { size: 100, type: D.WidthType.PERCENTAGE },
        borders: { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB },
        rows: [new D.TableRow({ children: [
          new D.TableCell({ width: pct(22), children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: "[Paste DepEd seal here]", size: 16, color: "5B6474" })] })] }),
          new D.TableCell({ width: pct(78), children: lhRight })
        ] })]
      });
      var lhRule = new D.Paragraph({ border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: "1F4E79", space: 4 } }, spacing: { after: 160 }, children: [] });
      children.unshift(lhTable, lhRule);

      var rows = [];
      ILAW.headerRows(state.meta, plan, state.declaration).forEach(function (r) {
        rows.push(new D.TableRow({ children: [cell([P(r[0])], { width: pct(28) }), cell(lines(r[1]), { width: pct(72), columnSpan: n })] }));
      });
      rows.push(new D.TableRow({ children: [cell([P("ILAW element")], { width: pct(22), shading: { fill: "E9EDF3" } })].concat(plan.sessions.map(function (s) { return cell([P("Session " + s.number)], { shading: { fill: "E9EDF3" } }); })) }));
      ILAW.matrixLayout(plan).blocks.forEach(function (b) {
        if (b.type === "banner") { rows.push(new D.TableRow({ children: [new D.TableCell({ columnSpan: n + 1, shading: { fill: "1F4E79" }, children: [new D.Paragraph({ children: [new D.TextRun({ text: b.title, bold: true, color: "FFFFFF", size: 22 })] })] })] })); return; }
        if (b.kind === "shared") { rows.push(new D.TableRow({ children: [cell([P(b.label)], { width: pct(22) }), cell(lines(b.value), { columnSpan: n, width: pct(78) })] })); return; }
        rows.push(new D.TableRow({ children: [cell([P(b.label)], { width: pct(22) })].concat(b.cells.map(function (c) { return cell(lines(c)); })) }));
      });
      children.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: rows }));

      busy(true, "Finding photos on Wikimedia Commons…");
      await resolvePlanPhotos();
      var imgData = {};
      for (var pi = 0; pi < plan.sessions.length; pi++) {
        for (var pj = 0; pj < plan.sessions[pi].photos.length; pj++) {
          var pc = plan.sessions[pi].photos[pj].commons;
          if (pc && !(pc.thumb in imgData)) imgData[pc.thumb] = await imageBytes(pc.thumb);
        }
      }
      busy(true, "Preparing the Word file…");
      children.push(H("Detailed sessions", 2));
      plan.sessions.forEach(function (s) {
        children.push(H("Session " + s.number + ": " + s.title + " (" + s.duration + " min)", 3));
        if (s.timeline.length) {
          var tRows = [new D.TableRow({ children: ["Time", "Phase", "Teacher does", "Learners do", "Materials"].map(function (h) { return cell([P(h)], { shading: { fill: "E9EDF3" } }); }) })];
          s.timeline.forEach(function (t) { tRows.push(new D.TableRow({ children: [t.time, t.phase, t.teacher, t.students, t.materials].map(function (x) { return cell(lines(x)); }) })); });
          children.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: tRows }));
        }
        if (s.discussion.length) { children.push(P("Discussion flow:", { spacing: { before: 120 } })); s.discussion.forEach(function (d) { children.push(P("Teacher: " + d.teacher)); children.push(P("Expected: " + d.expected, { indent: { left: 360 } })); if (d.follow) children.push(P("Follow-up: " + d.follow, { indent: { left: 360 } })); }); }
        if (s.formative.length) { children.push(P("Formative checks with answers:", { spacing: { before: 120 } })); s.formative.forEach(function (f, i) { children.push(P((i + 1) + ". " + f.question)); if (f.answer) children.push(P("Answer: " + f.answer, { indent: { left: 360 } })); }); }
        if (s.worksheet.length) { children.push(P("Worksheet and answer key:", { spacing: { before: 120 } })); s.worksheet.forEach(function (w, i) { children.push(P((i + 1) + ". " + w.item)); children.push(P("Answer: " + w.answer, { indent: { left: 360 } })); }); }
        var outW = sessionOutline(s.number);
        if (outW.length) { children.push(P("Slide outline (" + outW.length + " slides, built from this plan):", { spacing: { before: 120 } })); outW.forEach(function (x) { children.push(P(x.index + ". " + x.title + " [" + x.layout + "]")); }); }
        if (s.photos.length) {
          children.push(P("Photos (verify the licence and relevance before use):", { spacing: { before: 120 } }));
          s.photos.forEach(function (p) {
            var term = p.search || p.description, c = p.commons, bytes = c ? imgData[c.thumb] : null;
            if (bytes) {
              var w = 300, h = Math.round(300 * c.height / c.width);
              if (h > 240) { h = 240; w = Math.round(240 * c.width / c.height); }
              children.push(new D.Paragraph({ spacing: { after: 40 }, children: [new D.ImageRun({ type: c.type, data: bytes, transformation: { width: w, height: h } })] }));
              children.push(P("Photo: " + (p.description || term) + ". Source: Wikimedia Commons, \"" + c.title + "\"" + (c.license ? " (" + c.license + ")" : "") + (c.artist ? ", by " + c.artist : "") + ". " + c.page));
            } else {
              children.push(P("Photo: " + (p.description || term) + ". Find a licensed image: " + ILAW.photoSearchUrl(term)));
            }
          });
        }
        if (s.extended.length) { children.push(P("Extended learning: " + s.extended.join("; "))); }
        children.push(P("Reflections (after teaching): " + (s.reflections || "_______________________________")));
      });

      children.push(H("Annex A self-check", 2));
      ILAW.rubricCheck(plan).forEach(function (r, i) { children.push(P((i + 1) + ". [" + r.status + "] " + r.item + (r.note ? " " + r.note : ""))); });
      children.push(H("Declaration of AI use", 2));
      state.declaration.split("\n").forEach(function (line) { children.push(P(line)); });

      var doc = new D.Document({
        creator: "John Lee D. Peñarubia (J.L.D.P)", title: plan.lessonTitle,
        sections: [{
          properties: { page: { size: { orientation: D.PageOrientation.LANDSCAPE } } },
          footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: ILAW.CREDIT_LINE, size: 16, color: "5B6474" })] })] }) },
          children: children
        }]
      });
      var blob = await D.Packer.toBlob(doc);
      busy(false);
      offerFile(blob, safeName(plan.lessonTitle) + ".docx", "Download Word file (.docx)");
    } catch (err) { busy(false); toast("Could not create the Word file: " + err.message); }
  }

  // Printable HTML (overview table, detailed sessions, rubric, declaration). Opened as a file; use Print > Save as PDF.
  function buildPrintHtml() {
    var plan = state.plan, meta = state.meta, n = plan.sessions.length;
    var h = [];
    h.push('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(plan.lessonTitle) + '</title><style>');
    h.push('@page{size:A4 landscape;margin:12mm}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#1d2433}');
    h.push('h1{font-size:17px;text-align:center;margin:0}.credit{text-align:center;color:#5b6474;font-size:10px;margin:2px 0 10px}');
    h.push('table{width:100%;border-collapse:collapse;margin-bottom:10px}td,th{border:1px solid #9aa6b8;padding:4px 5px;vertical-align:top}th{background:#e9edf3}');
    h.push('td.lab{width:20%;font-weight:700;background:#f5f7fa}tr.banner td{background:#1f4e79;color:#fff;font-weight:700}tr.banner small{display:block;font-weight:400}');
    h.push('h2{font-size:13px;color:#1f4e79;margin:12px 0 4px}h3{font-size:12px;margin:10px 0 4px;color:#1f4e79}.printbtn{position:fixed;top:10px;right:10px;padding:8px 12px;background:#1f4e79;color:#fff;border:0;border-radius:8px}');
    h.push('@media print{.printbtn{display:none}}</style></head><body>');
    h.push('<button class="printbtn" onclick="window.print()">Print / Save as PDF</button>');
    h.push('<h1>' + esc(plan.lessonTitle) + '</h1><div class="credit">' + esc(ILAW.CREDIT_LINE) + '</div>');
    h.push('<table>');
    ILAW.headerRows(meta, plan, state.declaration).forEach(function (r) { h.push('<tr><td class="lab">' + esc(r[0]) + '</td><td colspan="' + n + '">' + esc(r[1]) + '</td></tr>'); });
    h.push('<tr><th>ILAW element</th>' + plan.sessions.map(function (s) { return '<th>Session ' + s.number + '</th>'; }).join('') + '</tr>');
    ILAW.matrixLayout(plan).blocks.forEach(function (b) {
      if (b.type === 'banner') { h.push('<tr class="banner"><td colspan="' + (n + 1) + '">' + esc(b.title) + '<small>' + esc(b.text) + '</small></td></tr>'); return; }
      if (b.kind === 'shared') { h.push('<tr><td class="lab">' + esc(b.label) + '</td><td colspan="' + n + '">' + esc(b.value) + '</td></tr>'); return; }
      h.push('<tr><td class="lab">' + esc(b.label) + '</td>' + b.cells.map(function (c) { return '<td>' + esc(c).replace(/\n/g, '<br>') + '</td>'; }).join('') + '</tr>');
    });
    h.push('</table><h2>Detailed sessions</h2>');
    plan.sessions.forEach(function (s) {
      h.push('<h3>Session ' + s.number + ': ' + esc(s.title) + ' (' + s.duration + ' min)</h3>');
      if (s.timeline.length) {
        h.push('<table><tr><th>Time</th><th>Phase</th><th>Teacher does</th><th>Learners do</th><th>Materials</th></tr>');
        s.timeline.forEach(function (t) { h.push('<tr><td>' + esc(t.time) + '</td><td>' + esc(t.phase) + '</td><td>' + esc(t.teacher) + '</td><td>' + esc(t.students) + '</td><td>' + esc(t.materials) + '</td></tr>'); });
        h.push('</table>');
      }
      if (s.discussion.length) { h.push('<div><b>Discussion flow</b></div>'); s.discussion.forEach(function (d) { h.push('<div>T: ' + esc(d.teacher) + '<br><i>Expected:</i> ' + esc(d.expected) + (d.follow ? '<br><i>Follow-up:</i> ' + esc(d.follow) : '') + '</div>'); }); }
      if (s.formative.length) { h.push('<div><b>Formative checks</b></div><ol>' + s.formative.map(function (f) { return '<li>' + esc(f.question) + (f.answer ? '<br><i>Answer:</i> ' + esc(f.answer) : '') + '</li>'; }).join('') + '</ol>'); }
      if (s.worksheet.length) { h.push('<div><b>Worksheet and answer key</b></div><ol>' + s.worksheet.map(function (w) { return '<li>' + esc(w.item) + '<br><i>Answer:</i> ' + esc(w.answer) + '</li>'; }).join('') + '</ol>'); }
      if (s.photos.length) { h.push('<div><b>Photos:</b></div>'); s.photos.forEach(function (p) { var c = p.commons; if (c) { h.push('<figure style="display:inline-block;width:210px;margin:4px 10px 8px 0;vertical-align:top"><img src="' + esc(c.thumb) + '" alt="' + esc(c.title) + '" style="width:210px;border-radius:6px"><figcaption style="font-size:9px;color:#5b6474">' + esc(p.description || p.search) + '. Wikimedia Commons: ' + esc(c.title) + (c.license ? ' (' + esc(c.license) + ')' : '') + (c.artist ? ', ' + esc(c.artist) : '') + '</figcaption></figure>'); } else { h.push('<div>' + esc(p.description || p.search) + ' - <a href="' + esc(ILAW.photoSearchUrl(p.search || p.description)) + '">find a licensed photo</a></div>'); } }); }
      if (s.extended.length) h.push('<div><b>Extended learning:</b> ' + esc(s.extended.join('; ')) + '</div>');
      h.push('<div><b>Reflections:</b> ______________________________________________</div>');
    });
    h.push('<h2>Annex A self-check</h2>' + ILAW.rubricCheck(plan).map(function (r, i) { return '<div>' + (i + 1) + '. [' + r.status + '] ' + esc(r.item) + (r.note ? ' ' + esc(r.note) : '') + '</div>'; }).join(''));
    h.push('<h2>Declaration of AI use</h2><div>' + esc(state.declaration) + '</div>');
    h.push('</body></html>');
    return h.join('');
  }

  async function exportPdf() {
    if (!state.plan) return;
    syncDeclaration();
    busy(true, "Finding photos on Wikimedia Commons…");
    try { await resolvePlanPhotos(); } catch (e) { /* the search links still work */ }
    busy(false);
    var blob = new Blob([buildPrintHtml()], { type: "text/html" });
    offerFile(blob, safeName(state.plan.lessonTitle) + "-print.html", "Open printable lesson plan (then Print > Save as PDF)");
  }

  /* ---------- Reference upload ---------- */

  async function onRefFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      try {
        var text = "";
        if (/\.pdf$/i.test(f.name)) text = await readPdf(f);
        else text = await f.text();
        text = String(text || "").slice(0, 30000);
        state.refs.push({ name: f.name, text: text });
      } catch (err) { toast("Could not read " + f.name + ": " + err.message); }
    }
    e.target.value = "";
    renderRefs();
  }

  async function readPdf(file) {
    if (typeof pdfjsLib === "undefined") throw new Error("PDF reader did not load. Upload a .txt file instead.");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
    var buf = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    var out = [];
    for (var p = 1; p <= Math.min(pdf.numPages, 40); p++) {
      var page = await pdf.getPage(p);
      var tc = await page.getTextContent();
      out.push(tc.items.map(function (it) { return it.str; }).join(" "));
    }
    return out.join("\n");
  }

  function renderRefs() {
    var box = $("refList");
    box.innerHTML = "";
    if (!state.refs.length) { box.appendChild(el("div", { class: "muted small", text: "No reference uploaded. The AI will use standard textbooks, the DepEd curriculum guide, exemplars, and reputable sources, and mark each reference to verify." })); return; }
    state.refs.forEach(function (r) { box.appendChild(el("div", { class: "ref-item", text: "📄 " + r.name + " (" + Math.round(r.text.length / 1000) + " thousand characters read)" })); });
  }

  /* ---------- PPT (native, editable slides built from the plan; no extra AI requests) ---------- */

  var PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  var FONT_HEAD = "Arial Black", FONT_BODY = "Calibri";

  function toBase64(buf) {
    var bytes = new Uint8Array(buf), out = "";
    for (var i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(out);
  }

  // Slides on this deck, for the detailed view, the Word outline, and the preview.
  function sessionOutline(sessionNo) {
    if (!state.plan || !state.meta) return [];
    return ILAW.buildSlideSpec(state.meta, state.plan, { includeReferences: false, includeWaysForward: false, includeDeclaration: false }).slides
      .filter(function (x) { return x.session === sessionNo; });
  }

  function slideSpec(opts) {
    return ILAW.buildSlideSpec(state.meta, state.plan, opts);
  }

  function slideOptions() {
    return {
      theme: $("pptTheme").value, hook: $("pptHook").value.trim(),
      includeReferences: $("pptRefs").checked, includeWaysForward: $("pptWays").checked, includeDeclaration: $("pptDecl").checked,
      declarationShort: state.declaration.split("\n")[0]
    };
  }

  function renderSlidePreview() {
    var box = $("slidePreview");
    box.innerHTML = "";
    if (!state.plan) return;
    var spec = slideSpec(slideOptions());
    box.appendChild(el("div", { class: "muted small", text: spec.slides.length + " slides. Preview (titles only; open the .pptx to see the design):" }));
    var grid = el("div", { class: "slide-grid deck" });
    spec.slides.forEach(function (s) {
      grid.appendChild(el("div", { class: "slide-thumb deck-thumb", style: "border-top:6px solid #" + spec.theme.primary }, [
        el("div", { class: "slide-no", text: String(s.index) }),
        el("div", { class: "slide-title", text: s.title }),
        el("div", { class: "muted small", text: s.layout })
      ]));
    });
    box.appendChild(grid);
  }

  // Fetches each slide photo once and turns it into a data URL the PowerPoint file carries.
  async function photoDataUrls(spec) {
    var out = {};
    for (var i = 0; i < spec.slides.length; i++) {
      var ph = spec.slides[i].photo;
      if (!ph || out[ph.thumb] !== undefined) continue;
      var buf = await imageBytes(ph.thumb);
      out[ph.thumb] = buf ? "data:image/" + (ph.type === "png" ? "png" : "jpeg") + ";base64," + toBase64(buf) : null;
    }
    return out;
  }

  // Decorative atom: three orbits and electrons, drawn as shapes (editable, no image file needed).
  function atomGraphic(sl, P, t, cx, cy) {
    var a = 2.5, b = 1.0;
    [0, 60, -60].forEach(function (rot) {
      sl.addShape(P.OVAL, { x: cx - a, y: cy - b, w: 2 * a, h: 2 * b, rotate: rot, fill: { color: "FFFFFF", transparency: 100 }, line: { color: t.primary, width: 2 } });
      [0, 120, 240].forEach(function (deg) {
        var r = deg * Math.PI / 180, x = a * Math.cos(r), y = b * Math.sin(r), th = rot * Math.PI / 180;
        var X = cx + x * Math.cos(th) - y * Math.sin(th), Y = cy + x * Math.sin(th) + y * Math.cos(th);
        sl.addShape(P.OVAL, { x: X - 0.17, y: Y - 0.17, w: 0.34, h: 0.34, fill: { color: t.accent }, line: { color: "FFFFFF", width: 1 } });
      });
    });
    sl.addShape(P.OVAL, { x: cx - 0.42, y: cy - 0.42, w: 0.84, h: 0.84, fill: { color: t.primary }, line: { color: "FFFFFF", width: 2 } });
    sl.addShape(P.OVAL, { x: cx - 0.2, y: cy - 0.3, w: 0.4, h: 0.4, fill: { color: t.accent }, line: { color: "FFFFFF", width: 1 } });
  }

  function badge(sl, P, x, y, d, text, fill, color, size) {
    sl.addShape(P.OVAL, { x: x, y: y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
    sl.addText(text, { x: x, y: y, w: d, h: d, align: "center", valign: "middle", fontFace: FONT_HEAD, fontSize: size || 16, bold: true, color: color || "FFFFFF", margin: 0 });
  }

  function cardShape(sl, P, x, y, w, h, t) {
    sl.addShape(P.ROUNDED_RECTANGLE, { x: x, y: y, w: w, h: h, rectRadius: 0.12, fill: { color: "FFFFFF" }, line: { color: t.primary, width: 1.25 } });
  }

  function slideHeader(sl, P, s, t) {
    var txt = String(s.title || "").toUpperCase();
    sl.addText(txt, { x: 0.7, y: 0.4, w: 11.9, h: 0.9, fontFace: FONT_HEAD, fontSize: ILAW.fitFont(txt, 11.9, 0.9, 30, 18, 0.62), bold: true, color: t.primary, valign: "middle", margin: 0 });
    sl.addShape(P.RECTANGLE, { x: 0.7, y: 1.36, w: 1.3, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });
  }

  function slideFooter(sl, s, t) {
    var credit = s.credit || "";
    var photo = s.photo ? "Photo: Wikimedia Commons, " + s.photo.title + (s.photo.license ? " (" + s.photo.license + ")" : "") + (s.photo.artist ? ", " + s.photo.artist : "") : "";
    sl.addText([credit, photo].filter(Boolean).join("   |   "), { x: 0.7, y: 6.98, w: 11.0, h: 0.32, fontFace: FONT_BODY, fontSize: 9, color: t.muted, margin: 0 });
    sl.addText(String(s.index), { x: 12.0, y: 6.98, w: 0.6, h: 0.32, fontFace: FONT_BODY, fontSize: 10, color: t.muted, align: "right", margin: 0 });
  }

  // Title, session start, and closing slides.
  function drawCover(sl, P, s, t, photos) {
    if (s.session) {
      sl.addShape(P.ROUNDED_RECTANGLE, { x: 0.8, y: 1.05, w: 2.6, h: 0.5, rectRadius: 0.25, fill: { color: t.accent }, line: { color: t.accent } });
      sl.addText("SESSION " + s.session, { x: 0.8, y: 1.05, w: 2.6, h: 0.5, align: "center", valign: "middle", fontFace: FONT_BODY, fontSize: 14, bold: true, color: "FFFFFF", margin: 0 });
    }
    var title = String(s.title || "").toUpperCase();
    sl.addText(title, { x: 0.8, y: 1.8, w: 6.8, h: 2.5, fontFace: FONT_HEAD, fontSize: ILAW.fitFont(title, 6.8, 2.5, 44, 24, 0.62), bold: true, color: t.primary, valign: "bottom", margin: 0 });
    sl.addShape(P.RECTANGLE, { x: 0.8, y: 4.5, w: 1.4, h: 0.07, fill: { color: t.accent }, line: { color: t.accent } });
    if (s.subtitle) sl.addText(s.subtitle, { x: 0.8, y: 4.75, w: 6.8, h: 0.7, fontFace: FONT_BODY, fontSize: ILAW.fitFont(s.subtitle, 6.8, 0.7, 20, 13), color: t.text, valign: "top", margin: 0 });
    if (s.footer) sl.addText(s.footer, { x: 0.8, y: 5.55, w: 6.8, h: 0.9, fontFace: FONT_BODY, fontSize: ILAW.fitFont(s.footer, 6.8, 0.9, 16, 11), color: t.muted, valign: "top", margin: 0 });
    var dataUrl = s.photo ? photos[s.photo.thumb] : null;
    cardShape(sl, P, 8.05, 0.95, 4.8, 4.8, t);
    if (dataUrl) {
      sl.addImage({ data: dataUrl, x: 8.3, y: 1.2, w: 4.3, h: 4.3, rounding: true, sizing: { type: "cover", w: 4.3, h: 4.3 } });
    } else {
      atomGraphic(sl, P, t, 10.45, 3.35);
    }
  }

  function drawCards(sl, P, s, t) {
    var items = s.items || [], n = Math.max(1, items.length), gap = 0.18;
    var h = Math.min(1.2, (4.95 - gap * (n - 1)) / n);
    items.forEach(function (it, i) {
      var y = 1.75 + i * (h + gap);
      cardShape(sl, P, 0.7, y, 11.9, h, t);
      badge(sl, P, 0.95, y + (h - 0.7) / 2, 0.7, it.badge, t.primary, "FFFFFF", it.badge.length > 1 ? 13 : 18);
      if (it.head) sl.addText(it.head.toUpperCase(), { x: 1.95, y: y + 0.06, w: 10.4, h: 0.28, fontFace: FONT_BODY, fontSize: 11, bold: true, color: t.muted, margin: 0 });
      var top = it.head ? 0.34 : 0.06;
      sl.addText(it.text, { x: 1.95, y: y + top, w: 10.4, h: h - top - 0.06, fontFace: FONT_BODY, fontSize: ILAW.fitFont(it.text, 10.4, h - top - 0.06, 22, 12), color: t.text, valign: "middle", margin: 0 });
    });
  }

  function drawChevrons(sl, P, s, t) {
    var steps = s.steps || [], n = Math.max(1, steps.length), w = 11.9 / n;
    steps.forEach(function (st, i) {
      var x = 0.7 + i * w;
      sl.addShape(i === 0 ? P.PENTAGON : P.CHEVRON, { x: x, y: 1.9, w: w + 0.12, h: 1.1, fill: { color: i % 2 ? t.accent : t.primary }, line: { color: "FFFFFF", width: 1 } });
      sl.addText(st.label, { x: x + (i === 0 ? 0.05 : 0.35), y: 1.9, w: w - 0.5, h: 1.1, align: "center", valign: "middle", fontFace: FONT_HEAD, fontSize: ILAW.fitFont(st.label, w - 0.5, 0.6, 15, 9, 0.62), bold: true, color: "FFFFFF", margin: 0 });
      sl.addText(st.sub, { x: x + 0.1, y: 3.15, w: w - 0.2, h: 0.5, align: "center", fontFace: FONT_BODY, fontSize: 12, color: t.muted, margin: 0 });
    });
    cardShape(sl, P, 0.7, 4.15, 11.9, 2.5, t);
    sl.addText("MAIN ACTIVITY", { x: 1.0, y: 4.35, w: 11.3, h: 0.35, fontFace: FONT_BODY, fontSize: 14, bold: true, color: t.primary, margin: 0 });
    var act = s.footer || "(the teacher describes the main activity in the plan)";
    sl.addText(act, { x: 1.0, y: 4.8, w: 11.3, h: 1.7, fontFace: FONT_BODY, fontSize: ILAW.fitFont(act, 11.3, 1.7, 22, 13), color: t.text, valign: "top", margin: 0 });
  }

  function drawPhase(sl, P, s, t) {
    var kick = String(s.kicker || "").toUpperCase();
    sl.addShape(P.ROUNDED_RECTANGLE, { x: 0.7, y: 1.7, w: Math.min(7.5, 1.2 + kick.length * 0.13), h: 0.5, rectRadius: 0.25, fill: { color: t.accent }, line: { color: t.accent } });
    sl.addText(kick, { x: 0.85, y: 1.7, w: Math.min(7.5, 1.2 + kick.length * 0.13) - 0.3, h: 0.5, valign: "middle", fontFace: FONT_BODY, fontSize: 13, bold: true, color: "FFFFFF", margin: 0 });
    cardShape(sl, P, 0.7, 2.45, 5.85, 3.35, t);
    cardShape(sl, P, 6.75, 2.45, 5.85, 3.35, t);
    sl.addText("TEACHER DOES", { x: 1.0, y: 2.65, w: 5.3, h: 0.35, fontFace: FONT_BODY, fontSize: 14, bold: true, color: t.primary, margin: 0 });
    sl.addText("LEARNERS DO", { x: 7.05, y: 2.65, w: 5.3, h: 0.35, fontFace: FONT_BODY, fontSize: 14, bold: true, color: t.accent, margin: 0 });
    sl.addText(s.teacher || "", { x: 1.0, y: 3.1, w: 5.3, h: 2.5, fontFace: FONT_BODY, fontSize: ILAW.fitFont(s.teacher || "", 5.3, 2.5, 20, 12), color: t.text, valign: "top", margin: 0 });
    sl.addText(s.students || "", { x: 7.05, y: 3.1, w: 5.3, h: 2.5, fontFace: FONT_BODY, fontSize: ILAW.fitFont(s.students || "", 5.3, 2.5, 20, 12), color: t.text, valign: "top", margin: 0 });
    cardShape(sl, P, 0.7, 6.0, 11.9, 0.75, t);
    sl.addText("Materials: " + (s.materials || "(none listed)"), { x: 1.0, y: 6.05, w: 11.3, h: 0.65, fontFace: FONT_BODY, fontSize: ILAW.fitFont("Materials: " + (s.materials || ""), 11.3, 0.65, 15, 11), color: t.text, valign: "middle", margin: 0 });
  }

  function drawQuestion(sl, P, s, t) {
    cardShape(sl, P, 0.9, 1.9, 11.5, 3.7, t);
    badge(sl, P, 1.25, 2.25, 0.9, "?", t.accent, "FFFFFF", 28);
    sl.addText(s.question || "", { x: 2.5, y: 2.2, w: 9.6, h: 3.1, fontFace: FONT_BODY, fontSize: ILAW.fitFont(s.question || "", 9.6, 3.1, 34, 18, 0.5), color: t.text, valign: "middle", margin: 0 });
    if (s.hint) {
      sl.addShape(P.ROUNDED_RECTANGLE, { x: 0.9, y: 5.9, w: 11.5, h: 0.8, rectRadius: 0.12, fill: { color: t.primary }, line: { color: t.primary } });
      sl.addText("Follow-up: " + s.hint, { x: 1.15, y: 5.9, w: 11.0, h: 0.8, fontFace: FONT_BODY, fontSize: ILAW.fitFont("Follow-up: " + s.hint, 11.0, 0.8, 16, 11), color: "FFFFFF", valign: "middle", margin: 0 });
    }
  }

  function drawPhoto(sl, P, s, t, photos) {
    var dataUrl = s.photo ? photos[s.photo.thumb] : null;
    if (dataUrl) sl.addImage({ data: dataUrl, x: 0.7, y: 1.7, w: 7.4, h: 4.95, sizing: { type: "cover", w: 7.4, h: 4.95 } });
    else cardShape(sl, P, 0.7, 1.7, 7.4, 4.95, t);
    cardShape(sl, P, 8.4, 1.7, 4.2, 4.95, t);
    sl.addText("WHAT TO NOTICE", { x: 8.7, y: 1.95, w: 3.7, h: 0.35, fontFace: FONT_BODY, fontSize: 14, bold: true, color: t.accent, margin: 0 });
    var cap = s.caption || "";
    sl.addText(cap, { x: 8.7, y: 2.4, w: 3.7, h: 4.0, fontFace: FONT_BODY, fontSize: ILAW.fitFont(cap, 3.7, 4.0, 22, 12), color: t.text, valign: "top", margin: 0 });
  }

  function drawList(sl, P, s, t) {
    cardShape(sl, P, 0.7, 1.75, 11.9, 4.9, t);
    var items = s.items || [], joined = items.join("\n");
    var size = ILAW.fitFont(joined, 11.3, 4.5, s.small ? 14 : 22, 10, 0.5);
    sl.addText(items.map(function (x) { return { text: x, options: { bullet: true, breakLine: true } }; }), {
      x: 1.0, y: 1.95, w: 11.3, h: 4.5, fontFace: FONT_BODY, fontSize: size, color: t.text, valign: "top", paraSpaceAfter: 6, margin: 0
    });
  }

  async function buildPptx(spec) {
    var pres = new PptxGenJS();
    pres.layout = "LAYOUT_WIDE";   // 13.33 x 7.5 in, 16:9
    pres.author = "John Lee D. Peñarubia (J.L.D.P)";
    pres.company = "ILAW LP by J.L.D.P";
    pres.title = state.plan ? state.plan.lessonTitle : "ILAW lesson";
    pres.subject = "ILAW lesson slides";
    var t = spec.theme, P = pres.shapes, photos = await photoDataUrls(spec);
    spec.slides.forEach(function (s) {
      var sl = pres.addSlide();
      sl.background = { color: t.secondary };
      if (s.notes) sl.addNotes(s.notes);
      if (s.layout === "title" || s.layout === "section" || s.layout === "closing") {
        drawCover(sl, P, s, t, photos);
      } else {
        slideHeader(sl, P, s, t);
        if (s.layout === "cards" || s.layout === "practice") drawCards(sl, P, s, t);
        else if (s.layout === "chevrons") drawChevrons(sl, P, s, t);
        else if (s.layout === "phase") drawPhase(sl, P, s, t);
        else if (s.layout === "question") drawQuestion(sl, P, s, t);
        else if (s.layout === "photo") drawPhoto(sl, P, s, t, photos);
        else drawList(sl, P, s, t);
      }
      slideFooter(sl, s, t);
    });
    var ab = await pres.write({ outputType: "arraybuffer" });
    // A .pptx is a zip whose entries are readable names; check the parts PowerPoint needs before offering it.
    var head = "", view = new Uint8Array(ab);
    for (var k = 0; k < view.length; k += 0x8000) head += String.fromCharCode.apply(null, view.subarray(k, k + 0x8000));
    if (head.indexOf("ppt/presentation.xml") === -1 || head.indexOf("[Content_Types].xml") === -1) throw new Error("the PowerPoint package was not built correctly");
    return new Blob([ab], { type: PPTX_MIME });
  }

  async function onPpt() {
    if (!state.plan) return;
    if (typeof PptxGenJS === "undefined") { toast("The PowerPoint library did not load. Check the vendor folder."); return; }
    syncDeclaration();
    busy(true, "Finding photos on Wikimedia Commons…");
    try {
      await resolvePlanPhotos();
      busy(true, "Building the slides…");
      var spec = slideSpec(slideOptions());
      var blob = await buildPptx(spec);
      busy(false);
      offerFile(blob, safeName(state.plan.lessonTitle) + ".pptx", "Download PowerPoint (.pptx)");
      $("pptStatus").textContent = "PowerPoint ready: " + spec.slides.length + " editable slides (" + spec.theme.label + "). Double-click the .pptx to open it in PowerPoint. Do not unzip it.";
      renderSlidePreview();
    } catch (err) { busy(false); $("pptStatus").textContent = "Could not create the slides: " + err.message; }
  }

  // Token estimate shown above the Generate button. Estimates only; real use depends on the provider.
  function updateEstimate() {
    var box = $("estimate");
    if (!box) return;
    try {
      var u = ILAW.estimateUsage(ILAW.sanitizeMeta(readForm()));
      box.textContent = "Estimated AI use for this plan: " + u.requests + " requests (1 overview + 1 per session), about " + Math.round(u.total / 1000) + "k tokens in total. The slides are built on your device and add no requests.";
    } catch (e) { box.textContent = ""; }
  }

  /* ---------- Init ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    try { buildSetup(); }
    catch (e) { toast("Setup error: " + e.message); console.error(e); }
  });
  document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("input", updateEstimate);
    document.addEventListener("change", updateEstimate);
    updateEstimate();
  });
})();
