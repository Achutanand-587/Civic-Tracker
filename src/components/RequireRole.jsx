import React from 'react';
import { usePMCAuth } from '../hooks/usePMCAuth';

export const ROLES = {
  COMMISSIONER: 'COMMISSIONER',
  HOD: 'HOD',
  WARD_OFFICER: 'WARD_OFFICER',
  JUNIOR_ENGINEER: 'JUNIOR_ENGINEER'
};

/**
 * Protects children from being rendered if the user does not have an allowed role.
 * Can also optionally enforce a specific ward or dept match.
 */
export const RequireRole = ({ allowedRoles, requiredWard = null, requiredDept = null, children, fallback = null }) => {
  const { user, claims, loading } = usePMCAuth();

  if (loading) return <div>Loading access...</div>;
  if (!user || !claims) return fallback;

  // 1. Check Role
  if (allowedRoles && !allowedRoles.includes(claims.pmcRole)) {
    return fallback;
  }

  // 2. Check Ward match if strictly required
  if (requiredWard && claims.ward_id !== requiredWard) {
    return fallback;
  }

  // 3. Check Dept match if strictly required
  if (requiredDept && claims.dept_id !== requiredDept) {
    return fallback;
  }

  // User passes all checks
  return <>{children}</>;
};
