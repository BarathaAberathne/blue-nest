package models

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
}

// PermissionsFor returns the permission set granted to a role (nil-safe).
func PermissionsFor(role Role) []Permission {
	perms := rolePermissions[role]
	out := make([]Permission, len(perms))
	copy(out, perms)
	return out
}

// HasPermission reports whether a role has been granted a permission.
func HasPermission(role Role, perm Permission) bool {
	for _, p := range rolePermissions[role] {
		if p == perm {
			return true
		}
	}
	return false
}
