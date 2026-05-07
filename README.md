<<<<<<< HEAD
# ⚡ TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, built with **Node.js + Express + PostgreSQL** (backend) and **React + Vite** (frontend).

---

## 🚀 Features

- **Authentication** — JWT-based signup/login, persistent sessions
- **Role-Based Access** — System roles (Admin/Member) + per-project roles
- **Projects** — Create, manage, delete projects; track progress
- **Team Management** — Invite members by email, assign project roles (Admin/Member)
- **Tasks** — Full CRUD: create, assign, update status & priority, set due dates
- **Dashboard** — Stats: my tasks, in-progress, completed, overdue; recent activity
- **Kanban Board** — Visual task columns (Todo / In Progress / Done)
- **Filters** — Filter tasks by priority and assignee
- **Overdue Detection** — Visual warnings for past-due tasks

---

## 🛠️ Tech Stack

| Layer     | Tech                            |
|-----------|---------------------------------|
| Backend   | Node.js, Express.js             |
| Database  | PostgreSQL (via `pg`)           |
| Auth      | JWT + bcryptjs                  |
| Frontend  | React 18, Vite, React Router v6 |
| Styling   | Custom CSS (dark theme)         |
| Deploy    | Railway                         |

---

## 📁 Project Structure

```
team-task-manager/
├── server.js              # Express entry point
├── db.js                  # PostgreSQL setup + schema init
├── middleware/
│   └── auth.js            # JWT + RBAC middleware
├── routes/
│   ├── auth.js            # POST /api/auth/{register,login,me}
│   ├── projects.js        # CRUD /api/projects + members
│   ├── tasks.js           # CRUD /api/tasks & /api/projects/:id/tasks
│   └── dashboard.js       # GET /api/dashboard
├── frontend/
│   ├── src/
│   │   ├── pages/         # Login, Register, Dashboard, Projects, ProjectDetail
│   │   ├── components/    # Layout, TaskModal
│   │   ├── context/       # AuthContext (global auth state)
│   │   └── api/           # Axios client with JWT interceptor
│   └── vite.config.js
├── railway.json           # Railway deployment config
└── .env.example           # Environment variables template
```

---

## 🔐 API Endpoints

### Auth
| Method | Endpoint             | Access  | Description        |
|--------|----------------------|---------|--------------------|
| POST   | /api/auth/register   | Public  | Create account     |
| POST   | /api/auth/login      | Public  | Login              |
| GET    | /api/auth/me         | Private | Get current user   |

### Projects
| Method | Endpoint                         | Access          | Description          |
|--------|----------------------------------|-----------------|----------------------|
| GET    | /api/projects                    | Member          | List my projects     |
| POST   | /api/projects                    | Member          | Create project       |
| GET    | /api/projects/:id                | Member          | Project detail       |
| PUT    | /api/projects/:id                | Owner/Admin     | Update project       |
| DELETE | /api/projects/:id                | Owner/Admin     | Delete project       |
| POST   | /api/projects/:id/members        | Project Admin   | Add member           |
| DELETE | /api/projects/:id/members/:uid   | Project Admin   | Remove member        |

### Tasks
| Method | Endpoint                          | Access  | Description          |
|--------|-----------------------------------|---------|----------------------|
| GET    | /api/projects/:id/tasks           | Member  | List project tasks   |
| POST   | /api/projects/:id/tasks           | Member  | Create task          |
| GET    | /api/tasks/:id                    | Member  | Get task             |
| PUT    | /api/tasks/:id                    | Member  | Update task          |
| DELETE | /api/tasks/:id                    | Creator/Admin | Delete task    |

### Dashboard
| Method | Endpoint        | Access  | Description      |
|--------|-----------------|---------|------------------|
| GET    | /api/dashboard  | Member  | Stats + overview |

---

## ⚙️ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd team-task-manager

# 2. Install all dependencies
npm run install:all

# 3. Set up environment variables
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET

# 4. Create PostgreSQL database
createdb taskflow
# Schema is auto-created on first server start

# 5. Start backend (port 5000)
npm run dev

# 6. Start frontend dev server (port 5173)
cd frontend && npm run dev
```

Visit `http://localhost:5173` — the frontend proxies `/api` calls to `localhost:5000`.

---

## 🌐 Deploy on Railway

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/team-task-manager.git
git push -u origin main
```

### Step 2 — Create Railway Project
1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo** → choose your repo

### Step 3 — Add PostgreSQL
1. Click **+ New** → **Database** → **Add PostgreSQL**
2. Railway auto-sets `DATABASE_URL` in your service environment

### Step 4 — Set Environment Variables
In your service settings → **Variables**, add:
```
JWT_SECRET=your-long-random-secret-here-minimum-32-chars
NODE_ENV=production
```

### Step 5 — Deploy
Railway will automatically build and deploy. The build command runs:
```
npm install && npm run build
```
And start command runs:
```
npm start
```

Your app will be live at the Railway-provided URL! 🎉

---

## 🔑 Role System

### System Roles (account-level)
| Role   | Permissions                                           |
|--------|-------------------------------------------------------|
| admin  | See all projects, manage everything, bypass checks    |
| member | Only see/manage projects they're a member of          |

### Project Roles (per-project)
| Role   | Permissions                                                   |
|--------|---------------------------------------------------------------|
| admin  | Create/edit tasks, add/remove members, update project         |
| member | View tasks, create tasks, update their own tasks              |

> **Note:** When you create a project, you're automatically added as project admin.

---

## 📊 Database Schema

```sql
users           — id, name, email, password_hash, role, created_at
projects        — id, name, description, owner_id, created_at, updated_at
project_members — project_id, user_id, role, joined_at  [composite PK]
tasks           — id, title, description, project_id, assignee_id,
                  creator_id, status, priority, due_date, created_at, updated_at
```

---

## 🧪 Quick Test Flow

1. Register as **Admin** (role: admin)
2. Create a **project**
3. Register a second user as **Member**
4. Add member to project via email
5. Create tasks, assign them, track status
6. Check the **Dashboard** for stats

---

## 📝 License
MIT
=======
# team-task-manager
>>>>>>> ce02707f5c84b80d15a2635b699716d09e0f810b
