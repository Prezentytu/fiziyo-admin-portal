'use client';

import dynamic from 'next/dynamic';

export const AssignmentSuccessDialog = dynamic(
  () => import('./AssignmentSuccessDialog').then((module) => module.AssignmentSuccessDialog),
  { ssr: false }
);
