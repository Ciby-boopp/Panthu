export default function manifest() {
  return {
    name: 'Panthu', short_name: 'Panthu', description: 'Liberdade para pertencer',
    start_url: '/app', display: 'standalone', background_color: '#F6F4EC', theme_color: '#164F46',
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png' }
    ]
  };
}
