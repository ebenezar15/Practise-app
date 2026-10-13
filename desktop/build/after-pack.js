/* electron-builder afterPack hook.
 * macOS refuses to run an Apple-Silicon app whose code signature is missing or broken
 * ("Overture is damaged and can't be opened"). Without a paid Apple Developer ID we still
 * ad-hoc sign the whole bundle so the signature is valid; Gatekeeper then only asks the
 * user to confirm opening it once. With a real identity (CSC_LINK) electron-builder signs. */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (process.env.CSC_LINK || process.env.CSC_NAME) return; // real signing handled by electron-builder
  if (/-temp$/.test(context.appOutDir)) return; // per-arch halves of a universal build: sign only the merged app
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  // remove extended attributes that break signing, then sign every nested binary ad-hoc
  try { execFileSync('xattr', ['-cr', app]); } catch (e) { /* not fatal */ }
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', '--timestamp=none', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' });
  console.log('  • ad-hoc signed', app);
};
