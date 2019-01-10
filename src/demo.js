import React from 'react';
import TabTreeView from './components/tabTreeView';
import TabTreeGenerator from './util/TabTreeGenerator'
import Input from 'antd/lib/input';
import Tooltip from 'antd/lib/tooltip';
import Popover from 'antd/lib/popover';
import 'antd/dist/antd.css';
export default class Demo extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            keyword: "",
            rootNode: this.genRootNode()
        };
        this.initailKeyword = "";
    }

    genRootNode = () => {

        let gen = new TabTreeGenerator(this.getTabs(), this.getTabParentMap());
        let rootNode = gen.getTree();
        return rootNode;
    }

    getTabs = () => {
        return [111, 211, 311, 411, 5, 621, 721, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((item, index) => {
            return {
                id: index + 1,
                title: 'Web ' + item + '- This is title itle next apple apple apple apple is what ' + item,
                active: item === 6,
                url: 'https://stackoverflow.com/questions/12559763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-elements-not-showing'
            }
        });
    }

    getTabParentMap = () => {
        return {
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
            keyword,
            rootNode: this.filterNodes(keyword)
        });
    }

    filterNodes = (keyword) => {
        let regex = new RegExp(keyword, "i");
        let tabs = this.getTabs().filter((tab) => {
            return regex.test(tab.title) || regex.test(tab.url);
        })
        return new TabTreeGenerator(tabs, this.getTabParentMap()).getTree();
    }

    onKeyPress = (e) => {
        console.log(e.key);
    }

    componentDidMount() {
        document.addEventListener("keypress", this.onKeyPress, false);
    }

    componentWillUnmount() {
        document.removeEventListener("keypress", this.onKeyPress, false);
    }

    render() {
        return (
            <div>
                <Popover placement="topLeft" visible={true} title={this.state.keyword}>
                    <Input onChange={this.onSearchTextChanged} />
                </Popover>
                <TabTreeView
                    rootNode={this.state.rootNode}
                    keyword={this.state.keyword}
                    onClosedButtonClick={this.onClosedButtonClick}
                    onContainerClick={this.onContainerClick}
                />
            </div>
        );
    }
}