# Production MongoDB backups

Nightly `mongodump` of the prod database on the droplet, with integrity
checking, 14-day retention, and an off-host copy to DO Spaces. Closes the
platform-audit finding that **no automated backup existed at all** for a
database holding safeguarding records and children's PII.

| Piece | Purpose |
|---|---|
| `mongo-backup.sh` | One backup pass: dump → verify → prune → off-host copy |
| `../bluenest-backup.service` | systemd oneshot wrapper (same pattern as `bluenest-deploy.service`) |
| `../bluenest-backup.timer` | Nightly at 02:30 UTC, `Persistent=true` |

The script dumps **through the running mongo container** (`docker compose exec
mongodb mongodump`), so nothing extra is installed on the host and the prod
overlay's authentication just works — credentials are read from the droplet's
`.env` and forwarded to the container **by name**, never appearing in the
host's process list.

## Install on the droplet (one-time)

```bash
ssh deploy@165.232.47.89
cd ~/app && git pull   # or let auto-deploy sync main first

# 1. Log file writable by the deploy user
sudo touch /var/log/bluenest-backup.log
sudo chown deploy:deploy /var/log/bluenest-backup.log

# 2. Units
sudo cp deploy/bluenest-backup.service deploy/bluenest-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bluenest-backup.timer

# 3. Prove it works right now (don't wait for 02:30)
sudo systemctl start bluenest-backup.service
tail -20 /var/log/bluenest-backup.log
ls -lh ~/backups/mongo/
```

## Off-host copy (do this — a droplet-only backup dies with the droplet)

Create a DO Space (e.g. `bluenest-backups`, same region as the droplet), then:

```bash
sudo apt-get install -y rclone
rclone config   # new remote "spaces", type s3, provider DigitalOcean,
                # endpoint e.g. lon1.digitaloceanspaces.com, + Spaces keys
```

Uncomment and set in `/etc/systemd/system/bluenest-backup.service`:

```
Environment=BACKUP_RCLONE_REMOTE=spaces:bluenest-backups/mongo
```

then `sudo systemctl daemon-reload && sudo systemctl start bluenest-backup.service`
and check the log shows `off-host copy OK`. Until this is configured every run
logs a loud `WARN … LOCAL-ONLY` so the gap can't be forgotten.

## Restore drill (run once now, then quarterly)

An untested backup is a hope, not a plan. Full drill — restore the latest
archive into a **throwaway** container and sanity-check counts:

```bash
LATEST=$(ls -t ~/backups/mongo/*.archive.gz | head -1)
gunzip -t "$LATEST" && echo "gzip OK"

docker run -d --name restore-drill -p 127.0.0.1:27099:27017 mongo:7
docker exec -i restore-drill mongorestore --archive --gzip --drop < "$LATEST"
docker exec restore-drill mongosh blue_nest_montessori --quiet --eval \
  '["children","staff","enquiries","orders","staff_attendance"].forEach(c =>
     print(c, db[c].countDocuments({})))'
docker rm -f restore-drill
```

Counts should match production expectations. **Restoring into the real prod
container** uses the same archive with the compose-managed service (this is
destructive — `--drop` replaces collections):

```bash
cd ~/app
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T \
  -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD mongodb sh -c \
  'exec mongorestore -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" \
     --authenticationDatabase admin --archive --gzip --drop' < "$LATEST"
```

## Notes

- **Retention:** 14 days local + 14 days remote (`RETENTION_DAYS` in the
  service unit). Raise the remote side once Spaces lifecycle rules are set.
- **Verification:** every run gzip-tests the archive and fails if it's under
  10 KB — a truncated dump is treated as a failed backup, visible in
  `systemctl status bluenest-backup.service`.
- **This is not `deploy/baseline/`** — that is the local-dev fixture snapshot
  (`make baseline-reset` is destructive). The backup script never touches it.
- Longer-term: DO Managed MongoDB gives point-in-time recovery and removes
  this whole layer; this kit is the bridge until that migration.
