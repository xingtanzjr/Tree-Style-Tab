/*global chrome*/

const NEW_TAB_URLS = ['chrome://newtab/', 'edge://newtab/'];

const isNewTabUrl = (url) => NEW_TAB_URLS.includes(url);

// Open onboarding page on first install
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    }
});

// Allow users to open the side panel by clicking the extension icon in side panel menu
// The popup (Alt+Q) remains as the default action click behavior
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error(error));

// Alt+S: Open the side panel
// Note: Chrome does not provide an API to programmatically focus the side panel.
// The user needs to click on the panel once to give it focus, after which
// keyboard shortcuts within the panel will work.
chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'open-side-panel' && tab) {
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
});

chrome.tabs.onCreated.addListener((tab) => {
    chrome.storage.session.get(['tabParentMap'], (ret) => {
        let tabParentMap = ret.tabParentMap || {};
        if (!isNewTabUrl(tab.url)) {
            tabParentMap[tab.id] = tab.openerTabId;
        }
        chrome.storage.session.set({ tabParentMap });
    })
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        if (isNewTabUrl(tab.url)) {
            chrome.storage.session.get(['tabParentMap'], (ret) => {
                let tabParentMap = ret.tabParentMap || {};
                if (isNewTabUrl(tab.url)) {
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