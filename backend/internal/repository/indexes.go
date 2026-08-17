package repository

import (
	"context"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
)

// ensureIndexes creates the given indexes at boot, logging every failure —
// NEVER swallowing it. Index creation must stay non-fatal (a transient error
// can't be allowed to block startup), but a silently-failed index is worse
// than a loud one: the app boots looking healthy with neither the performance
// nor the uniqueness guarantee (the audit found five `_, _ =` call sites).
// Every repository's boot-time index work goes through here.
func ensureIndexes(colName string, col *mongo.Collection, idx ...mongo.IndexModel) {
	if len(idx) == 0 {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	for _, m := range idx {
		if _, err := col.Indexes().CreateOne(ctx, m); err != nil {
			name := ""
			if m.Options != nil && m.Options.Name != nil {
				name = *m.Options.Name
			}
			slog.Warn("could not create index — queries fall back to collection scans and any uniqueness guarantee is ABSENT until this is fixed",
				"collection", colName, "index", name, "err", err)
		}
	}
}

// dropIndexIfExists removes a legacy index by name, best-effort — used when an
// index definition is superseded (e.g. re-shaped to be org-prefixed) so old
// deployments don't carry both forever. "Not found" is the normal case on
// fresh databases and is not logged.
func dropIndexIfExists(colName string, col *mongo.Collection, name string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := col.Indexes().DropOne(ctx, name); err != nil {
		if cmdErr, ok := err.(mongo.CommandError); ok && cmdErr.Name == "IndexNotFound" {
			return
		}
		slog.Warn("could not drop legacy index", "collection", colName, "index", name, "err", err)
	}
}
