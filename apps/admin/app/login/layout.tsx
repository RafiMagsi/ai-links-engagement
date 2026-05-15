'use client';

import { AuthProvider } from '@/lib/auth-context';
import { DialogProvider } from '@/lib/dialog-context';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DialogProvider>{children}</DialogProvider>
    </AuthProvider>
  );
}
