# SSO with OIDC

`Scatola Magica` supports any OIDC provider (Authentik, Auth0, Keycloak, Okta, Google, EntraID, etc.) with these requirements:

- Supports PKCE (most modern providers do)
- Can be configured as a public client (no client secret needed)
- Provides standard OIDC scopes (openid, profile, email)

1. Configure your OIDC Provider:

- Client Type: Public
- Grant Type: Authorization Code with PKCE
- Scopes: openid, profile, email
- Redirect URI: https://YOUR_APP_HOST/api/oidc/callback
- Post-logout URI: https://YOUR_APP_HOST/

2. Get these values from your provider:

- Client ID
- OIDC Issuer URL (usually ends with .well-known/openid-configuration)

3. Set environment variables:

**Required** (to show the SSO button and enable OIDC login):

```yaml
services:
  scatola-magica:
    environment:
      - OIDC_ISSUER=https://YOUR_SSO_HOST/issuer/path
      - OIDC_CLIENT_ID=your_client_id
```

**Recommended** (for proper redirects, especially behind reverse proxies):

```yaml
      - APP_URL=https://your-scatola-magica-domain.com
```

**Optional** (security enhancements and advanced features):

```yaml
      - OIDC_CLIENT_SECRET=your_client_secret # Enable confidential client mode (if your provider requires it)
      - OIDC_ADMIN_GROUPS=admins # Map provider groups to admin role
      - OIDC_ADMIN_ROLES=admin # Map provider roles to admin role
      - OIDC_USER_GROUPS=family # Only allow these groups (plus admins) to sign in
      - OIDC_CLIENT_SECRET_FILE=/run/secrets/oidc_secret # Read any OIDC_* value from a file instead
      - OIDC_GROUPS_SCOPE=groups # Scope to request for groups (set to empty string or "no" to disable for providers like Entra ID)
      - OIDC_LOGOUT_URL=https://authprovider.local/realms/master/logout # Custom logout URL for global logout
      - DISABLE_PASSWORD_LOGIN=true # Disable username/password login and only show OIDC login when OIDC is enabled
```

**Note**: The SSO button will appear on the login page when both `OIDC_ISSUER` and `OIDC_CLIENT_ID` are set. `APP_URL` is recommended but not required - if not set, it defaults to the request origin.

**Note**: PKCE is always used. When `OIDC_CLIENT_SECRET` is set, the client also authenticates to the token endpoint (`client_secret_post`, falling back to `client_secret_basic`).

**Note**: When `DISABLE_PASSWORD_LOGIN=true` is set and OIDC is properly configured, only the OIDC login button will be shown on the login page. If OIDC is not configured, password login will still be available as a fallback.

Dev verified Providers:

- Auth0 (`OIDC_ISSUER=https://YOUR_TENANT.REGION.auth0.com`)
- Authentik (`OIDC_ISSUER=https://YOUR_DOMAIN/application/o/APP_SLUG/`)
- Rauthy (`OIDC_ISSUER=https://YOUR_DOMAIN/auth/v1`)

Some provider's specific notes:

- **Google** provider doesn't support usage of `groups` with OIDC authentication, so do NOT set the `OIDC_ADMIN_GROUPS` environment variable.
- **Entra ID** provider allows usage of admin groups with `OIDC_ADMIN_GROUPS={Entra Group ID}` variable. For that, ensure to include optional `groups` claim in the 'Token Configuration' pane of your 'Enterprise Registration' AND define the environment variable to `OIDC_GROUPS_SCOPE=""` or `OIDC_GROUPS_SCOPE="no"`.

p.s. **First user to sign in via SSO when no local users exist becomes admin automatically.**

## Troubleshooting

### Redirected back to the login page after SSO

The login page now shows why the sign-in failed, and the server log contains a `[oidc-callback]` line with the exact reason. The most common causes:

- **"Sign-in session expired or APP_URL does not match"**: the address in your browser is different from `APP_URL` (for example `http://192.168.1.10:1133` vs `https://files.example.com`). The temporary SSO cookies are set on one origin and the provider sends you back to the other. Always browse through the URL set in `APP_URL`.
- **"The identity provider rejected the login"**: wrong client secret, or the redirect URI registered at your provider is not exactly `APP_URL/api/oidc/callback`. The server log includes the provider's error response.
- **"Could not reach the identity provider"**: the container cannot reach `OIDC_ISSUER`. Check DNS and TLS from inside the container.

Set `DEBUGGER=true` to log the resolved claims.
