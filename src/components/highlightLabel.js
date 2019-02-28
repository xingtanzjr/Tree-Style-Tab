import React from 'react';

export default class HighlightLabel extends React.Component {

    genNormalString(segment, key) {
        return (
            <span key={key}>{segment}</span>
        )
    }

    genKeywordString(segment, key) {
        return (
            <span className="keyword" key={key}>{segment}</span>
        )
    }

    render() {
        if (!this.props.keyword || this.props.keyword.trim() === "") {
            return <div className={this.props.className}>{this.genNormalString(this.props.children)}</div>
        }
        const getKey = (index, value) => {
            return index + '-' + value;
        }

        let regex = new RegExp(this.props.keyword, "ig");
        let matchedKeyword = regex.exec(this.props.children);
        this.segments = this.props.children.split(regex);
        let ret = [], key = 0, length = 0;
        ret.push(this.genNormalString(this.segments[0], getKey(key++, this.segments[0])));
        length += this.segments[0].length;
        for (let i = 1; i < this.segments.length; i++) {
            ret.push(this.genKeywordString(this.props.children.substring(length, length + this.props.keyword.length), getKey(key++, this.props.keyword)));
            // ret.push(this.genKeywordString(matchedKeyword[0], getKey(key++, this.props.keyword)));
            ret.push(this.genNormalString(this.segments[i], getKey(key++, this.segments[i])));
            length += this.props.keyword.length;
            length += this.segments[i].length;
        }
        return (
            <div className={this.props.className}>
                {ret}
            </div>
        );
    }
}
