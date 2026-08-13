package models

import "testing"

// Lock the parent-visibility semantics: creating/approving never shares;
// only the explicit shared flag + approval makes a record parent-visible;
// safeguarding is categorically unshareable; sanitisation strips staff fields.
func TestDailyRecordParentVisibility(t *testing.T) {
	r := DailyRecord{Type: RecObservation}
	if r.ParentVisible() {
		t.Error("a fresh record must never be parent-visible")
	}
	r.ApprovalStatus = ApprovalApproved
	if r.ParentVisible() {
		t.Error("approval alone must never make a record parent-visible")
	}
	r.ParentShared = true
	if !r.ParentVisible() {
		t.Error("shared + approved must be parent-visible")
	}
	r.ApprovalStatus = ApprovalPending
	if r.ParentVisible() {
		t.Error("a shared record that lost approval must not be parent-visible")
	}
	if !(DailyRecord{Type: RecMeal}).Shareable() || (DailyRecord{Type: RecSafeguarding}).Shareable() {
		t.Error("meals shareable; safeguarding never")
	}
	// Legacy records (no approval_status) count as approved.
	legacy := DailyRecord{Type: RecMeal, ParentShared: true}
	if !legacy.ParentVisible() {
		t.Error("legacy approved + shared must be visible")
	}
}

func TestSanitizeForParent(t *testing.T) {
	r := DailyRecord{
		Type: RecIncident, Title: "Bumped knee", Detail: "Small graze", ActionTaken: "Cleaned + plaster",
		Witnesses: []string{"Staff A"}, OtherStaff: []string{"Staff B"}, ReportedTo: []string{"DSL"},
		SubmittedBy: "u1", SubmittedByName: "Submitter", ApprovedBy: "u2", ApprovedByName: "Approver",
		RejectionReason: "x", ParentSharedByID: "u2", ParentSharedBy: "Manager",
	}
	s := r.SanitizeForParent()
	if s.Witnesses != nil || s.OtherStaff != nil || s.ReportedTo != nil || s.SubmittedBy != "" ||
		s.SubmittedByName != "" || s.ApprovedBy != "" || s.ApprovedByName != "" || s.RejectionReason != "" || s.ParentSharedByID != "" {
		t.Errorf("staff-only fields must be stripped: %+v", s)
	}
	if s.Title != "Bumped knee" || s.ActionTaken != "Cleaned + plaster" || s.ParentSharedBy != "Manager" {
		t.Error("parent-relevant content must survive sanitisation")
	}
}
