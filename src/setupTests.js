// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock chrome API globally for all tests
const mockChrome = {
    i18n: {
        getMessage: (key) => key,
    },
    tabs: {
        query: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
        remove: jest.fn().mockResolvedValue(),
        move: jest.fn().mockResolvedValue({}),
        group: jest.fn().mockResolvedValue(1),
        ungroup: jest.fn().mockResolvedValue(),
        onCreated: { addListener: jest.fn(), removeListener: jest.fn() },
        onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
        onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
        onActivated: { addListener: jest.fn(), removeListener: jest.fn() },
        onMoved: { addListener: jest.fn(), removeListener: jest.fn() },
        onAttached: { addListener: jest.fn(), removeListener: jest.fn() },
        onDetached: { addListener: jest.fn(), removeListener: jest.fn() },
    },
    tabGroups: {
        query: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        onCreated: { addListener: jest.fn(), removeListener: jest.fn() },
        onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
        onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
    },
    storage: {
        session: {
            get: jest.fn().mockResolvedValue({}),
            set: jest.fn().mockResolvedValue(),
            onChanged: { addListener: jest.fn(), removeListener: jest.fn() },
        },
        local: {
            get: jest.fn().mockResolvedValue({}),
            set: jest.fn().mockResolvedValue(),
            onChanged: { addListener: jest.fn(), removeListener: jest.fn() },
        },
    },
    runtime: {
        sendMessage: jest.fn().mockResolvedValue({}),
        onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    },
    bookmarks: {
        getTree: jest.fn().mockResolvedValue([]),
    },
    windows: {
        getCurrent: jest.fn().mockResolvedValue({ id: 1 }),
    },
    sidePanel: {
        setOptions: jest.fn().mockResolvedValue(),
    },
    commands: {
        onCommand: { addListener: jest.fn(), removeListener: jest.fn() },
    },
};

global.chrome = mockChrome;
