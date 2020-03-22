import React from 'react';
import LCSUtil from '../util/lcs-util';

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
        const matchRet = LCSUtil.LCS(this.props.children, this.props.keyword);
        if (matchRet.length < this.props.keyword.length) {
            return (
                <div className={this.props.className}>
                    <span>{this.props.children}</span>
                </div>
            );
        }
        const getKey = (index, value) => {
            return index + '-' + value;
        }
        const pathBitMap = LCSUtil.getPath(matchRet.step);
        let mergeMap = [];
        for (let i = 0; i < pathBitMap.length;) {
            let maxSameLen = 1;
            let j = i + 1;
            while (j < pathBitMap.length && pathBitMap[j] === pathBitMap[i]) {
                maxSameLen++;
                i++;
                j++;
            }
            mergeMap.push(maxSameLen);
            i++;
        }
        let ret = [], key = 0, startIdx = 0;
        for (let i = 0; i < mergeMap.length; i++) {
            const value = this.props.children.substring(startIdx, startIdx + mergeMap[i]);
            if (pathBitMap[startIdx] == 0) {
                ret.push(this.genNormalString(value, getKey(key++, value)));
            } else {
                ret.push(this.genKeywordString(value, getKey(key++, value)));
            }
            startIdx += mergeMap[i];
        }
        return (
            <div className={this.props.className}>
                {ret}
            </div>
        );

        // if (!this.props.keyword || this.props.keyword.trim() === "") {
        //     return <div className={this.props.className}>{this.genNormalString(this.props.children)}</div>
        // }

        // try {
        //     let regex = new RegExp(this.props.keyword, "ig");
        //     let matchedKeyword = regex.exec(this.props.children);
        //     this.segments = this.props.children.split(regex);
        //     let ret = [], key = 0, length = 0;
        //     ret.push(this.genNormalString(this.segments[0], getKey(key++, this.segments[0])));
        //     length += this.segments[0].length;
        //     for (let i = 1; i < this.segments.length; i++) {
        //         ret.push(this.genKeywordString(this.props.children.substring(length, length + matchedKeyword[0].length), getKey(key++, this.props.keyword)));
        //         // ret.push(this.genKeywordString(matchedKeyword[0], getKey(key++, this.props.keyword)));
        //         ret.push(this.genNormalString(this.segments[i], getKey(key++, this.segments[i])));
        //         length += matchedKeyword[0].length;
        //         length += this.segments[i].length;
        //     }
        //     return (
        //         <div className={this.props.className}>
        //             {ret}
        //         </div>
        //     );
        // } catch (e) {
        //     return <div className={this.props.className}>{this.genNormalString(this.props.children)}</div>
        // }
    }
}
