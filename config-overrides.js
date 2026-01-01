const { override, fixBabelImports, addWebpackAlias } = require('customize-cra');
const path = require('path');

const useMockEntry = (config) => {
    // In development mode, use the mock entry point
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK === 'true') {
        config.entry = path.resolve(__dirname, 'src/index.dev.js');
    }
    return config;
};

module.exports = override(
    fixBabelImports('import', {
        libraryName: 'antd',
        libraryDirectory: 'es',
        style: 'css',
    }),
    useMockEntry,
);