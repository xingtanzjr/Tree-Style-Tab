import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import TabTree from '../components/TabTree';
import MockChrome from '../mock/MockChrome';
import MockInitializer from '../mock/MockInitializer';
import messages from '../../public/_locales/en/messages.json';

jest.mock('../util/analytics', () => ({ fireEvent: jest.fn() }));
jest.mock('react-dnd', () => ({
    DndProvider: ({ children }) => children,
    useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
    useDrop: () => [{ isOver: false, canDrop: false }, jest.fn()],
    useDragLayer: () => ({ isDragging: false }),
}));
jest.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {}, getEmptyImage: () => ({}) }));

describe('live tab actions', () => {
    let chrome;
    let initializer;
    let originalChrome;

    beforeEach(() => {
        originalChrome = global.chrome;
        chrome = new MockChrome();
        chrome._i18nMessages = messages;
        initializer = new MockInitializer(chrome);
        global.chrome = chrome;
        window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    });

    afterEach(() => {
        cleanup();
        jest.useRealTimers();
        global.chrome = originalChrome;
    });

    it('lists all current-window groups even while the tree is filtered', async () => {
        render(<TabTree chrome={chrome} initializer={initializer} panelMode="sidepanel" />);
        await screen.findByText('React Docs - Hooks Reference');
        fireEvent.change(screen.getByPlaceholderText('Filter'), { target: { value: 'Hooks Reference' } });
        await waitFor(() => expect(screen.queryByText('Jira - Sprint Board')).not.toBeInTheDocument());
        fireEvent.contextMenu(screen.getByText('Hooks Reference'));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Move to group' }));
        expect(screen.getByRole('menuitem', { name: 'React Research' })).toBeDisabled();
        expect(screen.getByRole('menuitem', { name: 'Shopping' })).toBeEnabled();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Work Tasks' }));
        const target = chrome._groups.find(group => group.title === 'Work Tasks');
        await waitFor(() => expect(chrome._tabs.find(tab => tab.id === 2).groupId).toBe(target.id));
        expect(chrome._tabs.find(tab => tab.id === 3).groupId).toBe(target.id);
    });

    it('offers the requested actions and duplicates only one tab', async () => {
        render(<TabTree chrome={chrome} initializer={initializer} panelMode="sidepanel" />);
        fireEvent.contextMenu(await screen.findByText('React Docs - Hooks Reference'));
        expect(await screen.findByRole('menuitem', { name: 'New tab below' })).toBeEnabled();
        expect(screen.getByRole('menuitem', { name: 'Reload tab' })).toBeEnabled();
        const count = chrome._tabs.length;
        fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate tab' }));
        await waitFor(() => expect(chrome._tabs).toHaveLength(count + 1));
        await waitFor(() => expect(screen.getAllByText('React Docs - Hooks Reference')).toHaveLength(2));
    });

    it('pins only the clicked tab and unpins it without restoring its subtree', async () => {
        render(<TabTree chrome={chrome} initializer={initializer} panelMode="sidepanel" />);
        fireEvent.contextMenu(await screen.findByText('React Docs - Hooks Reference'));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Pin tab' }));
        const pinned = await screen.findByRole('button', { name: 'React Docs - Hooks Reference' });
        expect(document.querySelector('.tabTreeViewContainer')).not.toContainElement(pinned);
        expect(chrome._tabs.filter(tab => tab.pinned)).toHaveLength(1);
        expect(chrome._tabs.find(tab => tab.id === 3).pinned).not.toBe(true);
        fireEvent.click(pinned);
        await waitFor(() => expect(chrome._tabs.find(tab => tab.id === 2).active).toBe(true));
        fireEvent.contextMenu(pinned);
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Unpin tab' }));
        await waitFor(() => expect(screen.queryByRole('region', { name: 'Pinned tabs' })).not.toBeInTheDocument());
        expect(await screen.findByText('React Docs - Hooks Reference')).toBeInTheDocument();
        expect(chrome._sessionStorage.tabParentMap[3]).not.toBe(2);
    });

    it('syncs external pin changes and filters pinned results without duplicating them in the tree', async () => {
        jest.useFakeTimers();
        const updateNativeTab = async (tabId, changes) => {
            await act(async () => {
                await chrome.tabs.update(tabId, changes);
                jest.advanceTimersByTime(150);
            });
        };
        render(<TabTree chrome={chrome} initializer={initializer} panelMode="sidepanel" />);
        await screen.findByText('React Docs - Hooks Reference');
        await updateNativeTab(2, { pinned: true });
        await screen.findByRole('button', { name: 'React Docs - Hooks Reference' });
        await updateNativeTab(8, { pinned: true, audible: true });
        await screen.findByRole('img', { name: 'Playing audio' });
        fireEvent.change(screen.getByPlaceholderText('Filter'), { target: { value: 'Hooks Reference' } });
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Jira - Sprint Board' })).not.toBeInTheDocument());
        expect(screen.getByRole('button', { name: 'React Docs - Hooks Reference' })).toBeInTheDocument();
        await updateNativeTab(2, { pinned: false });
        await waitFor(() => expect(screen.queryByRole('region', { name: 'Pinned tabs' })).not.toBeInTheDocument());
        expect(await screen.findByText('Hooks Reference')).toBeInTheDocument();
    });

    it('keeps the default style and remembers the compact preference across panel mounts', async () => {
        const view = render(<TabTree chrome={chrome} initializer={initializer} panelMode="sidepanel" />);
        await screen.findByText('React Research');
        expect(document.querySelector('.group-container')).not.toHaveClass('compact');
        fireEvent.contextMenu(document.querySelector('.tabTreeViewContainer'));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
        const setting = screen.getByRole('checkbox', { name: 'Simple collapsed groups' });
        expect(setting).not.toBeChecked();
        fireEvent.click(setting);
        expect(chrome._localStorage.compactGroups).toBe(true);
        view.unmount();
        render(<TabTree chrome={chrome} initializer={initializer} panelMode="sidepanel" />);
        fireEvent.click(await screen.findByText('React Research'));
        await waitFor(() => expect(document.querySelector('.group-container')).toHaveClass('compact'));
    });
});