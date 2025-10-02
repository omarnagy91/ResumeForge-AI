import { MIN_JOB_DESCRIPTION_LENGTH, STORAGE_KEYS } from './constants.js';
import { requestTailoredResume } from './openaiClient.js';
import { normalizeResume } from './resumeRenderer.js';

export function createCustomizer({ selectors, state, storage, renderResume, statusReporter }) {
    const { apiKeyInput, jobInput, customizeButton, resetButton } = selectors;

    const init = () => {
        if (!customizeButton || !jobInput) {
            return;
        }

        const storedKey = storage.get(STORAGE_KEYS.apiKey);
        if (storedKey && apiKeyInput) {
            apiKeyInput.value = storedKey;
        }

        const storedJob = storage.get(STORAGE_KEYS.jobNotes);
        if (storedJob) {
            jobInput.value = storedJob;
        }

        if (apiKeyInput) {
            apiKeyInput.addEventListener('change', handleApiKeyChange);
        }

        jobInput.addEventListener('input', handleJobInputChange);
        customizeButton.addEventListener('click', handleCustomizeClick);
        if (resetButton) {
            resetButton.addEventListener('click', handleResetClick);
        }
    };

    const handleApiKeyChange = (event) => {
        const value = event.target.value.trim();
        storage.set(STORAGE_KEYS.apiKey, value);
    };

    const handleJobInputChange = (event) => {
        storage.set(STORAGE_KEYS.jobNotes, event.target.value);
    };

    const handleResetClick = () => {
        if (!state.hasBase()) {
            statusReporter.update('Base resume not loaded yet.', true);
            return;
        }
        const base = state.resetToBase();
        if (base) {
            renderResume(base);
            statusReporter.update('Resume reset to the base profile.');
        }
    };

    const handleCustomizeClick = async () => {
        if (state.isCustomizing()) {
            return;
        }
        if (!state.hasBase()) {
            statusReporter.update('Load the base resume before tailoring.', true);
            return;
        }

        const apiKey = resolveApiKey();
        if (!apiKey) {
            statusReporter.update('Enter your OpenAI API key to continue.', true);
            apiKeyInput?.focus();
            return;
        }

        const details = jobInput.value.trim();
        if (details.length < MIN_JOB_DESCRIPTION_LENGTH) {
            statusReporter.update(`Add more job details (at least ${MIN_JOB_DESCRIPTION_LENGTH} characters).`, true);
            jobInput.focus();
            return;
        }

        setCustomizeLoading(true);
        statusReporter.update('Generating tailored resume with GPT-5...');

        try {
            const resumeSnapshot = {
                base: state.getBase(),
                current: state.getCurrent()
            };
            const prompt = buildTailorPrompt(details, resumeSnapshot.current || resumeSnapshot.base || {});
            const tailored = await requestTailoredResume(apiKey, prompt);
            const normalized = normalizeResume(resumeSnapshot, tailored);
            renderResume(normalized);
            statusReporter.update('Tailored resume ready. Review and adjust before exporting.');
        } catch (error) {
            console.error('Tailoring failed:', error);
            statusReporter.update(error.message || 'Tailoring failed. Check the browser console for details.', true);
        } finally {
            setCustomizeLoading(false);
        }
    };

    const resolveApiKey = () => {
        const direct = apiKeyInput ? apiKeyInput.value.trim() : '';
        if (direct) {
            storage.set(STORAGE_KEYS.apiKey, direct);
            return direct;
        }
        const stored = storage.get(STORAGE_KEYS.apiKey);
        return stored.trim();
    };

    const setCustomizeLoading = (isLoading) => {
        state.setCustomizing(isLoading);
        if (customizeButton) {
            customizeButton.disabled = isLoading;
            customizeButton.textContent = isLoading ? 'Generating...' : state.getCustomizeLabel();
        }
        if (resetButton) {
            resetButton.disabled = isLoading;
        }
    };

    return {
        init
    };
}

function buildTailorPrompt(jobDetails, resume) {
    const resumeJson = JSON.stringify(resume, null, 2);
    const lines = [
        '=== JOB DESCRIPTION ===',
        jobDetails,
        '',
        '=== BASE RESUME (JSON) ===',
        resumeJson,
        '',
        '=== TAILORING INSTRUCTIONS ===',
        '',
        '## Primary Objectives',
        '- Maximize resume relevance for the target role, using the base resume as the source of truth.',
        '- Optimize for ATS (Applicant Tracking System) parsing and keyword matching.',
        '- Include only experiences directly pertinent to the desired position.',
        '- Keep the tone professional and achievement-focused, emphasizing quantifiable impact.',
        '',
        '## Output Requirements',
        '- Output ONLY a valid JSON object. Do not include markdown, prose, or commentary.',
        '- Preserve the schema and top-level key order: profile, contact, social, skills, languages, experience, certificates, education, technologies, interests.',
        '- Maintain existing identifiers, download paths, and image references without changes.',
        '',
        'Begin with a concise checklist (3-7 bullets) of what you will do; keep items conceptual, not implementation-level.',
        '',
        'After tailoring the resume, validate that output is correct JSON, adheres to the top-level key order, and all sections comply with the stated requirements before finalizing.',
        '',
        '## Preparation Checklist (do not output)',
        '1. Identify must-have and nice-to-have qualifications from the job description.',
        '2. Gather essential keywords (skills, tools, domains, outcomes, certifications).',
        '3. Clarify the role focus (seniority, domain, leadership vs individual contributor).',
        '4. Note soft skills, company values, and industry-specific terms.',
        '5. Pinpoint ATS-friendly terminology and mandatory qualifications.',
        '',
        '## ATS Optimization Guidelines',
        '- Use exact terms from the job description (e.g., prefer "machine learning" over just "ML").',
        '- Provide both acronyms and full terms (e.g., "AI (Artificial Intelligence)").',
        '- Utilize recognized section headers and formatting for ATS systems.',
        '- Integrate key skills into experience details, not only in lists.',
        '- Align the profile headline with job title keywords when fitting.',
        '- Ensure mission-critical keywords appear in multiple sections (summary, skills, experience).',
        '- Use industry-accepted role titles and terminology.',
        '',
        '## Section-by-Section Guidance',
        '### profile',
        '- Update the headline to reflect the target role title and seniority, if applicable (e.g., "Senior Data Engineer").',
        '- Rewrite the summary (2-3 sentences) to spotlight relevant achievements, metrics, and keywords from the job description.',
        '- Place the most important keywords in the opening sentence.',
        '- Do not change the name, contact information, image path, or download links.',
        '',
        '### skills',
        '- List the most critical hard skills for the target role first (as prioritized by job requirements).',
        '- Remove or deprioritize skills unrelated to the role.',
        '- Add only justifiable, defendable skills that are clearly evidenced in experiences.',
        '- Use exact keywords from the job description.',
        '- Incorporate both technical and soft skills stated in the job posting.',
        '- Limit skills list to the top 30-40, emphasizing relevance.',
        '',
        '## Experience Curation and Adaptation',
        '',
        '### Experience Selection Criteria',
        '- INCLUDE roles that demonstrate:',
        '  * Skills or technologies listed in the job description',
        '  * Transferable skills relevant to the position',
        '  * Industry background matching the target company',
        '  * Leadership or seniority appropriate to the level applied for',
        '  * Experience in similar problem domains',
        '',
        '- EXCLUDE or MINIMIZE roles that:',
        '  * Lack transferable skills relevant to the position',
        '  * Rely on obsolete technologies not required for the role',
        '  * Are too junior for a senior role (can be briefly mentioned)',
        '  * Distract from the central narrative',
        '',
        '- ORDER: Present most recent and most applicable experiences in depth; condense old or less relevant ones.',
        '',
        '### Experience Adaptation Rules',
        '- Keep company names, job titles, and date ranges EXACTLY as shown in the base resume.',
        '- You MAY adjust:',
        '  * Focus and framing of responsibilities for alignment with the target role',
        '  * Order and emphasis of accomplishments to highlight relevance',
        '  * Metrics and numbers, only if they truthfully reflect the same work',
        '  * Technology stack to draw out job-relevant tools',
        '  * Project scope descriptions to underline relevant experience',
        '',
        '- You MAY NOT:',
        '  * Invent new companies, projects, or positions',
        '  * Add non-existent technologies or skills',
        '  * Create achievements or metrics that conflict with verifiable records (e.g., LinkedIn)',
        '  * Change actual dates, company names, or job titles',
        '  * Falsely increase team size figures, revenue, or other verifiable stats',
        '',
        '### Responsible Edits: Examples',
        '- ✓ ACCEPTABLE: "Led team of 5" → "Led cross-functional team of 5 engineers" (adds defensible detail).',
        '- ✓ ACCEPTABLE: "Built data pipeline" → "Architected scalable data pipeline processing 10M+ records daily" (adds scale, if true).',
        '- ✓ ACCEPTABLE: Highlighting use of "Python" for a Python-related role.',
        '- ✗ UNACCEPTABLE: "Frontend developer" → "Led backend infrastructure team" (contradicts evidence).',
        '- ✗ UNACCEPTABLE: Claiming to manage a large team as an individual contributor.',
        '- ✗ UNACCEPTABLE: Listing technologies not demonstrably used in the given role.',
        '',
        '### experience',
        '- Retain the original work chronology.',
        '- For INCLUDED experiences:',
        '  * Focus summaries on responsibilities and outcomes most relevant to the new role.',
        '  * Rewrite highlights using an action + accomplishment + measurable outcome pattern (X → Y via Z).',
        '  * Name specific technologies used, giving priority to those in the job description.',
        '  * Provide 4-6 highlights for recent, highly relevant positions.',
        '  * Offer 2-3 highlights for moderately relevant roles.',
        '  * Include 1-2 highlights or a summary for old or marginally related roles.',
        '  * Update technologies array with 5-10 supporting, specific items.',
        '',
        '- For EXCLUDED experiences:',
        '  * Omit if they add no value.',
        '  * Or, include briefly (company, title, dates) to prevent resume gaps.',
        '',
        '### technologies',
        '- Lead with technologies matching job requirements.',
        '- List only tools that also feature in the experiences.',
        '- Add technologies from the job description only if corroborated by experience.',
        '- Group comparable technologies to improve ATS recognition (e.g., "React, Vue.js, Angular").',
        '- Leave icon URLs as is.',
        '',
        '### certificates',
        '- Position the most role-relevant certifications first.',
        '- Omit unrelated certifications if space is limited.',
        '',
        '### education and languages',
        '- Leave unchanged, unless direct relevance to the role is stated.',
        '- Emphasize pertinent coursework or projects, if clearly aligned with requirements.',
        '',
        '### contact, social, interests',
        '- Do not alter contact details.',
        '- Only reorder or update social links if explicitly required; do not invent new ones.',
        '- You may reorder or condense interests, but never fabricate them.',
        '',
        '## Keyword Use Strategy',
        '- Weave key terms throughout summary, skills, experience, and technologies.',
        '- Use verbatim phrases from the job posting when they factually match your experience.',
        '- Also use synonyms/abbreviations emphasized in the job (e.g., "LLM", "Large Language Model").',
        '- Aim for top keywords to appear 3-5 times naturally across sections, without overstuffing.',
        '- Leverage industry jargon and terminology present in the posting.',
        '- Include both hard and soft skills if required for the role.',
        '',
        '## Authenticity Requirements',
        '- Every claim should be defensible via LinkedIn, references, or background checks.',
        '- Never create new roles, companies, dates, or achievements not present in the base.',
        '- Any data or numbers should derive from plausible refinement, not invention.',
        '- Maintain alignment with public professional profiles.',
        '- If uncertain, choose authenticity over optimization.',
        '',
        '## Final Quality Checklist',
        '- Summary references the job title and includes metrics where possible.',
        '- Highlights use action + impact + metric structure.',
        '- Skills/technologies match job requirements.',
        '- Only pertinent experiences are included or described in detail.',
        '- Keywords from job description are integrated meaningfully.',
        '- Output validates as correct JSON, preserving arrays.',
        '- No placeholders, empty strings, or nulls remain.',
        '- All entries are verifiable and align with LinkedIn.',
        '- Crucial keywords are present in multiple relevant sections.',
        '',
        'Output the tailored resume JSON now:',
        '',
        '## Output Structure',
        '',
        'Return a valid JSON object with these top-level keys, in this order:',
        '1. profile',
        '2. contact',
        '3. social',
        '4. skills',
        '5. languages',
        '6. experience',
        '7. certificates',
        '8. education',
        '9. technologies',
        '10. interests',
        '',
        'Section details:',
        '- If a section is incomplete in the base, omit only subfields you cannot infer; never fabricate.',
        '- If an entire section is absent but defensibly inferred by job description, add only with evidence from other sections.',
        '- Keep all data types the same as the base and ensure list-type fields are arrays (even if empty).',
        '',
        'Expected field format (illustrative):',
        '',
        '{',
        '  "profile": {',
        '    "headline": string,',
        '    "summary": string,',
        '    "image": string (URL, optional),',
        '    "download": string (URL, optional)',
        '    // ...additional fields as present',
        '  },',
        '  "contact": {',
        '    "name": string,',
        '    "email": string,',
        '    "phone": string (optional),',
        '    "location": string (optional)',
        '  },',
        '  "social": [ { "label": string, "url": string } ],',
        '  "skills": [ string ],',
        '  "languages": [ { "language": string, "level": string } ],',
        '  "experience": [',
        '    {',
        '      "company": string,',
        '      "title": string,',
        '      "start": string (YYYY-MM),',
        '      "end": string (YYYY-MM or "Present"),',
        '      "summary": string,',
        '      "highlights": [ string ],',
        '      "technologies": [ string ]',
        '      // ...additional fields as present',
        '    }',
        '  ],',
        '  "certificates": [',
        '    { "name": string, "date": string (YYYY-MM), "authority": string }',
        '  ],',
        '  "education": [',
        '    {',
        '      "institution": string,',
        '      "degree": string,',
        '      "field": string,',
        '      "start": string (YYYY),',
        '      "end": string (YYYY or "Present"),',
        '      // ...additional fields as present',
        '    }',
        '  ],',
        '  "technologies": [',
        '    { "name": string, "icon": string (URL, optional) }',
        '  ],',
        '  "interests": [ string ]',
        '}',
        '',
        '- If a section is empty after tailoring, output an empty array for it.',
        '- Do not add any extra sections or keys.',
        '- If unsure about a type or allowed value, use the form in the base resume.',
        '- Do not include commentary, markdown, or any non-JSON output.'
    ];
    return lines.join('\n');
}
