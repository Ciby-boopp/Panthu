export default function manifest() {
  return {
    name: 'Panthu', short_name: 'Panthu', description: 'Liberdade para pertencer',
    start_url: '/app', display: 'standalone', background_color: '#17261D', theme_color: '#17261D',
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png' }
    ]
  };
}
