/*global chrome*/

const NEW_TAB_URL = 'chrome://newtab/';
const NEW_TAB_URL_EDGE = 'edge://newtab/';



chrome.tabs.onCreated.addListener((tab) => {
    chrome.storage.session.get(['tabParentMap'], (ret) => {
        let tabParentMap = ret.tabParentMap || {};
        var isNewTab = tab => {
            if (tab.url === NEW_TAB_URL) {
                return true;
            }
            if (tab.url === NEW_TAB_URL_EDGE) {
                return true;
            }
            if (!tab.pendingUrl || tab.pendingUrl === NEW_TAB_URL || tab.pendingUrl === NEW_TAB_URL_EDGE) {
                return true;
            }
        };
        if (!isNewTab(tab)) {
            tabParentMap[tab.id] = tab.openerTabId;
            chrome.storage.session.set({ tabParentMap });
        }
    })
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        if (tab.url === NEW_TAB_URL || tab.url === NEW_TAB_URL_EDGE) {
            chrome.storage.session.get(['tabParentMap'], (ret) => {
                let tabParentMap = ret.tabParentMap || {};
                if (tab.url === NEW_TAB_URL || tab.url === NEW_TAB_URL_EDGE) {
                    delete tabParentMap[tab.id];
                    chrome.storage.session.set({ tabParentMap });
                }
            })
        }
    }
})

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.get(['tabParentMap'], (ret) => {
        let tabParentMap = ret.tabParentMap || {};
        delete tabParentMap[tabId];
        chrome.storage.session.set({ tabParentMap });
    })
});