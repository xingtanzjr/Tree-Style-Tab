/*global chrome*/

const NEW_TAB_URL = 'chrome://newtab/';

chrome.tabs.onCreated.addListener((tab) => {
    chrome.storage.session.get(['tabParentMap'], (ret) => {
        let tabParentMap = ret.tabParentMap || {};
        if (tab.url !== NEW_TAB_URL) {
            tabParentMap[tab.id] = tab.openerTabId;
        }
        chrome.storage.session.set({ tabParentMap });
    })
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        if (tab.url === NEW_TAB_URL) {
            chrome.storage.session.get(['tabParentMap'], (ret) => {
                let tabParentMap = ret.tabParentMap || {};
                if (tab.url === NEW_TAB_URL) {
                    delete tabParentMap[tab.id];
                }
                chrome.storage.session.set({ tabParentMap });
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