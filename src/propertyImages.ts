import type { PropertyType } from "./types.js";

/**
 * Curated high-resolution real estate images categorized by property type.
 * Each gallery contains diverse photos: exteriors, interiors, surroundings, layouts.
 */
export const PROPERTY_TYPE_GALLERIES: Record<PropertyType, string[][]> = {
  agricultural_land: [
    // Set 1: Farmland & Cultivated Fields
    [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1200&auto=format&fit=crop&q=80"
    ],
    // Set 2: Plantations & Terraced Crops
    [
      "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80"
    ],
    // Set 3: Orchard & Rural Agro-Acreage
    [
      "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80"
    ]
  ],

  plot_site: [
    // Set 1: Surveyed Residential Layout Plots
    [
      "https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524813686514-a57563d77d61?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?w=1200&auto=format&fit=crop&q=80"
    ],
    // Set 2: Paved Gated Community Plots
    [
      "https://images.unsplash.com/photo-1524813686514-a57563d77d61?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1200&auto=format&fit=crop&q=80"
    ]
  ],

  apartment: [
    // Set 1: Modern Luxury High-Rise
    [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80"
    ],
    // Set 2: Contemporary Urban Complex
    [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1502005229762-ee1b2b8ab00f?w=1200&auto=format&fit=crop&q=80"
    ]
  ],

  independent_house: [
    // Set 1: Spacious Custom Villa
    [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80"
    ],
    // Set 2: Modern Suburban Residence
    [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&auto=format&fit=crop&q=80"
    ]
  ],

  farmhouse: [
    // Set 1: Country Estate & Lawns
    [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80"
    ],
    // Set 2: Serene Plantation Farm Retreat
    [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80"
    ]
  ],

  commercial: [
    // Set 1: Corporate Glass Tower & Boardrooms
    [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&auto=format&fit=crop&q=80"
    ],
    // Set 2: Prime Commercial Complex & Retail Floor
    [
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80"
    ]
  ]
};

/**
 * Return default single fallback image for a property type
 */
export function getPropertyTypeFallback(type?: string): string {
  switch (type) {
    case "agricultural_land":
      return "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80";
    case "plot_site":
      return "https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=800&auto=format&fit=crop&q=80";
    case "independent_house":
      return "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80";
    case "farmhouse":
      return "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format&fit=crop&q=80";
    case "commercial":
      return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80";
    case "apartment":
    default:
      return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80";
  }
}

/**
 * Get image gallery for a property based on its type and index.
 * If existingImages array or custom imageUrl is provided, prioritize it.
 */
export function getPropertyImages(
  type: PropertyType,
  index: number = 0,
  existingImages?: string[] | null,
  existingSingleUrl?: string | null
): string[] {
  if (existingImages && Array.isArray(existingImages) && existingImages.length > 0) {
    const valid = existingImages.filter((img) => typeof img === "string" && img.trim().length > 0);
    if (valid.length > 0) return valid;
  }

  const galleries = PROPERTY_TYPE_GALLERIES[type] || PROPERTY_TYPE_GALLERIES.apartment;
  const selectedSet = galleries[Math.abs(index) % galleries.length];

  if (existingSingleUrl && typeof existingSingleUrl === "string" && existingSingleUrl.trim().length > 0) {
    const trimmed = existingSingleUrl.trim();
    if (!selectedSet.includes(trimmed)) {
      return [trimmed, ...selectedSet.slice(0, 3)];
    }
  }

  return [...selectedSet];
}

/**
 * Get primary thumbnail image for a property card.
 */
export function getPropertyThumbnail(
  type: PropertyType,
  index: number = 0,
  existingUrl?: string | null,
  existingImages?: string[] | null
): string {
  if (existingImages && Array.isArray(existingImages) && existingImages.length > 0) {
    const first = existingImages[0];
    if (first && typeof first === "string" && first.trim().length > 0) {
      return first.trim();
    }
  }

  if (existingUrl && typeof existingUrl === "string" && existingUrl.trim().length > 0) {
    return existingUrl.trim();
  }

  const gallery = getPropertyImages(type, index);
  return gallery[0] || getPropertyTypeFallback(type);
}
