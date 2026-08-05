#!/usr/bin/env python3
"""
Baseline LIFECYCLE builder (PII-free).

Given a structural base already in the DB (branches + rooms + real-named staff +
children with room assignments, e.g. from the seeds), this drives the real admin
API to layer on the operational lifecycle a manual tester needs:

  - staff PINs (kiosk)                - rota shifts (this week)
  - staff attendance (today)          - child attendance (today)
  - terms (per active branch)         - leave requests in every state (four-eyes)
  - enquiries across EVERY pipeline stage (incl. 3 real registrations)
  - a kiosk device per active branch

Everything goes through the API so org_id / refs / validation / four-eyes are all
correct by construction. It reads staff/children from the API (no names baked in)
and uses generic synthetic names only for enquiries, so this file carries no PII.

Run (backend must be up on :8080):  python3 scripts/seed-baseline-lifecycle.py
Then snapshot it:                    make baseline-snapshot
"""
import json, os, urllib.request, urllib.error, datetime, random

BASE = os.environ.get("API_BASE", "http://localhost:8080/api/v1")
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
TODAY = datetime.date(2026, 8, 4)   # fixed for a deterministic baseline
random.seed(42)


def envval(key):
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip()
    return None


def d(delta):
    return (TODAY + datetime.timedelta(days=delta)).isoformat()


stats = {}
def bump(k, ok=True):
    s = stats.setdefault(k, [0, 0]); s[0 if ok else 1] += 1


def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, (json.loads(e.read().decode() or "{}"))
    except Exception as e:
        return 0, {"error": str(e)}


def data_list(res):
    v = res.get("data", res)
    if isinstance(v, list):
        return v
    if isinstance(v, dict):
        return v.get("items", [])
    return []


def login(email, key):
    st, r = call("POST", "/admin/auth/login", body={"email": email, "password": envval(key)})
    assert st == 200, f"login {email} -> {st} {r}"
    return r["data"]["access_token"]


def main():
    ADMIN = login("admin@bluenest.uk", "DEFAULT_ADMIN_PASSWORD")
    DIRECTOR = login("director@bluenest.uk", "DEFAULT_DIRECTOR_PASSWORD")
    print("logged in: admin + director")

    staff = data_list(call("GET", "/admin/staff?limit=500", ADMIN)[1])
    kids = data_list(call("GET", "/admin/children?limit=1000", ADMIN)[1])
    print(f"structural base: {len(staff)} staff, {len(kids)} children")
    active = ["harrow", "pinner", "borehamwood"]
    staff_by = {b: [s for s in staff if s.get("branch_slug") == b] for b in active}
    kids_by = {b: [k for k in kids if k.get("branch_slug") == b] for b in active}

    # terms
    for b in active:
        for name, s0, e0 in [("Autumn Term 2026", "2026-09-01", "2026-12-18"),
                             ("Summer Term 2026", "2026-04-20", "2026-07-24")]:
            st, _ = call("POST", "/admin/terms", ADMIN, {"branch_slug": b, "name": name, "start_date": s0, "end_date": e0})
            bump("terms", st in (200, 201))

    # staff PINs
    for i, s in enumerate(staff[:15]):
        st, _ = call("PUT", f"/admin/staff/{s['id']}/pin", ADMIN, {"pin": f"{1000 + i:04d}"})
        bump("staff_pins", st in (200, 201, 204))

    # rota shifts, this week Mon-Fri
    monday = TODAY - datetime.timedelta(days=TODAY.weekday())
    for b in active:
        for s in staff_by[b][:12]:
            for wd in range(5):
                day = (monday + datetime.timedelta(days=wd)).isoformat()
                body = {"staff_id": s["id"], "date": day, "start_time": "08:00", "end_time": "17:00"}
                if s.get("room_id"):
                    body["room_id"] = s["room_id"]
                st, _ = call("POST", "/admin/shifts", ADMIN, body)
                bump("shifts", st in (200, 201))

    # staff attendance today (~70% in), then normalise arrival times
    present = []
    for b in active:
        pool = staff_by[b]
        for s in pool[:max(1, int(len(pool) * 0.7))]:
            st, _ = call("POST", "/admin/staff-attendance/clock-in", ADMIN, {"staff_id": s["id"], "date": d(0)})
            if st in (200, 201):
                present.append(s)
            bump("staff_clock_in", st in (200, 201))

    # child attendance today
    for b in active:
        for k in kids_by[b]:
            r = random.random()
            if r < 0.82:
                st, _ = call("POST", "/admin/attendance/check-in", ADMIN, {"child_id": k["id"], "date": d(0)})
                bump("child_present", st in (200, 201))
            elif r < 0.92:
                st, _ = call("PATCH", "/admin/attendance/mark", ADMIN, {"child_id": k["id"], "date": d(0), "status": "absent"})
                bump("child_absent", st in (200, 201))
            elif r < 0.97:
                st, _ = call("PATCH", "/admin/attendance/mark", ADMIN, {"child_id": k["id"], "date": d(0), "status": "sick"})
                bump("child_sick", st in (200, 201))

    # leave in every state (applied by admin, approved/declined by director = four-eyes).
    # Ranges are WEEKDAY-ONLY (Mon-Fri) so no request starts/ends on a weekend
    # (weekends are non-working days anyway).
    next_monday = TODAY + datetime.timedelta(days=(7 - TODAY.weekday()) % 7 or 7)
    def weekday_leave_range(i):
        start = next_monday + datetime.timedelta(days=(i // 5) * 7 + (i % 3))  # Mon/Tue/Wed of a future week
        end = start + datetime.timedelta(days=i % 3)                            # +0..2 working days -> <= Fri
        return start.isoformat(), end.isoformat()
    targets = [s for s in staff if s not in present][:12] or staff[:12]
    ids = []
    for i, s in enumerate(targets):
        typ = ["leave", "leave", "sick", "unpaid_leave", "dependant_sick", "maternity"][i % 6]
        start_date, end_date = weekday_leave_range(i)
        st, res = call("POST", "/admin/leave-requests", ADMIN, {
            "staff_id": s["id"], "type": typ, "start_date": start_date, "end_date": end_date,
            "reason": {"leave": "Family holiday", "sick": "Unwell", "unpaid_leave": "Personal",
                       "dependant_sick": "Child unwell", "maternity": "Maternity leave"}.get(typ, "")})
        bump("leave_applied", st in (200, 201))
        if st in (200, 201) and isinstance(res.get("data"), dict):
            ids.append(res["data"].get("id"))
    for i, lid in enumerate([x for x in ids if x]):
        if i % 3 == 0:
            bump("leave_approved", call("POST", f"/admin/leave-requests/{lid}/approve", DIRECTOR)[0] in (200, 201))
        elif i % 3 == 1:
            bump("leave_declined", call("POST", f"/admin/leave-requests/{lid}/decline", DIRECTOR, {"reason": "Insufficient cover"})[0] in (200, 201))

    # enquiries across every stage
    fns = ["Olivia","Noah","Amelia","Leo","Aria","Ethan","Mia","Zayn","Freya","Kai",
           "Sophia","Ibrahim","Isla","Ronan","Maya","Dylan","Ava","Yusuf","Grace","Theo"]
    lns = ["Patel","Khan","Smith","Ali","Jones","Ahmed","Brown","Shah","Wilson","Hussain",
           "Taylor","Begum","Evans","Malik","Roberts","Iqbal","Walker","Kaur","Green","Nair"]
    stages = ["new","contacted","awaiting_reply","booked_visit","visit_completed",
              "pending_confirmation","cancelled","lost","spam"]
    srcs = ["website","referral","google","facebook","walk_in","phone"]
    ei = 0
    for stage in stages:
        for _ in range(5 if stage in ("new", "contacted") else 3):
            fn, ln = fns[ei % 20], lns[(ei * 3) % 20]
            br = active[ei % 3]
            st, res = call("POST", "/contact", body={
                "name": f"{fn} {ln}", "email": f"{fn.lower()}.{ln.lower()}{ei}@example.com",
                "phone": f"07{random.randint(100000000, 999999999)}", "branch": br,
                "child_age": random.choice(["under 2", "2-3 years", "3-5 years"]),
                "enquiry_type": random.choice(["admission", "general", "tour"]),
                "message": f"Interested in a place at {br.title()}.", "source": srcs[ei % len(srcs)], "consent": True})
            bump("enquiry_created", st in (200, 201))
            ei += 1
            if st in (200, 201) and stage != "new" and isinstance(res.get("data"), dict):
                eid = res["data"].get("id")
                if eid:
                    bump("enquiry_staged", call("PATCH", f"/admin/enquiries/{eid}/status", ADMIN, {"status": stage})[0] in (200, 201))

    # 3 real registrations (creates the Child too)
    for i, (fn, ln) in enumerate([("Harper", "Dawson"), ("Musa", "Rahman"), ("Elena", "Costa")]):
        st, res = call("POST", "/contact", body={
            "name": f"{fn} {ln} (parent)", "email": f"reg{i}.{ln.lower()}@example.com",
            "phone": f"07{random.randint(100000000, 999999999)}", "branch": active[i],
            "child_age": "2-3 years", "enquiry_type": "admission", "message": "Ready to register.",
            "source": "website", "consent": True})
        if st in (200, 201):
            eid = res["data"]["id"]
            dob = (datetime.date(2023, 3, 1) + datetime.timedelta(days=i * 40)).isoformat()
            sr, _ = call("POST", f"/admin/enquiries/{eid}/register", ADMIN, {
                "registration_date": "2026-08-01T00:00:00Z", "expected_start_date": "2026-09-01T00:00:00Z",
                "child_age_group": "2-3 years", "funding_type": "funded", "room_allocation": "",
                "child_first_name": fn, "child_last_name": ln, "child_dob": dob,
                "child_gender": ["female", "male", "female"][i]})
            bump("enquiry_registered", sr in (200, 201))

    # kiosk devices
    for b in active:
        bump("kiosk_devices", call("POST", "/admin/kiosk-devices", ADMIN,
                                   {"name": f"{b.title()} Entrance Tablet", "branch_slug": b})[0] in (200, 201))

    print("\n=== lifecycle build summary (ok/fail) ===")
    for k in sorted(stats):
        ok, fail = stats[k]
        print(f"  {k:22} ok={ok:4} fail={fail:3}" + ("  <-- check" if fail else ""))
    print("\nNote: normalise today's staff arrival times and run `make baseline-snapshot` after this.")


if __name__ == "__main__":
    main()
