// Build the static stylesheet (no CDN at runtime). Run from the repo root after changing classes in index.html:
//   npx tailwindcss@3.4.19 -c tools/css/tailwind.config.js -o assets/app.css --minify
const path = require('path');
module.exports = { content: [path.join(__dirname, '../../index.html')], theme: { extend: {} }, plugins: [] };
