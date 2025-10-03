export const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
export const OPENAI_MODEL = 'gpt-5';
export const DEFAULT_IMAGE = 'assets/pictures/profile.png';
export const DARK_THEME_CLASS = 'dark-theme';
export const DATA_PATH = 'assets/data/candidate.json';
export const MAX_OUTPUT_TOKENS = 20000;
export const MIN_JOB_DESCRIPTION_LENGTH = 40;
export const NAV_SECTION_OFFSET = 50;
export const SCROLL_TOP_THRESHOLD = 200;

export const STORAGE_KEYS = Object.freeze({
    apiKey: 'resumeforge-ai:openai-api-key',
    jobNotes: 'resumeforge-ai:job-details',
    extraInstructions: 'resumeforge-ai:extra-instructions',
    darkMode: 'resumeforge-ai:dark-mode'
});

export const DOWNLOAD_FALLBACKS = Object.freeze({
    light: 'assets/pdf/myResumeCV-light.pdf',
    dark: 'assets/pdf/myResumeCV-dark.pdf'
});
