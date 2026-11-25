import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { seedListings } from "../data/listings.js";
import { hashPassword } from "./password.js";
import type { Listing, PropertyType, AreaUnit, VerificationStatus, Match, Boot, ExchangeLeg } from "../types.js";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");

// Ensure data directory exists and configure database path
const rawDbPath = process.env.DATABASE_PATH || "asset_swap.db";
const dbPath = path.isAbsolute(rawDbPath) ? rawDbPath : path.resolve(process.cwd(), rawDbPath);
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
export const db = new DatabaseSync(dbPath);

// Enable Foreign Keys, WAL Mode, and Busy Timeout for concurrency
try {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 10000;");
  db.exec("PRAGMA foreign_keys = ON;");
} catch {
  // Ignored if already configured
}

export function initDatabase(): void {
  // 1. Users Table (Migration check for role: admin, broker, owner & status: active, pending, etc.)
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get() as { name: string } | undefined;
  if (tableCheck) {
    const cols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const hasPasswordHash = cols.some((c) => c.name === "passwordHash");
    const hasStatus = cols.some((c) => c.name === "status");
    if (!hasPasswordHash || !hasStatus) {
      db.exec("PRAGMA foreign_keys = OFF;");
      db.exec(`
        CREATE TABLE users_migrated (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'broker', 'owner')),
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending', 'rejected', 'suspended')),
          phone TEXT,
          agency TEXT,
          licenseNumber TEXT,
          jurisdiction TEXT,
          experienceYears INTEGER,
          rejectionReason TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);
      const defaultOwnerHash = hashPassword("Owner@123");
      const defaultAdminHash = hashPassword("Admin@123");
      db.exec(`
        INSERT OR IGNORE INTO users_migrated (id, name, email, passwordHash, role, status, phone, createdAt, updatedAt)
        SELECT id, name, email,
          CASE WHEN role = 'admin' THEN '${defaultAdminHash}' ELSE '${defaultOwnerHash}' END,
          CASE WHEN role = 'admin' THEN 'admin' WHEN role = 'broker' THEN 'broker' ELSE 'owner' END,
          'active',
          phone,
          createdAt,
          createdAt
        FROM users;
      `);
      db.exec("DROP TABLE users;");
      db.exec("ALTER TABLE users_migrated RENAME TO users;");
      db.exec("PRAGMA foreign_keys = ON;");
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'broker', 'owner')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending', 'rejected', 'suspended')),
        phone TEXT,
        agency TEXT,
        licenseNumber TEXT,
        jurisdiction TEXT,
        experienceYears INTEGER,
        rejectionReason TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  }

  // Sessions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // 2. Listings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL REFERENCES users(id),
      ownerName TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'real_estate',
      propertyType TEXT NOT NULL,
      district TEXT NOT NULL,
      taluk TEXT,
      locality TEXT NOT NULL,
      pincode TEXT,
      latitude REAL,
      longitude REAL,
      area REAL NOT NULL,
      areaUnit TEXT NOT NULL,
      ownerDeclaredValue REAL NOT NULL,
      reviewedValue REAL,
      status TEXT NOT NULL CHECK(status IN ('draft', 'submitted', 'under_review', 'reviewed', 'rejected')),
      rejectionReason TEXT,
      locked INTEGER NOT NULL DEFAULT 0,
      khataType TEXT,
      surveyNumber TEXT,
      conversionStatus TEXT,
      description TEXT,
      imageUrl TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // 3. Exchange Requirements Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exchange_requirements (
      id TEXT PRIMARY KEY,
      listingId TEXT UNIQUE NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      desiredPropertyTypes TEXT NOT NULL,
      preferredDistricts TEXT NOT NULL,
      preferredLocalities TEXT NOT NULL,
      minArea REAL,
      minAreaUnit TEXT,
      maxCashToPay REAL,
      maxCashToReceive REAL
    );
  `);

  // 4. Property Reviews (Admin Audit Trail)
  db.exec(`
    CREATE TABLE IF NOT EXISTS property_reviews (
      id TEXT PRIMARY KEY,
      listingId TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      reviewerId TEXT NOT NULL REFERENCES users(id),
      reviewerName TEXT NOT NULL,
      reviewedValue REAL NOT NULL,
      internalNotes TEXT,
      action TEXT NOT NULL CHECK(action IN ('approved', 'rejected')),
      createdAt TEXT NOT NULL
    );
  `);

  // 5. Matches Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      matchType TEXT NOT NULL,
      partyCount INTEGER NOT NULL,
      cycle TEXT NOT NULL,
      listingIds TEXT NOT NULL,
      totalAbsoluteBoot REAL NOT NULL,
      locationScoreKm REAL NOT NULL,
      matchScore INTEGER NOT NULL,
      verificationStatus TEXT NOT NULL DEFAULT 'reviewed',
      status TEXT NOT NULL CHECK(status IN ('proposed', 'accepted', 'declined', 'expired')),
      explanation TEXT NOT NULL,
      reasons TEXT NOT NULL,
      exchangeLegs TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // 6. Match Participants Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS match_participants (
      id TEXT PRIMARY KEY,
      matchId TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      listingId TEXT NOT NULL REFERENCES listings(id),
      ownerId TEXT NOT NULL,
      ownerName TEXT NOT NULL,
      givesAssetId TEXT NOT NULL,
      givesPropertyType TEXT NOT NULL,
      givesValue REAL NOT NULL,
      receivesAssetId TEXT NOT NULL,
      receivesPropertyType TEXT NOT NULL,
      receivesValue REAL NOT NULL,
      amount REAL NOT NULL,
      action TEXT NOT NULL,
      cashDifference REAL NOT NULL,
      explanation TEXT NOT NULL
    );
  `);

  // 7. Match Responses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS match_responses (
      id TEXT PRIMARY KEY,
      matchId TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      listingId TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      decision TEXT NOT NULL CHECK(decision IN ('pending', 'accepted', 'declined')),
      respondedAt TEXT
    );
  `);

  // 8. Audit Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      performedBy TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  // 9. Buyer Inquiries Table (For Buy & Sell direct interest workflow)
  db.exec(`
    CREATE TABLE IF NOT EXISTS buyer_inquiries (
      id TEXT PRIMARY KEY,
      listingId TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      sellerId TEXT NOT NULL REFERENCES users(id),
      buyerId TEXT NOT NULL REFERENCES users(id),
      buyerName TEXT NOT NULL,
      buyerEmail TEXT NOT NULL,
      buyerPhone TEXT,
      offerAmount REAL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'contacted', 'closed')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Safe schema migrations for listings (intent, askingPrice, saleDescription, bedrooms, bathrooms)
  try {
    const listingCols = db.prepare("PRAGMA table_info(listings)").all() as Array<{ name: string }>;
    if (!listingCols.some((c) => c.name === "intent")) {
      db.exec("ALTER TABLE listings ADD COLUMN intent TEXT NOT NULL DEFAULT 'swap';");
    }
    if (!listingCols.some((c) => c.name === "askingPrice")) {
      db.exec("ALTER TABLE listings ADD COLUMN askingPrice REAL;");
    }
    if (!listingCols.some((c) => c.name === "saleDescription")) {
      db.exec("ALTER TABLE listings ADD COLUMN saleDescription TEXT;");
    }
    if (!listingCols.some((c) => c.name === "bedrooms")) {
      db.exec("ALTER TABLE listings ADD COLUMN bedrooms INTEGER;");
    }
    if (!listingCols.some((c) => c.name === "bathrooms")) {
      db.exec("ALTER TABLE listings ADD COLUMN bathrooms INTEGER;");
    }

    // Safe schema migrations for exchange_requirements (minValue, maxValue, openToCashAdjustment)
    const reqCols = db.prepare("PRAGMA table_info(exchange_requirements)").all() as Array<{ name: string }>;
    if (!reqCols.some((c) => c.name === "minValue")) {
      db.exec("ALTER TABLE exchange_requirements ADD COLUMN minValue REAL;");
    }
    if (!reqCols.some((c) => c.name === "maxValue")) {
      db.exec("ALTER TABLE exchange_requirements ADD COLUMN maxValue REAL;");
    }
    if (!reqCols.some((c) => c.name === "openToCashAdjustment")) {
      db.exec("ALTER TABLE exchange_requirements ADD COLUMN openToCashAdjustment INTEGER DEFAULT 1;");
    }
  } catch (err) {
    console.warn("Migration warning:", err);
  }

  // Populate askingPrice & intent on seed/existing reviewed listings if not yet configured for buy/sell
  try {
    const sellCountRow = db.prepare("SELECT COUNT(*) as c FROM listings WHERE intent IN ('sell', 'both')").get() as { c: number };
    if (sellCountRow.c === 0) {
      // Set approximately 40% of reviewed properties to 'both' (swap and sell) and populate askingPrice, bedrooms, bathrooms
      db.exec(`
        UPDATE listings
        SET intent = 'both',
            askingPrice = COALESCE(reviewedValue, ownerDeclaredValue),
            bedrooms = CASE 
              WHEN propertyType IN ('apartment', 'independent_house', 'farmhouse') THEN ((CAST(SUBSTR(id, -2) AS INTEGER) % 3) + 2)
              ELSE NULL 
            END,
            bathrooms = CASE 
              WHEN propertyType IN ('apartment', 'independent_house', 'farmhouse') THEN 2
              ELSE NULL 
            END,
            saleDescription = 'Verified clear title property available for outright sale or mutual property swap.'
        WHERE status = 'reviewed' AND (CAST(SUBSTR(id, -2) AS INTEGER) % 2 = 0);
      `);
    }
  } catch {
    // Non-fatal if already set
  }

  // Handle environment-based initialization
  if (process.env.NODE_ENV === "production") {
    bootstrapProductionAdmin();
  } else {
    ensureDemoAuthUsers();
    const countRow = db.prepare("SELECT COUNT(*) as count FROM listings").get() as { count: number };
    if (countRow.count === 0) {
      seedDatabase();
    }
  }
}

function generatePropertyTitle(p: Listing): string {
  const typeMap: Record<string, string> = {
    agricultural_land: "Fertile Agricultural Land",
    plot_site: "Prime Residential Site",
    apartment: "Modern Premium Apartment",
    independent_house: "Spacious Independent Villa",
    farmhouse: "Tranquil Country Farmhouse",
    commercial: "Prime Commercial Building"
  };
  const titlePrefix = typeMap[p.propertyType] || "Exclusive Property";
  return `${titlePrefix} in ${p.locality}, ${p.district}`;
}

function getPropertyImage(type: PropertyType, index: number): string {
  const images: Record<PropertyType, string[]> = {
    agricultural_land: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=60"
    ],
    plot_site: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=800&auto=format&fit=crop&q=60"
    ],
    apartment: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=60"
    ],
    independent_house: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=60"
    ],
    farmhouse: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=60"
    ],
    commercial: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60"
    ]
  };
  const list = images[type] || images.apartment;
  return list[index % list.length];
}

export function bootstrapProductionAdmin(): void {
  const adminRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  if (adminRow.count === 0) {
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@asset-swap.local";
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "Admin@123";
    const now = new Date().toISOString();
    const insertAdmin = db.prepare(`
      INSERT OR IGNORE INTO users (
        id, name, email, passwordHash, role, status, phone,
        agency, licenseNumber, jurisdiction, experienceYears, rejectionReason,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?, ?, ?, ?, NULL, ?, ?)
    `);
    insertAdmin.run(
      "admin-bootstrap",
      "System Administrator",
      email,
      hashPassword(password),
      "+91 98450 11223",
      "Asset Swap Platform Governance",
      "ADMIN-GOV-BOOTSTRAP",
      "Karnataka State",
      15,
      now,
      now
    );
    console.log(`[BOOTSTRAP] Initial production administrator created with email: ${email}`);
  }
}

export function ensureDemoAuthUsers(): void {
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, name, email, passwordHash, role, status, phone,
      agency, licenseNumber, jurisdiction, experienceYears, rejectionReason,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  // 1. Admin Account (admin@asset-swap.local / Admin@123)
  insertUser.run(
    "admin-001",
    "Kavitha Murthy (Administrator)",
    "admin@asset-swap.local",
    hashPassword("Admin@123"),
    "admin",
    "active",
    "+91 98450 11223",
    "Asset Swap Platform Governance",
    "ADMIN-GOV-01",
    "Karnataka State",
    15,
    null,
    now,
    now
  );

  // 2. Approved Broker 1 (kavitha.murthy@broker.local / Broker@123)
  insertUser.run(
    "broker-001",
    "Kavitha Murthy (Senior Broker Reviewer)",
    "kavitha.murthy@broker.local",
    hashPassword("Broker@123"),
    "broker",
    "active",
    "+91 98450 22334",
    "Karnataka Valuation Partners",
    "KAR-REV-2018-0912",
    "Bengaluru, Ramanagara, Mysuru",
    12,
    null,
    now,
    now
  );

  // 3. Approved Broker 2 (suresh.rao@broker.local / Broker@123)
  insertUser.run(
    "broker-002",
    "Suresh Rao (Valuation Expert)",
    "suresh.rao@broker.local",
    hashPassword("Broker@123"),
    "broker",
    "active",
    "+91 98450 33445",
    "Mysuru Urban Realty Advisors",
    "KAR-REV-2020-4421",
    "Mysuru, Mandya, Tumakuru",
    8,
    null,
    now,
    now
  );

  // 4. Pending Broker Application (rajesh.patel@broker.local / Broker@123)
  insertUser.run(
    "broker-003",
    "Rajesh Patel",
    "rajesh.patel@broker.local",
    hashPassword("Broker@123"),
    "broker",
    "pending",
    "+91 98450 44556",
    "Patel Property Consultants",
    "KAR-REV-2023-8890",
    "Chikkaballapur, Tumakuru",
    4,
    null,
    now,
    now
  );

  // 5. Featured Property Owners (Owner@123)
  const demoOwners = [
    { id: "OWNER-001", name: "Naveen Hegde", email: "naveen.hegde@owner.local", phone: "+91 98450 00001" },
    { id: "OWNER-002", name: "Sunil Kulkarni", email: "sunil.kulkarni@owner.local", phone: "+91 98450 00002" },
    { id: "OWNER-007", name: "Arun Deshmukh", email: "arun.deshmukh@owner.local", phone: "+91 98450 00007" },
    { id: "OWNER-008", name: "Bhavana Shetty", email: "bhavana.shetty@owner.local", phone: "+91 98450 00008" },
    { id: "OWNER-009", name: "Chandrasekhar Gowda", email: "chandrasekhar.gowda@owner.local", phone: "+91 98450 00009" },
    { id: "OWNER-014", name: "Pooja Varma", email: "pooja.varma@owner.local", phone: "+91 98450 00014" }
  ];

  const ownerHash = hashPassword("Owner@123");
  for (const o of demoOwners) {
    insertUser.run(
      o.id,
      o.name,
      o.email,
      ownerHash,
      "owner",
      "active",
      o.phone,
      null,
      null,
      null,
      null,
      null,
      now,
      now
    );
  }
}

export function seedDatabase(): void {
  console.log("Seeding SQLite database with 112+ Karnataka listings...");
  ensureDemoAuthUsers();

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, name, email, passwordHash, role, status, phone,
      agency, licenseNumber, jurisdiction, experienceYears, rejectionReason,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, 'owner', 'active', ?, NULL, NULL, NULL, NULL, NULL, ?, ?)
  `);

  const ownerHash = hashPassword("Owner@123");
  const now = new Date().toISOString();

  const insertListing = db.prepare(`
    INSERT INTO listings (
      id, ownerId, ownerName, title, category, propertyType,
      district, taluk, locality, pincode, latitude, longitude,
      area, areaUnit, ownerDeclaredValue, reviewedValue, status,
      rejectionReason, locked, khataType, surveyNumber, conversionStatus,
      description, imageUrl, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const insertRequirement = db.prepare(`
    INSERT INTO exchange_requirements (
      id, listingId, desiredPropertyTypes, preferredDistricts,
      preferredLocalities, minArea, minAreaUnit, maxCashToPay, maxCashToReceive
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let idx = 0;
  for (const item of seedListings) {
    idx++;
    const ownerId = item.ownerId ?? `OWNER-${String(idx).padStart(3, "0")}`;
    const email = `${item.ownerName.toLowerCase().replace(/[^a-z]/g, "")}@fictional-demo.local`;

    // Ensure user exists
    insertUser.run(
      ownerId,
      item.ownerName,
      email,
      ownerHash,
      `+91 98${String(10000000 + idx).slice(0, 8)}`,
      now,
      now
    );

    const title = generatePropertyTitle(item);
    const imageUrl = getPropertyImage(item.propertyType, idx);

    const khataType = item.propertyType === "agricultural_land" ? "Pahani / RTC" : "A-Khata (BBMP/Local Authority)";
    const surveyNumber = `Sy. No. ${100 + (idx % 150)}/${(idx % 4) + 1}`;
    const conversionStatus = item.propertyType === "agricultural_land" ? "Agricultural" : "DC Converted / Residential Approval";
    const description = `Well-maintained ${item.propertyType.replace(/_/g, " ")} with clear title documents, verified road access, and utility connections. Ideal for equitable asset exchange.`;

    const rejectionReason = item.status === "rejected" ? "Valuation discrepancy: Declared value differs significantly from prevailing sub-registrar guidance value." : null;

    insertListing.run(
      item.id,
      ownerId,
      item.ownerName,
      title,
      item.category ?? "real_estate",
      item.propertyType,
      item.district,
      item.locality,
      item.locality,
      "560001",
      item.latitude ?? null,
      item.longitude ?? null,
      item.area,
      item.areaUnit,
      item.ownerDeclaredValue,
      item.reviewedValue ?? null,
      item.status,
      rejectionReason,
      item.locked ? 1 : 0,
      khataType,
      surveyNumber,
      conversionStatus,
      description,
      imageUrl,
      now,
      now
    );

    const preferredDistricts = [item.district];
    const preferredLocalities = item.wants?.preferredLocations ?? [item.locality];

    insertRequirement.run(
      `req-${item.id}`,
      item.id,
      JSON.stringify(item.wants?.propertyTypes ?? []),
      JSON.stringify(preferredDistricts),
      JSON.stringify(preferredLocalities),
      item.wants?.minArea ?? null,
      item.wants?.minAreaUnit ?? "sq_ft",
      item.wants?.maxCashToPay ?? 5000000,
      item.wants?.maxCashToReceive ?? 5000000
    );
  }

  console.log(`Successfully seeded ${seedListings.length} listings into database.`);
}

export interface DbListingRow {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  category: string;
  propertyType: PropertyType;
  district: string;
  taluk: string | null;
  locality: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  area: number;
  areaUnit: AreaUnit;
  ownerDeclaredValue: number;
  reviewedValue: number | null;
  status: VerificationStatus;
  rejectionReason: string | null;
  locked: number;
  intent?: "swap" | "sell" | "both" | null;
  askingPrice?: number | null;
  saleDescription?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  khataType: string | null;
  surveyNumber: string | null;
  conversionStatus: string | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // joined from exchange_requirements
  desiredPropertyTypes: string | null;
  preferredDistricts: string | null;
  preferredLocalities: string | null;
  minArea: number | null;
  minAreaUnit: AreaUnit | null;
  minValue?: number | null;
  maxValue?: number | null;
  openToCashAdjustment?: number | null;
  maxCashToPay: number | null;
  maxCashToReceive: number | null;
}

export function rowToListing(row: DbListingRow): Listing {
  let propertyTypes: PropertyType[] = [];
  try {
    propertyTypes = row.desiredPropertyTypes ? JSON.parse(row.desiredPropertyTypes) : [];
  } catch {
    propertyTypes = [];
  }

  let preferredLocations: string[] = [];
  try {
    const locs = row.preferredLocalities ? JSON.parse(row.preferredLocalities) : [];
    const dists = row.preferredDistricts ? JSON.parse(row.preferredDistricts) : [];
    preferredLocations = [...new Set([...locs, ...dists])];
  } catch {
    preferredLocations = [];
  }

  const effectiveIntent = (row.intent as "swap" | "sell" | "both") || "swap";
  const askingPrice = row.askingPrice ?? (row.reviewedValue ?? row.ownerDeclaredValue);

  return {
    id: row.id,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    category: "real_estate",
    propertyType: row.propertyType,
    district: row.district,
    locality: row.locality,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    area: row.area,
    areaUnit: row.areaUnit,
    ownerDeclaredValue: row.ownerDeclaredValue,
    reviewedValue: row.reviewedValue ?? undefined,
    status: row.status,
    locked: row.locked === 1,
    intent: effectiveIntent,
    askingPrice,
    saleDescription: row.saleDescription ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    wants: {
      propertyTypes,
      preferredLocations,
      minArea: row.minArea ?? undefined,
      minAreaUnit: row.minAreaUnit ?? undefined,
      minValue: row.minValue ?? undefined,
      maxValue: row.maxValue ?? undefined,
      openToCashAdjustment: row.openToCashAdjustment !== 0,
      maxCashToPay: row.maxCashToPay ?? undefined,
      maxCashToReceive: row.maxCashToReceive ?? undefined
    },
    metadata: {
      title: row.title,
      khataType: row.khataType,
      surveyNumber: row.surveyNumber,
      conversionStatus: row.conversionStatus,
      description: row.description,
      imageUrl: row.imageUrl,
      rejectionReason: row.rejectionReason,
      taluk: row.taluk,
      pincode: row.pincode,
      intent: effectiveIntent,
      askingPrice,
      saleDescription: row.saleDescription,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms
    }
  };
}

export function getAllDbListings(): Listing[] {
  const query = `
    SELECT l.*, 
           r.desiredPropertyTypes, r.preferredDistricts, r.preferredLocalities,
           r.minArea, r.minAreaUnit, r.maxCashToPay, r.maxCashToReceive,
           r.minValue, r.maxValue, r.openToCashAdjustment
    FROM listings l
    LEFT JOIN exchange_requirements r ON l.id = r.listingId
  `;
  const rows = db.prepare(query).all() as unknown as DbListingRow[];
  return rows.map(rowToListing);
}

export function getDbListingById(id: string): Listing | null {
  const query = `
    SELECT l.*, 
           r.desiredPropertyTypes, r.preferredDistricts, r.preferredLocalities,
           r.minArea, r.minAreaUnit, r.maxCashToPay, r.maxCashToReceive
    FROM listings l
    LEFT JOIN exchange_requirements r ON l.id = r.listingId
    WHERE l.id = ?
  `;
  const row = db.prepare(query).get(id) as unknown as DbListingRow | undefined;
  return row ? rowToListing(row) : null;
}

/**
 * Executes a function atomically inside an SQLite transaction with write locking (BEGIN IMMEDIATE).
 * Automatically rolls back on any error to prevent partial updates.
 */
export function runInTransaction<T>(action: () => T): T {
  db.exec("BEGIN IMMEDIATE;");
  try {
    const result = action();
    db.exec("COMMIT;");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // Ignored if already rolled back
    }
    throw err;
  }
}
