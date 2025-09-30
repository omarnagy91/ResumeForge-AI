<h1 align="center">ResumeForge AI</h1>
<h4 align="center">Open-source resume builder with GPT-5 tailoring</h4>
<p align="center">
  Maintained by <a href="https://omargnagy.com">Omar Nagy</a> &middot; <a href="https://github.com/omarnagy91">@omarnagy91</a>
</p>

## Overview

ResumeForge AI turns a handcrafted HTML/CSS resume into a data-driven experience. Candidate details live in a JSON file, the UI renders those details dynamically, and GPT-5 can rewrite the dataset to target a specific job description. The project stays framework-free, making it easy to host on any static site or embed inside a personal portfolio.

## Feature Highlights

- **Live theming:** Light/dark mode toggle with persisted preference and print-ready layout.
- **Data-driven sections:** Contact info, skills, experience, and more are rendered from `assets/data/candidate.json`.
- **AI tailoring:** Paste a job description and let GPT-5 generate an ATS-friendly variant in seconds.
- **PDF export:** One-click desktop export with `html2pdf.js`, mobile download links, and typography scaling.
- **Fully responsive:** Works on phones, tablets, and desktops without extra tooling.

## Quick Start

1. Clone the repo and install a simple static server (`npm i -g http-server` or use Python).
2. Serve the project: `npx http-server . --port 5500`
3. Visit `http://localhost:5500` and explore the resume UI.
4. Optional: update `assets/data/candidate.json` with your own details. Keep the schema stable so the AI flow continues to parse.

## AI Tailor Workflow

1. Open the **AI Tailor** panel at the top of the page.
2. Paste an OpenAI API key (stored in `localStorage` only) and the target job description.
3. Click **Generate Tailored Resume**. ResumeForge AI calls `https://api.openai.com/v1/responses` with `model: "gpt-5"`, `reasoning.effort: "high"`, and `text.verbosity: "medium"`, asking for JSON that matches the base schema before re-rendering.
4. Use **Reset to Base Profile** to restore the default dataset or refine the JSON by hand.
5. GPT-5 ignores legacy parameters such as `temperature` and `top_p`; adjust the payload in `assets/javascripts/main.js` if you want different reasoning or verbosity defaults.

## Tech Stack

- HTML5, modern CSS, and vanilla JavaScript
- `html2pdf.js` for client-side PDF export
- OpenAI GPT-5 Responses API for AI-enhanced tailoring

## Contact

Questions, ideas, or collaboration requests? Reach out via [omargnagy.com](https://omargnagy.com) or open an issue/PR on [GitHub](https://github.com/omarnagy91).
