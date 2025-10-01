# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ResumeForge AI is a framework-free, data-driven resume builder that combines HTML/CSS/vanilla JavaScript with GPT-5 AI tailoring. Candidate details live in `assets/data/candidate.json`, the UI renders them dynamically, and the GPT-5 Responses API can rewrite the dataset to target specific job descriptions.

## Development Commands

**Run local server:**
```bash
npx http-server . --port 5500
```
Or use Python if Node is unavailable:
```bash
python -m http.server 5500
```

**Format code before PRs:**
```bash
npx prettier@latest index.html assets/**/*.js assets/**/*.css --check
npx prettier@latest index.html assets/**/*.js assets/**/*.css --write  # to fix
```

**Run Lighthouse audit:**
```bash
npx lighthouse http://localhost:5500
```

## Architecture

### Data Flow
1. **Single Source of Truth**: `assets/data/candidate.json` contains all resume data (profile, contact, skills, experience, certificates, education, technologies)
2. **Rendering**: `main.js` (lines 176-232) fetches the JSON, stores it in `state.base` and `state.current`, then renders all sections via collection renderers
3. **AI Tailoring**: User provides API key + job description → GPT-5 Responses API generates tailored JSON → normalized and re-rendered
4. **PDF Export**: `html2pdf.js` generates PDF from the rendered `#area-cv` element with dynamic dimensions based on content height

### Key State Management
- `state.base`: Original resume data loaded from JSON (immutable baseline)
- `state.current`: Currently displayed resume data (mutated during AI tailoring)
- Reset button restores `state.base` to `state.current`

### GPT-5 Integration (`main.js:629-675`)
- **Endpoint**: `https://api.openai.com/v1/responses`
- **Model**: `gpt-5` with `reasoning.effort: "high"` and `text.verbosity: "medium"`
- **Critical**: Do NOT use legacy parameters (`temperature`, `top_p`) - they are ignored by GPT-5
- Response parsing handles multiple formats: `output_text`, `output[].content[].text`, nested `text.value`, and `result`
- JSON extraction strips markdown code blocks and control characters

### Collection Rendering Pattern
All sections follow the same pattern (lines 240-254):
```javascript
renderCollection(container, items, renderer)
```
Each renderer function (e.g., `renderExperienceItem`, `renderSkillItem`) returns a DOM node that gets appended to the container.

### Theme System
- Dark/light mode toggled via `.dark-theme` class on `<body>`
- Theme preference persisted in `localStorage` with key `resumeforge-ai:dark-mode`
- CSS variables (lines 5-39 in `style.css`) switch automatically
- PDF export respects current theme via `isDarkMode()` check

### PDF Generation (`main.js:781-805`)
- Dynamic page height calculation based on actual content: `pageHeight = (elementHeight * 210) / elementWidth`
- Scale class `.scale-cv` temporarily reduces font sizes during export
- Downloads use theme-specific filenames from `candidate.json` profile.download paths

## File Structure

### Core Files
- `index.html`: Single-page UI with semantic sections (job-tailor, home, profile, skills, languages, experience, etc.)
- `assets/javascripts/main.js`: All application logic in IIFE
- `assets/data/candidate.json`: Resume data schema
- `assets/stylesheets/style.css`: Component styles with CSS variables
- `assets/stylesheets/layout.css`: Print/export scaling rules

### Data Schema (candidate.json)
Top-level keys must remain stable for AI parsing:
- `profile`: fullName, headline, summary, image, download paths
- `contact`: Array of contact items with icon/label/href
- `social`: Array of social links
- `skills`: Array of skill strings or objects with name/level/keywords
- `languages`: Array with name/level/rating (1-5 stars)
- `experience`: Array with title/company/start/end/summary/highlights/technologies
- `certificates`: Array with year/title/honours
- `education`: Array with title/institution/years
- `technologies`: Array with name/icon (CDN URLs)

## Coding Conventions

- **Indentation**: 4 spaces (HTML, CSS, JS)
- **Class naming**: Underscore-heavy (`nav_link`, `home_icon`, `experience_rounder`)
- **CSS custom properties**: kebab-case (e.g., `--title-color`)
- **JavaScript**: camelCase, prefer `const`, cache DOM queries early
- **localStorage keys**: Namespaced with `resumeforge-ai:` prefix

## Testing

**Manual test checklist:**
1. Dark/light theme toggle and persistence across page reloads
2. Mobile menu collapse/expand (<768px)
3. Scroll-spy navigation highlighting
4. Desktop PDF export (verify filename and theme match)
5. Mobile download button href swap based on theme
6. AI Tailor flow: paste API key + job description → verify tailored resume renders
7. Reset button restores original profile
8. Keyboard navigation (nav links, scroll-to-top)

**Browser targets:** Chrome, Firefox, Safari (desktop + responsive views)

## AI Tailor Workflow

1. User pastes OpenAI API key (stored in `localStorage` only - never commit)
2. User pastes job description (min 40 chars)
3. `buildTailorPrompt()` (lines 677-693) sends base resume + job description with strict JSON formatting instructions
4. GPT-5 returns tailored JSON matching original schema
5. `normalizeResume()` (lines 744-765) merges AI response with base data
6. UI re-renders with tailored content
7. User can reset or export PDF

**Production note:** Use server-side proxy for API key management; localStorage approach is for demo/local use only.

## Assets & Configuration

- **Profile images**: Update `assets/pictures/profile.png` and reference in candidate.json
- **PDF paths**: `assets/pdf/myResumeCV-light.pdf` and `myResumeCV-dark.pdf` (update download config in candidate.json)
- **html2pdf.js**: v0.9.3 bundled in `assets/javascripts/` (version noted in index.html line 172)
- **Icons**: Font Awesome kit loaded via CDN (index.html line 12)
- **Technology icons**: devicons CDN URLs in candidate.json technologies array

## Important Notes

- **Security**: Never commit API keys. Implement server-side proxy for production.
- **Schema stability**: Keep candidate.json top-level keys consistent so GPT responses remain parseable.
- **GPT-5 parameters**: Use `reasoning.effort` and `text.verbosity`; do NOT use `temperature` or `top_p`.
- **PDF dynamic sizing**: Recent change (commit b9f192e) calculates page height from content instead of fixed A4 to prevent cutoff.
