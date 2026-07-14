package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RoleDefinition is a role and its granted permissions, stored in the `roles`
// collection so Super Admin can edit permission sets and create custom roles
// (Phase B3). Built-in roles are seeded from the static defaults in
// permission.go; the effective set is cached for HasPermission.
type RoleDefinition struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"  json:"id"`
	Name        Role               `bson:"name"           json:"name"`  // slug (unique)
	Label       string             `bson:"label"          json:"label"` // human name
	Permissions []Permission       `bson:"permissions"    json:"permissions"`
	IsCustom    bool               `bson:"is_custom"      json:"is_custom"`
	Dashboard   string             `bson:"dashboard,omitempty" json:"dashboard,omitempty"` // default dashboard profile (B3.3)
	CreatedAt   time.Time          `bson:"created_at"     json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"     json:"updated_at"`
}

// RoleLabels are the human names for the built-in role catalogue.
var RoleLabels = map[Role]string{
	RoleSuperAdmin:        "Super Admin",
	RoleAdmin:             "Administrator",
	RoleDirector:          "Group Director",
	RoleRegionalManager:   "Regional Manager",
	RoleBranchManager:     "Branch Manager",
	RoleDeputyManager:     "Deputy Manager",
	RoleEYFSLead:          "EYFS Lead",
	RoleSENCO:             "SENCO",
	RoleOfficeAdmin:       "Office Administrator",
	RoleFinanceOfficer:    "Finance Officer",
	RoleHROfficer:         "HR Officer",
	RoleAdmissionsOfficer: "Admissions Officer",
	RoleRoomLeader:        "Room Leader",
	RolePractitioner:      "Nursery Practitioner",
	RoleApprentice:        "Apprentice / Trainee",
	RoleKitchen:           "Kitchen Staff",
	RoleMaintenance:       "Cleaner / Maintenance",
	RoleExternalInspector: "External Inspector",
	RoleFinance:           "Finance (legacy)",
	RoleAdmissions:        "Admissions (legacy)",
	RoleProcurement:       "Procurement (legacy)",
	RoleStaff:             "Staff",
	RoleCustomer:          "Parent / Customer",
}

// RoleLabel returns a human label for a role (falls back to the slug).
func RoleLabel(role Role) string {
	if l, ok := RoleLabels[role]; ok {
		return l
	}
	return string(role)
}
