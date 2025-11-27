# Environment Variables

```bash
NODE_ENV=production
HTTPS=true
APP_URL=https://your-scatola-magica-domain.com
DATABASE_URL=file:/data/scatola.db
UPLOAD_DIR=/data/uploads
MAX_CHUNK_SIZE=104857600
PARALLEL_UPLOADS=12
MAX_FILE_SIZE=0
OIDC_ISSUER=<YOUR_SSO_ISSUER>
OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>
OIDC_CLIENT_SECRET=your_client_secret
OIDC_ADMIN_GROUPS=admins
```

### Mandatory (for production instances)

- `NODE_ENV=production` Sets the Node.js environment to production mode for optimal performance and security.
- `DATABASE_URL=file:/data/scatola.db` SQLite database file location for storing file metadata and user data.

### Upload Configuration

- `UPLOAD_DIR=/data/uploads` Directory where uploaded files are stored.
- `MAX_CHUNK_SIZE=104857600` Maximum chunk size for resumable uploads (100MB default).
- `PARALLEL_UPLOADS=12` Number of parallel upload streams allowed.
- `MAX_FILE_SIZE=0` Maximum file size limit (0 = unlimited).

### Optional

- `HTTPS=true` Optional. Enables HTTPS mode for secure connections.
- `APP_URL=https://your-scatola-magica-domain.com` Force a base URL of your Scatola Magica instance. Required for SSO but optional otherwise - if you have trouble logging in with reverse proxy try setting this up as it will force the application to login using this exact url.
- `INTERNAL_API_URL=http://localhost:3000` Optional. URL used for internal API calls within the container. Defaults to `http://localhost:3000` if not set. Only needed if you're experiencing session validation issues behind a reverse proxy.

## SSO Configuration (Optional)

### Mandatory

- `APP_URL=https://your-scatola-magica-domain.com` Tells the OIDC of your choice what url you are trying to authenticate against.
- `OIDC_ISSUER=<YOUR_SSO_ISSUER>` URL of your OIDC provider (e.g., Authentik, Auth0, Keycloak).
- `OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>` Client ID from your OIDC provider configuration.

### Optional

- `OIDC_CLIENT_SECRET=your_client_secret` Optional. Client secret for confidential OIDC client authentication.
- `OIDC_ADMIN_GROUPS=admins` Optional. Comma-separated list of OIDC groups that should have admin privileges.
- `OIDC_GROUPS_SCOPE=groups` Optional. Scope to request for groups. Defaults to "groups". Set to empty string or "no" to disable for providers like Entra ID that don't support the groups scope.
- `OIDC_LOGOUT_URL=https://authprovider.local/realms/master/logout` Optional. Custom logout URL for global logout.
