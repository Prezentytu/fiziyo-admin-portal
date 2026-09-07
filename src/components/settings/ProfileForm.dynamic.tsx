'use client';

import dynamic from 'next/dynamic';

export const ProfileForm = dynamic(() => import('./ProfileForm').then((module) => module.ProfileForm), {
  ssr: false,
});
