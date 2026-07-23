// Package seedguard is a defense-in-depth check for the seed commands that
// unconditionally Drop() a collection before reseeding it (seed, seedchildren,
// seedstaff, seeddailylogs, seedgbp). The Makefile's _guard-not-prod already
// blocks `make seed-*`/`make docker-up`/`make docker-restart` on a host whose
// .env has APP_ENV=production, but that only protects invocations that go
// through `make` — a bare `go run ./cmd/seedchildren` (or the same binary run
// some other way against a real environment) bypasses it entirely and would
// silently wipe real data (e.g. a Famly-imported nursery, see cmd/seedfamly).
// RequireDrop pushes the same confirmation down into the binaries themselves,
// so it holds regardless of how they're invoked.
package seedguard

import (
	"fmt"
	"os"
)

// RequireDrop refuses unless SEED_ALLOW_DROP is explicitly set. `make`
// exports it for the targets it already gates behind _guard-not-prod, so the
// documented local workflow (make dev / docker-up / docker-restart /
// seed-all) is unaffected; any other invocation must opt in explicitly.
func RequireDrop(cmdName string) error {
	v := os.Getenv("SEED_ALLOW_DROP")
	if v == "1" || v == "true" {
		return nil
	}
	return fmt.Errorf(
		"%s refuses to drop and reseed its collection(s) outside `make` — SEED_ALLOW_DROP is not set. "+
			"If this is genuinely a throwaway dev/test database, re-run with SEED_ALLOW_DROP=1. "+
			"Never set this against an environment that has real imported data (see cmd/seedfamly)",
		cmdName,
	)
}
