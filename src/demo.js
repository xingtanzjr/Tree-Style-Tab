import React from 'react';
import TabTreeView from './components/tabTreeView';
import TabTreeGenerator from './util/TabTreeGenerator'
import Input from 'antd/lib/input';

export default class Demo extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            keyword: "question"
        };
        this.initailKeyword = "question";
    }

    genRootNode = () => {
        let tabs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((item) => {
            return {
                id: item,
                title: 'Web ' + item + '- This is title itle next apple apple apple apple is what ' + item,
                active: item === 6,
                url: 'https://stackoverflow.com/questions/12559763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-elements-not-showing'
            }
        });
        let tabsParentMap = {
            2: 1,
            3: 1,
            4: 1,
            5: 4,
            6: 2,
            7: 2,
            8: 4,
            9: 1,
            11: 9,
            12: 9,
            16: 15,
            18: 16
        };
        let gen = new TabTreeGenerator(tabs, tabsParentMap);
        let rootNode = gen.getTree();
        return rootNode;
    }

    onClosedButtonClick = (tab) => {
        console.log("Closed: " + tab.id);
    }

    onContainerClick = (tab) => {
        console.log("change to: " + tab.id);
    }

    onSearchTextChanged = (e) => {
        let keyword = e.target.value;
        if (e.target.value.length <= 1) {
            keyword = this.initailKeyword;
        }
        this.setState({
            keyword
        });
    }

    render() {
        return (
            <div>
                <Input onChange={this.onSearchTextChanged} />
                <TabTreeView
                    rootNode={this.genRootNode()}
                    keyword={this.state.keyword}
                    onClosedButtonClick={this.onClosedButtonClick}
                    onContainerClick={this.onContainerClick}
                />
            </div>
        );
    }
}