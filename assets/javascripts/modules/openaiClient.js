import { MAX_OUTPUT_TOKENS, OPENAI_ENDPOINT, OPENAI_MODEL } from './constants.js';

export async function requestTailoredResume(apiKey, prompt) {
    const payload = {
        model: OPENAI_MODEL,
        input: prompt,
        reasoning: { effort: 'high' },
        text: { verbosity: 'high' },
        max_output_tokens: MAX_OUTPUT_TOKENS
    };

    const response = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let message = `OpenAI request failed (${response.status})`;
        try {
            const errorPayload = await response.json();
            message = errorPayload?.error?.message || message;
        } catch (error) {
            // Ignore JSON parse errors when extracting error message.
        }
        throw new Error(message);
    }

    const data = await response.json();

    if (data?.error) {
        const message = data.error?.message || 'OpenAI API error.';
        throw new Error(message);
    }

    if (data?.status === 'incomplete' || data?.incomplete_details) {
        const reason = data?.incomplete_details?.reason || 'incomplete';
        throw new Error(`OpenAI returned an incomplete response (${reason}). Try reducing the job description or lowering max output tokens.`);
    }

    const content = extractResponseText(data);
    if (!content) {
        throw new Error('Empty response from GPT-5.');
    }

    return extractJson(content);
}

export function extractResponseText(payload) {
    if (!payload) {
        return '';
    }

    if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text.trim();
    }

    if (Array.isArray(payload.output)) {
        for (const item of payload.output) {
            if (!item) {
                continue;
            }
            if (typeof item === 'string' && item.trim()) {
                return item.trim();
            }
            if (Array.isArray(item.content)) {
                for (const chunk of item.content) {
                    if (!chunk) {
                        continue;
                    }
                    if (chunk.type === 'output_text') {
                        const nestedValue = chunk.text?.value || chunk.text;
                        if (typeof nestedValue === 'string' && nestedValue.trim()) {
                            return nestedValue.trim();
                        }
                    }
                    if (typeof chunk.text === 'string' && chunk.text.trim()) {
                        return chunk.text.trim();
                    }
                }
            }
        }
    }

    if (typeof payload.result === 'string' && payload.result.trim()) {
        return payload.result.trim();
    }

    return '';
}

export function extractJson(content) {
    const trimmed = content.trim();
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
    const jsonSource = codeBlockMatch ? codeBlockMatch[1] : trimmed;
    const start = jsonSource.indexOf('{');
    const end = jsonSource.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
        throw new Error('Model response did not include a JSON object.');
    }

    const jsonString = jsonSource.slice(start, end + 1);
    const sanitized = jsonString.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    return JSON.parse(sanitized);
}
