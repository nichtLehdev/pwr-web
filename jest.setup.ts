// Minimal env for modules that read configuration at import time.
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-1234";
// Magic-link helpers build absolute URLs; without a base URL they fall back to
// localhost and warn on every call.
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
