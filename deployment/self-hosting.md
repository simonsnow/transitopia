# Running your own copy

How to deploy a fork of Transitopia on your own domain, Cloudflare account and VM. It's the same system as transitopia.org ([README.md](README.md)): a static site on Cloudflare Pages, the published data and map tiles in R2, and the server in Docker Compose on a VM. The differences are names, and that the VM can sit behind a **Cloudflare Tunnel** instead of Caddy and an origin certificate. [api-server-setup.md](api-server-setup.md) has the details this page refers to.

The example throughout is `transit.simonsnow.ca`. Cloudflare's free certificate covers one level of subdomains, so the hosts are siblings rather than children of the site's name:

| Host | Serves |
|---|---|
| `transit.simonsnow.ca` | The site (Cloudflare Pages) |
| `transit-api.simonsnow.ca` | The server, through the tunnel |
| `transit-data.simonsnow.ca` | The published transit data (R2 bucket `transitopia-data`, custom domain) |
| `transit-tiles.simonsnow.ca` | Basemap, cycling and overview tiles (the tile worker over R2 bucket `transitopia-maps`) |

R2 bucket names are per account, so a copy can keep `transitopia-maps`, `transitopia-data` and `transitopia-archive`, which the workflows and `infra/.env.example` use.

## What you need

- A domain on Cloudflare.
- A VM with **4 GB of RAM** or more and Docker ([README.md → Sizing](README.md#sizing)). Set `SERVER_MEM_LIMIT` in `infra/.env` (default `3g`) if the VM runs other services. Disk grows by roughly 250 MB a day with every feed recorded (observed stop times are kept indefinitely), so plan for a larger volume within months.
- Your own upstream keys: a [TransLink API key](https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources) (1,000 requests a day, per key) and an [aisstream.io](https://aisstream.io) key (3 connections per account; the server holds one per feed with vessels: SeaBus and BC Ferries). BC Transit, BC Ferries' schedule and BC's inland ferries need no key.

## 1. Cloudflare: storage and the site

1. **R2 buckets** ([README.md → Map tiles](README.md#map-tiles-map-tilestransitopiaorg), [→ Transit data](README.md#transit-data-datatransitopiaorg)):
   - `transitopia-data`, public through the custom domain `transit-data.simonsnow.ca`, with the CORS policy and Cache Rule described there, for `https://transit.simonsnow.ca` (and `http://localhost:5173`, and your Pages preview hosts).
   - `transitopia-maps`, no public access: the tile worker reads it.
   - `transitopia-archive`, private: backups, recordings, GTFS feeds.
2. **Tile worker:** a Worker from `deployment/worker.js`, with the R2 binding `BUCKET` → `transitopia-maps`, the variable `ALLOWED_ORIGINS` (`https://transit.simonsnow.ca,http://localhost:5173`), and the custom domain `transit-tiles.simonsnow.ca`.
3. **R2 tokens** ([api-server-setup.md, step 7](api-server-setup.md#7-r2-tokens)): one for the server (Object Read & Write on the three buckets) and one for GitHub Actions (Read & Write on `transitopia-maps` and `transitopia-data`).
4. **Pages project** from your fork ([README.md → The website](README.md#the-website-wwwtransitopiaorg)): production branch `prod`, root directory the repository root, build command `npm ci && npm run build -w @transitopia/web`, output `apps/web/dist`, custom domain `transit.simonsnow.ca`, and these **build environment variables** (they override `apps/web/.env.production`, so nothing domain-specific needs committing):

   | Variable | Value |
   |---|---|
   | `VITE_SITE_URL` | `https://transit.simonsnow.ca` |
   | `VITE_TRANSIT_API` | `https://transit-api.simonsnow.ca/` |
   | `VITE_TRANSIT_DATA` | `https://transit-data.simonsnow.ca/` |
   | `VITE_BASEMAP_TILES` | `https://transit-tiles.simonsnow.ca/protomaps-bc.json` |
   | `VITE_CYCLING_MAP_TILES_CDN` | `https://transit-tiles.simonsnow.ca/transitopia-cycling-british-columbia.json` |
   | `VITE_TRANSIT_OVERVIEW_TILES_CDN` | `https://transit-tiles.simonsnow.ca/` |

## 2. GitHub: tiles and deploys

In the fork's Settings → Secrets and variables → Actions:

- **Secrets for the tile workflows:** `RCLONE_CONFIG_TRANSITOPIA_MAPS_R2_ENDPOINT` (`https://<account id>.r2.cloudflarestorage.com`), and the Actions token as `RCLONE_CONFIG_TRANSITOPIA_MAPS_R2_ACCESS_KEY_ID` / `…_SECRET_ACCESS_KEY` and `RCLONE_CONFIG_TRANSITOPIA_DATA_R2_ACCESS_KEY_ID` / `…_SECRET_ACCESS_KEY`.
- **Secrets for deploys** ([api-server-setup.md, step 12](api-server-setup.md#12-automatic-deploys)): `DEPLOY_HOST` (the VM's address), `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`. GitHub's runners deploy over SSH, so the VM's SSH port must be reachable from the internet (key-only, [api-server-setup.md, step 4](api-server-setup.md#4-key-only-ssh)); the tunnel carries HTTP only.
- **Variable** `DEPLOY_COMPOSE_ARGS` = `-f infra/compose.yml -f infra/compose.tunnel.yml`, so deploys keep the tunnel's setup.

Forks start with scheduled workflows off: enable Actions, then run **Build Basemap** and **Build Cycling Map** once by hand (Actions → the workflow → Run workflow). They upload `protomaps-bc.pmtiles` (about 2 GB) and the cycling tiles to `transitopia-maps`, and rerun weekly and daily from `main`.

## 3. The VM

1. **Docker, the deploy user and the checkout** as in [api-server-setup.md, steps 2–5](api-server-setup.md#2-docker), with the repo cloned from your fork to `/opt/transitopia`. Skip the firewall rules that admit only Cloudflare to ports 80 and 443: nothing listens publicly; only SSH must be open.
2. **The tunnel:** in Cloudflare Zero Trust → Networks → Tunnels, add a public hostname `transit-api.simonsnow.ca` → `http://localhost:8787` to the VM's tunnel (`SERVER_PORT` in `infra/.env` if 8787 is taken, and the same port here). `infra/compose.tunnel.yml` publishes the server on the VM's loopback only and leaves Caddy out.
3. **Cache Rule** for `transit-api.simonsnow.ca`, as in [api-server-setup.md, step 9](api-server-setup.md#9-cloudflare) (paths starting with `/rt/` or `/regions/`; browser TTL "Respect origin TTL"). It matters: every visitor polls the live endpoint, and the edge cache is what keeps that off the VM.
4. **Configuration:** `cp infra/.env.example infra/.env` and fill it in ([api-server-setup.md, step 10](api-server-setup.md#10-configuration); no certificates with a tunnel), with:

   ```sh
   PUBLIC_URL=https://transit-api.simonsnow.ca
   SITE_URL=https://transit.simonsnow.ca
   ALLOWED_ORIGINS=https://transit.simonsnow.ca,http://localhost:5173
   SERVER_IMAGE=ghcr.io/<your GitHub login>/transitopia-server:prod
   # SERVER_MEM_LIMIT=2g   # on a VM shared with other services
   ```

   The GitHub OAuth app for `/admin` ([step 8](api-server-setup.md#8-github-oauth-app)) is optional; without it `/admin` can't sign in.
5. **First start:** push to your fork's `prod` (step 4 below) so the image exists, `docker login ghcr.io` on the VM if the package is private, then:

   ```sh
   # VM (deploy)
   cd /opt/transitopia
   docker compose -f infra/compose.yml -f infra/compose.tunnel.yml up -d
   docker compose -f infra/compose.yml -f infra/compose.tunnel.yml logs -f server
   ```

   The server applies its migrations, starts polling and streaming, and builds and publishes the transit data to `transitopia-data` (a few minutes), then daily at 03:30. Check `curl https://transit-api.simonsnow.ca/healthz` and `/rt/status`.

## 4. Deploying

Production deploys from `prod`, as upstream ([README.md → Branches](README.md#branches)): merge `main` into `prod` and push. Pages builds the site and `deploy_server.yml` builds the server's image into your GHCR and restarts it on the VM.
