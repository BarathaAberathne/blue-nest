// Induction form field catalogue — mirrors the Child Induction Form PDF,
// section by section. The generic renderer (InductionSectionForm) draws each
// section from these definitions, so form evolution is a data change here,
// not new UI code. Allergy/dietary tag fields are wired to the taxonomy
// chips by the renderer (kind "tags"); those + medical notes WRITE THROUGH
// to the canonical Child record server-side.

export type FieldKind = "text" | "textarea" | "yesno" | "checkbox" | "tags";

export interface InductionField {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  /** For kind "tags": which taxonomy category feeds the chips. */
  taxonomy?: "allergy_type" | "dietary_label";
}

export const INDUCTION_FIELDS: Record<string, InductionField[]> = {
  child_details: [
    { key: "address", label: "Child's full home address", kind: "textarea" },
    { key: "birth_cert_seen", label: "Copy of birth certificate provided", kind: "yesno" },
    { key: "previous_childcare", label: "Previous childcare experience (setting, how long)", kind: "textarea" },
  ],
  family: [
    { key: "lives_with", label: "Name of parent(s)/carer(s) the child lives with", kind: "textarea" },
    { key: "family_notes", label: "Anything else about the family we should know", kind: "textarea" },
  ],
  legal_contact: [
    { key: "name", label: "Name of person with legal contact (S8 order)", kind: "text" },
    { key: "relationship", label: "Relationship to child", kind: "text" },
    { key: "phones", label: "Contact telephone numbers", kind: "text" },
    { key: "address", label: "Address", kind: "textarea" },
    { key: "arrangements", label: "Contact arrangements we need to be aware of", kind: "textarea", hint: "Reviewed by the manager only." },
  ],
  professionals: [
    { key: "nhs_number", label: "Child's NHS number", kind: "text" },
    { key: "gp_name", label: "GP name", kind: "text" },
    { key: "gp_phone", label: "GP telephone", kind: "text" },
    { key: "gp_address", label: "GP address", kind: "textarea" },
    { key: "health_visitor", label: "Health visitor (name, phone, address)", kind: "textarea" },
    { key: "social_care_worker", label: "Social care worker (name, phone, address)", kind: "textarea" },
    { key: "social_care_reason", label: "Reason for social care involvement", kind: "textarea", hint: "If a child protection plan exists, note it here without details." },
    { key: "dentist", label: "Dentist (name, phone, address)", kind: "textarea" },
    { key: "other_professional", label: "Any other professional (name, agency, role)", kind: "textarea" },
  ],
  collectors: [
    { key: "person1", label: "Authorised person 1 (name, relationship, address, phones, email)", kind: "textarea", hint: "Must be over 16. Staff check before releasing the child." },
    { key: "person2", label: "Authorised person 2 (name, relationship, address, phones, email)", kind: "textarea" },
    { key: "collection_password", label: "Password for collection by authorised persons", kind: "text" },
  ],
  health: [
    { key: "immunisations_confirmed", label: "Immunisations up to date for age (per the schedule)", kind: "yesno" },
    { key: "immunisation_notes", label: "Immunisation notes / exceptions", kind: "textarea" },
    { key: "health_record_seen", label: "Child's health record book seen to confirm dates", kind: "yesno" },
    { key: "medical_conditions", label: "Ongoing medical conditions", kind: "textarea" },
    { key: "external_agencies", label: "External agencies involved (paediatrician, SALT…)", kind: "textarea" },
    { key: "health_care_plan", label: "Does your child require a Health Care Plan?", kind: "yesno" },
  ],
  allergies_dietary: [
    { key: "allergy_tags", label: "Known allergies & food intolerances", kind: "tags", taxonomy: "allergy_type" },
    { key: "allergies", label: "Allergy details / notes", kind: "textarea", hint: "A risk assessment is completed for any known allergy." },
    { key: "dietary_tags", label: "Dietary requirements", kind: "tags", taxonomy: "dietary_label" },
    { key: "dietary_reqs", label: "Dietary details / notes", kind: "textarea" },
    { key: "medical_notes", label: "Medical notes for the child's record", kind: "textarea" },
  ],
  cultural: [
    { key: "ethnicity", label: "Ethnicity or cultural background", kind: "text" },
    { key: "religion", label: "Main religion in the family (if applicable)", kind: "text" },
    { key: "festivals", label: "Festivals/special occasions to acknowledge", kind: "textarea" },
    { key: "languages", label: "Language(s) spoken at home", kind: "text" },
    { key: "first_english_setting", label: "First experience of an English-speaking environment?", kind: "yesno" },
    { key: "bilingual_plan", label: "Bilingual support plan needed?", kind: "yesno" },
    { key: "settling_plan", label: "Agreed settling-in support", kind: "textarea" },
  ],
  routine: [
    { key: "sleep_pattern", label: "Sleep pattern", kind: "textarea" },
    { key: "feeding_routine", label: "Feeding routine?", kind: "yesno" },
    { key: "food_preferences", label: "Food preferences?", kind: "yesno" },
    { key: "pacifier", label: "Dummy or thumb?", kind: "yesno" },
    { key: "special_toy", label: "Special toy or comfort object", kind: "text" },
    { key: "enjoys", label: "Things your child enjoys doing at home", kind: "textarea" },
    { key: "other_info", label: "Other important information (likes, fears, special words)", kind: "textarea" },
  ],
  development: [
    { key: "difficulties", label: "Any difficulties (3+): speaking, listening, eating, walking, toileting…", kind: "textarea" },
    { key: "sen", label: "Special needs or disabilities", kind: "textarea" },
    { key: "sen_status", label: "Early Years Action / Action Plus / SEN Statement in place?", kind: "text" },
    { key: "support_needed", label: "Special support required in our setting", kind: "textarea" },
    { key: "two_year_check_done", label: "Two-year-old progress check already completed (24–36m)?", kind: "yesno" },
  ],
  equality: [
    { key: "ethnicity_category", label: "Ethnicity (monitoring/funding only — optional)", kind: "text" },
    { key: "sen_category", label: "SEN status category (monitoring only)", kind: "text" },
  ],
};

export const inductionStatusAccent: Record<string, "slate" | "amber" | "indigo" | "teal"> = {
  not_started: "slate", in_progress: "amber", submitted: "indigo", reviewed: "teal",
};

export const onboardingStatusLabel: Record<string, string> = {
  registration_started: "Registration started",
  induction_required: "Induction required",
  induction_in_progress: "Induction in progress",
  awaiting_review: "Awaiting review",
  finance_setup_required: "Finance setup required",
  ready_to_start: "Ready to start",
  active: "Active",
  withdrawn: "Withdrawn",
};

export const onboardingStatusAccent: Record<string, "slate" | "amber" | "indigo" | "teal" | "green" | "red" | "sky"> = {
  registration_started: "slate",
  induction_required: "amber",
  induction_in_progress: "amber",
  awaiting_review: "indigo",
  finance_setup_required: "sky",
  ready_to_start: "teal",
  active: "green",
  withdrawn: "red",
};
