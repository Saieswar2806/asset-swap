# Asset Swap – Core Asset Exchange Matching Engine

**Asset Swap** is a technology-driven asset exchange platform. 

Our fundamental business objective is to connect people who own assets they want to exchange with people who own assets they actually need.

> **Important Transaction Model:** This is **NOT** a conventional property buying/selling marketplace. Asset exchange is the primary transaction model. Cash is only used when there is a difference in the mutually reviewed asset valuations (**Cash Boot**).

---

## Architecture & Algorithm Overview

### 1. Graph-Based Directed Cycle Matching Engine

The matching engine models the asset marketplace as a **directed compatibility graph**:
- **Nodes ($V$)**: Individual asset listings verified and unlocked in the system.
- **Edges ($E$)**: A directed edge $A \to B$ indicates that **Seeker $A$ wants and is willing to receive Target $B$'s asset**. An edge exists if and only if:
  1. **Distinct Owners**: Owner of $A$ is not owner of $B$ (`A.ownerId !== B.ownerId`).
  2. **Property Type Compatibility**: $B$'s property category is contained in $A$'s desired types (`wants.propertyTypes`).
  3. **Location Proximity**: $B$'s location matches $A$'s preferred locations or falls within $A$'s configured geographical radius (computed via Haversine distance from the Karnataka Geo-Coordinates Database).
  4. **Minimum Area Requirement**: If $A$ specifies `minArea`, $B$'s standardized area (converted to square feet) satisfies the requirement.

### 2. Supported Exchange Topologies & Transfer Direction

The cycle direction has one clear, consistent interpretation:

#### A. Direct 2-Party Asset Exchange ($A \leftrightarrow B$)
- **Cycle**: $A \to B \to A$
- $A$ wants and receives $B$'s asset.
- $B$ wants and receives $A$'s asset.
- **Actual Asset Transfers**:
  - Person $A$ gives their asset to Person $B$.
  - Person $B$ gives their asset to Person $A$.
- Cash settlement (boot) balances any valuation difference between $A$ and $B$. When valuations are identical, cash boot is ₹0.

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

#### Example:
- Participant $A$ gives an asset worth ₹20 Lakh and receives an asset worth ₹25 Lakh $\implies$ $A$ pays ₹5 Lakh.

#### Conservation of Value
Across any closed cycle $[L_0, L_1, \dots, L_{n-1}]$:

$$\sum_{i=0}^{n-1} \text{Boot}_i = \sum_{i=0}^{n-1} \left( \text{Value}(L_{(i+1) \bmod n}) - \text{Value}(L_i) \right) = \sum \text{Received} - \sum \text{Given} \equiv 0$$

The total cash paid across all participants equals the total cash received, ensuring zero net deficit or surplus. Computations use 2-decimal-place monetary precision to prevent floating-point rounding errors.

### 4. Valuation Source: Broker-Reviewed Valuations Only

- In adherence to strict platform guidelines, **no machine-learning or black-box algorithmic estimations** are used for asset values.
- Only assets evaluated through human **broker-reviewed valuations** (`status: "reviewed"` and positive `reviewedValue > 0`) are eligible for matching.
- Listings with status `draft`, `submitted`, `under_review`, `rejected`, or `locked: true` are completely excluded.

### 5. Deterministic Match Quality Scoring (0 – 100)

Matches are ranked deterministically:
1. **Cash Efficiency (up to 45 pts)**: Highest score for pure asset swaps (₹0 boot), decaying proportionally as cash boot increases as a fraction of asset value.
2. **Location Proximity (up to 35 pts)**: Highest score for exact locality matches (0 km), decaying with average distance within configured radius.
3. **Execution Simplicity (up to 10 pts)**: 2-party direct swaps receive a 10 pt simplicity score; 3-party swaps receive 7 pts.
4. **Broker-Reviewed Baseline (10 pts)**: Baseline for verified broker-reviewed listings.

> **Disclaimer:** The match quality score is an algorithmic compatibility heuristic (0–100) reflecting relative valuation alignment, geographical proximity, cycle simplicity, and broker review status. It is **NOT** a guarantee of transaction closing, structural soundness, legal title validity, or property physical quality.

### 6. Transaction Workflow & Locking Lifecycle

Managed via `MatchWorkflow`:
1. **`propose(match)`**: Locks all participating listings, preventing them from participating in conflicting matches or being locked twice.
2. **`respond(matchId, listingId, decision)`**:
   - Only registered participants with pending responses can respond.
   - If any participant **declines**, the match status transitions to `declined` and all asset locks are **immediately released**.
   - If all participants **accept**, the match status transitions to `accepted` and asset locks are retained pending offline legal execution.
   - Closed matches (accepted, declined, expired) reject further responses.
3. **`expire(matchId)`**: Cancels timed-out proposals and releases all asset locks.

---

## Collision-Free Match ID Generation

Match IDs are generated using a rotation-invariant canonical structure:
- **Direct 2-Party Swaps**: Rotation-independent ID formatted as `match-2p-${sorted[0]}-${sorted[1]}`. `[A, B]` and `[B, A]` produce identical IDs.
- **3-Party Directed Cycles**: Canonical rotation starting with the lexicographically smallest listing ID: `match-3p-${canonicalRotation.join("-")}`.
  - Rotations of the same directed cycle ($A \to B \to C \to A$, $B \to C \to A \to B$, $C \to A \to B \to C$) produce the **same ID** (`match-3p-A-B-C`).
  - Reversed directed cycles ($A \to C \to B \to A$) produce a **different ID** (`match-3p-A-C-B`), preventing collision when two opposite directed cycles exist between the same three participants.

---

## Fictional Demonstration Dataset

The dataset in [src/data/listings.ts](file:///c:/Users/laksh/Downloads/asset-swap-prototype/src/data/listings.ts) contains **112 fictional property listings** created exclusively for algorithmic demonstration and testing:
- **Districts Covered**: Bengaluru, Ramanagara, Mysuru, Mandya, Tumakuru, Chikkaballapur.
- **Categories Included**: Agricultural land (acres/guntas), Residential plots (sq ft), Apartments (sq ft), Independent houses (sq ft), Farmhouses (acres/sq ft), Commercial properties (sq ft).
- **Notice**: All owner names, properties, and values in this dataset are fictional demonstrations. The prototype does **NOT** conduct real-money banking transactions, title search, escrow, payment processing, or deed registration.

---

## Local Execution Instructions

### Prerequisites
- Node.js (v18+)
- npm

### 1. Run Typecheck
Verify strict TypeScript compilation with zero errors:
```bash
npm run typecheck
```

### 2. Run Automated Test Suite
Run the 17 automated tests covering all requirements and edge cases:
```bash
npm test
```

Test coverage includes:
1. Successful direct asset exchange (2-party) with correct transfer direction ($A \to B$, $B \to A$).
2. Successful three-party exchange ($A \to B \to C \to A$) with transfers: $A \to C$, $B \to A$, $C \to B$.
3. Match ID uniqueness and rotation consistency.
4. Separate directed 3-party cycles between same participants producing distinct IDs.
5. Monetary precision strategy preventing floating-point inaccuracies.
6. Invalid asset type combination rejection.
7. Location boundary conditions: exact match, radius boundaries, coordinate validity, and unknown localities.
8. Minimum-area unit conversions (acres, guntas, sq ft).
9. Unreviewed, locked, and invalid property listing exclusion.
10. Duplicate listing ID detection.
11. Same owner self-matching prevention.
12. Maximum cash-to-pay and cash-to-receive enforcement.
13. Workflow proposal safety, double-locking prevention, and response validation.
14. Workflow decline and expiration releasing all asset locks.
15. Match-quality score clamping (0–100) and edge-input safety.
16. Matcher `maxCycles` limit option.
17. Full integration test on 112+ fictional Karnataka listings.

### 3. Run Interactive Demo
Execute the full matching demonstration and workflow lifecycle:
```bash
npm run demo
```
