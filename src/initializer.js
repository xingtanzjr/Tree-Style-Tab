/*global chrome*/
class Initializer {

    constructor(chrome) {
        this.chrome = chrome;
    }

    getTablist() {
        return new Promise((resolve) => {
            this.chrome.windows.getCurrent({ populate: true }, (window) => {
                let tabTitles = [];
                window.tabs.forEach(tab => {
                    tabTitles.push(tab);
                });
                resolve(tabTitles);
            });
        });
    }
}

export default Initializer;