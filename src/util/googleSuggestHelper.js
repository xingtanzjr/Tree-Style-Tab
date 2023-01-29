import TabTreeNode from './TabTreeNode';

export default class GoogleSuggestHelper {

    genGoogleSuggestRootNode = async (query) => {
        if (!query || query.length === 0) {
            return Promise.resolve(new TabTreeNode());
        }
        return this.fetchGoogleSearchSuggestion(query)
            .then(this.assembleRootNodeBySuggestItems);
    }

    fetchGoogleSearchSuggestion = async (query) => {
        const url = `https://suggestqueries.google.com/complete/search?output=toolbar&q=${query}`;
        return fetch(url)
            .then(this.handleResponse)
            .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
            .then(this.extractSuggestionItems)
            .catch(this.handleRequestError);
        // return Promise.resolve(['test', 'test course', 'test basketball']);
    }

    handleResponse = (response) => {
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return response.text();
    }

    handleRequestError = (res) => {
        return [];
    }

    extractSuggestionItems = (doc) => {
        let suggestionItems = [];
        if (doc.children.length > 0 && doc.children[0].children.length > 0) {
            [...doc.children[0].children].forEach((item) => suggestionItems.push(item.children[0].getAttribute('data')))
        }
        return suggestionItems;
    }

    assembleRootNodeBySuggestItems = (items) => {
        const root = new TabTreeNode();
        items.forEach((item) => {
            let tabTreeNode = new TabTreeNode({
                id: this.getUniqueId(item),
                title: item,
                url: '_____',
                isGoogleSearch: true
            });
            root.children.push(tabTreeNode);
        })
        return root;
    }

    getUniqueId = (item) => {
        return `gg-${item}`;
    }
}