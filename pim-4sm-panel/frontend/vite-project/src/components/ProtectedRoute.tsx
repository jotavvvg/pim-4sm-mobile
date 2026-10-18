import { Navigate, Outlet } from 'react-router-dom';

import { roleHomePath } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import type { UserRole } from '@/types/entities';

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={roleHomePath[role]} replace />;
  }

  return <Outlet />;
}