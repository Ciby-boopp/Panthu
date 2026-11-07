export default function manifest() {
  return {
    name: 'Panthu', short_name: 'Panthu', start_url: '/app', display: 'standalone',
    background_color: '#F3EFFF', theme_color: '#5B2EE0',
    icons: [{ src: '/icone.svg', sizes: 'any', type: 'image/svg+xml' }]
  };
}
