import { initDatabase, getAllDbListings } from "../src/server/db.js";

initDatabase();
const listings = getAllDbListings();
console.log(`Database initialized successfully. Total listings in SQLite: ${listings.length}`);
