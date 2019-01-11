export default class MockChrome {
    constructor() {
        this.tabs = {
            onUpdated: {
                addListener: (f) => {
                    
                }
            },
            onRemoved: {
                addListener: (f) => {
                    
                }
            },
            remove: (tabId, f) => {
                console.log("remove tab " + tabId);
            },
            update: (tabId, info) => {
                console.log("update tab " + tabId);
            }
        };
    }
}