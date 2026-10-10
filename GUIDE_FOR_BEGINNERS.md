# ILAW LP: Beginner's Guide

This guide is for someone who has never built a website. It covers three things: how the AI part works, how to get a Gemini key, and how to put the site online for free.

---

## Part 1: The three ways to use the generator

**A. No AI at all.** Fill in the form and click **Build plan (no AI)**. You get the official ILAW template with your own words in it. The app does not write anything for you. This always works, even offline except for the page itself.

**B. Google Gemini (recommended to start).** Get a key from Google AI Studio. Part 3 below walks you through it.

**C. Other providers.** Groq, OpenRouter, OpenAI (ChatGPT), Anthropic (Claude), or a custom endpoint. Each is in the provider dropdown and needs its own key. Check each provider's current access and billing before you sign up.

---

## Part 2: What an "API key" is, in plain words

An AI model lives on a company's computer. To use it from a website, the website sends your request over the internet and receives the answer back. This is called an **API**.

- The **API key** is your personal password for that service. It tells the company whose account to use.
- **Limits:** most providers limit how many requests a key can make. If you hit the limit on a busy day, wait for it to reset, or use another provider.
- **Your key stays in your browser.** This website has no server and does not store your key. If you tick "Remember my key," it is saved only on the device you are using. Do not share your key with anyone, and do not paste it into a message or a screenshot.
- **Privacy:** Google may use free-tier data to improve its products. Do not put learner names, grades, or other personal information into any AI tool (DepEd Order No. 003, s. 2026). Lesson content is fine.

**Can the generator run without AI?** Yes. Use option A above. The AI only drafts text. The form, the official layout, the Word and PDF files, and the PowerPoint still work without it.

---

## Part 3: Get a Gemini key (about 5 minutes)

1. Open **aistudio.google.com** in your browser.
2. Sign in with a Google account.
3. Click **Get API key** (it may be on the left side menu), then **Create API key**.
4. Choose a project if asked (the default is fine).
5. Copy the key. It is a long string starting with `AIza`.
6. In the ILAW LP app, section 1: choose **Google Gemini (recommended)** as the provider, paste the key into **API key**, and click **Find working models**. Pick a ✓ model from the dropdown (for example **gemini-2.5-flash**).
7. If a model shows ✓, you are ready. If none does, see the troubleshooting list in Part 6.

Google's limits and model names change, so the **Find working models** button is the quickest check. The check uses a few requests from your daily allowance.

**Is Gemini good enough?** Gemini 2.5 Flash handles lesson plans well. Other models may write differently. You review every plan anyway.

**Other providers** (Groq, OpenRouter, OpenAI, Anthropic, or a custom endpoint) are listed in the same dropdown.

---

## Part 4: Use the app

**Step 1: Connect (section 1).**
1. Choose a provider. **Google Gemini (recommended)** is the starting point.
2. Paste your key into **API key**.
3. Click **Find working models**. The app tests the models your key can use and marks the ones that reply with ✓. Pick one from the dropdown.
4. Click **Test the selected model** if you want a quick check.
5. Tick **Remember** boxes only on your own device.

**Step 2: Describe the lesson (section 2).**
- Required: your name, school, subject, grade, number of sessions, the learning competency, and at least one design pattern.
- Everything else is optional. Leave objectives or activities blank and the AI writes them. Mark them as AI drafts for your review.
- **Learners:** tick what applies. The AI builds a learner profile from your ticks and tailors the lesson. Add your real observations only if you have them.
- **Pattern:** pick one or more, or tick "Let the AI decide" to let it choose and explain why. 6Es is the default because Extend belongs in Ways Forward.
- **Reference material:** optional. Upload a .txt, .md, or .pdf of your textbook or curriculum guide. If you upload nothing, the AI draws on standard sources and marks each reference for you to verify. With Gemini you can also tick the web-search box to get current sources.

**Step 3: Draft (the button).** The app makes one overview call, then one call per session. A progress bar shows each step. This can take several minutes for 4 or 5 sessions.

**Step 4: Review (section 3).**
- **Overview (official layout):** one column per session, with the ILAW rows: objectives (Knowledge, Skills, Attitude), pre-lesson routine, lesson flow, resources, integration, formative checks, extended learning, and reflections.
- **Detailed sessions:** the full plan for each session: a minute-by-minute table, the teacher's discussion flow with expected answers, formative questions with answers, any worksheet with its key, slide previews, photo search links, and reflection questions.
- Edit anything. For an AI activity you do not like, press **Regenerate activities** on that session and type what you want. **Undo** goes back.

**Step 5: Declaration (section 4).** Press **Draft with AI** for a one-to-three-line declaration, or **Use the built-in version**. Check it before you use it.

**Step 6: Download (section 5).** Word (.docx), PDF (see below), copy as text, or save JSON to reopen later. Each file also appears as a button under **Downloads**. If your browser blocks the automatic download, click that button.

**Word letterhead and photos.** In section 2, the division, school address, and school email are optional. They appear in the Word file's letterhead only. Paste the official DepEd seal into the box marked "[Paste DepEd seal here]". Photos are real images found on Wikimedia Commons, with their licence and author credited. Check each one before use.

**PDF:** the app creates a printable page. Open it, then press **Print / Save as PDF**.

**Step 7: PowerPoint (section 6).** Choose a theme, then **Create the .pptx**. The slides are built on your device from your plan, so they add no AI requests. The file is a normal PowerPoint you can edit. Double-click it to open in PowerPoint. Do not unzip it. The speaker notes hold the full text and the answers.

**Important:** Read every AI-drafted part and rewrite what does not sound like you or does not fit your learners. The AI is a helper, not the author.

---

## Part 5: Publish the website for free (GitHub Pages)

You need a free GitHub account and about 20 minutes. You do not need to know how to code.

### Step 1: Create a GitHub account
1. Go to **github.com** and click **Sign up**.
2. Choose a username. This becomes part of your web address, so pick something you are happy with (for example `jlpenarubia`).
3. Verify your email.

### Step 2: Create a repository (a folder for your site)
1. After signing in, click the **+** at the top right, then **New repository**.
2. Repository name: `ilaw-lp`
3. Choose **Public** (GitHub Pages is free for public repositories).
4. Tick **Add a README file**, then click **Create repository**.

### Step 3: Upload the website files
1. Unzip `ilaw_lp_app.zip` on your computer. You will get a folder with `index.html`, `css`, `js`, `vendor`, `assets`, and so on.
2. In your new repository, click **Add file**, then **Upload files**.
3. Drag the **contents** of the unzipped folder into the upload box. Make sure `index.html` is at the top level (not inside another folder).
4. Scroll down and click **Commit changes**.

### Step 4: Turn on GitHub Pages
1. In your repository, click **Settings** (top menu).
2. In the left menu, click **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Under **Branch**, choose **main** and **/ (root)**, then click **Save**.
5. Wait 1 to 3 minutes, then refresh the page. It shows your web address, for example `https://jlpenarubia.github.io/ilaw-lp/`.

Open that address on your phone or computer. That is your website. Anyone with the link can use it. Each user adds their own key.

### About a free domain name
- **GitHub's address** (`yourname.github.io/ilaw-lp`) is free and reliable. It is a subdomain, so you do not own the root domain.
- **Free subdomain services** such as is-a.dev or eu.org give you a shorter address. They approve requests manually, so allow several days. Check each service's rules first.
- **A paid domain** (around a few hundred pesos a year) can be pointed at GitHub Pages later, if you want your own name.

---

## Part 6: Troubleshooting

| What you see | What to do |
|---|---|
| "No API key yet" | Paste the key in section 1, or use **Build plan (no AI)**. |
| "Could not reach the provider" | Check your internet. Some browsers or providers block direct calls. Try another provider from the dropdown. |
| "HTTP 401" or "403" | The key is wrong or was copied with extra spaces. Create a new key. |
| "HTTP 404" or "model not found" | The model name changed or is not available to your account. Click **Find working models** and pick a ✓ model. |
| "HTTP 429" or "quota" | You hit the free daily limit. A 4-session plan makes 5 AI calls, so one generation can use a noticeable share of a free allowance. Wait until tomorrow, use another provider, or use a paid plan. |
| The AI reply is not valid JSON | Click **Draft the ILAW plan with AI** again. If it repeats, try a stronger model. |
| The GitHub page is blank or 404 | Check that `index.html` is at the top level of the repository, and that Pages is set to the main branch, root folder. |
| A download did not start | Click the green button under **Downloads**. If that does nothing, open the page in a normal browser tab (not an email or chat preview) and allow downloads. |
| The PowerPoint button does nothing | Make sure the page is open in a normal browser tab. Then click the file under **Downloads**. |
| The PDF window does not open | Allow pop-ups for the page, then try again. |

---

## Part 7: Keeping yourself safe

- Never share your key. If you think it leaked, delete it in your provider's dashboard and create a new one.
- Do not enter learner names, grades, or personal information.
- Review every plan before you teach from it. Verify every reference the AI gives you.
- Use "Remember" only on a device you control.
