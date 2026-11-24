# Asset Swap — Matching Engine Prototype

A small, runnable TypeScript prototype for matching reviewed property listings into:
- direct 2-party swaps
- 3-party trade loops
- cash boot calculations
- ranked match suggestions
- all-or-nothing accept/decline workflow with listing locks

This is an algorithm prototype, not a production property transaction system.
It does not verify title, ownership, valuation, tax, stamp duty, or legal eligibility.
Those checks must be performed by qualified local professionals.

## Requirements
- Node.js 20+ (18+ should also work)
- npm

## Run
```bash
npm install
npm run typecheck
npm test
npm run demo
```

## How the cycle works
An edge `A -> B` means owner A wants the property owned by B.
For a cycle `A -> B -> C -> A`:
- A receives B's property and gives A's property to C
- B receives C's property and gives B's property to A
- C receives A's property and gives C's property to B

Boot for each participant = value given - value received.
Positive boot means that participant pays; negative means they receive.
Boots in a cycle must sum to zero.

## Data rules
Only listings with `status: "reviewed"` and `locked: false` are eligible.
The `reviewedValue` must be supplied by your human review process (for example,
a broker valuation review). The prototype never estimates it.

Location matching uses exact preferred locality/district matches first.
If coordinates are supplied, it also allows a configurable radius (default 50 km).

## Important limitations
- Only cycles of length 2 and 3 are searched.
- The demo uses sample data only.
- The in-memory workflow is not durable across restarts.
- No payments are processed.
- Do not upload real sale deeds, identity documents, or sensitive customer data
  into this prototype.
