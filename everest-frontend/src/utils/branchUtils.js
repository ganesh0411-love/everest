/**
 * Utility functions for strict branch validation and ghost branch purging.
 * Permanently filters and scrubs deleted branches (e.g. Madurai, Trichy).
 */

export const isBranchActive = (b) => {
  if (!b) return false;
  const bId = String(b.id || '').trim().toLowerCase();
  const bName = String(b.name || b.branchName || b.id || '').trim().toLowerCase();

  // 1. Explicitly purge permanently deleted ghost branches
  if (
    bName === 'madurai' || 
    bName === 'trichy' || 
    bName.includes('madurai') || 
    bName.includes('trichy') ||
    bId === 'madurai' || 
    bId === 'trichy' ||
    bId.includes('madurai') || 
    bId.includes('trichy')
  ) {
    return false;
  }

  // 2. Explicit soft-deletion flags
  if (b.isDeleted === true || b.is_deleted === true || b.deleted === true) return false;
  if (
    String(b.isDeleted).toLowerCase() === 'true' || 
    String(b.is_deleted).toLowerCase() === 'true' || 
    String(b.deleted).toLowerCase() === 'true'
  ) return false;

  // 3. Status checks (must not be deleted, recycled, inactive, disabled)
  const st = String(b.status || '').trim().toLowerCase();
  if (st === 'deleted' || st === 'recycled' || st === 'inactive' || st === 'disabled') return false;
  if (b.disabled === true || b.enabled === false || b.hidden === true) return false;
  if (b.isVisibleInDropdown === false) return false;

  return true;
};

/**
 * Clean up legacy or stale localStorage keys caching ghost or inactive branches.
 */
export const sanitizeLocalStorageBranches = () => {
  try {
    ['everest_branches', 'branches', 'selectedBranch', 'activeBranch'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(b => isBranchActive(b));
          localStorage.setItem(key, JSON.stringify(cleaned));
        } else if (parsed && typeof parsed === 'object') {
          if (!isBranchActive(parsed)) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        if (
          raw.toLowerCase().includes('madurai') || 
          raw.toLowerCase().includes('trichy')
        ) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (e) {}
};

/**
 * Strict RBAC permission check for Cash Book access.
 * Returns true ONLY if user is:
 * 1. Super Admin / Main Branch Owner
 * 2. Staff member explicitly granted Admin / Manager / Customer Management Admin permissions
 */
export const canAccessCashBook = (userProfile) => {
  if (!userProfile) return false;
  const role = String(userProfile.role || '').toLowerCase();
  const permissions = userProfile.permissions || {};

  // 1. Super Admin / Main Branch Owner
  const isSuperAdmin = (
    role === 'admin' ||
    role === 'main_admin' ||
    role === 'super_admin' ||
    userProfile.isAdmin === true ||
    userProfile.isSuperAdmin === true
  );
  if (isSuperAdmin) return true;

  // 2. Staff member with explicitly granted Admin / Manager / Customer Management Admin permissions
  const hasAdminPermission = (
    userProfile.has_admin_permission === true ||
    userProfile.hasAdminPermission === true ||
    permissions.allPermissions === true ||
    permissions.adminOverride === true ||
    permissions.staffManagementRole === 'Admin' ||
    permissions.customerManagementMode === 'Admin' ||
    permissions.applicationStatusRole === 'Admin' ||
    permissions.collectionReportRole === 'Admin' ||
    permissions.attendanceRole === 'Admin' ||
    permissions.cashBook === true ||
    permissions.cash_book === true
  );

  return Boolean(hasAdminPermission);
};
