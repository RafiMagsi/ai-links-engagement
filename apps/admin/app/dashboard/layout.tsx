'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { DialogProvider } from '@/lib/dialog-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DialogProvider>
        <ProtectedRoute>{children}</ProtectedRoute>
      </DialogProvider>
    </AuthProvider>
  );
}
