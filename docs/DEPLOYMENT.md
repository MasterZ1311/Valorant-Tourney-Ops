# Deployment & Environment Guide — VTO

## 1. System Requirements
- **Node.js**: v20.x or v22.x LTS
- **Database**: PostgreSQL 15+
- **Memory**: Minimum 1GB RAM (2GB+ recommended for live multi-client events)
- **Local Network**: Fast low-latency Gigabit LAN for venue deployment

---

## 2. Environment Variables
Create `.env` based on `.env.example`:
```env
# Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vto_production?schema=public"

# Auth Secret & Sessions
AUTH_SECRET="vto-super-secret-auth-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Application Settings
NODE_ENV="production"
PORT=3000
```

---

## 3. Database Initialization & Migrations
```bash
# Generate Prisma Client
npx prisma generate

# Apply Migrations
npx prisma migrate deploy

# Seed Default Roles & Sample Tournament
npx prisma db seed
```

---

## 4. Production Build & Start
```bash
# Build Next.js Application
npm run build

# Start Production Server
npm run start
```

---

## 5. Offline LAN Venue Deployment (On-Premise)
For campus tournaments where venue internet might be unstable:
1. Run local PostgreSQL instance on the Organizer's workstation.
2. Run `npm run start` bound to local network interface (`0.0.0.0:3000`).
3. Connect Volunteers and Display TVs to venue Wi-Fi / Local Subnet (e.g. `http://192.168.1.100:3000`).
4. System requires zero external third-party cloud calls during match execution.
