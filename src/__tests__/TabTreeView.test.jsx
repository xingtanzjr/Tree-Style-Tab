import { render, screen } from '@testing-library/react';
import TabTreeView from '../components/TabTreeView';
import TabTreeNode from '../util/TabTreeNode';

// Mock react-dnd to avoid ESM issues in Jest
jest.mock('react-dnd', () => ({
    useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
    useDrop: () => [{ isOver: false, canDrop: false }, jest.fn()],
}));
jest.mock('react-dnd-html5-backend', () => ({
    HTML5Backend: {},
    getEmptyImage: () => ({}),
}));

const renderWithDnd = (ui) => render(ui);

const createTestTree = () => {
    const root = new TabTreeNode();
    const tab1 = new TabTreeNode({
        id: 1,
        title: 'React Documentation',
        url: 'https://react.dev',
        favIconUrl: 'https://react.dev/favicon.ico',
        active: true,
        status: 'complete',
    });
    const tab2 = new TabTreeNode({
        id: 2,
        title: 'Jest Testing Framework',
        url: 'https://jestjs.io',
        favIconUrl: 'https://jestjs.io/favicon.ico',
        active: false,
        status: 'complete',
    });
    const tab3 = new TabTreeNode({
        id: 3,
        title: 'Child Tab',
        url: 'https://example.com',
        active: false,
        status: 'complete',
    });
    root.children = [tab1, tab2];
    tab1.children = [tab3];
    tab1.parent = root;
    tab2.parent = root;
    tab3.parent = tab1;
    return root;
};

const defaultProps = {
    rootNode: null,
    keyword: '',
    selectedTabId: -1,
    onContainerClick: jest.fn(),
    onClosedButtonClick: jest.fn(),
    onTabDrop: jest.fn(),
    onTabItemSelected: jest.fn(),
    collapsedTabs: new Set(),
    onToggleCollapse: jest.fn(),
    onGroupUpdate: jest.fn(),
    onGroupEditingChange: jest.fn(),
    panelMode: 'popup',
    onCloseTab: jest.fn(),
    onMarkTab: jest.fn(),
    tabMarks: new Map(),
};

describe('TabTreeView', () => {
    it('should render empty div when rootNode has no children', () => {
        const { container } = renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={new TabTreeNode()} />
        );
        expect(container.querySelector('.tabTreeView')).toBeInTheDocument();
        expect(container.querySelector('.tabTreeView').children).toHaveLength(0);
    });

    it('should render tab titles', () => {
        const root = createTestTree();
        renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} />
        );

        expect(screen.getByText('React Documentation')).toBeInTheDocument();
        expect(screen.getByText('Jest Testing Framework')).toBeInTheDocument();
    });

    it('should render tab URLs', () => {
        const root = createTestTree();
        renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} />
        );

        expect(screen.getByText('https://react.dev')).toBeInTheDocument();
        expect(screen.getByText('https://jestjs.io')).toBeInTheDocument();
    });

    it('should render nested children', () => {
        const root = createTestTree();
        renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} />
        );

        expect(screen.getByText('Child Tab')).toBeInTheDocument();
    });

    it('should highlight keyword in tab titles', () => {
        const root = createTestTree();
        const { container } = renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} keyword="React" />
        );

        const highlights = container.querySelectorAll('.keyword');
        expect(highlights.length).toBeGreaterThan(0);
        expect(highlights[0].textContent).toBe('React');
    });

    it('should apply selected class to active tab', () => {
        const root = createTestTree();
        const { container } = renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} selectedTabId={1} />
        );

        const selected = container.querySelector('.container.selected');
        expect(selected).toBeInTheDocument();
    });

    it('should hide children when tab is collapsed', () => {
        const root = createTestTree();
        const collapsedTabs = new Set([1]);

        renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} collapsedTabs={collapsedTabs} />
        );

        // Tab 1 is collapsed, so "Child Tab" (id:3) should not be visible
        expect(screen.queryByText('Child Tab')).not.toBeInTheDocument();
    });

    it('should show collapsed badge with children count', () => {
        const root = createTestTree();
        const collapsedTabs = new Set([1]);

        const { container } = renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} collapsedTabs={collapsedTabs} />
        );

        const badge = container.querySelector('.collapsed-badge');
        expect(badge).toBeInTheDocument();
        expect(badge.textContent).toBe('+1');
    });

    it('should render group container for grouped tabs', () => {
        const root = new TabTreeNode();
        const group = new TabTreeNode({
            id: 'group-1',
            title: 'Work Tasks',
            isGroup: true,
        });
        group.groupInfo = {
            id: 1,
            title: 'Work Tasks',
            color: 'blue',
            collapsed: false,
            tabCount: 2,
        };
        const child1 = new TabTreeNode({ id: 10, title: 'Task 1', url: 'https://task1.com', status: 'complete' });
        const child2 = new TabTreeNode({ id: 11, title: 'Task 2', url: 'https://task2.com', status: 'complete' });
        group.children = [child1, child2];
        child1.parent = group;
        child2.parent = group;
        root.children = [group];
        group.parent = root;

        renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} />
        );

        expect(screen.getByText('Work Tasks')).toBeInTheDocument();
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('should render search items for google search results', () => {
        const root = new TabTreeNode();
        const searchNode = new TabTreeNode({
            id: 's1',
            title: 'Search: React hooks',
            isGoogleSearch: true,
        });
        root.children = [searchNode];
        searchNode.parent = root;

        renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} />
        );

        expect(screen.getByText('Search: React hooks')).toBeInTheDocument();
    });

    it('should show loading indicator for loading tabs', () => {
        const root = new TabTreeNode();
        const loadingTab = new TabTreeNode({
            id: 1,
            title: '',
            url: 'https://example.com',
            status: 'loading',
        });
        root.children = [loadingTab];
        loadingTab.parent = root;

        renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} />
        );

        expect(screen.getByText('loading...')).toBeInTheDocument();
    });

    it('should render mark badge when tab is marked', () => {
        const root = new TabTreeNode();
        const tab = new TabTreeNode({
            id: 1,
            title: 'Marked Tab',
            url: 'https://example.com',
            status: 'complete',
        });
        root.children = [tab];
        tab.parent = root;

        const tabMarks = new Map([[1, 'check']]);

        const { container } = renderWithDnd(
            <TabTreeView {...defaultProps} rootNode={root} tabMarks={tabMarks} />
        );

        const badge = container.querySelector('.favicon-badge');
        expect(badge).toBeInTheDocument();
    });
});
