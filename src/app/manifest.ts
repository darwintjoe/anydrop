import type { MetadataRoute } from 'next';

// PWA manifest — this is what makes AnyDrop installable and, crucially,
// registers it as an OS **share target** (like Edge Drop was):
// any app's "Share" sheet can send text, URLs and files straight into your room.
export default function manifest(): MetadataRoute.Manifest {
  const m = {
    name: 'AnyDrop — Drop anything between your devices',
    short_name: 'AnyDrop',
    description:
      'The Edge Drop successor for Chrome: pair your phone and laptop with a room code and share text, links, files and photos both ways — straight from the share sheet.',
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    categories: ['utilities', 'productivity'],
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Web Share Target: Android/ChromeOS/Windows share sheet → AnyDrop.
    // The OS POSTs multipart/form-data to /api/share; the route delivers the
    // items into the room stored in the anydrop_room cookie, then redirects back.
    share_target: {
      action: '/api/share',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
        files: [{ name: 'files', accept: ['*/*'] }],
      },
    },
  };
  return m as MetadataRoute.Manifest;
}
