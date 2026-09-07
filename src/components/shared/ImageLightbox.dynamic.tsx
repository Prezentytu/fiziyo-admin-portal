'use client';

import dynamic from 'next/dynamic';

export const ImageLightbox = dynamic(() => import('./ImageLightbox').then((module) => module.ImageLightbox), {
  ssr: false,
});
