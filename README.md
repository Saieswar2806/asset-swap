# Asset Swap – Full-Stack Property Exchange Platform (Phase 2)

**Asset Swap** is a technology-driven real estate asset exchange platform. 

Our fundamental business objective is to connect people who own assets they want to exchange with people who own assets they actually need.

> **Important Transaction Model:** This is **NOT** a conventional property buying/selling marketplace. Asset exchange is the primary transaction model. Cash is only used when there is a difference in the mutually reviewed asset valuations (**Cash Boot**).
>
> In strict compliance with regulatory guidelines, **no machine-learning or black-box algorithmic estimations** are used for asset values. Only broker-reviewed valuations are accepted. The prototype does not conduct real-money banking transactions, title search, escrow, payment processing, or deed registration.

---

## System Architecture

The platform is designed as a modern, decoupled full-stack TypeScript application:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                           │
│  - Tailwind CSS + Lucide Icons (Institutional Real Estate Design)      │
│  - React Router (Dashboard, Register, Portfolio, Review, Match Explorer)│
│  - React Flow (@xyflow/react) Visual Exchange Graph Engine             │
│  - Recharts Dashboard Analytics (Property Category & Activity Trends)  │
│  - Persona Switcher Context (Switch between Owners & Admin Reviewer)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON REST APIs
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Express Backend (Node.js)                        │
│  - RESTful Endpoints (/api/listings, /api/matches, /api/workflow, etc.)│
│  - Auto-seeding SQLite Persistence Layer (node:sqlite DatabaseSync)    │
│  - Persona Header & Simulated Auth Context                             │
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

## Interactive Application Modules

### 1. Executive Dashboard (`/`)
- **Key Metrics Overview**: Real-time KPI cards for Total Listings, Listings Awaiting Review, Broker-Reviewed Assets, Available Matches, Active Proposals, and Completed Exchanges.
- **Visual Analytics**: Interactive Recharts graphs displaying property category distribution (Acres & Sq Ft) and platform exchange activity trends.
- **Top Match Opportunities & Recent Listings**: Quick access to highest-scoring exchange opportunities and recently submitted Karnataka properties.

### 2. Multi-Step Property Registration Wizard (`/register`)
- **Step 1: Property Details**: Title, category, district, taluk, locality, PIN code, standardized area unit conversion, and owner-declared valuation.
- **Step 2: Legal & Land Information**: Khata type (A Khata, B Khata, E Khata), survey number, land conversion status (DC Converted, Agricultural, NA), and comprehensive description.
- **Step 3: Exchange Requirements**: Desired asset types, preferred districts/localities, minimum acceptable area, maximum cash willing to pay, and maximum cash willing to receive.
- **Step 4: Review & Submit**: Comprehensive client-side validation and immediate transition to `submitted` status for broker evaluation.

### 3. My Properties & Owner Portfolio (`/my-properties`)
- **Owner Asset Management**: Displays the authenticated user's registered real estate portfolio with badges (`submitted`, `reviewed`, `rejected`, `locked`).
- **Inline Property Editing**: Modal dialog allowing owners to update descriptions, valuations, and exchange preferences.
- **Instant Match Discovery**: 1-click trigger to find direct 2-party and 3-way circular matches specific to any selected property.

### 4. Admin Broker Review Panel (`/admin/review`)
- **Valuation Assessment Queue**: Dedicated administration interface for broker-in-the-loop valuation reviews.
- **Broker Review Action Modal**: 
  - Allows verified brokers to review legal records and enter an official broker-reviewed valuation (in ₹ Lakhs/Crores).
  - Explicit decision triggers: **Approve to `reviewed`** or **Reject** with formal internal reviewer notes and reason.
- **Security & Integrity**: Unreviewed assets cannot enter the matching graph until formally approved by a broker.

### 5. Intelligent Match Discovery (`/matches`)
- **Configurable Graph Cycle Search**: Search for exchange cycles across all reviewed Karnataka listings or targeted to a specific property.
- **Search Parameters**: Configurable geographical search radius (10 km to 150 km) and exchange topology filters (Direct 2-Party vs. Multi-Party 3-Way).
- **Match Opportunity Cards**: Displays composite match score (0–100), breakdown of participants, cash settlement requirements, and savings compared to conventional double-brokerage sales.

### 6. Interactive Match Flow & Consensus Workflow (`/matches/:id`)
- **Dual Flow React Flow Graph**:
  - **Preference Flow ($A \to B \to C \to A$)**: Clear blue directional paths showing what each participant desired and receives.
  - **Physical Asset Transfer Flow ($A \to C$, $B \to A$, $C \to B$)**: Distinct amber directional paths showing exact physical deed conveyances.
- **Cash Boot Financial Ledger**: Clear tabular view of value given, value received, signed cash boot, and payment directions ensuring zero net deficit across the closed cycle.
- **Simulated Transaction Lifecycle**:
  - **Propose Exchange**: Initiates proposal, locking all participating listings from competing matches.
  - **Participant Consensus**: Real-time simulation of individual participant voting (Accept / Decline).
  - **Consensus Resolution**: Unanimous acceptance retains locks for legal conveyancing; any decline or proposal expiration automatically releases all locks back to the open pool.

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
- **Auto-Seeded Database**: On initial startup, the platform creates an embedded SQLite database (`asset_swap.db`) populated with these 112 listings, requirement profiles, broker reviews, and user accounts.

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
# Run unit & SQLite database tests (22 tests)
npm test

# Run API integration tests (8 tests)
npm run test:api
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

