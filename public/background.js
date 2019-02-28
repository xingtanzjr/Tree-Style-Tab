/*global chrome*/

const NEW_TAB_URL = 'chrome://newtab/';

chrome.runtime.onInstalled.addListener(() => {
    if (!this.tabParentMap) {
        this.tabParentMap = {};
    }
    // setBadge();
});

chrome.tabs.onCreated.addListener((tab) => {
    if (!this.tabParentMap) {
        this.tabParentMap = {};
    }
    if (tab.url !== NEW_TAB_URL) {
        this.tabParentMap[tab.id] = tab.openerTabId;
    }
    // setBadge();
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    this.activeTabId = activeInfo.tabId;
})