# Deploy webhook

Tiny HTTP server that receives an authenticated `POST /deploy` and runs `docker compose pull && docker compose up -d` against the host's Docker daemon (the host socket is bind-mounted in — this container effectively has root on the host, so the token must stay secret and the port must never be published beyond `127.0.0.1`).

CI (`.github/workflows/docker-build.yml`) calls this over a Cloudflare Tunnel hostname after it pushes a new app image, so the Pi pulls and restarts within seconds of a build finishing instead of waiting on a polling interval.

## Environment variables

| Variable               | Default                        | Meaning                                                    |
| ----------------------- | ------------------------------- | ------------------------------------------------------------ |
| `DEPLOY_WEBHOOK_TOKEN`  | _(required, no default)_        | Bearer token expected on `Authorization: Bearer <token>`. Generate with `openssl rand -hex 32`. |
| `WEBHOOK_PORT`          | `9090`                          | Port the server listens on inside the container.             |
| `COMPOSE_FILE`          | `/workspace/docker-compose.yml` | Path *inside this container* to the compose file to operate on. |
| `COMPOSE_SERVICE`       | `app`                           | The compose service to pull + recreate.                      |

## Usage

Add it alongside the app in the deployment's `docker-compose.yml`:

```yaml
services:
  app:
    image: ghcr.io/<owner>/<repo>:latest
    restart: unless-stopped
    ports:
      - '127.0.0.1:3000:3000'
    volumes:
      - app-data:/opt/app/data # named volume - see note below

  deploy-webhook:
    image: ghcr.io/<owner>/<repo>-deploy-webhook:latest
    restart: unless-stopped
    ports:
      - '127.0.0.1:9090:9090' # loopback only - cloudflared reaches it from the host
    environment:
      - DEPLOY_WEBHOOK_TOKEN=${DEPLOY_WEBHOOK_TOKEN}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./docker-compose.yml:/workspace/docker-compose.yml:ro

volumes:
  app-data:
```

Then expose `deploy-webhook`'s port through your Cloudflare Tunnel ingress (e.g. an internal hostname routed to `http://localhost:9090`), and set the app repo's `DEPLOY_WEBHOOK_URL` / `DEPLOY_WEBHOOK_TOKEN` GitHub Actions secrets to that hostname + the same token.

### Why a named volume for app data

This container runs `docker compose` *inside a container*, against the *host's* Docker daemon (Docker-outside-of-Docker). Any relative bind-mount path in the compose file (e.g. `./data:/opt/app/data`) gets resolved by the `docker compose` CLI running inside *this* container, then handed to the host daemon as an absolute path — which won't exist on the host unless this container happens to see the project directory at the exact same absolute path the host does. A named volume sidesteps this entirely: the daemon manages it by name, no host path involved, so it works regardless of where the compose file or this container's bind-mounts live.

### Updating the webhook itself

This container doesn't include itself in the default `COMPOSE_SERVICE`, so a new `deploy-webhook` image isn't auto-applied (the webhook would be killing its own container mid-update, which is racy). When this image changes, update it manually on the Pi:

```sh
docker compose pull deploy-webhook && docker compose up -d deploy-webhook
```
