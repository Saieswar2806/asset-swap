# Asset Swap – Full-Stack Property Exchange Platform (Production Ready)

**Asset Swap** is a technology-driven real estate asset exchange platform. 

Our fundamental business objective is to connect people who own assets they want to exchange with people who own assets they actually need.

> **Important Transaction Model:** This is **NOT** a conventional property buying/selling marketplace. Asset exchange is the primary transaction model. Cash is only used when there is a difference in the mutually reviewed asset valuations (**Cash Boot**).
>
> In strict compliance with regulatory guidelines, **no machine-learning or black-box algorithmic estimations** are used for asset values. Only certified broker-reviewed valuations are accepted. The prototype does not conduct real-money banking transactions, title search, escrow, payment processing, or deed registration.

---

## Demonstration Credentials & Roles

Asset Swap features genuine authentication and backend-enforced role-based access control (RBAC). For demonstration and review, the embedded database is auto-seeded with test accounts:

| Role | Name | Email | Password | Status | Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@asset-swap.local` | `Admin@123` | `active` | Platform governance, broker approval/rejection, user management, audit logging |
| **Broker** | Kavitha Murthy | `kavitha.murthy@broker.local` | `Broker@123` | `active` | Valuation assessment queue, physical inspection notes, approve/reject property listings |
| **Broker** | Suresh Rao | `suresh.rao@broker.local` | `Broker@123` | `active` | Commercial & agricultural valuation reviews, review history |
| **Broker (Pending)** | Rajesh Patel | `rajesh.patel@broker.local` | `Broker@123` | `pending` | Onboarding applicant awaiting admin verification (queue access blocked until approved) |
| **Property Owner** | Naveen Hegde | `naveen.hegde@owner.local` | `Owner@123` | `active` | Agricultural land owner in Kanakapura, swap match discovery, consensus voting |
| **Property Owner** | Sunil Kulkarni | `sunil.kulkarni@owner.local` | `Owner@123` | `active` | Residential plot owner in Mysore, direct & circular swap proposals |
| **Property Owner** | Arun Deshmukh | `arun.deshmukh@owner.local` | `Owner@123` | `active` | Commercial property owner in Indiranagar |
| **Property Owner** | Bhavana Shetty | `bhavana.shetty@owner.local` | `Owner@123` | `active` | Luxury apartment owner in Bengaluru |

*Tip: The Login page (`/login`) includes 1-click credential selector buttons to quickly log in as Admin, Verified Broker, Pending Broker, or Property Owners.*

---

## Authentication & Security Architecture

The platform uses genuine cryptographic authentication and server-side session management:

1. **Password Security**:
   - Built using Node.js standard cryptographic library (`node:crypto`).
   - Passwords hashed using `scryptSync` with unique 16-byte cryptographically secure random salts.
   - Verification uses timing-attack resistant `timingSafeEqual`.
2. **Session Management**:
   - Server-side SQLite `sessions` table storing high-entropy tokens with 7-day expiration.
   - Dual-mode client authentication:
     - **HTTP-Only Cookies (`asset_swap_session`)**: Mitigates cross-site scripting (XSS) token theft.
     - **Authorization Bearer Header**: Standard REST client and automated API test support.
3. **Role-Based Access Control (RBAC)**:
   - Express route middleware (`requireAuth`, `requireRole('admin' | 'broker' | 'owner')`).
   - Role enforcement occurs strictly on the server:
     - `/api/admin/*` is restricted exclusively to authenticated users with `role: "admin"`.
     - `/api/broker/*` is restricted to users with `role: "broker"` and `status: "active"`.
     - `/api/owner/*` is restricted to authenticated owners, isolating private listings and proposal voting.
4. **Registration Rules**:
   - **Property Owners (`/register-owner`)**: Public registration immediately creates an `owner` account with `status: "active"`.
   - **Brokers (`/broker-apply`)**: Professional onboarding collects agency, RERA license, jurisdiction, and years of experience. Broker accounts strictly enter in `status: "pending"` and cannot review listings until verified and approved by an administrator.
   - **Administrators**: Protected system accounts; cannot be created via public registration.

---

## Three Dedicated Role-Based Dashboards

### 1. Administrator Dashboard (`/admin/dashboard`)
*Designed for platform oversight, governance, and broker credential verification.*
- **System Metrics**: Real-time KPI cards for total users, broker application pipeline, property review statuses, and active exchange proposals.
- **User Management**: View all platform users, filter by role and status, search by name/email, and toggle account states (`active`, `suspended`).
- **Broker Verification Queue**: Dedicated modal to review broker applications (agency, RERA license number, jurisdiction, experience) with 1-click **Approve** or **Reject** (with mandatory reason).
- **Property Inventory Monitoring**: Global view of all 112+ Karnataka listings across review stages.
- **Audit Logs Trail**: Platform-wide chronological record of all administrative and transactional actions.

### 2. Verified Broker Dashboard (`/broker/dashboard`)
*Designed for licensed real estate consultants conducting manual valuation reviews.*
- **Valuation Assessment Queue**: Filter property listings awaiting broker review (`submitted`, `under_review`).
- **Human-in-the-Loop Valuation Modal**:
  - Brokers inspect declared values, land Khata types (A Khata, B Khata, Pahani), survey numbers, and locations.
  - Enter the audited, broker-reviewed property valuation (in ₹ Lakhs/Crores) and physical inspection notes.
  - Formally **Approve to `reviewed`** or **Reject** with formal notes.
- **Strict Human Valuation Policy**: No machine learning or automated algorithms are used. Only properties with human broker-reviewed valuations can participate in the matching engine.
- **My Reviews & Professional Profile**: Complete history of all valuations assessed by the logged-in broker.

### 3. Property Owner Dashboard (`/owner/dashboard`)
*Designed for property owners to manage assets, find exchanges, list for sale, and explore buy opportunities.*
- **Three Prominent Action Hubs**:
  1. **Swap Property (`/swap`)**: Discover 2-party direct and 3-party circular exchange loops with certified broker valuations and automated Cash Boot calculations.
  2. **Buy Property (`/buy`)**: Explore verified properties listed for outright purchase, search by location/type/budget, and transmit direct purchase inquiries to verified owners.
  3. **Sell Property (`/sell`)**: List properties for outright cash sale, manage asking prices, convert existing portfolio assets to sale mode, and track buyer inquiries received.
- **Redesigned Property Registration Wizard (`/register`)**:
  - **Intent Selection**: Explicitly declare intention: `Swap Only`, `Sell Only`, or `Both Swap & Sell`.
  - **Section A (Owned Property)**: Collects title, property type, location, area/unit, conditional bedrooms/bathrooms (strictly for residential types; hidden for plots, commercial, and agricultural land), Khata type, and survey number.
  - **Section B (Desired Property Wanted)**: Separately stores exchange preferences (desired property types, preferred localities, min area, and cash boot limits) so the matching engine compares what you own with what others want.
  - **Section C (Sale Terms)**: Collects asking price and sale terms when intent is `sell` or `both`.
- **My Properties Portfolio**: Comprehensive management of registered properties with intent badges (`Swap`, `Sell`, `Both`) and verification badges (`submitted`, `reviewed`, `rejected`, `locked`).
- **Live Inquiries Management**: Real-time tracking of sent purchase inquiries and received buyer inquiries with direct response status updates (`pending`, `contacted`, `closed`).

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                           │
│  - Tailwind CSS + Lucide Icons (Institutional Real Estate Design)      │
│  - Dedicated Dashboards (/admin/dashboard, /broker/dashboard, etc.)    │
│  - Real Authentication & UserContext (Session cookies + Bearer token)  │
│  - React Flow (@xyflow/react) Visual Exchange Graph Engine             │
│  - Recharts Dashboard Analytics (Property Category & Activity Trends)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON REST APIs (with Auth)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Express Backend (Node.js)                        │
│  - Modular RBAC Routers (/api/auth, /api/admin, /api/broker, etc.)    │
│  - Node:crypto scryptSync password hashing & verification              │
│  - SQLite Session Store & WAL-Mode Concurrency (node:sqlite)           │
│  - Comprehensive Audit Trail & Consensus State Machine                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Direct TypeScript In-Memory Calls
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Core Asset Exchange Engine                          │
│  - Graph-Based Cycle Detection (src/matcher.ts)                        │
│  - Haversine Geo-Proximity Matrix (src/location.ts)                    │
│  - Deterministic 0-100 Match Scoring (src/scoring.ts)                  │
│  - Distributed Transaction Consensus Workflow (src/workflow.ts)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Core Matching Algorithm & Mathematical Model

### 1. Graph-Based Directed Cycle Matching Engine

The matching engine models the asset marketplace as a **directed compatibility graph**:
- **Nodes ($V$)**: Individual asset listings verified (`status: "reviewed"`) and unlocked (`locked: false`).
- **Edges ($E$)**: A directed edge $A \to B$ indicates that **Seeker $A$ wants and is willing to receive Target $B$'s asset**. An edge exists if and only if:
  1. **Distinct Owners**: Owner of $A$ is not owner of $B$ (`A.ownerId !== B.ownerId`).
  2. **Property Type Compatibility**: $B$'s property category is contained in $A$'s desired types (`wants.propertyTypes`).
  3. **Location Proximity**: $B$'s location matches $A$'s preferred locations or falls within $A$'s configured geographical radius (computed via Haversine distance from the Karnataka Geo-Coordinates Database).
  4. **Minimum Area Requirement**: If $A$ specifies `minArea`, $B$'s standardized area (converted to square feet) satisfies the requirement.

### 2. Supported Exchange Topologies & Transfer Direction

#### A. Direct 2-Party Asset Exchange ($A \leftrightarrow B$)
- **Cycle**: $A \to B \to A$
- $A$ wants and receives $B$'s asset.
- $B$ wants and receives $A$'s asset.
- **Actual Asset Transfers**:
  - Person $A$ gives their asset to Person $B$.
  - Person $B$ gives their asset to Person $A$.
- Cash settlement balances any valuation difference. When valuations are identical, cash boot is ₹0.

#### B. Multi-Party 3-Way Circular Asset Exchange ($A \to B \to C \to A$)
- **Cycle**: $A \to B \to C \to A$
  - $A$ wants and receives $B$'s asset.
  - $B$ wants and receives $C$'s asset.
  - $C$ wants and receives $A$'s asset.
- **Actual Asset Transfers**:
  - Person $A$ gives their asset to Person $C$.
  - Person $B$ gives their asset to Person $A$.
  - Person $C$ gives their asset to Person $B$.
- Cash differences for each participant are computed individually, and the sum of all signed cash boots across the closed cycle strictly balances to ₹0.

### 3. Cash Boot Settlement Calculations

Cash boot represents the financial adjustment required to achieve equitable exchange:

$$\text{Cash Boot} = \text{Value of Asset Received} - \text{Value of Asset Given}$$

- **Positive amount ($> 0$)**: Participant received a higher-value asset $\to$ **Participant pays cash boot**.
- **Negative amount ($< 0$)**: Participant gave a higher-value asset $\to$ **Participant receives cash boot**.
- **Zero ($= 0$)**: Exact asset valuation match $\to$ **No cash adjustment (pure asset swap)**.

#### Conservation of Value
Across any closed cycle $[L_0, L_1, \dots, L_{n-1}]$:

$$\sum_{i=0}^{n-1} \text{Boot}_i = \sum_{i=0}^{n-1} \left( \text{Value}(L_{(i+1) \bmod n}) - \text{Value}(L_i) \right) = \sum \text{Received} - \sum \text{Given} \equiv 0$$

All monetary computations use 2-decimal-place precision to eliminate floating-point rounding errors.

### 4. Collision-Free Match ID Generation
- **Direct 2-Party Swaps**: Rotation-independent ID formatted as `match-2p-${sorted[0]}-${sorted[1]}`. `[A, B]` and `[B, A]` produce identical IDs.
- **3-Party Directed Cycles**: Canonical rotation starting with the lexicographically smallest listing ID: `match-3p-${canonicalRotation.join("-")}`.
  - Rotations of the same directed cycle ($A \to B \to C \to A$, $B \to C \to A \to B$, $C \to A \to B \to C$) produce the **same ID** (`match-3p-A-B-C`).
  - Reversed directed cycles ($A \to C \to B \to A$) produce a **different ID** (`match-3p-A-C-B`).

---

## Fictional Demonstration Dataset

The dataset in [src/data/listings.ts](file:///c:/Users/laksh/Downloads/asset-swap-prototype/src/data/listings.ts) contains **112 fictional property listings** across Karnataka:
- **Districts Covered**: Bengaluru, Ramanagara, Mysuru, Mandya, Tumakuru, Chikkaballapur.
- **Categories Included**: Agricultural land (acres/guntas), Residential plots (sq ft), Apartments (sq ft), Independent houses (sq ft), Farmhouses (acres/sq ft), Commercial properties (sq ft).
- **Auto-Seeded Database**: On initial startup, the platform creates an embedded SQLite database (`asset_swap.db`) populated with these 112 listings, requirement profiles, broker reviews, user accounts, and test credentials.

---

## Local Execution Instructions

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Verify Strict TypeScript Compilation
```bash
npm run typecheck
```

### 3. Run Automated Tests
```bash
# Run all tests across the complete test suite (102 tests across 7 suites)
npm test

# Run Buy & Sell direct acquisition and intent tests
npm run test:buysell

# Run authentication and RBAC tests specifically
npm run test:auth

# Run API integration tests
npm run test:api

# Run security hardening tests
npm run test:security

# Run end-to-end consensus workflow tests
npm run test:e2e

# Run matching engine & database unit tests
npm run test:unit
```

### 4. Build Frontend for Production
```bash
npm run build
```

### 5. Launch Full-Stack Application
To run the full-stack system in development mode:

```bash
# Terminal 1: Start Express API server (port 3001)
npm run server

# Terminal 2: Start Vite Frontend (port 5173 with proxy to backend)
npm run dev
```

Alternatively, to serve the built production application directly from the Express server:
```bash
npm run build
npm run server
```
Open your browser at `http://localhost:3001` (or `http://localhost:5173` in dev mode).

### 6. Run CLI Matching Engine Demo
```bash
npm run demo
```

---

## Production Deployment & Render Guide

The application is architected as a self-contained full-stack Node.js service that builds the React client and serves it alongside the authenticated Express REST API and embedded SQLite database.

### 1. Render Blueprint (`render.yaml`)

Asset Swap includes a production-ready `render.yaml` specification for 1-click Render Blueprints:

```yaml
services:
  - type: web
    name: asset-swap
    runtime: node
    plan: starter
    buildCommand: npm ci && npm run build
    startCommand: npm run server
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DATABASE_PATH
        value: /var/data/asset_swap.db
      - key: ADMIN_BOOTSTRAP_EMAIL
        generateValue: false
      - key: ADMIN_BOOTSTRAP_PASSWORD
        generateValue: true
      - key: APP_ORIGIN
        sync: false
    disk:
      name: asset-swap-data
      mountPath: /var/data
      sizeGB: 1
```

> **IMPORTANT Persistent Disk Requirement:** Render's free tier uses an ephemeral filesystem that clears on every deploy and service restart. To ensure your SQLite database (`users`, `listings`, `matches`, `proposals`, and `audit_logs`) persists permanently across deployments, Render requires a persistent disk on the **Starter** instance tier (`plan: starter`, $7/month instance + $0.25/GB disk).

### 2. Manual Render Web Service Setup

If deploying manually via the Render Dashboard:

1. **Create Web Service**: Connect your GitHub repository (`Saieswar2806/asset-swap`).
2. **Environment**: Select `Node`.
3. **Build Command**: `npm ci && npm run build`
4. **Start Command**: `npm run server`
5. **Instance Plan**: Select `Starter` (required to attach persistent disk).
6. **Add Persistent Disk**:
   - Name: `asset-swap-data`
   - Mount Path: `/var/data`
   - Size: `1 GB`
7. **Configure Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_PATH`: `/var/data/asset_swap.db`
   - `ADMIN_BOOTSTRAP_EMAIL`: Your primary admin email (e.g. `admin@yourdomain.com`)
   - `ADMIN_BOOTSTRAP_PASSWORD`: Strong password for the initial administrator
   - `APP_ORIGIN`: Your public Render URL (e.g. `https://asset-swap.onrender.com`)

### 3. Environment Variables Reference

| Variable | Required | Default (Dev) | Production Recommendation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | No | `development` | `production` | Enables production security headers, secure cookies, and disables demo data auto-seeding |
| `PORT` | No | `3001` | `10000` (Render default) | Port for the Express backend server |
| `DATABASE_PATH` | No | `asset_swap.db` | `/var/data/asset_swap.db` | Absolute or relative path to the persistent SQLite database file |
| `ADMIN_BOOTSTRAP_EMAIL` | No | `admin@asset-swap.local` | `admin@yourdomain.com` | Email for initial administrator bootstrap when database is empty |
| `ADMIN_BOOTSTRAP_PASSWORD` | No | `Admin@123` | Secure random password | Password for initial administrator bootstrap |
| `APP_ORIGIN` | No | `*` (Any origin) | `https://your-service.onrender.com` | CORS origin policy; if omitted in production, requests default to same-origin |

### 4. Database Persistence & Integrity

- **Directory Auto-Creation**: On initialization, the backend checks `DATABASE_PATH` and automatically creates parent directories (`fs.mkdirSync(dbDir, { recursive: true })`) before opening the SQLite database.
- **Concurrency & WAL Mode**: SQLite runs with `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`, and `PRAGMA busy_timeout = 10000;`.
- **Safe Migrations**: Table schemas check existing SQLite metadata and use `INSERT OR IGNORE` rather than destructive replacements, preserving existing users, hashed passwords, and foreign key relationships across server reboots.
- **Production Admin Bootstrap**: In `NODE_ENV === "production"`, synthetic demo accounts and listings are **never** seeded. If no admin account exists, `bootstrapProductionAdmin()` safely creates a single initial administrator using the configured environment variables.
- **Frontend Safety**: In production mode (`NODE_ENV === "production"`), demo login shortcuts and test credentials are automatically hidden from the login view.

---

## Technical Boundaries & Regulatory Disclaimers

1. **Primary Transaction Model**: Asset exchange is the foundational mechanism. Cash is strictly utilized as a valuation balancing adjustment (**Cash Boot**).
2. **Human-in-the-Loop Valuations**: No algorithmic or machine-learning pricing models are utilized for property values. All exchange valuations require physical inspection and sign-off by a licensed real estate broker.
3. **Regulatory Scope**: This application is a technology prototype and matching facilitation tool. It does **not** conduct real-money banking transactions, automated escrow disbursement, title insurance, legal due diligence, or statutory deed registration. All final real estate transactions must be executed through appropriate legal deed conveyances under applicable state laws.
