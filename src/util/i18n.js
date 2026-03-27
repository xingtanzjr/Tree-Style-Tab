/**
 * Thin wrapper around chrome.i18n.getMessage.
 * In real extension context, delegates to the Chrome i18n API.
 * Falls back to returning the key itself when API is unavailable (dev/test).
 */
export function t(key, substitutions) {
    try {
        const msg = chrome.i18n.getMessage(key, substitutions);
        return msg || key;
    } catch {
        return key;
    }
}
