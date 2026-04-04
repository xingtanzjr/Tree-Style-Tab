/* global chrome */
import { StrictMode, useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import TabTree from './components/TabTree';
import Initializer from './util/Initializer';
import MockChrome from './mock/MockChrome';
import MockInitializer from './mock/MockInitializer';
import './index.css';

// Determine if we're in mock mode
const useMock = process.env.REACT_APP_USE_MOCK === 'true';

// Initialize chrome and initializer based on environment
const chromeInstance = useMock ? new MockChrome() : chrome;
const initializerInstance = useMock ? new MockInitializer(chromeInstance) : new Initializer(chrome);

// Detect panel mode from body data attribute (set by sidepanel.html)
const initialMode = document.body.dataset.mode === 'sidepanel' ? 'sidepanel' : 'popup';

/**
 * Dev mode toggle - floating switch to toggle popup/sidepanel at runtime
 */
function DevModeToggle({ mode, onToggle }) {
    return (
        <div className="dev-mode-toggle">
            <button onClick={onToggle}>
                {mode === 'popup' ? '📦 Popup' : '📌 Sidepanel'}
            </button>
        </div>
    );
}

/**
 * Resizable wrapper for sidepanel simulation in dev mode.
 * Renders a right-edge drag handle to adjust container width.
 */
function DevResizablePanel({ children }) {
    const [width, setWidth] = useState(360);
    const dragging = useRef(false);

    const onMouseDown = useCallback((e) => {
        e.preventDefault();
        dragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!dragging.current) return;
            const newWidth = Math.max(260, Math.min(800, e.clientX));
            setWidth(newWidth);
        };
        const onMouseUp = () => {
            if (!dragging.current) return;
            dragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    return (
        <div className="dev-sidepanel-wrapper">
            <div className="dev-sidepanel-container" style={{ width }}>
                {children}
            </div>
            <div className="dev-resize-handle" onMouseDown={onMouseDown} />
        </div>
    );
}

function useDarkMode() {
    const [isDark, setIsDark] = useState(
        () => window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setIsDark(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);
    return isDark;
}

function App() {
    const [panelMode, setPanelMode] = useState(initialMode);
    const isDark = useDarkMode();

    useEffect(() => {
        if (panelMode === 'sidepanel') {
            document.body.dataset.mode = 'sidepanel';
        } else {
            delete document.body.dataset.mode;
        }
    }, [panelMode]);

    const toggleMode = () =>
        setPanelMode(prev => (prev === 'popup' ? 'sidepanel' : 'popup'));

    const isSidepanel = panelMode === 'sidepanel';

    const tree = (
        <TabTree
            chrome={chromeInstance}
            initializer={initializerInstance}
            panelMode={panelMode}
        />
    );

    return (
        <ConfigProvider
            theme={{
                algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#1890ff',
                    borderRadius: 4,
                },
            }}
        >
            {useMock && isSidepanel ? (
                <DevResizablePanel>{tree}</DevResizablePanel>
            ) : (
                tree
            )}
            {useMock && <DevModeToggle mode={panelMode} onToggle={toggleMode} />}
        </ConfigProvider>
    );
}

const container = document.getElementById('root');
const root = createRoot(container);

async function init() {
    if (useMock) {
        await chromeInstance.loadI18n();
        // Expose mock as global chrome so chrome.i18n.getMessage() works everywhere
        window.chrome = chromeInstance;
    }
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}
init();
