# Asset Swap – Core Asset Exchange Matching Engine

**Asset Swap** is a technology-driven asset exchange platform. 

Our fundamental business objective is to connect people who own assets they want to exchange with people who own assets they actually need.

> **Important Business Model:** This is **NOT** a conventional property buying/selling marketplace. Asset exchange is the primary transaction model. Cash is only used when there is a difference in the mutually reviewed asset valuations (**Cash Boot**).

---

## Architecture & Algorithm Overview

### 1. Graph-Based Directed Cycle Matching Engine

The matching engine models the asset marketplace as a **directed compatibility graph**:
- **Nodes ($V$)**: Individual asset listings verified and unlocked in the system.
- **Edges ($E$)**: A directed edge $A \to B$ exists if and only if:
  1. **Distinct Owners**: Owner of $A$ is not owner of $B$.
  2. **Property Type Compatibility**: $B$'s property category is contained in $A$'s desired types (`wants.propertyTypes`).
  3. **Location Proximity**: $B$'s location matches $A$'s preferred locations or falls within $A$'s configured geographical radius (computed via Haversine distance from the Karnataka Geo-Coordinates Database).
  4. **Minimum Area Requirement**: If $A$ specifies `minArea`, $B$'s standardized area (converted to square feet) satisfies the requirement.

### 2. Supported Exchange Topologies

The engine discovers closed directed cycles of length 2 and 3:

#### A. Direct 2-Party Asset Exchange ($A \leftrightarrow B$)
- Person $A$ gives Asset $A$ to Person $B$ and receives Asset $B$.
- Person $B$ gives Asset $B$ to Person $A$ and receives Asset $A$.
- Cash settlement (boot) balances any valuation difference between $A$ and $B$. When valuations are identical, cash boot is ₹0.

#### B. Multi-Party 3-Way Circular Asset Exchange ($A \to B \to C \to A$)
- Person $A$ gives Asset $A$ to Person $C$ and receives Asset $B$ from Person $B$.
- Person $B$ gives Asset $B$ to Person $A$ and receives Asset $C$ from Person $C$.
- Person $C$ gives Asset $C$ to Person $B$ and receives Asset $A$ from Person $A$.
- Cash difference for each participant is computed individually, and the sum of all cash boots across the closed cycle strictly balances to ₹0.

### 3. Cash Boot Settlement Calculations

Cash boot represents the financial adjustment required to achieve equitable exchange:

$$\text{Cash Boot} = \text{Value of Asset Received} - \text{Value of Asset Given}$$

- **Positive value ($> 0$)**: Owner received a higher-value asset $\to$ **Owner pays cash boot**.
- **Negative value ($< 0$)**: Owner gave a higher-value asset $\to$ **Owner receives cash boot**.
- **Zero ($= 0$)**: Exact asset valuation match $\to$ **Pure asset swap**.

#### Conservation of Value
Across any closed cycle $[L_0, L_1, \dots, L_{n-1}]$:

$$\sum_{i=0}^{n-1} \text{Boot}_i = \sum_{i=0}^{n-1} \left( \text{Value}(L_{(i+1) \bmod n}) - \text{Value}(L_i) \right) = \sum \text{Received} - \sum \text{Given} \equiv 0$$

The total cash paid across all participants equals the total cash received, ensuring zero net deficit or surplus.

### 4. Valuation Integrity: Broker-Reviewed Only

- In adherence to strict platform guidelines, **no machine-learning or black-box algorithmic estimations** are used for asset values.
- Only assets verified through certified human broker inspection (`status: "reviewed"` and valid `reviewedValue > 0`) are eligible for matching.
- Assets in `draft`, `submitted`, `under_review`, `rejected`, or `locked: true` are completely excluded.

### 5. Multi-Factor Match Quality Scoring (0 – 100)

Matches are ranked deterministically:
1. **Cash Efficiency (up to 45 pts)**: Highest score for pure asset swaps (₹0 boot), decaying proportionally as cash boot increases as a fraction of asset value.
2. **Location Proximity (up to 35 pts)**: Highest score for exact locality matches (0 km), decaying with average distance within configured radius.
3. **Execution Simplicity (up to 10 pts)**: 2-party direct swaps receive a 10 pt bonus; 3-party swaps receive 7 pts.
4. **Verification Base (10 pts)**: Certified broker valuation baseline.

### 6. Transaction Workflow & Locking Lifecycle

Managed via `MatchWorkflow`:
1. **`propose(match)`**: Locks all participating listings, preventing them from being matched into conflicting exchanges.
2. **`respond(matchId, listingId, decision)`**:
   - If any participant **declines**, the match status changes to `declined` and all asset locks are **immediately released**.
   - If all participants **accept**, the match status transitions to `accepted` and asset locks are retained for legal deed execution.
3. **`expire(matchId)`**: Cancels timed-out proposals and releases asset locks.

---

## Extensibility to Other Asset Classes

While the prototype prioritizes real estate in Karnataka, the architecture is designed for multi-asset expansion:
- **`AssetCategory`**: `"real_estate" | "vehicle" | "machinery" | "business"`
- **Category-Agnostic Matching Engine**: The graph cycle detector operates on standardized `Listing` and `Boot` interfaces. Adding vehicle or machinery listings requires only extending asset-specific attribute filters (e.g., vehicle mileage, machine manufacturing year) while keeping the core exchange graph and boot balancing untouched.

---

## Realistic Karnataka Dataset

The seed dataset (`src/data/listings.ts`) includes **112 realistic listings** across 6 Karnataka districts:
- **Bengaluru**: Indiranagar, Whitefield, Koramangala, Jayanagar, Electronic City, Yelahanka, HSR Layout, Hebbal
- **Ramanagara**: Harohalli, Kanakapura, Channapatna, Bidadi, Magadi, Ramanagara Town
- **Mysuru**: Vijayanagar, Jayalakshmipuram, Kuvempunagar, Gokulam, Nanjangud, Bannur
- **Mandya**: Mandya Town, Maddur, Srirangapatna, Pandavapura, Malavalli
- **Tumakuru**: Tumakuru Town, Kunigal, Tiptur, Sira, Gubbi
- **Chikkaballapur**: Chikkaballapur Town, Gauribidanur, Sidlaghatta, Bagepalli, Chintamani

Property categories include:
- Agricultural land (measured in acres and guntas)
- Residential plots & sites (measured in sq ft)
- Apartments (measured in sq ft)
- Independent houses (measured in sq ft)
- Farmhouses (measured in acres and sq ft)
- Commercial properties (measured in sq ft)

---

## Local Execution Instructions

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Run Typecheck
Verify strict TypeScript compilation with zero errors:
```bash
npm run typecheck
```

### 2. Run Automated Test Suite
Run the 13 automated test suites covering all required scenarios:
```bash
npm test
```

Test coverage includes:
1. Successful direct asset exchange (2-party).
2. Successful three-party exchange (3-party cycle).
3. Invalid asset type combination rejection.
4. Location incompatibility (radius / preference exclusions).
5. Unreviewed asset exclusion (`draft`, `under_review`, `rejected`, zero value).
6. Locked asset exclusion.
7. Cash settlement limits enforcement (`maxCashToPay`, `maxCashToReceive`).
8. Cash settlement balance validation ($\sum \text{boots} = 0$).
9. Duplicate cycle prevention (canonical rotation deduplication).
10. Declined exchange and lock release.
11. Unanimous acceptance and lock retention.
12. Assets without possible matches (graceful orphan handling).
13. Full dataset integration test (112 listings).

### 3. Run Interactive Demo
Execute the full matching demonstration and workflow lifecycle:
```bash
npm run demo
```
