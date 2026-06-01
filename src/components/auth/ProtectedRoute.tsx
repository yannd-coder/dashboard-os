import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types/auth';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  requireRole?: Role[];
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="text-sm text-text-tertiary">Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.is_approved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6 text-center">
        <div className="max-w-md">
          <div className="mb-3 text-xl font-semibold text-text-primary">Compte en attente</div>
          <p className="text-sm text-text-tertiary">
            Ton compte <strong>{user.prenom}</strong> existe mais n'est pas encore approuvé. Demande
            à un admin de l'activer.
          </p>
        </div>
      </div>
    );
  }

  if (user.must_change_pin && location.pathname !== '/change-pin') {
    return <Navigate to="/change-pin" replace />;
  }

  if (requireRole && !requireRole.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
