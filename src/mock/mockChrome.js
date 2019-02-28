export default class MockChrome {
    constructor() {
        this.removeListener = [];
        this.tabs = {
            onUpdated: {
                addListener: (f) => {

                }
            },
            onRemoved: {
                addListener: (f) => {
                    this.removeListener.push(f);
                }
            },
            create: (createInfo, f) => {
                console.log("create tab " + createInfo.url)
            },
            remove: (tabId, f) => {
                console.log("remove tab " + tabId);
                this.removeListener.forEach((listener) => {
                    listener(tabId, "");
                });
            },
            update: (tabId, info) => {
                console.log("update tab " + tabId);
            }
        };
    }
}