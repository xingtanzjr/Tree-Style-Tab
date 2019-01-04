import React from 'react';
import Tree from 'antd/lib/tree'
import Icon from 'antd/lib/icon'
import { AntTreeNodeProps } from 'antd/lib/tree';

class MyTree extends Tree {

    renderSwitcherIcon = ({ isLeaf, expanded, loading }: AntTreeNodeProps) => {
        const { prefixCls, showLine } = this.props;
        if (loading) {
            return <Icon type="loading" className={`${prefixCls}-switcher-loading-icon`} />;
        }
        if (showLine) {
            if (isLeaf) {
                return <Icon type="plus" className={`${prefixCls}-switcher-line-icon`} />;
                // return null;
            }
            return (
                <Icon
                    type={expanded ? 'minus-square' : 'plus-square'}
                    className={`${prefixCls}-switcher-line-icon`}
                    theme="outlined"
                />
            );
        } else {
            if (isLeaf) {
                return null;
            }
            return <Icon type="caret-down" className={`${prefixCls}-switcher-icon`} theme="filled" />;
        }
    };
}

export default MyTree;