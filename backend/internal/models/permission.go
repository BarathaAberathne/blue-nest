package models

import "sync"

// Permission is a granular capability gate. Routes and UI sections check
// permissions rather than role names, so adding a specialist role is a matter of
// composing its permission set (below) — no scattered role lists to update.
type Permission string

const (
	PermDashboardView     Permission = "dashboard.view"
	PermStoreManage       Permission = "store.manage"       // products, categories, orders
	PermBlogManage        Permission = "blog.manage"        // blog posts, uploads
	PermEnquiriesManage   Permission = "enquiries.manage"   // admissions CRM
	PermProcurementView   Permission = "procurement.view"   // read supply requests / POs
	PermProcurementManage Permission = "procurement.manage" // mutate requests / POs / catalogue
	PermSuppliersManage   Permission = "suppliers.manage"   // supplier directory CRUD
	PermFinanceView       Permission = "finance.view"       // spend, procurement analytics
	PermAuditView         Permission = "audit.view"         // activity / audit log
	PermBranchesManage    Permission = "branches.manage" // view + edit in-scope branches
	PermBranchAdmin       Permission = "branch.admin"    // branch lifecycle: create/delete/archive/merge/assign/GBP (super admin)
	PermUsersManage       Permission = "users.manage"    // account management (super admin)
	// Nursery operations (Phase 1)
	PermChildrenManage   Permission = "children.manage"   // child records + rooms
	PermAttendanceManage Permission = "attendance.manage" // daily attendance register
	// Staff / HR (Phase 2)
	PermStaffManage Permission = "staff.manage" // staff records + staff attendance
	// Daily records / safeguarding (Phase 3)
	PermDailyLogsManage Permission = "daily_logs.manage" // observations, incidents, safeguarding, medication, meals
)

// AllPermissions is the full set, granted to super_admin/admin.
var AllPermissions = []Permission{
	PermDashboardView, PermStoreManage, PermBlogManage, PermEnquiriesManage,
	PermProcurementView, PermProcurementManage, PermSuppliersManage,
	PermFinanceView, PermAuditView, PermBranchesManage, PermBranchAdmin, PermUsersManage,
	PermChildrenManage, PermAttendanceManage, PermStaffManage, PermDailyLogsManage,
}

// rolePermissions maps each role to its capability set. Customers/staff have no
// management permissions (staff use the separate Staff Portal). users.manage is
// reserved for super_admin (mirrors SuperAdminOnly on /admin/users).
var rolePermissions = map[Role][]Permission{
	RoleSuperAdmin: AllPermissions,
	RoleAdmin: {
		PermDashboardView, PermStoreManage, PermBlogManage, PermEnquiriesManage,
		PermProcurementView, PermProcurementManage, PermSuppliersManage,
		PermFinanceView, PermAuditView, PermBranchesManage,
		PermChildrenManage, PermAttendanceManage, PermStaffManage, PermDailyLogsManage,
	},
	RoleBranchManager: {
		PermDashboardView, PermStoreManage, PermBlogManage, PermEnquiriesManage,
		PermProcurementView, PermProcurementManage, PermSuppliersManage,
		PermFinanceView, PermAuditView, PermBranchesManage,
		PermChildrenManage, PermAttendanceManage, PermStaffManage, PermDailyLogsManage,
	},
	// Director (Managing Director): broad executive oversight across the whole
	// back office — same reach as a general manager, minus account management.
	RoleDirector: {
		PermDashboardView, PermStoreManage, PermBlogManage, PermEnquiriesManage,
		PermProcurementView, PermProcurementManage, PermSuppliersManage,
		PermFinanceView, PermAuditView, PermBranchesManage,
		PermChildrenManage, PermAttendanceManage, PermStaffManage, PermDailyLogsManage,
	},
	RoleFinance: {
		PermDashboardView, PermFinanceView, PermProcurementView, PermAuditView,
	},
	RoleAdmissions: {
		PermDashboardView, PermEnquiriesManage,
	},
	RoleProcurement: {
		PermDashboardView, PermProcurementView, PermProcurementManage,
		PermSuppliersManage, PermFinanceView,
	},
	// Regional Manager: multi-branch oversight (scoped to User.BranchSlugs by the
	// policy layer). Full operational reach across their branches; no lifecycle.
	RoleRegionalManager: {
		PermDashboardView, PermBranchesManage, PermEnquiriesManage,
		PermFinanceView, PermAuditView,
		PermChildrenManage, PermAttendanceManage, PermStaffManage, PermDailyLogsManage,
	},
	// Deputy Manager: assists one branch — same operational reach as a branch
	// manager minus finance/payroll approval.
	RoleDeputyManager: {
		PermDashboardView, PermBranchesManage, PermEnquiriesManage,
		PermChildrenManage, PermAttendanceManage, PermStaffManage, PermDailyLogsManage,
	},
	// ── Enterprise catalogue (B3) — sensible starting sets, editable by super
	// admin via the Permission Builder. ────────────────────────────────────────
	RoleEYFSLead:          {PermDashboardView, PermChildrenManage, PermAttendanceManage, PermDailyLogsManage},
	RoleSENCO:             {PermDashboardView, PermChildrenManage, PermDailyLogsManage},
	RoleOfficeAdmin:       {PermDashboardView, PermEnquiriesManage, PermChildrenManage, PermAttendanceManage},
	RoleFinanceOfficer:    {PermDashboardView, PermFinanceView, PermProcurementView, PermAuditView},
	RoleHROfficer:         {PermDashboardView, PermStaffManage, PermAuditView},
	RoleAdmissionsOfficer: {PermDashboardView, PermEnquiriesManage},
	RoleRoomLeader:        {PermDashboardView, PermChildrenManage, PermAttendanceManage, PermDailyLogsManage},
	RolePractitioner:      {PermDashboardView, PermChildrenManage, PermAttendanceManage, PermDailyLogsManage},
	RoleApprentice:        {PermDashboardView, PermDailyLogsManage},
	RoleKitchen:           {PermDashboardView, PermDailyLogsManage},
	RoleMaintenance:       {PermDashboardView},
	RoleExternalInspector: {PermDashboardView, PermAuditView}, // read-only auditor
}

// ── Permission metadata: label + category, for the grouped Permission Builder ─
type PermissionInfo struct {
	Key      Permission `json:"key"`
	Label    string     `json:"label"`
	Category string     `json:"category"`
}

// PermissionCatalogue lists every permission with a human label + category,
// ordered for display. The Permission Builder groups checkboxes by category.
var PermissionCatalogue = []PermissionInfo{
	{PermDashboardView, "View dashboard", "General"},
	{PermBranchesManage, "Manage branches (in scope)", "Organisation"},
	{PermBranchAdmin, "Branch lifecycle (create/delete/assign)", "Organisation"},
	{PermChildrenManage, "Manage children & rooms", "Children"},
	{PermAttendanceManage, "Child attendance register", "Children"},
	{PermDailyLogsManage, "Observations, safeguarding, medication", "Children"},
	{PermStaffManage, "Manage staff & rota", "Staff"},
	{PermUsersManage, "Manage user accounts", "Staff"},
	{PermEnquiriesManage, "Admissions / enquiries", "Admissions"},
	{PermFinanceView, "View finance & spend", "Finance"},
	{PermProcurementView, "View procurement", "Procurement"},
	{PermProcurementManage, "Manage procurement", "Procurement"},
	{PermSuppliersManage, "Manage suppliers", "Procurement"},
	{PermStoreManage, "Manage store (products/orders)", "Store"},
	{PermBlogManage, "Manage blog / CMS", "Content"},
	{PermAuditView, "View audit log", "Audit"},
}

// PermissionCategories is the display order of categories.
var PermissionCategories = []string{"General", "Organisation", "Children", "Staff", "Admissions", "Finance", "Procurement", "Store", "Content", "Audit"}

// ── DB-backed role permissions (B3): the static map above is the DEFAULT/seed.
// At startup the server loads role definitions from the `roles` collection into
// roleCache; edits via the Permission Builder refresh it. HasPermission reads
// the cache and falls back to the defaults, so it stays a pure lookup. ─────────
var (
	roleCacheMu sync.RWMutex
	roleCache   map[Role][]Permission // nil until loaded → fall back to defaults
	customRoles map[Role]string       // custom role slug → label
)

// SetRolePermissions swaps the effective role→permission map (called on startup
// and after any Permission Builder edit). Pass the full effective map.
func SetRolePermissions(m map[Role][]Permission, labels map[Role]string) {
	roleCacheMu.Lock()
	defer roleCacheMu.Unlock()
	roleCache = m
	customRoles = labels
}

func effectivePerms(role Role) []Permission {
	roleCacheMu.RLock()
	defer roleCacheMu.RUnlock()
	if roleCache != nil {
		if p, ok := roleCache[role]; ok {
			return p
		}
	}
	return rolePermissions[role]
}

// DefaultRolePermissions returns a copy of the built-in defaults (for seeding).
func DefaultRolePermissions() map[Role][]Permission {
	out := make(map[Role][]Permission, len(rolePermissions))
	for r, ps := range rolePermissions {
		cp := make([]Permission, len(ps))
		copy(cp, ps)
		out[r] = cp
	}
	return out
}

// BuiltInRoles returns every built-in role (management catalogue + customer).
func BuiltInRoles() []Role {
	return append(append([]Role{}, ManagementRoles...), RoleCustomer)
}

// IsCustomRole reports whether a role slug is a super-admin-created custom role.
func IsCustomRole(role Role) bool {
	roleCacheMu.RLock()
	defer roleCacheMu.RUnlock()
	_, ok := customRoles[role]
	return ok
}

// PermissionsFor returns the permission set granted to a role (nil-safe),
// reading the DB-backed cache with a fallback to the built-in defaults.
func PermissionsFor(role Role) []Permission {
	perms := effectivePerms(role)
	out := make([]Permission, len(perms))
	copy(out, perms)
	return out
}

// HasPermission reports whether a role has been granted a permission.
func HasPermission(role Role, perm Permission) bool {
	for _, p := range effectivePerms(role) {
		if p == perm {
			return true
		}
	}
	return false
}
