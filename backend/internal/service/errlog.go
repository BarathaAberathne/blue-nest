package service

import "log/slog"

// Best-effort side effects must never be SILENTLY best-effort (audit item 7:
// a failed MarkPaid left a paid order unpaid-looking, a failed PaymentCreate
// left Stripe money in flight with no local record, and a dropped
// safeguarding notification vanished without trace — all behind `_ =`).
// These helpers keep call sites one-line while guaranteeing a log trail.
//
// Level rule: a dropped WRITE of money or canonical data is an ERROR (state
// has diverged and someone must reconcile); a dropped notification or
// status propagation is a WARN (the underlying action succeeded).

func logErrorIf(err error, op string, args ...any) {
	if err != nil {
		slog.Error(op, append(args, "err", err)...)
	}
}

func logWarnIf(err error, op string, args ...any) {
	if err != nil {
		slog.Warn(op, append(args, "err", err)...)
	}
}
