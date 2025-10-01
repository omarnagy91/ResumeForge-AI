export function createStatusReporter(element) {
    return {
        update(message, isError = false) {
            if (!element) {
                return;
            }
            element.textContent = message;
            element.classList.toggle('customizer_status--error', Boolean(isError));
        }
    };
}
