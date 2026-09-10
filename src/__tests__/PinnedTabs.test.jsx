import { act, fireEvent, render, screen } from '@testing-library/react';
import PinnedTabs from '../components/PinnedTabs';
import TabTreeNode from '../util/TabTreeNode';

const nodes = [
    new TabTreeNode({ id: 1, title: 'Mail', url: 'https://mail.example.com', favIconUrl: 'https://example.com/icon.png', pinned: true, active: true }),
    new TabTreeNode({ id: 2, title: 'Music', url: 'https://music.example.com', pinned: true, audible: true }),
];

test('pinned buttons have stable labels, activate tabs and open menus without dragging', () => {
    const onActivate = jest.fn();
    const onContextMenu = jest.fn();
    const { container } = render(<PinnedTabs nodes={nodes} onActivate={onActivate} onContextMenu={onContextMenu} />);
    const mail = screen.getByRole('button', { name: 'Mail' });
    expect(mail).toHaveAttribute('aria-pressed', 'true');
    expect(mail).toHaveAttribute('title', 'Mail\nhttps://mail.example.com');
    fireEvent.click(mail);
    expect(onActivate).toHaveBeenCalledWith(nodes[0].tab);
    fireEvent.contextMenu(mail);
    expect(onContextMenu).toHaveBeenCalledWith(expect.anything(), nodes[0], nodes[0].tab, false, false);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(mail.querySelector('.anticon-file-text')).toBeInTheDocument();
});

test('keyboard navigation stays in the strip and exposes a keyboard context menu', () => {
    const onContextMenu = jest.fn();
    render(<PinnedTabs nodes={nodes} onActivate={jest.fn()} onContextMenu={onContextMenu} />);
    const mail = screen.getByRole('button', { name: 'Mail' });
    const music = screen.getByRole('button', { name: 'Music' });
    mail.focus();
    fireEvent.keyDown(mail, { key: 'ArrowRight' });
    expect(music).toHaveFocus();
    fireEvent.keyDown(music, { key: 'Home' });
    expect(mail).toHaveFocus();
    fireEvent.keyDown(mail, { key: 'F10', shiftKey: true });
    expect(onContextMenu).toHaveBeenCalledTimes(1);
});

test('empty pinned areas disappear and loading and muted states are visible', () => {
    const { container, rerender } = render(<PinnedTabs nodes={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PinnedTabs nodes={[new TabTreeNode({ id: 3, title: 'Loading', status: 'loading', mutedInfo: { muted: true } })]} />);
    expect(container.querySelector('.anticon-loading')).toBeInTheDocument();
    expect(container.querySelector('.anticon-audio-muted')).toBeInTheDocument();
});

describe('single-row scrolling', () => {
    let originalMatchMedia;

    beforeEach(() => {
        originalMatchMedia = window.matchMedia;
        window.matchMedia = jest.fn(() => ({ matches: false }));
    });

    afterEach(() => {
        jest.useRealTimers();
        window.matchMedia = originalMatchMedia;
    });

    function renderStrip() {
        const pinnedNodes = Array.from({ length: 8 }, (_, index) => new TabTreeNode({
            id: index + 1, title: `Pinned ${index + 1}`, pinned: true, active: index === 0,
        }));
        const props = { nodes: pinnedNodes, onActivate: jest.fn(), onContextMenu: jest.fn() };
        const view = render(<PinnedTabs {...props} />);
        const region = view.container.querySelector('.pinned-tabs');
        const viewport = view.container.querySelector('.pinned-tabs-viewport');
        const track = view.container.querySelector('.pinned-tabs-track');
        let width = 220;
        let left = 0;
        region.style.padding = '5px 8px';
        viewport.style.padding = '3px';
        track.style.columnGap = '4px';
        Object.defineProperty(region, 'clientWidth', { get: () => width });
        Object.defineProperty(track, 'scrollWidth', { value: 316 });
        Object.defineProperties(viewport, {
            clientWidth: { get: () => width - 16 - (region.querySelector('.pinned-tabs-nav') ? 56 : 0) },
            scrollWidth: { get: () => Math.max(322, viewport.clientWidth) },
            scrollLeft: {
                get: () => left,
                set: value => { left = Math.max(0, Math.min(value, viewport.scrollWidth - viewport.clientWidth)); },
            },
        });
        track.querySelectorAll('.pinned-tab').forEach((button, index) => {
            Object.defineProperties(button, {
                offsetLeft: { value: index * 40 },
                offsetWidth: { value: 36 },
            });
        });
        viewport.scrollTo = jest.fn(options => {
            viewport.scrollLeft = options.left;
            fireEvent.scroll(viewport);
        });
        fireEvent(window, new Event('resize'));
        return {
            ...view, props, region, viewport,
            arrows: () => region.querySelectorAll('.pinned-tabs-nav'),
            resize: nextWidth => {
                width = nextWidth;
                viewport.scrollLeft = viewport.scrollLeft;
                fireEvent(window, new Event('resize'));
            },
        };
    }

    test('shows arrows only on overflow and pages by complete buttons with disabled edges', () => {
        const { viewport, arrows, resize } = renderStrip();
        expect(arrows()[0]).toBeDisabled();
        expect(arrows()[1]).toBeEnabled();
        fireEvent.click(arrows()[1]);
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 120, behavior: 'smooth' });
        expect(arrows()[0]).toBeEnabled();
        fireEvent.click(arrows()[1]);
        expect(viewport.scrollLeft).toBe(174);
        expect(arrows()[1]).toBeDisabled();
        window.matchMedia.mockReturnValue({ matches: true });
        fireEvent.click(arrows()[0]);
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 80, behavior: 'instant' });
        resize(500);
        expect(arrows()).toHaveLength(0);
        resize(220);
        expect(arrows()).toHaveLength(2);
        expect(arrows()[0]).toBeDisabled();
    });

    test('maps vertical wheel input to horizontal scrolling without hijacking zoom or horizontal gestures', () => {
        window.matchMedia.mockReturnValue({ matches: true });
        const { viewport, arrows } = renderStrip();
        const wheel = new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true });
        fireEvent(viewport, wheel);
        expect(wheel.defaultPrevented).toBe(true);
        expect(viewport.scrollLeft).toBe(40);
        fireEvent.wheel(viewport, { deltaY: 2, deltaMode: 1 });
        expect(viewport.scrollLeft).toBe(72);
        fireEvent.wheel(viewport, { deltaY: -1000 });
        expect(viewport.scrollLeft).toBe(0);
        expect(arrows()[0]).toBeDisabled();
        const horizontal = new WheelEvent('wheel', { deltaX: 40, bubbles: true, cancelable: true });
        fireEvent(viewport, horizontal);
        expect(horizontal.defaultPrevented).toBe(false);
        const zoom = new WheelEvent('wheel', { deltaY: 40, ctrlKey: true, bubbles: true, cancelable: true });
        fireEvent(viewport, zoom);
        expect(zoom.defaultPrevented).toBe(false);
        expect(viewport.scrollLeft).toBe(0);
    });

    test('smoothly accumulates wheel input and settles at the target without restarting the animation', () => {
        jest.useFakeTimers('modern');
        const { viewport, unmount } = renderStrip();
        fireEvent.wheel(viewport, { deltaY: 40 });
        expect(viewport.scrollLeft).toBe(0);
        act(() => jest.advanceTimersByTime(32));
        expect(viewport.scrollLeft).toBeGreaterThan(0);
        expect(viewport.scrollLeft).toBeLessThan(40);
        const previousPosition = viewport.scrollLeft;
        fireEvent.wheel(viewport, { deltaY: 40 });
        expect(viewport.scrollLeft).toBe(previousPosition);
        act(() => jest.advanceTimersByTime(32));
        expect(viewport.scrollLeft).toBeGreaterThan(previousPosition);
        expect(viewport.scrollLeft).toBeLessThan(80);
        act(() => jest.advanceTimersByTime(160));
        expect(viewport.scrollLeft).toBe(80);
        fireEvent.wheel(viewport, { deltaY: -1000 });
        act(() => jest.advanceTimersByTime(176));
        expect(viewport.scrollLeft).toBe(0);
        unmount();
    });

    test('native horizontal gestures and selected-tab navigation cancel pending wheel animation', () => {
        jest.useFakeTimers('modern');
        const { viewport, props, rerender, unmount } = renderStrip();
        fireEvent.wheel(viewport, { deltaY: 100 });
        act(() => jest.advanceTimersByTime(32));
        const position = viewport.scrollLeft;
        const horizontal = new WheelEvent('wheel', { deltaX: 40, bubbles: true, cancelable: true });
        fireEvent(viewport, horizontal);
        expect(horizontal.defaultPrevented).toBe(false);
        act(() => jest.advanceTimersByTime(200));
        expect(viewport.scrollLeft).toBe(position);
        fireEvent.wheel(viewport, { deltaY: 100 });
        rerender(<PinnedTabs {...props} selectedTabId={8} />);
        act(() => jest.advanceTimersByTime(200));
        expect(viewport.scrollLeft).toBe(174);
        fireEvent.wheel(viewport, { deltaY: -80 });
        unmount();
        act(() => jest.advanceTimersByTime(200));
        expect(viewport.scrollLeft).toBe(174);
    });

    test('reveals a newly selected tab but preserves scroll position on ordinary refreshes', () => {
        const { viewport, props, rerender } = renderStrip();
        viewport.scrollLeft = 80;
        fireEvent.scroll(viewport);
        rerender(<PinnedTabs {...props} nodes={props.nodes.map(node => node.clone())} />);
        expect(viewport.scrollLeft).toBe(80);
        rerender(<PinnedTabs {...props} selectedTabId={8} />);
        expect(viewport.scrollLeft).toBe(174);
        rerender(<PinnedTabs {...props} selectedTabId={1} />);
        expect(viewport.scrollLeft).toBe(0);
    });

    test('keyboard navigation reveals offscreen tabs and excludes paging controls', () => {
        const { viewport } = renderStrip();
        const first = screen.getByRole('button', { name: 'Pinned 1' });
        const last = screen.getByRole('button', { name: 'Pinned 8' });
        first.focus();
        fireEvent.keyDown(first, { key: 'End' });
        expect(last).toHaveFocus();
        expect(viewport.scrollLeft).toBe(174);
        fireEvent.keyDown(last, { key: 'Home' });
        expect(first).toHaveFocus();
        expect(viewport.scrollLeft).toBe(0);
    });
});