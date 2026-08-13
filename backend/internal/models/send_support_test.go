package models

import "testing"

// The SEND classifier is the single source every filter/KPI uses — lock its
// semantics: monitoring/sen_support/ehcp are "requiring support"; none and
// ended are not.
func TestSendStatusClassifier(t *testing.T) {
	active := []SendStatus{SendMonitoring, SendSupport, SendEHCP}
	for _, s := range active {
		if !SendStatusActive(s) {
			t.Errorf("%q must classify as active SEND", s)
		}
		if !ValidSendStatus(s) {
			t.Errorf("%q must be valid", s)
		}
	}
	inactive := []SendStatus{SendNone, SendEnded}
	for _, s := range inactive {
		if SendStatusActive(s) {
			t.Errorf("%q must NOT classify as active SEND", s)
		}
		if !ValidSendStatus(s) {
			t.Errorf("%q must still be a valid status value", s)
		}
	}
	if ValidSendStatus("banana") {
		t.Error("unknown status must be invalid")
	}
	if ValidSendPlanStatus("banana") {
		t.Error("unknown plan status must be invalid")
	}
	for _, s := range []SendPlanStatus{SendPlanNone, SendPlanDraft, SendPlanActive, SendPlanEnded} {
		if !ValidSendPlanStatus(s) {
			t.Errorf("plan status %q must be valid", s)
		}
	}
}

// Room provision never constrains children; it is just a label with two values.
func TestRoomProvision(t *testing.T) {
	if !ValidRoomProvision(ProvisionMainstream) || !ValidRoomProvision(ProvisionSendDedicated) {
		t.Error("both provisions must be valid")
	}
	if ValidRoomProvision("specialist") {
		t.Error("unknown provision must be invalid")
	}
}
