// Runs once, when the mongo container's data volume is empty.
//
// At this point the mongo image's own entrypoint has already created the root
// user from MONGO_INITDB_ROOT_USERNAME / MONGO_INITDB_ROOT_PASSWORD and is
// running this script authenticated as root.
//
// We create a database-scoped application user so the Go backend never has
// to connect with root credentials. The application database name is taken
// from MONGO_INITDB_DATABASE (set in docker-compose.prod.yml) and the app
// credentials from MONGO_APP_USERNAME / MONGO_APP_PASSWORD.
//
// This script is idempotent for first-run: if the volume is ever wiped and
// the container reinitialised, the user is recreated from the same env vars.
// Changing the password after first run requires a manual `db.changeUserPassword`
// — the init script does NOT run on subsequent starts.

const dbName  = process.env.MONGO_INITDB_DATABASE || "blue_nest_montessori";
const appUser = process.env.MONGO_APP_USERNAME;
const appPass = process.env.MONGO_APP_PASSWORD;

if (!appUser || !appPass) {
  print("[mongo-init] MONGO_APP_USERNAME or MONGO_APP_PASSWORD not set — skipping app-user creation.");
  print("[mongo-init] The backend will be unable to authenticate until these are configured and the data volume is reset.");
  quit(1);
}

const appDb = db.getSiblingDB(dbName);

appDb.createUser({
  user: appUser,
  pwd:  appPass,
  roles: [{ role: "readWrite", db: dbName }],
});

print(`[mongo-init] Created application user '${appUser}' with readWrite on '${dbName}'.`);
