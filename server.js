// Entry file for the Hostinger Node.js Web App (the panel requires a .js file).
// The real server is the bundle produced by `pnpm build` at dist-server/index.mjs.
// Dynamic import() without top-level await keeps this file loadable both by `node server.js`
// and by hosts that require() the entry file (Node 22.12+ can require ES modules without top-level await).
process.env.NODE_ENV ??= 'production';

import('./dist-server/index.mjs').catch((error) => {
  console.error('SHOWBRINQ failed to start. Confirm that `pnpm build` ran and created dist-server/index.mjs.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
