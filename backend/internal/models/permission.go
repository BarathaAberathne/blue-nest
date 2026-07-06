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
	PermBranchesManage    Permission = "branches.manage"
	PermUsersManage       Permission = "users.manage" // account management (super admin)
)

// AllPermissions is the full set, granted to super_admin/admin.
var AllPermissions = []Permission{
	PermDashboardView, PermStoreManage, PermBlogManage, PermEnquiriesManage,
	PermProcurementView, PermProcurementManage, PermSuppliersManage,
	PermFinanceView, PermAuditView, PermBranchesManage, PermUsersManage,
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
	},
	RoleBranchManager: {
		PermDashboardView, PermStoreManage, PermBlogManage, PermEnquiriesManage,
		PermProcurementView, PermProcurementManage, PermSuppliersManage,
		PermFinanceView, PermAuditView, PermBranchesManage,
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
