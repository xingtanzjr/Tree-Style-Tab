import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
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