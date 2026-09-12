# Real-Time Client Project Dashboard

A full-stack, enterprise-grade project management dashboard built for client collaboration, role-based workload tracking, and live activity streaming.

---

## ⚡ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Axios |
| **Backend** | Node.js, Express 5, TypeScript, Zod, Argon2, JSON Web Tokens (JWT) |
| **Database & ORM** | PostgreSQL 16, Prisma ORM (relational schema with indexes & foreign keys) |
| **Real-Time WebSockets** | Socket.io (authenticated JWT handshake, presence tracking, room-based isolation) |
| **Background Jobs** | BullMQ & Redis 7 (automated overdue task scheduler running every 60s) |
| **DevOps & Containers** | Docker, Docker Compose |

---

## 🔐 Role-Based Access Control (RBAC)

Access permissions are enforced strictly at the **API controller and database layer** (not merely hidden in the frontend):

| Role | Permissions & Scope | Dashboard Capabilities |
| :--- | :--- | :--- |
| **Admin** | Full system access across all clients, projects, tasks, and users. | Total projects, tasks by status breakdown, overdue counter, and **live active users online** via WebSocket presence. |
| **Project Manager** | Can create/manage their own projects and assign tasks. Cannot see or edit projects owned by another PM. | Owned projects summary, tasks by priority, and upcoming deadlines due this week. |
| **Developer** | Scoped strictly to assigned tasks only. Cannot view tasks assigned to other developers. | Assigned tasks automatically sorted by **Priority (`Critical` → `Low`) then earliest Due Date**. Can transition task statuses (`To Do` → `In Progress` → `In Review` → `Done`). |

---

## 🚀 Quick Start (Docker - Preferred)

The entire application stack (PostgreSQL, Redis, Backend API, and Frontend) can be launched with a single command:

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Run with Docker Compose
```bash
# Clone repository
git clone https://github.com/BhavyaB19/project-management.git
cd project-management

# Start all 4 services (PostgreSQL, Redis, Backend, Frontend)
docker compose up --build
```

Once running:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSockets**: [http://localhost:3000](http://localhost:3000)
- **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

*(To run in detached background mode: `docker compose up --build -d`. To stop: `docker compose down`).*

---

## 💻 Manual Setup (Without Docker)

If running services locally outside Docker:

### 1. Backend Setup
```bash
cd backend
npm install

# Create .env based on configuration
# Ensure PostgreSQL (port 5432) and Redis (port 6379) are running
npm run seed       # Seeds 1 Admin, 2 PMs, 4 Developers, 3 Projects, Overdue Tasks & Activity
npm run dev        # Starts Express server & Socket.io on http://localhost:3000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
```

---

## 👥 Seeded Demo Accounts

The database comes pre-seeded with accounts for immediate testing. All accounts share the same password:

> **Password for all seeded accounts**: `Password123!`

| Role | Email | Purpose |
| :--- | :--- | :--- |
| **Admin** | `admin@velozity.com` | Global oversight, cross-project workload, live online presence count. |
| **Project Manager 1** | `pm1@velozity.com` | Manages "E-Commerce Platform" & "Mobile Banking App". |
| **Project Manager 2** | `pm2@velozity.com` | Manages "Healthcare Patient Portal" (PM isolation test). |
| **Developer 1** | `dev1@velozity.com` | Ravi Kumar (Assigned tasks across projects). |
| **Developer 2** | `dev2@velozity.com` | Aisha Patel. |
| **Developer 3** | `dev3@velozity.com` | Lucas Vance. |
| **Developer 4** | `dev4@velozity.com` | Elena Rostova. |

*(Quick-fill buttons are also available on the Login screen for instant testing).*

---

## 🗄️ Database Schema & Indexing Decisions

```
  ┌──────────────┐          ┌────────────────┐          ┌─────────────────┐
  │     User     │1        *│    Project     │1        *│      Task       │
  ├──────────────┼──────────┤────────────────┼──────────┤─────────────────┤
  │ id (PK)      │          │ id (PK)        │          │ id (PK)         │
  │ email (UQ)   │          │ name           │          │ taskNumber      │
  │ password     │          │ description    │          │ title           │
  │ role         │          │ ownerId (FK)   │◄─────────┤ description     │
  └──────┬───────┘          │ clientId       │          │ priority        │
         │1                 └────────────────┘          │ status          │
         │                                              │ projectId (FK)  │
         │*                                             │ assigneeId (FK) │
  ┌──────┴───────┐                                      │ dueDate         │
  │ RefreshToken │                                      └────────┬────────┘
  ├──────────────┤                                               │1
  │ token (UQ)   │                                               │*
  │ userId (FK)  │                                      ┌────────┴────────┐
  │ expiresAt    │                                      │   ActivityLog   │
  └──────────────┘                                      ├─────────────────┤
                                                        │ id (PK)         │
                                                        │ taskId (FK)     │
                                                        │ userId (FK)     │
                                                        │ action          │
                                                        │ details (JSONB) │
                                                        │ createdAt       │
                                                        └─────────────────┘
```

### Indexing Decisions:
- **`Task([projectId])` & `Task([assigneeId])`**: Speeds up foreign key lookups when filtering tasks by project board or developer workspace.
- **`Task([status])` & `Task([priority])`**: Accelerates URL-based query filters (`?status=IN_PROGRESS&priority=HIGH`).
- **`Task([dueDate])`**: Highly optimized index for the BullMQ scheduled background job querying `WHERE dueDate < NOW() AND status NOT IN ('DONE', 'OVERDUE')`.
- **`Project([ownerId])`**: Enforces fast Project Manager isolation queries.
- **`ActivityLog([taskId])`, `ActivityLog([userId])`, `ActivityLog([createdAt])`**: Powers fast pagination for offline event catchup (`ORDER BY createdAt DESC LIMIT 20`).

---

## 🏛️ Architectural Decisions

### 1. WebSocket Choice: Socket.io vs. Native WebSocket
- **Decision**: **Socket.io** was selected.
- **Justification**: Socket.io provides built-in **room-based multiplexing** (`io.to('project:123')`, `io.to('admin-feed')`), which made enforcing role-isolated live activity streaming and project board updates clean and modular. Furthermore, Socket.io offers automatic fallback to HTTP long-polling, heartbeat ping/pong lifecycle management, and built-in connection authentication middleware.

### 2. Job Queue Choice: BullMQ + Redis vs. `node-cron`
- **Decision**: **BullMQ + Redis** was selected.
- **Justification**:
  1. *Reliability across restarts*: In-memory timers like `node-cron` lose state and execution schedules if the Node server restarts or crashes. BullMQ schedules and job states are persisted in Redis.
  2. *Distributed coordination & horizontal scale*: If multiple instances of the backend are deployed behind a load balancer, `node-cron` would execute on every instance simultaneously, causing duplicate database updates and race conditions. BullMQ uses Redis distributed locks so only one worker executes each run.

### 3. Token Storage & Authentication Security
- **Decision**: **Access Token + HttpOnly Refresh Token Cookie**.
- **Justification**:
  - Refresh tokens are strictly stored in `HttpOnly; SameSite=Lax; Secure` cookies, preventing cross-site scripting (XSS) attacks from stealing long-lived credentials.
  - Short-lived Access Tokens (15-minute expiration) are passed in authorization headers and refreshed automatically via silent Axios response interceptors on 401 statuses.
  - Refresh tokens are tracked in PostgreSQL, enabling instant session revocation upon logout.

---

## 📝 Assessment Submission Explanation (150–250 words)

> *The following text can be submitted directly into the assessment explanation field:*

The most challenging problem was designing the real-time activity feed with strict role-based visibility while ensuring offline users never miss events. Instead of broadcasting events globally or re-querying the database on every action, I implemented room-scoped WebSocket dispatching via Socket.io combined with indexed PostgreSQL persistence.

When a task updates, the event is saved to `ActivityLog` and emitted conditionally: `admin-feed` receives all system activity; `pm-feed:${ownerId}` receives events scoped only to projects owned by that PM; and `user:${assigneeId}` notifies the assigned developer. When a user reconnects after being offline, the client queries `/api/activity?limit=20` to catch up on missed database-persisted events before streaming live socket payloads. This guarantees strict data isolation (developers cannot see other developers' work, and PMs cannot view competing projects) without client-side data leaks.
