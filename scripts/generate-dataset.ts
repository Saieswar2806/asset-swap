import fs from "node:fs";
import path from "node:path";
import type { Listing, PropertyType, AreaUnit, VerificationStatus } from "../src/types.js";
import { KARNATAKA_GEO_DATABASE } from "../src/location.js";

// Fictional dataset generator for Karnataka real estate asset swaps
const districts = [
  { district: "Bengaluru", localities: ["indiranagar", "whitefield", "koramangala", "jayanagar", "electronic city", "yelahanka", "hsr layout", "hebbal"] },
  { district: "Ramanagara", localities: ["ramanagara town", "harohalli", "kanakapura", "channapatna", "bidadi", "magadi"] },
  { district: "Mysuru", localities: ["vijayanagar", "jayalakshmipuram", "kuvempunagar", "gokulam", "nanjangud", "bannur"] },
  { district: "Mandya", localities: ["mandya town", "maddur", "srirangapatna", "pandavapura", "malavalli"] },
  { district: "Tumakuru", localities: ["tumakuru town", "kunigal", "tiptur", "sira", "gubbi"] },
  { district: "Chikkaballapur", localities: ["chikkaballapur town", "gauribidanur", "sidlaghatta", "bagepalli", "chintamani"] }
];

const listings: Listing[] = [];

// Helper to format locality for display
function titleCase(s: string): string {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

let assetCounter = 1;
function nextId(): string {
  const id = `ASSET-${String(assetCounter).padStart(3, "0")}`;
  assetCounter++;
  return id;
}

// 1. SPECIFIC INTENTIONAL DIRECT 2-PARTY MATCHES

// Match 1: Agricultural Land <-> Farmhouse (₹2.00 Cr exact, Ramanagara)
listings.push({
  id: nextId(),
  ownerId: "OWNER-001",
  ownerName: "Naveen Hegde",
  category: "real_estate",
  propertyType: "agricultural_land",
  district: "Ramanagara",
  locality: "Harohalli",
  latitude: KARNATAKA_GEO_DATABASE["harohalli"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["harohalli"].longitude,
  area: 2.5,
  areaUnit: "acres",
  ownerDeclaredValue: 20000000,
  reviewedValue: 20000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["farmhouse"],
    preferredLocations: ["Ramanagara", "Kanakapura"],
    maxCashToPay: 2000000,
    maxCashToReceive: 2000000
  }
});

listings.push({
  id: nextId(),
  ownerId: "OWNER-002",
  ownerName: "Sunil Kulkarni",
  category: "real_estate",
  propertyType: "farmhouse",
  district: "Ramanagara",
  locality: "Kanakapura",
  latitude: KARNATAKA_GEO_DATABASE["kanakapura"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["kanakapura"].longitude,
  area: 1,
  areaUnit: "acres",
  ownerDeclaredValue: 20500000,
  reviewedValue: 20000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["agricultural_land"],
    preferredLocations: ["Ramanagara", "Harohalli"],
    maxCashToPay: 1500000,
    maxCashToReceive: 1500000
  }
});

// Match 2: Apartment <-> Residential Plot in Mysuru (₹1.50 Cr exact)
listings.push({
  id: nextId(),
  ownerId: "OWNER-003",
  ownerName: "Deepa Narayan",
  category: "real_estate",
  propertyType: "apartment",
  district: "Mysuru",
  locality: "Jayalakshmipuram",
  latitude: KARNATAKA_GEO_DATABASE["jayalakshmipuram"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["jayalakshmipuram"].longitude,
  area: 2100,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 15000000,
  reviewedValue: 15000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["plot_site"],
    preferredLocations: ["Mysuru", "Gokulam"],
    maxCashToPay: 1000000,
    maxCashToReceive: 1000000
  }
});

listings.push({
  id: nextId(),
  ownerId: "OWNER-004",
  ownerName: "Raghavendra Rao",
  category: "real_estate",
  propertyType: "plot_site",
  district: "Mysuru",
  locality: "Gokulam",
  latitude: KARNATAKA_GEO_DATABASE["gokulam"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["gokulam"].longitude,
  area: 4000,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 15500000,
  reviewedValue: 15000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["apartment"],
    preferredLocations: ["Mysuru", "Jayalakshmipuram"],
    maxCashToPay: 2000000,
    maxCashToReceive: 2000000
  }
});

// Match 3: Direct swap with Cash Boot: Commercial (₹3.20 Cr) <-> Independent House (₹2.80 Cr) in Bengaluru
// Boot: Independent house owner pays ₹40 L cash; Commercial owner receives ₹40 L cash.
listings.push({
  id: nextId(),
  ownerId: "OWNER-005",
  ownerName: "Manjunath Prasad",
  category: "real_estate",
  propertyType: "commercial",
  district: "Bengaluru",
  locality: "Indiranagar",
  latitude: KARNATAKA_GEO_DATABASE["indiranagar"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["indiranagar"].longitude,
  area: 3200,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 35000000,
  reviewedValue: 32000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["independent_house"],
    preferredLocations: ["Bengaluru", "Koramangala"],
    maxCashToPay: 5000000,
    maxCashToReceive: 5000000
  }
});

listings.push({
  id: nextId(),
  ownerId: "OWNER-006",
  ownerName: "Geetha Mohan",
  category: "real_estate",
  propertyType: "independent_house",
  district: "Bengaluru",
  locality: "Koramangala",
  latitude: KARNATAKA_GEO_DATABASE["koramangala"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["koramangala"].longitude,
  area: 2800,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 29000000,
  reviewedValue: 28000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["commercial"],
    preferredLocations: ["Bengaluru", "Indiranagar"],
    maxCashToPay: 5000000,
    maxCashToReceive: 5000000
  }
});

// 2. SPECIFIC INTENTIONAL 3-PARTY CYCLE MATCHES

// Cycle 1: The exact prompt specification:
// A: Commercial (₹3.0 Cr) -> wants residential (apartment / independent house)
// B: Residential (₹2.0 Cr) -> wants agricultural land
// C: Agricultural (₹2.5 Cr) -> wants commercial
// Expected: A gives Commercial, receives Residential (B). A receives ₹1.0 Cr cash boot.
//           B gives Residential, receives Agricultural (C). B pays ₹0.5 Cr cash boot.
//           C gives Agricultural, receives Commercial (A). C pays ₹0.5 Cr cash boot.
listings.push({
  id: nextId(),
  ownerId: "OWNER-007",
  ownerName: "Arun Deshmukh",
  category: "real_estate",
  propertyType: "commercial",
  district: "Bengaluru",
  locality: "HSR Layout",
  latitude: KARNATAKA_GEO_DATABASE["hsr layout"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["hsr layout"].longitude,
  area: 3000,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 32000000,
  reviewedValue: 30000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["independent_house", "apartment"],
    preferredLocations: ["Bengaluru", "Jayanagar"],
    maxCashToPay: 15000000,
    maxCashToReceive: 15000000
  }
});

listings.push({
  id: nextId(),
  ownerId: "OWNER-008",
  ownerName: "Bhavana Shetty",
  category: "real_estate",
  propertyType: "independent_house",
  district: "Bengaluru",
  locality: "Jayanagar",
  latitude: KARNATAKA_GEO_DATABASE["jayanagar"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["jayanagar"].longitude,
  area: 2400,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 21000000,
  reviewedValue: 20000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["agricultural_land"],
    preferredLocations: ["Ramanagara", "Bidadi"],
    maxCashToPay: 10000000,
    maxCashToReceive: 10000000
  }
});

listings.push({
  id: nextId(),
  ownerId: "OWNER-009",
  ownerName: "Chandrasekhar Gowda",
  category: "real_estate",
  propertyType: "agricultural_land",
  district: "Ramanagara",
  locality: "Bidadi",
  latitude: KARNATAKA_GEO_DATABASE["bidadi"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["bidadi"].longitude,
  area: 4,
  areaUnit: "acres",
  ownerDeclaredValue: 26000000,
  reviewedValue: 25000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["commercial"],
    preferredLocations: ["Bengaluru", "HSR Layout"],
    maxCashToPay: 10000000,
    maxCashToReceive: 10000000
  }
});

// Cycle 2: Tumakuru - Mandya - Mysuru 3-party cycle
// X: Farmhouse in Tumakuru (₹1.8 Cr) -> wants plot in Mandya
// Y: Plot in Mandya (₹1.6 Cr) -> wants apartment in Mysuru
// Z: Apartment in Mysuru (₹1.7 Cr) -> wants farmhouse in Tumakuru
listings.push({
  id: nextId(),
  ownerId: "OWNER-010",
  ownerName: "Kishore Kumar",
  category: "real_estate",
  propertyType: "farmhouse",
  district: "Tumakuru",
  locality: "Kunigal",
  latitude: KARNATAKA_GEO_DATABASE["kunigal"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["kunigal"].longitude,
  area: 1.2,
  areaUnit: "acres",
  ownerDeclaredValue: 19000000,
  reviewedValue: 18000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["plot_site"],
    preferredLocations: ["Mandya", "Maddur"],
    maxCashToPay: 3000000,
    maxCashToReceive: 3000000
  }
});

listings.push({
  id: nextId(),
  ownerId: "OWNER-011",
  ownerName: "Laxman Murthy",
  category: "real_estate",
  propertyType: "plot_site",
  district: "Mandya",
  locality: "Maddur",
  latitude: KARNATAKA_GEO_DATABASE["maddur"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["maddur"].longitude,
  area: 4500,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 16500000,
  reviewedValue: 16000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["apartment"],
    preferredLocations: ["Mysuru", "Kuvempunagar"],
    maxCashToPay: 3000000,
    maxCashToReceive: 3000000
  }
});

listings.push({
  id: nextId(),
  ownerId: "OWNER-012",
  ownerName: "Meenakshi Sundaram",
  category: "real_estate",
  propertyType: "apartment",
  district: "Mysuru",
  locality: "Kuvempunagar",
  latitude: KARNATAKA_GEO_DATABASE["kuvempunagar"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["kuvempunagar"].longitude,
  area: 1950,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 17500000,
  reviewedValue: 17000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["farmhouse"],
    preferredLocations: ["Tumakuru", "Kunigal"],
    maxCashToPay: 3000000,
    maxCashToReceive: 3000000
  }
});

// 3. UNREVIEWED / LOCKED / INCOMPLETE LISTINGS (to test exclusion)
// Unreviewed: status draft
listings.push({
  id: nextId(),
  ownerId: "OWNER-013",
  ownerName: "Vikas Patil",
  category: "real_estate",
  propertyType: "apartment",
  district: "Bengaluru",
  locality: "Whitefield",
  latitude: KARNATAKA_GEO_DATABASE["whitefield"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["whitefield"].longitude,
  area: 1400,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 11000000,
  reviewedValue: 11000000,
  status: "draft",
  locked: false,
  wants: {
    propertyTypes: ["plot_site"],
    preferredLocations: ["Bengaluru"]
  }
});

// Unreviewed: status under_review
listings.push({
  id: nextId(),
  ownerId: "OWNER-014",
  ownerName: "Pooja Varma",
  category: "real_estate",
  propertyType: "plot_site",
  district: "Bengaluru",
  locality: "Hebbal",
  latitude: KARNATAKA_GEO_DATABASE["hebbal"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["hebbal"].longitude,
  area: 2400,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 14000000,
  reviewedValue: 14000000,
  status: "under_review",
  locked: false,
  wants: {
    propertyTypes: ["apartment"],
    preferredLocations: ["Bengaluru"]
  }
});

// Unreviewed: status rejected
listings.push({
  id: nextId(),
  ownerId: "OWNER-015",
  ownerName: "Shashank Joshi",
  category: "real_estate",
  propertyType: "commercial",
  district: "Mysuru",
  locality: "Vijayanagar",
  latitude: KARNATAKA_GEO_DATABASE["vijayanagar"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["vijayanagar"].longitude,
  area: 2000,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 19000000,
  status: "rejected",
  locked: false,
  wants: {
    propertyTypes: ["apartment"],
    preferredLocations: ["Mysuru"]
  }
});

// Locked asset: already in transaction
listings.push({
  id: nextId(),
  ownerId: "OWNER-016",
  ownerName: "Girish Nayak",
  category: "real_estate",
  propertyType: "agricultural_land",
  district: "Mandya",
  locality: "Srirangapatna",
  latitude: KARNATAKA_GEO_DATABASE["srirangapatna"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["srirangapatna"].longitude,
  area: 3,
  areaUnit: "acres",
  ownerDeclaredValue: 18000000,
  reviewedValue: 18000000,
  status: "reviewed",
  locked: true,
  wants: {
    propertyTypes: ["farmhouse"],
    preferredLocations: ["Mandya"]
  }
});

// 4. UNMATCHED LISTINGS (unique constraints, isolated types, or restrictive limits)
listings.push({
  id: nextId(),
  ownerId: "OWNER-017",
  ownerName: "Radha Krishnan",
  category: "real_estate",
  propertyType: "farmhouse",
  district: "Chikkaballapur",
  locality: "Bagepalli",
  latitude: KARNATAKA_GEO_DATABASE["bagepalli"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["bagepalli"].longitude,
  area: 2,
  areaUnit: "acres",
  ownerDeclaredValue: 12000000,
  reviewedValue: 12000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["commercial"],
    preferredLocations: ["Bagepalli"], // highly restricted locality where no commercial exists
    maxCashToPay: 0,
    maxCashToReceive: 0
  }
});

listings.push({
  id: nextId(),
  ownerId: "OWNER-018",
  ownerName: "Sanjay Dixit",
  category: "real_estate",
  propertyType: "commercial",
  district: "Tumakuru",
  locality: "Tiptur",
  latitude: KARNATAKA_GEO_DATABASE["tiptur"].latitude,
  longitude: KARNATAKA_GEO_DATABASE["tiptur"].longitude,
  area: 8000,
  areaUnit: "sq_ft",
  ownerDeclaredValue: 45000000,
  reviewedValue: 45000000,
  status: "reviewed",
  locked: false,
  wants: {
    propertyTypes: ["apartment"],
    preferredLocations: ["Tiptur"],
    maxCashToPay: 50000, // unrealistically low cash difference tolerance
    maxCashToReceive: 50000
  }
});

// 5. REMAINING REALISTIC LISTINGS TO REACH 110+ TOTAL
// We'll generate realistic diverse listings across all 6 districts, property types, and valuations.
const firstNames = [
  "Abhishek", "Aditi", "Ajay", "Alok", "Amit", "Amrutha", "Anand", "Anitha", "Ashok", "Balaji",
  "Bharath", "Chetan", "Darshan", "Divya", "Ganesh", "Gautam", "Harish", "Hemalatha", "Jagadeesh", "Kavitha",
  "Kiran", "Madhav", "Mahesh", "Mamatha", "Mohan", "Nandini", "Nikhil", "Padma", "Prakash", "Prashanth",
  "Prathap", "Rajesh", "Rakshith", "Rashmi", "Rohit", "Roopa", "Sachin", "Sandhya", "Santosh", "Shilpa",
  "Shivakumar", "Shruthi", "Siddharth", "Smitha", "Srinivas", "Subhash", "Suma", "Tarun", "Uday", "Varun",
  "Vidya", "Vijay", "Vinay", "Vinutha", "Yogesh"
];

const lastNames = [
  "Adiga", "Acharya", "Bhat", "Deshpande", "Gowda", "Hebbar", "Hedge", "Iyengar", "Joshi", "Kamath",
  "Kashyap", "Katti", "Kulkarni", "Kumar", "Murthy", "Naik", "Patil", "Prasad", "Puranik", "Rao",
  "Reddy", "Sastry", "Shetty", "Shukla", "Somanna", "Urs", "Vaidya", "Varma", "Venkatesh", "Yadav"
];

const propertyTypeCatalog: Array<{
  type: PropertyType;
  areaUnit: AreaUnit;
  minArea: number;
  maxArea: number;
  minValue: number;
  maxValue: number;
}> = [
  { type: "agricultural_land", areaUnit: "acres", minArea: 1.0, maxArea: 5.0, minValue: 8000000, maxValue: 35000000 },
  { type: "plot_site", areaUnit: "sq_ft", minArea: 1200, maxArea: 4000, minValue: 4000000, maxValue: 25000000 },
  { type: "apartment", areaUnit: "sq_ft", minArea: 950, maxArea: 2800, minValue: 6000000, maxValue: 28000000 },
  { type: "independent_house", areaUnit: "sq_ft", minArea: 1800, maxArea: 4200, minValue: 12000000, maxValue: 45000000 },
  { type: "farmhouse", areaUnit: "acres", minArea: 0.5, maxArea: 2.5, minValue: 15000000, maxValue: 40000000 },
  { type: "commercial", areaUnit: "sq_ft", minArea: 1500, maxArea: 7500, minValue: 20000000, maxValue: 80000000 }
];

// Generate listings until we have at least 110 listings
let genIdx = 0;
while (listings.length < 112) {
  genIdx++;
  const districtObj = districts[genIdx % districts.length];
  const locality = districtObj.localities[genIdx % districtObj.localities.length];
  const geo = KARNATAKA_GEO_DATABASE[locality] ?? KARNATAKA_GEO_DATABASE[districtObj.district.toLowerCase()];

  const propSpec = propertyTypeCatalog[genIdx % propertyTypeCatalog.length];
  const ownerFirstName = firstNames[(genIdx * 7) % firstNames.length];
  const ownerLastName = lastNames[(genIdx * 11) % lastNames.length];
  const ownerName = `${ownerFirstName} ${ownerLastName}`;
  const ownerId = `OWNER-${String(listings.length + 1).padStart(3, "0")}`;

  // Deterministic realistic value in Lakhs/Crores
  const rawValue = propSpec.minValue + ((genIdx * 2500000) % (propSpec.maxValue - propSpec.minValue));
  // Round to nearest 5 Lakhs
  const reviewedValue = Math.round(rawValue / 500000) * 500000;
  const ownerDeclaredValue = reviewedValue + (genIdx % 3 === 0 ? 500000 : 0);

  // Area
  const areaRange = propSpec.maxArea - propSpec.minArea;
  const area = Math.round((propSpec.minArea + ((genIdx * 1.3) % areaRange)) * 10) / 10;

  // Desired property types (1 or 2 types)
  const otherTypes = propertyTypeCatalog
    .map((p) => p.type)
    .filter((t) => t !== propSpec.type);
  const wantsTypes = [otherTypes[(genIdx + 1) % otherTypes.length]];
  if (genIdx % 2 === 0) {
    wantsTypes.push(otherTypes[(genIdx + 3) % otherTypes.length]);
  }

  // Preferred locations
  const targetDistrict = districts[(genIdx + 1) % districts.length];
  const preferredLocations = [
    districtObj.district,
    titleCase(locality),
    targetDistrict.district
  ];

  // Cash limits (realistic budget)
  const maxCashToPay = Math.min(reviewedValue * 0.3, 5000000);
  const maxCashToReceive = Math.min(reviewedValue * 0.35, 6000000);

  // Majority reviewed, occasional under_review
  const status: VerificationStatus = genIdx % 19 === 0 ? "under_review" : "reviewed";
  const locked = genIdx % 23 === 0;

  listings.push({
    id: nextId(),
    ownerId,
    ownerName,
    category: "real_estate",
    propertyType: propSpec.type,
    district: districtObj.district,
    locality: titleCase(locality),
    latitude: geo.latitude,
    longitude: geo.longitude,
    area,
    areaUnit: propSpec.areaUnit,
    ownerDeclaredValue,
    reviewedValue,
    status,
    locked,
    wants: {
      propertyTypes: wantsTypes,
      preferredLocations,
      maxDistanceKm: 60,
      maxCashToPay,
      maxCashToReceive
    }
  });
}

// Generate the TypeScript file contents
const outputCode = `// Realistic fictional dataset of 110+ Karnataka asset listings for Asset Swap
// Locations: Bengaluru, Ramanagara, Mysuru, Mandya, Tumakuru, Chikkaballapur
// Categories: Agricultural land, Residential plots, Apartments, Independent houses, Farmhouses, Commercial properties
import type { Listing } from "../types.js";

export const seedListings: Listing[] = ${JSON.stringify(listings, null, 2)};
`;

const outputPath = path.resolve("src", "data", "listings.ts");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, outputCode, "utf8");
console.log(`Generated ${listings.length} listings in ${outputPath}`);
