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

chrome.tabs.onRemoved.addListener((tab) => {
    // setBadge();cosmetic 
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    this.activeTabId = activeInfo.tabId;
})

function setBadge() {
    chrome.windows.getCurrent({ populate: true }, (window) => {
        let tabCount = window.tabs.length;
        if (tabCount > 15) {
            chrome.browserAction.setBadgeText({ text: '' + tabCount });
            chrome.browserAction.setBadgeBackgroundColor({ color: '#4688F1' });
        } else {
            chrome.browserAction.setBadgeText({ text: '' });
        }
    })
}