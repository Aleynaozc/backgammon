import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Backgammon', short_name: 'Backgammon', description: 'Play backgammon with friends',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#08283a', theme_color: '#08283a',
    icons: [192, 512].map(size => ({ src: `/icons/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })),
  };
}
