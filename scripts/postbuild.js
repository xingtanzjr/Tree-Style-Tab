/**
 * Post-build script to generate sidepanel.html from the built index.html.
 * 
 * CRA only processes index.html as its template. This script creates a
 * sidepanel.html that loads the exact same React bundle but with
 * data-mode="sidepanel" on the body, so CSS can apply sidepanel-specific styles.
 */
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const indexPath = path.join(buildDir, 'index.html');
const sidepanelPath = path.join(buildDir, 'sidepanel.html');

const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Add data-mode="sidepanel" to the body tag
const sidepanelHtml = indexHtml.replace('<body>', '<body data-mode="sidepanel">');

fs.writeFileSync(sidepanelPath, sidepanelHtml, 'utf-8');

console.log('Generated sidepanel.html');
