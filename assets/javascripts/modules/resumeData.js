import { DATA_PATH } from './constants.js';

export async function loadResumeData() {
    const response = await fetch(DATA_PATH, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to load resume data (${response.status})`);
    }
    return response.json();
}
