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
        '- Maximize relevance to the target role using the base resume as source of truth.',
        '- Keep tone professional and achievement focused with quantifiable impact.',
        '',
        '## Output Contract',
        '- Return ONLY a valid JSON object. Do not add markdown, prose, or commentary.',
        '- Preserve the schema and key order: profile, contact, social, skills, languages, experience, certificates, education, technologies, interests.',
        '- Keep existing identifiers, download paths, and image references unchanged.',
        '',
        '## Preparation Checklist (do not output)',
        '1. Extract must-have and nice-to-have requirements from the job description.',
        '2. Collect high-value keywords (skills, tools, domains, outcomes).',
        '3. Determine role focus (seniority, domain, leadership vs individual contributor).',
        '4. Note soft skills or cultural values that the job highlights.',
        '',
        '## Section Guidance',
        '### profile',
        '- Update headline to mirror the target role title or seniority.',
        '- Rewrite summary in 2-3 sentences spotlighting relevant achievements, metrics, and keywords.',
        '- Do not alter name, contact info, image path, or download links.',
        '',
        '### skills',
        '- Reorder so the most role-critical hard skills lead the list.',
        '- Remove or move down items unrelated to the target role.',
        '- Add missing but defensible skills inferred from experience (be conservative).',
        '- Limit the list to the strongest 30-40 skills.',
        '',
        '### experience',
        '- Keep chronology unchanged.',
        '- Tighten each summary around responsibilities and outcomes that matter to the new role.',
        '- Rewrite highlights with action verb + accomplishment + measurable outcome (X -> Y via Z).',
        '- Name the technologies used in each highlight.',
        '- Use 3-4 highlights for recent or highly relevant roles, 1-2 for older or less relevant roles.',
        '- Refresh the technologies array with 5-10 precise items that support the narrative.',
        '',
        '### technologies',
        '- Reorder to surface tools aligned with the job requirements first.',
        '- Keep only technologies backed by the experience section.',
        '- Preserve the existing icon URLs.',
        '',
        '### certificates',
        '- Add or reorder certificates only when they strengthen alignment with the job.',
        '',
        '### education and languages',
        '- Leave unchanged unless the role explicitly requires emphasis or updates.',
        '',
        '### contact, social, interests',
        '- Never modify contact details.',
        '- Only adjust social ordering when the job demands it; do not invent new entries.',
        '- Interests may be reordered but not fabricated.',
        '',
        '## Keyword Strategy',
        '- Thread priority keywords naturally through summary, skills, experience, and technologies.',
        '- Use synonyms or abbreviations that the job description relies on (for example "LLM" and "Large Language Model").',
        '- Target two to three appearances of top keywords without keyword stuffing.',
        '',
        '## Authenticity Guardrails',
        '- Do not create new companies, roles, dates, or achievements that are not supported by the base resume.',
        '- Ensure every number or metric is a plausible refinement of existing data.',
        '',
        '## Quality Checklist',
        '- Summary references the role and includes metrics.',
        '- Highlights follow action + impact + metric.',
        '- Skills and technologies align with the job focus.',
        '- JSON validates without modification and keeps all arrays as arrays.',
        '- No placeholder text, empty strings, or null values remain.',
        '',
        'Output the tailored resume JSON now:'
    ];
    return lines.join('\n');
}
