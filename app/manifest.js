export default function manifest() {
  return {
    name: 'Panthu', short_name: 'Panthu', description: 'Liberdade para pertencer',
    start_url: '/app', display: 'standalone', background_color: '#17261D', theme_color: '#17261D',
    // Ícones quadrados que preenchem tudo (sem cantos transparentes): o celular aplica o formato dele.
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]  };
}
