'use client';

import dynamic from 'next/dynamic';

export const PatientQRCodeDialog = dynamic(
  () => import('./PatientQRCodeDialog').then((module) => module.PatientQRCodeDialog),
  { ssr: false }
);
