import { render, screen } from '@testing-library/react';
import { useDrop } from 'react-dnd';
import { GroupContainerItem } from '../components/DraggableTabItem';
import TabTreeNode from '../util/TabTreeNode';

jest.mock('react-dnd', () => ({
    useDrag: jest.fn(),
    useDrop: jest.fn(() => [{ isOver: false, canDrop: false }, jest.fn()]),
}));
jest.mock('react-dnd-html5-backend', () => ({ getEmptyImage: jest.fn() }));

const groupInfo = { id: 10, title: 'Work', color: 'blue', tabCount: 1 };
const node = new TabTreeNode({ id: 'group-10', isGroup: true });
node.groupInfo = groupInfo;
node.children = [new TabTreeNode({ id: 2, url: 'https://example.com' })];

describe('GroupContainerItem', () => {
    beforeEach(() => {
        useDrop.mockReturnValue([{ isOver: false, canDrop: false }, jest.fn()]);
    });

    it.each([false, true])('accepts a subtree drop with collapsed=%s', (isCollapsed) => {
        const onTabGroupDrop = jest.fn();
        render(<GroupContainerItem node={node} groupInfo={groupInfo} isCollapsed={isCollapsed} onTabGroupDrop={onTabGroupDrop} />);
        const specification = useDrop.mock.calls[useDrop.mock.calls.length - 1][0]();
        const item = { tabId: 1, node: new TabTreeNode({ id: 1, groupId: -1 }) };
        expect(specification.canDrop(item)).toBe(true);
        specification.drop(item, { didDrop: () => false });
        expect(onTabGroupDrop).toHaveBeenCalledWith(1, 10);
        expect(specification.canDrop({ node: new TabTreeNode({ id: 2, groupId: 10 }) })).toBe(false);
    });

    it('preserves the default collapsed count and preview', () => {
        const { container } = render(<GroupContainerItem node={node} groupInfo={groupInfo} isCollapsed />);
        expect(screen.getByText('(1)')).toBeInTheDocument();
        expect(container.querySelector('.group-favicon-strip')).toBeInTheDocument();
        expect(container.querySelector('.group-container')).not.toHaveClass('compact');
    });

    it('keeps the color dot and delegates compact background colors to the theme', () => {
        const { container, rerender } = render(<GroupContainerItem node={node} groupInfo={groupInfo} isCollapsed compactGroups />);
        const header = container.querySelector('.group-container');
        const dot = container.querySelector('.group-dot');
        expect(header).toHaveClass('compact');
        expect(header.style.getPropertyValue('--group-color')).toBe('#1a73e8');
        expect(header.style.backgroundColor).toBe('');
        expect(dot).toHaveStyle({ backgroundColor: '#1a73e8' });
        expect(dot.nextElementSibling).toBe(screen.getByText('Work'));
        expect(screen.queryByText('(1)')).not.toBeInTheDocument();
        expect(container.querySelector('.group-favicon-strip')).not.toBeInTheDocument();
        rerender(<GroupContainerItem node={node} groupInfo={groupInfo} isCollapsed={false} compactGroups />);
        expect(header).not.toHaveClass('compact');
        expect(header.style.backgroundColor).toBe('');
        expect(container.querySelector('.group-dot')).toBe(dot);
        expect(screen.getByText('(1)')).toBeInTheDocument();
    });
});