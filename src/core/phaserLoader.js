const LOCAL_PHASER_URL = new URL('../vendor/phaser.min.js', import.meta.url).pathname;
const CDN_PHASER_URL = 'https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Phaser from ${src}`));
    document.head.appendChild(script);
  });
}

export async function ensurePhaserReady() {
  if (window.Phaser) return window.Phaser;

  try {
    await loadScript(LOCAL_PHASER_URL);
  } catch (err) {
    console.warn(err.message);
  }

  if (window.Phaser) return window.Phaser;

  await loadScript(CDN_PHASER_URL);
  return window.Phaser;
}
