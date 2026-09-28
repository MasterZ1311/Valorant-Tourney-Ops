# Deployment & Environment Guide — VTO

## 1. System Requirements
- **Node.js**: v20.x or v22.x LTS
- **Database**: PostgreSQL 15+
- **Memory**: Minimum 1GB RAM (2GB+ recommended for live multi-client events)
- **Local Network**: Fast low-latency Gigabit LAN or venue Wi-Fi for multi-device operations

---

## 2. Environment Variables
Create `.env` by copying the template `.env.example`:
```bash
cp .env.example .env
```

Key environment configurations:
```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vto?schema=public"

# Auth Secret & Sessions (Generate with: openssl rand -base64 32)
AUTH_SECRET="vto-super-secret-auth-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Application Settings
NODE_ENV="production"
PORT=3000
```

---

## 3. Quick Start with Docker Compose (Recommended)

The fastest, cleanest way to spin up both PostgreSQL and the Next.js tournament operations server with zero manual database configuration:

```bash
# 1. Clone repository and copy environment configuration
cp .env.example .env

# 2. Build and launch database and application containers
docker compose up -d --build

# 3. Apply Prisma migrations and seed initial data
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed
```

The application is now live at `http://localhost:3000`.

To stop services:
```bash
docker compose down
```

---

## 4. Bare-Metal Production Deployment

### Database Initialization
```bash
# Generate Prisma Client
npx prisma generate

# Apply Schema Migrations
npx prisma db push

# Seed Roles and Initial Tournament Data
npx prisma db seed
```

### Build & Start
```bash
# Build Next.js Application
npm run build

# Start Production Server
npm run start
```

---

## 5. Offline LAN Venue Deployment (On-Premise LAN)

For college campuses, computer labs, and gaming cafes where venue internet may be restricted or unreliable:

1. **Host Server**: Run the application via Docker Compose or native Node.js on the tournament director's machine.
2. **Network Binding**: Ensure the server binds to `0.0.0.0` (default in container and `npm run start`).
3. **Find Host IP**: Identify the host machine's local IP address (`ipconfig` on Windows or `ip a` on Linux, e.g. `192.168.1.100`).
4. **Distribute Endpoints**:
   - **Admin Control Center**: `http://192.168.1.100:3000/admin` (Director desktop)
   - **Mobile Match Marshal**: `http://192.168.1.100:3000/volunteer` (Staff smartphones on venue Wi-Fi)
   - **Auditorium Display**: `http://192.168.1.100:3000/display/<tournament-id>` (Projector PC)
5. **Zero External Dependencies**: All tournament calculations, fixtures, bracket advances, and state transitions execute entirely within the local LAN perimeter.

---

## 6. Cloud Platform Deployment

### Railway / Render
1. Connect GitHub repository to Railway or Render.
2. Add a PostgreSQL database service.
3. Configure build command:
   ```bash
   npx prisma generate && npx prisma db push && npm run build
   ```
4. Start command: `npm run start`
5. Supply `AUTH_SECRET` and `NEXTAUTH_URL` environment variables.

### Self-Hosted Cloud VPS (Hetzner / DigitalOcean / Coolify)
1. Provision Ubuntu LTS droplet/server with Docker installed.
2. Clone repository, populate `.env`, and execute `docker compose up -d --build`.
3. Configure Caddy or Nginx reverse proxy with Let's Encrypt SSL.
