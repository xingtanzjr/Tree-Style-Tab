/* eslint-disable no-redeclare */
/* global chrome */
import { StrictMode } from 'react';
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
const initializerInstance = useMock ? new MockInitializer() : new Initializer(chrome);

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <StrictMode>
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#1890ff',
                    borderRadius: 4,
                },
            }}
        >
            <TabTree
                chrome={chromeInstance}
                initializer={initializerInstance}
            />
        </ConfigProvider>
    </StrictMode>
);
