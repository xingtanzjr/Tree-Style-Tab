import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { FileTextOutlined, LoadingOutlined, SoundOutlined, AudioMutedOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { t } from '../util/i18n';

function PinnedIcon({ tab }) {
    const [failedUrl, setFailedUrl] = useState(null);
    if (tab.status === 'loading') return <LoadingOutlined />;
    if (tab.favIconUrl && tab.favIconUrl !== failedUrl) {
        return <img src={tab.favIconUrl} alt="" draggable={false} onError={() => setFailedUrl(tab.favIconUrl)} />;
    }
    return <FileTextOutlined />;
}

export default function PinnedTabs({ nodes, selectedTabId, onActivate, onContextMenu }) {
    const regionRef = useRef(null);
    const viewportRef = useRef(null);
    const trackRef = useRef(null);
    const wheelAnimationRef = useRef(null);
    const [scrollState, setScrollState] = useState({ overflow: false, canLeft: false, canRight: false });
    const activeId = nodes.find(node => node.tab.active)?.tab.id;
    const selectedId = nodes.some(node => node.tab.id === selectedTabId) ? selectedTabId : activeId;

    const stopWheelScroll = useCallback(() => {
        if (wheelAnimationRef.current) {
            cancelAnimationFrame(wheelAnimationRef.current.frame);
            wheelAnimationRef.current = null;
        }
    }, []);

    const updateScrollState = useCallback(() => {
        const region = regionRef.current;
        const viewport = viewportRef.current;
        const track = trackRef.current;
        if (!region || !viewport || !track) return;
        const regionStyle = getComputedStyle(region);
        const viewportStyle = getComputedStyle(viewport);
        const fullWidth = region.clientWidth - (parseFloat(regionStyle.paddingLeft) || 0) - (parseFloat(regionStyle.paddingRight) || 0);
        const contentWidth = track.scrollWidth + (parseFloat(viewportStyle.paddingLeft) || 0) + (parseFloat(viewportStyle.paddingRight) || 0);
        const next = {
            overflow: contentWidth > fullWidth + 1,
            canLeft: viewport.scrollLeft > 1,
            canRight: viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1,
        };
        setScrollState(previous => Object.keys(next).every(key => next[key] === previous[key]) ? previous : next);
    }, []);

    useLayoutEffect(() => {
        const region = regionRef.current;
        const viewport = viewportRef.current;
        if (!region || !viewport) return;
        updateScrollState();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
        observer?.observe(region);
        observer?.observe(viewport);
        observer?.observe(trackRef.current);
        const onWheel = event => {
            if (event.ctrlKey || viewport.scrollWidth <= viewport.clientWidth + 1) {
                stopWheelScroll();
                return;
            }
            event.stopPropagation();
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && viewport.contains(event.target)) {
                stopWheelScroll();
                return;
            }
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (!delta) return;
            event.preventDefault();
            const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1;
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            if (reducedMotion.matches) {
                stopWheelScroll();
                viewport.scrollLeft += delta * scale;
                updateScrollState();
                return;
            }
            const previous = wheelAnimationRef.current;
            const target = Math.max(0, Math.min((previous?.target ?? viewport.scrollLeft) + delta * scale, viewport.scrollWidth - viewport.clientWidth));
            const now = performance.now();
            if (previous) {
                previous.target = target;
                previous.lastInput = now;
                return;
            }
            const animation = { target, position: viewport.scrollLeft, previousTime: now, lastInput: now, frame: null };
            wheelAnimationRef.current = animation;
            const animate = () => {
                const timestamp = performance.now();
                animation.target = Math.max(0, Math.min(animation.target, viewport.scrollWidth - viewport.clientWidth));
                const finished = reducedMotion.matches || timestamp - animation.lastInput >= 160 || Math.abs(animation.target - animation.position) < 0.5;
                animation.position = finished ? animation.target : animation.position + (animation.target - animation.position) * (1 - Math.exp(-(timestamp - animation.previousTime) / 45));
                animation.previousTime = timestamp;
                viewport.scrollLeft = animation.position;
                updateScrollState();
                if (finished) wheelAnimationRef.current = null;
                else animation.frame = requestAnimationFrame(animate);
            };
            animation.frame = requestAnimationFrame(animate);
        };
        region.addEventListener('wheel', onWheel, { passive: false });
        viewport.addEventListener('scroll', updateScrollState);
        window.addEventListener('resize', updateScrollState);
        return () => {
            stopWheelScroll();
            observer?.disconnect();
            region.removeEventListener('wheel', onWheel);
            viewport.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [nodes.length, updateScrollState, stopWheelScroll]);

    useLayoutEffect(updateScrollState, [scrollState.overflow, updateScrollState]);

    const revealButton = useCallback(button => {
        const viewport = viewportRef.current;
        if (!viewport || !button) return;
        stopWheelScroll();
        const padding = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
        const right = button.offsetLeft + button.offsetWidth + padding * 2;
        if (button.offsetLeft < viewport.scrollLeft) viewport.scrollLeft = button.offsetLeft;
        else if (right > viewport.scrollLeft + viewport.clientWidth) viewport.scrollLeft = right - viewport.clientWidth;
        updateScrollState();
    }, [updateScrollState, stopWheelScroll]);

    useLayoutEffect(() => {
        revealButton(trackRef.current?.querySelector(`[data-pinned-tab-id="${selectedId}"]`));
    }, [selectedId, scrollState.overflow, revealButton]);

    const scrollPage = direction => {
        stopWheelScroll();
        const viewport = viewportRef.current;
        const track = trackRef.current;
        const step = track.querySelector('.pinned-tab').offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
        if (!step) return;
        const padding = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
        const pageSize = Math.max(1, Math.floor((viewport.clientWidth - padding * 2) / step));
        const current = direction > 0 ? Math.floor(viewport.scrollLeft / step) : Math.ceil(viewport.scrollLeft / step);
        viewport.scrollTo({
            left: Math.max(0, Math.min((current + direction * pageSize) * step, viewport.scrollWidth - viewport.clientWidth)),
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
    };

    if (!nodes.length) return null;

    return (
        <div className="pinned-tabs" role="region" aria-label={t('pinnedTabs')} ref={regionRef}
            onKeyDown={event => {
                event.stopPropagation();
                const buttons = Array.from(trackRef.current.querySelectorAll('.pinned-tab'));
                const current = buttons.indexOf(event.target);
                if (current < 0) return;
                const offsets = { ArrowLeft: -1, ArrowRight: 1 };
                if (event.key in offsets || event.key === 'Home' || event.key === 'End') {
                    event.preventDefault();
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : current + offsets[event.key];
                    const button = buttons[Math.max(0, Math.min(buttons.length - 1, next))];
                    button.focus({ preventScroll: true });
                    revealButton(button);
                }
            }}>
            {scrollState.overflow && (
                <button type="button" className="pinned-tabs-nav" disabled={!scrollState.canLeft}
                    title={t('pinnedTabsPrevious')} aria-label={t('pinnedTabsPrevious')} onClick={() => scrollPage(-1)}>
                    <LeftOutlined aria-hidden="true" />
                </button>
            )}
            <div className="pinned-tabs-viewport" ref={viewportRef}>
                <div className="pinned-tabs-track" ref={trackRef}>
                    {nodes.map(node => {
                        const tab = node.tab;
                        const label = tab.title || tab.url || t('newTab');
                        const openMenu = event => onContextMenu(event, node, tab, false, false);
                        return (
                            <button key={tab.id} type="button" data-pinned-tab-id={tab.id}
                                className={`pinned-tab${tab.active ? ' active' : ''}${tab.id === selectedTabId ? ' selected' : ''}`}
                                aria-label={label} aria-pressed={!!tab.active} title={`${label}\n${tab.url || ''}`}
                                onClick={() => onActivate(tab)} onContextMenu={openMenu}
                                onKeyDown={event => {
                                    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                                        event.preventDefault();
                                        const bounds = event.currentTarget.getBoundingClientRect();
                                        openMenu({ preventDefault() {}, stopPropagation() {}, clientX: bounds.left, clientY: bounds.bottom });
                                    }
                                }}>
                                <span className="pinned-tab-icon" aria-hidden="true"><PinnedIcon tab={tab} /></span>
                                {(tab.mutedInfo?.muted || tab.audible) && (
                                    <span className="pinned-tab-audio" role="img" aria-label={t(tab.mutedInfo?.muted ? 'tabMuted' : 'tabPlayingAudio')}>
                                        {tab.mutedInfo?.muted ? <AudioMutedOutlined /> : <SoundOutlined />}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            {scrollState.overflow && (
                <button type="button" className="pinned-tabs-nav" disabled={!scrollState.canRight}
                    title={t('pinnedTabsNext')} aria-label={t('pinnedTabsNext')} onClick={() => scrollPage(1)}>
                    <RightOutlined aria-hidden="true" />
                </button>
            )}
        </div>
    );
}