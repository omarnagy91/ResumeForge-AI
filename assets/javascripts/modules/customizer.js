import { MIN_JOB_DESCRIPTION_LENGTH, STORAGE_KEYS } from './constants.js';
import { requestTailoredResume, requestCoverLetter } from './openaiClient.js';
import { normalizeResume } from './resumeRenderer.js';

export function createCustomizer({ selectors, state, storage, renderResume, statusReporter }) {
    const {
        apiKeyInput,
        jobInput,
        extraInstructions,
        customizeButton,
        coverLetterButton,
        resetButton,
        coverLetterContainer,
        coverLetterOutput,
        coverLetterCopyButton
    } = selectors;

    const init = () => {
        if (!jobInput) {
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

        const storedExtras = storage.get(STORAGE_KEYS.extraInstructions);
        if (storedExtras && extraInstructions) {
            extraInstructions.value = storedExtras;
        }

        coverLetterContainer?.setAttribute('hidden', 'hidden');
        coverLetterCopyButton?.setAttribute('disabled', 'disabled');

        apiKeyInput?.addEventListener('change', handleApiKeyChange);
        jobInput.addEventListener('input', handleJobInputChange);
        extraInstructions?.addEventListener('input', handleExtraInstructionsChange);
        customizeButton?.addEventListener('click', handleCustomizeClick);
        coverLetterButton?.addEventListener('click', handleCoverLetterClick);
        resetButton?.addEventListener('click', handleResetClick);
        coverLetterCopyButton?.addEventListener('click', handleCopyCoverLetter);
    };

    const handleApiKeyChange = (event) => {
        storage.set(STORAGE_KEYS.apiKey, event.target.value.trim());
    };

    const handleJobInputChange = (event) => {
        storage.set(STORAGE_KEYS.jobNotes, event.target.value);
    };

    const handleExtraInstructionsChange = (event) => {
        storage.set(STORAGE_KEYS.extraInstructions, event.target.value);
    };

    const handleResetClick = () => {
        if (!state.hasBase()) {
            statusReporter.update('Base resume not loaded yet.', true);
            return;
        }
        const base = state.resetToBase();
        if (base) {
            renderResume(base);
            clearCoverLetter();
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
        clearCoverLetter();
        statusReporter.update('Generating tailored resume with GPT-5...');

        try {
            const snapshot = {
                base: state.getBase(),
                current: state.getCurrent()
            };
            const prompt = buildTailorPrompt(details, snapshot.current || snapshot.base || {}, extraInstructions?.value);
            const tailored = await requestTailoredResume(apiKey, prompt);
            const normalized = normalizeResume(snapshot, tailored);
            renderResume(normalized);
            statusReporter.update('Tailored resume ready. Review and adjust before exporting.');
        } catch (error) {
            console.error('Tailoring failed:', error);
            statusReporter.update(error.message || 'Tailoring failed. Check the browser console for details.', true);
        } finally {
            setCustomizeLoading(false);
        }
    };

    const handleCoverLetterClick = async () => {
        if (state.isCustomizing()) {
            return;
        }
        if (!state.hasBase()) {
            statusReporter.update('Load the base resume before generating a cover letter.', true);
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

        const resumeData = state.getCurrent() || state.getBase() || {};

        setCustomizeLoading(true);
        clearCoverLetter();
        statusReporter.update('Drafting cover letter with GPT-5...');

        try {
            const prompt = buildCoverLetterPrompt(details, resumeData, extraInstructions?.value);
            const letter = await requestCoverLetter(apiKey, prompt);
            renderCoverLetter(letter);
            statusReporter.update('Cover letter ready. Review and copy as needed.');
        } catch (error) {
            console.error('Cover letter generation failed:', error);
            statusReporter.update(error.message || 'Cover letter generation failed. Check the browser console for details.', true);
        } finally {
            setCustomizeLoading(false);
        }
    };

    const handleCopyCoverLetter = async () => {
        if (!coverLetterOutput) {
            return;
        }
        const text = coverLetterOutput.textContent?.trim();
        if (!text) {
            statusReporter.update('Generate a cover letter before copying.', true);
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            statusReporter.update('Cover letter copied to clipboard.');
        } catch (error) {
            console.error('Clipboard copy failed:', error);
            statusReporter.update('Unable to copy automatically. Select the cover letter and copy manually.', true);
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
            const label = state.getCustomizeLabel ? state.getCustomizeLabel() : 'Generate Tailored Resume';
            customizeButton.textContent = isLoading ? 'Generating...' : label;
        }
        if (coverLetterButton) {
            coverLetterButton.disabled = isLoading;
        }
        if (resetButton) {
            resetButton.disabled = isLoading;
        }
        if (jobInput) {
            jobInput.disabled = isLoading;
        }
        if (extraInstructions) {
            extraInstructions.disabled = isLoading;
        }
    };

    const renderCoverLetter = (text) => {
        if (!coverLetterContainer || !coverLetterOutput) {
            return;
        }
        coverLetterOutput.textContent = text.trim();
        coverLetterContainer.hidden = false;
        if (coverLetterCopyButton) {
            coverLetterCopyButton.disabled = false;
        }
    };

    const clearCoverLetter = () => {
        if (coverLetterOutput) {
            coverLetterOutput.textContent = '';
        }
        if (coverLetterContainer) {
            coverLetterContainer.hidden = true;
        }
        if (coverLetterCopyButton) {
            coverLetterCopyButton.disabled = true;
        }
    };

    return {
        init
    };
}

function buildTailorPrompt(jobDetails, resume, additionalInstructions) {
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

    appendAdditionalGuidance(lines, additionalInstructions);
    lines.push('', 'Return a valid JSON object that matches the existing schema.');

    return lines.join('\n');
}

function buildCoverLetterPrompt(jobDetails, resume, additionalInstructions) {
    const resumeJson = JSON.stringify(resume, null, 2);
    const lines = [
        '=== JOB DESCRIPTION ===',
        jobDetails,
        '',
        '=== CANDIDATE RESUME (JSON) ===',
        resumeJson,
        '',
        '=== COVER LETTER INSTRUCTIONS ===',
        '- Draft a concise, professional cover letter tailored to the job description.',
        '- Use only information present in the resume JSON.',
        '- Keep the tone confident, collaborative, and impact driven.',
        '- Structure the letter with an opening, evidence-based middle paragraph(s), and a closing call to action.',
        '- Highlight the most relevant achievements with metrics where possible.',
        '- Address the letter to "Dear Hiring Team," unless the job description provides a specific name.',
        '- Limit the letter to 3-4 short paragraphs and no more than 300 words.',
        '',
        '=== OUTPUT REQUIREMENTS ===',
        '- Return plain text only (no markdown or JSON).',
        '- Separate paragraphs with a single blank line.',
        '- Ensure every claim aligns with the resume data.'
    ];

    appendAdditionalGuidance(lines, additionalInstructions);
    lines.push('', 'Output the cover letter text now:');

    return lines.join('\n');
}

function appendAdditionalGuidance(lines, additionalInstructions) {
    const extra = additionalInstructions ? additionalInstructions.trim() : '';
    if (!extra) {
        return;
    }

    const extras = extra.split(/\n/).map((line) => line.trim()).filter(Boolean);
    if (!extras.length) {
        return;
    }

    lines.push('', '## Additional Guidance');
    lines.push(...extras);
}
