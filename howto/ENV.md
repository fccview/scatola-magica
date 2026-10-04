# Environment Variables

```bash
NODE_ENV=production
HTTPS=true
APP_URL=https://your-scatola-magica-domain.com
UPLOAD_DIR=/data/uploads
MAX_CHUNK_SIZE=104857600
PARALLEL_UPLOADS=12
MAX_FILE_SIZE=0
OIDC_ISSUER=<YOUR_SSO_ISSUER>
OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>
OIDC_CLIENT_SECRET=your_client_secret
OIDC_ADMIN_GROUPS=admins
DISABLE_PASSWORD_LOGIN=true
```

### Mandatory

- `NODE_ENV=production` Sets the Node.js environment to production mode for optimal performance and security.

### Upload Configuration

- `UPLOAD_DIR=/data/uploads` Directory where uploaded files are stored.
- `MAX_CHUNK_SIZE=104857600` Maximum chunk size for resumable uploads (100MB default).
- `PARALLEL_UPLOADS=12` Number of parallel upload streams allowed.
- `MAX_FILE_SIZE=0` Maximum file size limit (0 = unlimited).

### Optional

- `HTTPS=true` Optional. Enables HTTPS mode for secure connections.
- `APP_URL=https://your-scatola-magica-domain.com` Force a base URL of your Scatola Magica instance. Required for SSO but optional otherwise - if you have trouble logging in with reverse proxy try setting this up as it will force the application to login using this exact url.
- `AUDIT_LOG_DIR=/app/data/audit-logs` Optional. Directory where audit logs are stored. Defaults to `data/audit-logs` relative to the app root. Map a volume to this path if running as a non-root container user.
- `THUMBNAIL_CACHE_DIR=/app/data/thumbnails` Optional. Directory where generated image thumbnails are cached. Defaults to `data/thumbnails` relative to the app root. Map a volume to this path to persist the cache across container restarts.
- `ENCRYPTION_KEY=your-secret-key` Optional. Seeds the per-user key used to obfuscate folder paths in URLs and to protect cached passphrases in the browser. When set, every new user gets this same key; leave unset to generate a random key per user (recommended).
- `KEYS_DIR=/app/data/config/keys` Optional. Where PGP keys are stored. Defaults to `data/config/keys`.
- `TORRENTS_DATA_DIR=/app/data/config/torrents` Optional. Where torrent metadata is stored. Defaults to `data/config/torrents`.
- `DEV_ORIGINS=192.168.1.10,my-dev-host` Optional, development only. Extra origins allowed to reach the dev server.
- `BRUTEFORCE_PROTECTION=true` Optional. Locks out an IP for 15 minutes after 10 consecutive failed login attempts. Recommended for publicly exposed instances.
- `VALKEY_URL=valkey://valkey:6379` Optional. Stores the listing cache in Valkey (or any Redis compatible server) and relays live update events between instances. Supports `valkey://`, `valkeys://`, `redis://` and `rediss://` URLs, credentials included. Can also be read from a file with `VALKEY_URL_FILE`. Leave unset to use the built in in-memory cache. See [DOCKER.md](DOCKER.md#valkey-cache-optional).
- `VALKEY_PREFIX=scatola:` Optional. Prefix for every key and channel, useful when sharing one Valkey between apps. Defaults to `scatola:`.

## SSO Configuration (Optional)

### Mandatory

- `APP_URL=https://your-scatola-magica-domain.com` Tells the OIDC of your choice what url you are trying to authenticate against.
- `OIDC_ISSUER=<YOUR_SSO_ISSUER>` URL of your OIDC provider (e.g., Authentik, Auth0, Keycloak, Rauthy). The full `.well-known/openid-configuration` URL also works.
- `OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>` Client ID from your OIDC provider configuration.

### Optional

- `OIDC_CLIENT_SECRET=your_client_secret` Optional. Client secret for confidential OIDC client authentication. Both `client_secret_post` and `client_secret_basic` are supported.
- `OIDC_ISSUER_FILE`, `OIDC_CLIENT_ID_FILE`, `OIDC_CLIENT_SECRET_FILE` Optional. Read the matching value from a file (Docker secrets). Takes precedence over the plain variable.
- `OIDC_ADMIN_GROUPS=admins` Optional. Comma-separated list of OIDC groups that should have admin privileges.
- `OIDC_ADMIN_ROLES=admin` Optional. Comma-separated list of OIDC roles (`roles` claim) that should have admin privileges.
- `OIDC_USER_GROUPS=family,friends` Optional. When set, only members of these groups (or admins) can sign in.
- `OIDC_USER_ROLES=user` Optional. When set, only users with these roles (or admins) can sign in.
- `OIDC_GROUPS_SCOPE=groups` Optional. Scope to request for groups. Defaults to "groups". Set to empty string or "no" to disable for providers like Entra ID that don't support the groups scope.
- `OIDC_LOGOUT_URL=https://authprovider.local/realms/master/logout` Optional. Custom logout URL for global logout.
- `DISABLE_PASSWORD_LOGIN=true` Optional. When set to "true" and OIDC is properly configured, disables username/password login and only shows OIDC login. If OIDC is not configured, password login will still be available as a fallback.
