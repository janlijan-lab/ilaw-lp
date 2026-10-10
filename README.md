# ILAW LP

A browser app that drafts ILAW lesson plans under DepEd Order No. 016, s. 2026, with a teacher review step, an AI-use declaration, and Word, PDF, and PowerPoint export.

For a step-by-step beginner guide (getting a key, using the app, and publishing on GitHub Pages), open **GUIDE_FOR_BEGINNERS.md**.

ILAW LP by J.L.D.P. Website and generator design: **John Lee D. Peñarubia (J.L.D.P)**.

## Using it
1. **Section 1 (Connect an AI):** choose a provider (Google Gemini is recommended), paste your API key, and click **Find working models**. Pick a ✓ model from the dropdown. Skip this section to use the built-in template with no AI.
2. **Section 2 (Describe the lesson):** required are teacher name, school, subject, grade, sessions (1–5), the learning competency, and at least one design pattern. Optional: the school's division, address, and email (these appear only in the Word letterhead), objectives, real observations, and main activities. Leave any optional field blank and the AI drafts it, marked for your review.
3. **Build the plan:** the app makes one overview call, then one call per session, with a progress bar.
4. **Review (section 3):** check the overview and the detailed sessions. Edit anything. For an AI activity you do not like, use **Regenerate** with a note, and **Undo** to go back.
5. **Declaration (section 4):** draft it with AI or use the built-in version, then check it.
6. **Download (section 5):** Word (.docx), printable PDF page, copy as text, or save JSON. **PowerPoint (section 6):** choose a theme, then create the .pptx. The slides are built from the plan on your device (no extra AI requests), with speaker notes and answers.

## Providers
Listed in this order. Each one needs its own key.
- **Google Gemini (recommended).** Suggested models: `gemini-2.5-flash`, `gemini-3-flash-preview`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`. The check tests only a few models to save your daily allowance.
- **Groq.** Models are listed after a check.
- **OpenRouter.** Many models. Names ending in `:free` are listed first. The check tests up to 8.
- **OpenAI (ChatGPT).** Every chat model on your key is tested; the working ones are listed first, cheaper mini and nano models first.
- **Anthropic (Claude).** Suggested models: `claude-sonnet-5`, `claude-opus-5-5`, `claude-haiku-4-5`. Check the exact IDs in your Anthropic console.
- **Custom OpenAI-compatible endpoint.** Enter the base URL your provider gives you.

Your key stays in your browser. Choose "Remember" only on a device you control.

## Word file and photos
- **Letterhead (Word file only):** Republic of the Philippines, Department of Education, Region V, your division, school name, address, and email. Blank fields show a bracketed reminder. The box marked "[Paste DepEd seal here]" is for you to replace with the official seal image.
- **Photos:** the app searches Wikimedia Commons (free-licensed images) for the photo terms the AI suggests, shows real images with their licence and author, and embeds them in the Word file with a credit line. If nothing suitable is found, it gives a search link instead. Check each image's licence and relevance before use.

## Compliance notes
- Competency is required. Objectives, real observations, and main activities are optional.
- If the AI drafts objectives or activities, a review banner appears, and the declaration says so. DO 016, s. 2026 (para 25a) lists defining objectives and designing learning experiences as core decisions that AI should not make. Rewrite or adopt each AI draft in your own words before teaching with it.
- Real observations are used only when you supply them. Nothing about learners is assumed.
- Do not enter learner names, grades, or other personal data into any AI tool (DO 003, s. 2026).

## Hosting on GitHub Pages (free)
1. Create a free GitHub account, then a **public** repository, for example `ilaw-lp`.
2. Upload the contents of this folder to the repository root (`index.html` must be at the root).
3. Repository **Settings → Pages**: set the source to the `main` branch, folder `/ (root)`, and save.
4. Your site will be at `https://<your-username>.github.io/ilaw-lp/`, with HTTPS included.

Free address options:
- **GitHub Pages** (`username.github.io`): no card, reliable for a static site. It is a subdomain, so you do not own the root domain.
- **is-a.dev** or **eu.org**: free developer subdomains, requested through a GitHub pull request or form. Approval can take days. Check each service's current rules before relying on one.
- A paid custom domain can be pointed at GitHub Pages later.

Because the site has no server and stores no keys, hosting it publicly is safe. Each teacher uses their own key.

## Files
- `index.html`: the page.
- `css/style.css`: styles.
- `js/core.js`: pure logic (prompts, validation, plan shape, declaration, slide spec, provider requests, letterhead, photo search). Tested.
- `js/app.js`: page logic (forms, AI calls, editing, exports, photo lookup).
- `vendor/`: docx 8.5.0, PptxGenJS 3.12.0, and pdf.js, bundled so exports work offline.
- `assets/logo.svg`: the ILAW LP logo.
- `tests/test_core.js`: unit tests (`node tests/test_core.js`).

## Limits
- The AI's output depends on the inputs. Review every part. Verify every reference.
- Some providers block direct browser calls (CORS). Test the model check first. The app cannot change a provider's rules.
- Photo lookup needs an internet connection. Images are fetched from Wikimedia Commons at download time.
- The DO 003 Annex A wording was not retrieved. The declaration follows DO 003 and DO 016 and DepEd-aligned wording. Check Annex A before using it on official records.
