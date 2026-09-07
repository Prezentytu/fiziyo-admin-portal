'use client';

import dynamic from 'next/dynamic';

export const GeneratePDFDialog = dynamic(
  () => import('./GeneratePDFDialog').then((module) => module.GeneratePDFDialog),
  { ssr: false }
);
