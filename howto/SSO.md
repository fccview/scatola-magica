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
      - OIDC_GROUPS_SCOPE=groups # Scope to request for groups (set to empty string or "no" to disable for providers like Entra ID)
      - OIDC_LOGOUT_URL=https://authprovider.local/realms/master/logout # Custom logout URL for global logout
      - INTERNAL_API_URL=http://localhost:3000 # Use if getting 403 errors after SSO login (behind reverse proxy)
      - DISABLE_PASSWORD_LOGIN=true # Disable username/password login and only show OIDC login when OIDC is enabled
```

**Note**: The SSO button will appear on the login page when both `OIDC_ISSUER` and `OIDC_CLIENT_ID` are set. `APP_URL` is recommended but not required - if not set, it defaults to the request origin.

**Note**: When OIDC_CLIENT_SECRET is set, Scatola Magica switches to confidential client mode using client authentication instead of PKCE. This is more secure but requires provider support.

**Note**: When `DISABLE_PASSWORD_LOGIN=true` is set and OIDC is properly configured, only the OIDC login button will be shown on the login page. If OIDC is not configured, password login will still be available as a fallback.

Dev verified Providers:

- Auth0 (`OIDC_ISSUER=https://YOUR_TENANT.REGION.auth0.com`)
- Authentik (`OIDC_ISSUER=https://YOUR_DOMAIN/application/o/APP_SLUG/`)

Some provider's specific notes:

- **Google** provider doesn't support usage of `groups` with OIDC authentication, so do NOT set the `OIDC_ADMIN_GROUPS` environment variable.
- **Entra ID** provider allows usage of admin groups with `OIDC_ADMIN_GROUPS={Entra Group ID}` variable. For that, ensure to include optional `groups` claim in the 'Token Configuration' pane of your 'Enterprise Registration' AND define the environment variable to `OIDC_GROUPS_SCOPE=""` or `OIDC_GROUPS_SCOPE="no"`.

p.s. **First user to sign in via SSO when no local users exist becomes admin automatically.**

## Troubleshooting

### 403 Forbidden Error After SSO Login (Behind Reverse Proxy)

If you successfully authenticate via SSO but get redirected back to the login page, and your logs show:

```

MIDDLEWARE - sessionCheck: Response { ... status: 403 ... }

MIDDLEWARE - session is not ok

```

This means the app is trying to validate your session by calling its own API through the external URL, but your reverse proxy is blocking it.

**Solution**: Set the `INTERNAL_API_URL` environment variable:

```yaml
environment:
  - INTERNAL_API_URL=http://localhost:3000
```

This tells the app to use `localhost` for internal API calls instead of going through the reverse proxy. The default value is already `http://localhost:3000`, but explicitly setting it can help in some edge cases.

**Why this happens**: When `APP_URL` is set to your external domain (e.g., `https://scatola-magica.domain.com`), the middleware tries to validate sessions by making a fetch request to `https://scatola-magica.domain.com/api/auth/check-session`. This request goes through your reverse proxy, which may block it with a 403 Forbidden response due to security policies or misconfigurations.







