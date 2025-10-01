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
        '=== INSTRUCTIONS ===',
        '1. Produce updated resume JSON tailored to the role above.',
        '2. Preserve the schema and key order used in the base resume.',
        '3. Return ONLY raw JSON. Do not wrap in markdown, prose, or commentary.',
        '4. Keep profile image paths, download paths, and personal identifiers unchanged.',
        '',
        '### Tailoring Guidance',
        '- Rewrite `profile.headline` and `profile.summary` to reflect the target role using concise, metric-focused language.',
        '- Reorder `skills` so role-critical skills appear first and merge duplicates when necessary.',
        '- Update `experience` entries to emphasize achievements and technologies relevant to the job requirements.',
        '- Adjust `technologies` to highlight the most important stack elements for the role.',
        '- Leave any sections without applicable updates exactly as provided.',
        '',
        '### Validation Rules',
        '- Ensure every array remains an array (skills, experience, certificates, etc.).',
        '- Omit null or empty strings instead of adding placeholders.',
        '- Verify the JSON parses without modifications on the client.'
    ];

    return lines.join('\n');
}
