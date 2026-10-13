'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthPageContent } from '@/components/auth/AuthPageContent';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      }
    >
      <AuthPageContent initialTab="login" />
    </Suspense>
  );
}
