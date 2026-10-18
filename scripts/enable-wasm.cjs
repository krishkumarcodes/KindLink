// Polyfill process.versions.webcontainer to force Next.js to use @next/swc-wasm-nodejs on Termux/Android
if (process.platform === 'android' && !process.versions.webcontainer) {
  process.versions.webcontainer = '1';
}
