/**
 * Ghost Browser compatibility helpers.
 *
 * Ghost Browser exposes `chrome.ghostPublicAPI` and per-tab `tab.ghostPublicAPI`.
 * All functions here are no-ops / return null when running in plain Chrome/Chromium,
 * so they are safe to call unconditionally throughout the codebase.
 *
 * Relevant Ghost APIs used:
 *   tab.ghostPublicAPI.identity_id          – string identity ID for the tab
 *   tab.ghostPublicAPI.workspace_id         – string workspace ID for the tab
 *   tab.ghostPublicAPI.is_temporary_identity – boolean
 *   chrome.ghostPublicAPI.openTab({ url, identity, index, active, pinned }, cb)
 *   chrome.ghostPublicAPI.DEFAULT_IDENTITY
 *   chrome.ghostPublicAPI.NEW_TEMPORARY_IDENTITY
 */

/**
 * Sentinel identity ID used internally to represent the Ghost Browser default
 * identity. Ghost Browser sets identity_id to null for default-identity tabs,
 * so we normalise those to this constant so they can be grouped in the tree.
 */
export const GHOST_DEFAULT_IDENTITY = '__ghost_default__';

/**
 * Returns true when the extension is running inside Ghost Browser.
 * Safe to call at any time; never throws.
 */
export function isGhostBrowser() {
    try {
        return typeof chrome !== 'undefined' && typeof chrome.ghostPublicAPI !== 'undefined';
    } catch {
        return false;
    }
}

/**
 * Extract Ghost identity/workspace metadata from a raw Chrome tab object.
 * Returns null fields in plain Chrome (no ghostPublicAPI on the tab).
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {{ identityId: string|null, workspaceId: string|null, isTemporary: boolean }}
 */
export function getGhostTabMeta(tab) {
    if (!tab?.ghostPublicAPI) {
        return { identityId: null, workspaceId: null, isTemporary: false };
    }
    return {
        identityId: tab.ghostPublicAPI.identity_id ?? null,
        workspaceId: tab.ghostPublicAPI.workspace_id ?? null,
        isTemporary: tab.ghostPublicAPI.is_temporary_identity ?? false,
    };
}

/**
 * Create a tab, using Ghost's openTab API when an identity is provided.
 * Falls through to chrome.tabs.create for all non-Ghost cases.
 *
 * Pass identity: null/undefined to skip Ghost even in Ghost Browser.
 *
 * @param {object} chromeApi  – The Chrome API instance (real or mock)
 * @param {object} params
 * @param {string}  [params.url]
 * @param {string|null} [params.identity]  – Ghost identity ID; omit for standard creation
 * @param {number}  [params.index]
 * @param {boolean} [params.active]
 * @param {boolean} [params.pinned]
 * @param {number}  [params.windowId]
 * @returns {Promise<chrome.tabs.Tab>}
 */
export async function createTabCompat(chromeApi, params) {
    const { identity, ...rest } = params;

    if (identity && chromeApi?.ghostPublicAPI?.openTab) {
        return new Promise((resolve, reject) => {
            const ghostParams = { identity };
            if (rest.url !== undefined)    ghostParams.url    = rest.url;
            if (rest.index !== undefined)  ghostParams.index  = rest.index;
            if (rest.active !== undefined) ghostParams.active = rest.active;
            if (rest.pinned !== undefined) ghostParams.pinned = rest.pinned;

            chromeApi.ghostPublicAPI.openTab(ghostParams, (tab) => {
                if (chromeApi.runtime?.lastError) {
                    reject(chromeApi.runtime.lastError);
                } else {
                    resolve(tab);
                }
            });
        });
    }

    return chromeApi.tabs.create(rest);
}

/**
 * Fetch Ghost Browser identity info (name, isTemporary) for all known identities.
 * Returns a map of identityId → { id, name, isTemporary }.
 * Returns an empty object in plain Chrome or if the API is unavailable.
 *
 * @param {object} chromeApi
 * @returns {Promise<Object.<string, { id: string, name: string, isTemporary: boolean }>>}
 */
export async function getGhostIdentities(chromeApi) {
    if (!chromeApi?.ghostPublicAPI?.getIdentities) return {};
    return new Promise((resolve) => {
        try {
            chromeApi.ghostPublicAPI.getIdentities((identities) => {
                if (!Array.isArray(identities)) { resolve({}); return; }
                const map = {};
                for (const identity of identities) {
                    if (identity?.id) {
                        map[identity.id] = {
                            id: identity.id,
                            name: identity.name || identity.id,
                            isTemporary: identity.isTemporary || false,
                        };
                    }
                }
                resolve(map);
            });
        } catch {
            resolve({});
        }
    });
}

/**
 * Generate a deterministic HSL color from an identity ID string.
 * Ensures every unique identityId always maps to the same color for UI consistency.
 *
 * @param {string|null} identityId
 * @returns {string} CSS color string
 */
export function getIdentityColor(identityId) {
    if (!identityId) return '#888888';
    let hash = 0;
    for (let i = 0; i < identityId.length; i++) {
        hash = (hash * 31 + identityId.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}
