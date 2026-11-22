# Mini CRM – Backend

A lightweight, production-grade RESTful CRM backend built with Express 5, Mongoose 9, MongoDB, and CommonJS.

---

## 1. Project Overview and Modules

Mini CRM is designed to streamline lead tracking, task management, and customer relations across workspaces. The backend exposes clean REST endpoints adhering to standard response contracts without arbitrary framework dependencies.

### Key Modules:
- **Auth & Users (`/usercheck`, `/users`)**: Stateless JWT authentication and team member directory for task and lead assignment.
- **Companies (`/companies`)**: Organization profiles categorised by industry with relationship safeguards against accidental deletion.
- **Leads (`/leads`)**: Prospect records with status workflows, contact info, owner attribution, search, filtering, and reversible soft deletion.
- **Tasks (`/tasks`)**: Follow-up activities tied to leads and team members, with strict assigned-user ownership authorization on status transitions.
- **Dashboard (`/dashboard`)**: Aggregated high-level CRM KPIs and quick-access recent leads and upcoming activities.

---

## 2. Tech Stack

- **express** (`^5.3.0`): Minimalist and robust HTTP web framework for routing and middleware.
- **mongoose** (`^9.12.3`): MongoDB ODM providing schema enforcement, partial indexes, and population.
- **jsonwebtoken** (`^9.0.3`): Issues and verifies signed JWT tokens for bearer authentication.
- **bcrypt** (`^6.0.0`): Secure one-way salt and hash implementation for user passwords.
- **moment** (`^2.31.0`): Date manipulation and calendar parsing utility.
- **moment-timezone** (`^0.6.6`): Handles timezone conversions (`Asia/Kolkata`) preventing date-shifting anomalies across clients.
- **dotenv** (`^18.0.10`): Loads runtime environment variables from `.env`.
- **cors** (`^2.8.6`): Manages Cross-Origin Resource Sharing headers for authorized frontend origins.
- **nodemon** (`^3.1.14`): Development monitor restarting Node.js processes upon source code updates.

---

## 3. Getting Started

### Prerequisites
- Node.js (v18+)
- Active MongoDB Atlas or local MongoDB instance

### Step-by-Step Setup
1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Ensure `.env` contains your MongoDB connection URI, client origin, and JWT secret.

3. **Register default users**:
   ```bash
   npm run register
   ```

4. **Seed mock data**:
   ```bash
   npm run seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Start production server**:
   ```bash
   npm start
   ```

---

## 4. Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Local port on which the Express server listens | `5000` |
| `MONGO_URI` | MongoDB connection connection string | `mongodb://localhost:27017/mini-crm` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens | `change_this_to_a_long_random_string` |
| `CLIENT_URL` | Allowed origin for Cross-Origin Resource Sharing | `http://localhost:5173` |
| `TIMEZONE` | Canonical timezone used for due dates and dashboard day boundaries | `Asia/Kolkata` |

---

## 5. Folder Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB connection handler
├── controllers/              # Resource routers with inline controllers
│   ├── companyController.js  # /companies (CRUD + company leads)
│   ├── dashboardController.js# /dashboard (KPI aggregation)
│   ├── leadController.js     # /leads (CRUD, search, filter, soft delete)
│   ├── loginController.js    # /usercheck (login endpoint)
│   ├── taskController.js     # /tasks (CRUD + status ownership verification)
│   └── userController.js     # /users (workspace user list)
├── middleware/
│   ├── auth.js               # JWT bearer verification middleware
│   └── errorHandler.js       # Centralized 404 and error-handling middleware
├── models/
│   ├── Company.js            # Company schema and industry enumeration
│   ├── Lead.js               # Lead schema, statuses, and partial unique index
│   ├── Task.js               # Task schema, statuses, and timezone date transform
│   └── User.js               # User schema
├── utils/
│   └── helpers.js            # Shared helpers (addIdTransform, escapeRegex, getPagination, etc.)
├── .env                      # Local environment configuration (gitignored)
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore patterns
├── package-lock.json         # Pinned npm dependency tree
├── package.json              # Project scripts and dependency definitions
├── README.md                 # Project architecture, guidelines, and API reference
├── register.js               # Seeds default authentication users
├── seed.js                   # Populates demo companies, leads, and tasks
└── server.js                 # Express server configuration and routing pipeline
```

---

## 6. API Conventions

- **Base URL**: `http://localhost:5000` with no `/api` prefix.
- **Authentication**: All endpoints except `GET /` and `POST /usercheck/login` require `Authorization: Bearer <token>`. Missing tokens return `401 {"success":false,"message":"No token provided"}`.
- **Response Shapes**:
  - **Single Record**: `{ "success": true, "data": { ... } }`
  - **Create / Update**: `{ "success": true, "message": "...", "data": { ... } }`
  - **Delete**: `{ "success": true, "message": "..." }`
  - **Paginated List**: `{ "success": true, "data": [ ... ], "total": 42, "page": 1, "totalPages": 5 }`
  - **Dropdown List (`all=true`)**: `{ "success": true, "data": [ ... ] }` (no paging metadata)
  - **Error Body**: `{ "success": false, "message": "Plain descriptive message" }`
- **Status Codes**:
  - `200`: Successful fetch, update, or soft/hard delete
  - `201`: Successful resource creation
  - `400`: Missing required field, malformed ID, invalid query, or schema violation
  - `401`: Missing, invalid, or expired JWT; invalid credentials
  - `403`: Forbidden (e.g. attempting to update a task's status assigned to someone else)
  - `404`: Entity not found or soft-deleted
  - `409`: Conflict (duplicate email for active lead, deleting company with assigned leads)
  - `500`: Internal unexpected server error
- **Identifiers**: Every returned entity includes a string `id` and strips `_id` and `__v`.
- **Dates**: Sent and formatted as `yyyy-mm-dd` anchored to `TIMEZONE` (`Asia/Kolkata`).

---

## 7. Authentication and Authorization

1. **JWT Verification**: The global `auth` middleware intercepts every protected route, verifies the signature using `JWT_SECRET`, and populates `req.user = { id: String(decoded.id) }`.
2. **Task Ownership Rule**: Tasks can be edited by any authenticated workspace user (for details such as title, lead, due date), but **only the user assigned to the task (`req.user.id === String(task.assignedTo)`) can modify its status** via `PATCH /tasks/:id/status` or `PUT /tasks/:id`. Any violation returns `403 {"success": false, "message": "Only the assigned user can update this task"}`.

---

## 8. The Full API List (18 Endpoints)

### General and Auth

| Method | Endpoint | Request | Success response | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | none | `200 text Mini CRM API running` | none |
| `POST` | `/usercheck/login` | body `{ email, password }` | `200 { success, data: { id, name, email }, token, color }` | 400 missing field, 401 wrong credentials |
| `GET` | `/users` | none | `200 { success, data: [ { id, name, email } ] }` | 401 |

### Dashboard

| Method | Endpoint | Request | Success response | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/summary` | none | `200 { success, data: { totalLeads, qualifiedLeads, tasksDueToday, completedTasks, recentLeads, upcomingTasks } }` | 401, 500 |

### Leads

| Method | Endpoint | Request | Success response | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/leads` | query `page`, `limit`, `search`, `status` (or `all=true`) | `200 { success, data, total, page, totalPages }`; with `all=true` only `{ success, data }` | 400 bad status, 401 |
| `POST` | `/leads` | body `{ name, email, phone?, status?, assignedTo?, company? }` | `201 { success, message, data }` | 400 validation, 409 duplicate email |
| `PUT` | `/leads/:id` | same body as POST | `200 { success, message, data }` | 400, 404, 409 |
| `DELETE` | `/leads/:id` | none | `200 { success, message }` (soft delete) | 400 invalid id, 404 |

### Companies

| Method | Endpoint | Request | Success response | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/companies` | query `page`, `limit`, `search` (or `all=true`) | `200 { success, data, total, page, totalPages }`; with `all=true` only `{ success, data }` | 401 |
| `POST` | `/companies` | body `{ name, industry, location, website? }` | `201 { success, message, data }` | 400 validation |
| `PUT` | `/companies/:id` | same body as POST | `200 { success, message, data }` | 400, 404 |
| `DELETE` | `/companies/:id` | none | `200 { success, message }` | 400, 404, 409 company still has leads |
| `GET` | `/companies/:id/leads` | none | `200 { success, data: [ lead ] }` (deleted leads excluded) | 400, 404 |

### Tasks

| Method | Endpoint | Request | Success response | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | query `page`, `limit` | `200 { success, data, total, page, totalPages }` | 401 |
| `POST` | `/tasks` | body `{ title, lead, dueDate, assignedTo, status? }` | `201 { success, message, data }` | 400 validation, 404 lead or user not found |
| `PUT` | `/tasks/:id` | same body as POST | `200 { success, message, data }` | 400, 403 (status change by non-assigned user), 404 |
| `PATCH` | `/tasks/:id/status` | body `{ status }` | `200 { success, message, data }` | 400, 403 only assigned user can update, 404 |
| `DELETE` | `/tasks/:id` | none | `200 { success, message }` | 400, 404 |

### Record Shapes Returned by the API

| Record | Shape |
| :--- | :--- |
| **Lead** | `{ id, name, email, phone, status, assignedTo: { id, name } or null, company: { id, name } or null, createdAt, updatedAt }` |
| **Company** | `{ id, name, industry, location, website, createdAt, updatedAt }` |
| **Task** | `{ id, title, status, dueDate: "yyyy-mm-dd", lead: { id, name }, assignedTo: { id, name }, createdAt, updatedAt }` |
| **Dashboard recent lead** | A Lead record (newest 5, soft-deleted excluded) |
| **Dashboard upcoming task**| A Task record (next 5 by due date, status not Done) |

---

## 9. Module Guide

### Users Module
- **Model**: `User` (`name`, `email`, `password`, `createdAt`).
- **Endpoint**: `GET /users` returns an array of team members sorted alphabetically by name without password hashes. Accessible to all authenticated users for dropdown assignments.

### Companies Module
- **Model**: `Company` (`name`, `industry`, `location`, `website`, `timestamps`).
- **Validation**:
  - `name`: required, trimmed.
  - `industry`: required, must match one of `IT`, `Healthcare`, `Finance`, `Education`, `Manufacturing`, `Retail`, `Other`.
  - `location`: required, trimmed.
  - `website`: optional, must be a valid URL (`http` / `https`) if provided.
- **Endpoints**: Supports pagination, case-insensitive search by name or location, dropdown list via `all=true`, and fetching child leads via `GET /companies/:id/leads`. Deletion is blocked (`409`) if non-deleted leads remain associated.

### Leads Module
- **Model**: `Lead` (`name`, `email`, `phone`, `status`, `assignedTo`, `company`, `isDeleted`, `timestamps`).
- **Validation**:
  - `name`: required, trimmed, min length 2.
  - `email`: required, valid email format, lowercased and trimmed.
  - `phone`: optional, 7-15 characters composed of numbers, spaces, `+`, and `-`.
  - `status`: one of `New`, `Contacted`, `Qualified`, `Lost` (default `New`).
  - `assignedTo`, `company`: optional, must exist in DB if supplied.
- **Endpoints**: Full CRUD, case-insensitive regex search by name or email, status filter, and dropdown list via `all=true`.

### Tasks Module
- **Model**: `Task` (`title`, `lead`, `dueDate`, `assignedTo`, `status`, `timestamps`).
- **Validation**:
  - `title`: required, trimmed.
  - `lead`: required, valid non-deleted lead id.
  - `dueDate`: required, `YYYY-MM-DD` real calendar date parsed at start-of-day in `TIMEZONE`.
  - `assignedTo`: required, valid user id.
  - `status`: one of `Pending`, `To Do`, `In Progress`, `Done` (default `Pending`).
- **Endpoints**: Workspace-wide listing sorted by ascending due date, creation, status updates with ownership verification, and deletion.

### Dashboard Module
- **Endpoint**: `GET /dashboard/summary` delivers aggregated metrics computed on the database engine.
- **KPI Definitions**:
  - `totalLeads`: Count of active (`isDeleted: false`) leads.
  - `qualifiedLeads`: Active leads whose `status === "Qualified"`.
  - `tasksDueToday`: Tasks with `dueDate` within today's start and end in `TIMEZONE` and `status !== "Done"`.
  - `completedTasks`: Tasks with `status === "Done"`.
  - `recentLeads`: 5 newest active leads with populated references.
  - `upcomingTasks`: 5 tasks due on or after today's start date with `status !== "Done"`.

---

## 10. Soft Delete and Aggregation Notes

### Soft Delete Implementation
Leads are never permanently dropped from the database on standard delete calls. Instead, `DELETE /leads/:id` updates `isDeleted = true`.
- **Partial Unique Index**: MongoDB enforces `{ unique: true, partialFilterExpression: { isDeleted: false } }` on `email`. This guarantees active emails are strictly unique while permitting reused emails if an older prospect was soft-deleted.
- **Query Scopes**: Every lead query in `leadController.js`, `companyController.js`, and `dashboardController.js` includes `{ isDeleted: false }`.

### Aggregation Pipeline
Dashboard metrics are computed directly in MongoDB using aggregation operators:
- `$match`: Filters the collection pipeline (e.g. `{ isDeleted: false }`).
- `$group`: Groups matching documents into a single summary accumulator (`_id: null`).
- `$cond`: Ternary conditional evaluator `[ { $condition }, valueIfTrue, valueIfFalse ]`.
- `$sum`: Increments metric accumulators based on conditional matches (e.g. `$sum: { $cond: [{ $eq: ["$status", "Qualified"] }, 1, 0] }`).

---

## 11. Seed Data

Running `npm run seed` sets up realistic sandbox records:
- **5 Companies**: Covering IT, Healthcare, Finance, Manufacturing, and Education.
- **12 Leads**: 11 active across all 4 statuses (`New`, `Contacted`, `Qualified`, `Lost`) and 1 soft-deleted lead (`archived.lead@example.com`).
- **8 Tasks**: 2 due today, 3 due in the next 7 days, 1 overdue, and 2 marked `Done`.
- **Demo User Accounts** (created via `npm run register`):
  - `john@mail.com` / `password123`
  - `priya@mail.com` / `password123`
  - `admin@mail.com` / `password123`

---

## 12. Concepts Used (Interview Notes)

- **Application-Level Middleware**: Centralizing authentication logic and error boundaries so route controllers focus exclusively on domain logic.
- **JWT Authorization**: Extracting identities securely from bearer tokens and enforcing field-level business rules (such as task ownership).
- **Mongoose Schema & Population**: Declaring strict schemas, automatic timestamps, toJSON transforms, and resolving cross-collection document relations with `.populate()`.
- **Partial Unique Indexes**: Enforcing unique data constraints selectively on active document subsets in MongoDB.
- **MongoDB Aggregation Pipelines**: Computing complex analytics inside the database engine using `$match`, `$group`, `$cond`, and `$sum` without pulling raw collections into application memory.
- **Server-Side Pagination & Regex Escaping**: Safely handling search and paginating datasets using `$or`, regex patterns, `skip`, and `limit`.

---

## 13. Known Limitations and Next Steps

- **No Refresh Tokens**: Relies on a single long-lived access token; future iterations can add revolving refresh tokens.
- **No Rate Limiting**: Production deployments should introduce IP and account rate limiting (e.g. token bucket via Redis).
- **User createdAt String**: The legacy user schema retains its initial String-formatted `createdAt` attribute to maintain backward compatibility with legacy seeders.
- **Automated Test Suite**: End-to-end and unit test suites (e.g., using Supertest) can be integrated into CI/CD pipelines.
