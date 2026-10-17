// @ts-check
// Register the offline service worker (sw.js). Skipped on localhost so editing files never serves stale copies;
// add ?sw=1 to test it locally.

export function registerOffline() {
  if (!('serviceWorker' in navigator)) return;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (local && new URLSearchParams(location.search).get('sw') !== '1') return;
  const go = () => navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}
