package models

// BranchOverviewRow is one row of the enterprise branch list — the live rollup
// of a branch's operational state, aggregated from the child/staff/attendance/
// daily/enquiry modules by branch_slug (nothing duplicated).
type BranchOverviewRow struct {
	Slug            string  `json:"slug"`
	Name            string  `json:"name"`
	Ref             string  `json:"ref,omitempty"`
	Status          string  `json:"status"`
	ManagerID       string  `json:"manager_id,omitempty"`
	Children        int     `json:"children"`
	Capacity        int     `json:"capacity"`
	Occupancy       int     `json:"occupancy"`
	Staff           int     `json:"staff"`
	StaffPresent    int     `json:"staff_present"`
	Rooms           int     `json:"rooms"`
	Enquiries       int     `json:"enquiries"`
	NewEnquiries    int     `json:"new_enquiries"`
	AttendanceToday int     `json:"attendance_today"`
	SafeguardingOpen int    `json:"safeguarding_open"`
	MedicationDue   int     `json:"medication_due"`
	Rating          float64 `json:"rating"`
	Ofsted          string  `json:"ofsted,omitempty"`
	Performance     int     `json:"performance"`
	Lat             float64 `json:"lat,omitempty"`
	Lng             float64 `json:"lng,omitempty"`
}

// BranchActivityItem is one line of a branch's live activity feed.
type BranchActivityItem struct {
	Time string `json:"time"`
	Text string `json:"text"`
	Kind string `json:"kind"`
}

// BranchDashboard is the per-branch executive dashboard payload — a mini version
// of the MD Command Centre, scoped to one branch.
type BranchDashboard struct {
	Slug             string               `json:"slug"`
	Name             string               `json:"name"`
	Date             string               `json:"date"`
	ChildrenActive   int                  `json:"children_active"`
	ChildrenPresent  int                  `json:"children_present"`
	ChildrenExpected int                  `json:"children_expected"`
	AttendanceRate   int                  `json:"attendance_rate"`
	Capacity         int                  `json:"capacity"`
	Occupancy        int                  `json:"occupancy"`
	Available        int                  `json:"available"`
	StaffTotal       int                  `json:"staff_total"`
	StaffPresent     int                  `json:"staff_present"`
	StaffOnLeave     int                  `json:"staff_on_leave"`
	Rooms            int                  `json:"rooms"`
	Enquiries        int                  `json:"enquiries"`
	NewEnquiries     int                  `json:"new_enquiries"`
	MedicationDue    int                  `json:"medication_due"`
	SafeguardingOpen int                  `json:"safeguarding_open"`
	IncidentsToday   int                  `json:"incidents_today"`
	MealsServed      int                  `json:"meals_served"`
	Rating           float64              `json:"rating"`
	ReviewCount      int                  `json:"review_count"`
	Ofsted           string               `json:"ofsted,omitempty"`
	Performance      int                  `json:"performance"`
	Birthdays        []string             `json:"birthdays"`
	Activity         []BranchActivityItem `json:"activity"`
}
