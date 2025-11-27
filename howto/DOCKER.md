# Docker Compose Configuration Guide

This guide explains every configuration value in the `docker-compose.yml` file for Scatola Magica.

## Complete Docker Compose Example

```yaml
services:
  scatola-magica:
    image: ghcr.io/fccview/scatola-magica:latest
    container_name: scatola-magica
    user: "1000:1000"
    ports:
      - "1133:3000"
    volumes:
      - ./uploads:/app/data/uploads:rw
      - ./config:/app/data/config:rw
      - ./cache:/app/.next/cache:rw
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    # platform: linux/arm64
```

**note**: Scroll down if you are running this with podman or via rootless docker

## Container Configuration

```yaml
image: ghcr.io/fccview/scatola-magica:latest
```

Specifies the Docker image to use. This pulls the latest stable version of Scatola Magica from GitHub Container Registry. You can use `latest`, `main`, `develop` _(for beta features when available)_ and the specific tag numbers for amd/arm specifically.

```yaml
container_name: scatola-magica
```

Sets a custom name for the running container. This makes it easier to manage with docker commands.

```yml
user: "1000:1000"
```

Runs the container with the specified user and group ID. This should match your host system user for proper file permissions.

```yaml
userns_mode: keep-id
```

**Required for Podman and rootless Docker environments.** This option preserves the user namespace when mounting volumes, ensuring the container user (1000:1000) can properly access mounted directories.

**When you need this option:**

- Running with Podman instead of Docker
- Running Docker in rootless mode
- Getting permission denied errors when writing to mounted volumes (e.g., `EACCES: permission denied, open '/app/data/uploads/temp/file.txt'`)

**Why it's needed:** In rootless environments, the container user cannot become root to access mounted volumes. The `userns_mode: keep-id` option maps the container user's UID/GID directly to the host's UID/GID, allowing proper file access. More info [here](https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md#using-volumes)

## Network Configuration

```yaml
ports:
  - "1133:3000"
```

Maps host port 1133 to container port 3000. You can change `1133` to any available port on your host system.

## Storage Configuration

```yaml
volumes:
  - ./uploads:/app/data/uploads:rw
  - ./config:/app/data/config:rw
  - ./cache:/app/.next/cache:rw
```

Mounts host directories into the container for persistent data storage. Here's some details:

- `- ./uploads:/app/data/uploads:rw` Mounts your local `uploads` directory to `/app/data/uploads` inside the container with read-write permissions. This stores all uploaded files and folders.
- `- ./config:/app/data/config:rw` Mounts your local `config` directory to `/app/data/config` inside the container with read-write permissions. This contains user data, preferences, sessions, and avatars.
- `- ./cache:/app/.next/cache:rw` Optional mount for Next.js build cache. Improves performance by persisting cache between container restarts.

## Runtime Configuration

```yaml
restart: unless-stopped
```

Automatically restarts the container unless it was explicitly stopped. Ensures your app stays running.

## Environment Variables

```yaml
environment:
  - NODE_ENV=production
  - HTTPS=true
  - APP_URL=https://your-scatola-magica-domain.com
  - OIDC_ISSUER=<YOUR_SSO_ISSUER>
  - OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>
  - DATABASE_URL=file:/data/scatola.db
  - UPLOAD_DIR=/data/uploads
  - MAX_CHUNK_SIZE=104857600
  - PARALLEL_UPLOADS=12
  - MAX_FILE_SIZE=0
```

- `- NODE_ENV=production` Sets the Node.js environment to production mode for optimal performance and security.
- `- HTTPS=true` Optional. Enables HTTPS mode for secure connections.
- `- APP_URL=https://your-scatola-magica-domain.com` Base URL of your Scatola Magica instance. Required for secure session (https) and SSO.
- `- DATABASE_URL=file:/data/scatola.db` SQLite database file location for storing metadata.
- `- UPLOAD_DIR=/data/uploads` Directory where uploaded files are stored.
- `- MAX_CHUNK_SIZE=104857600` Maximum chunk size for resumable uploads (100MB default).
- `- PARALLEL_UPLOADS=12` Number of parallel upload streams allowed.
- `- MAX_FILE_SIZE=0` Maximum file size limit (0 = unlimited).

### SSO Configuration (Optional)

- `- OIDC_ISSUER=<YOUR_SSO_ISSUER>` URL of your OIDC provider (e.g., Authentik, Auth0, Keycloak).
- `- OIDC_CLIENT_ID=<YOUR_SSO_CLIENT_ID>` Client ID from your OIDC provider configuration.
- `- OIDC_CLIENT_SECRET=your_client_secret` Optional. Client secret for confidential OIDC client authentication.
- `- OIDC_ADMIN_GROUPS=admins` Optional. Comma-separated list of OIDC groups that should have admin privileges.

## Platform Configuration

```yaml
platform: linux/arm64
```

Optional. Specifies the target platform. Uncomment this line if running on ARM64 systems (like Apple Silicon Macs or Raspberry Pi).

## Testing with Docker Compose

For local testing without deploying images, you can use the provided `docker-compose.test.yml`:

```bash
# Build and run locally
docker compose -f docker-compose.test.yml up --build

# Or run in background
docker compose -f docker-compose.test.yml up -d --build
```

This builds the image from your local source code instead of pulling from the registry.
