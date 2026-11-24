// Realistic fictional dataset of 110+ Karnataka asset listings for Asset Swap
// Locations: Bengaluru, Ramanagara, Mysuru, Mandya, Tumakuru, Chikkaballapur
// Categories: Agricultural land, Residential plots, Apartments, Independent houses, Farmhouses, Commercial properties
import type { Listing } from "../types.js";

export const seedListings: Listing[] = [
  {
    "id": "ASSET-001",
    "ownerId": "OWNER-001",
    "ownerName": "Naveen Hegde",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 2.5,
    "areaUnit": "acres",
    "ownerDeclaredValue": 20000000,
    "reviewedValue": 20000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Kanakapura"
      ],
      "maxCashToPay": 2000000,
      "maxCashToReceive": 2000000
    }
  },
  {
    "id": "ASSET-002",
    "ownerId": "OWNER-002",
    "ownerName": "Sunil Kulkarni",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Ramanagara",
    "locality": "Kanakapura",
    "latitude": 12.5463,
    "longitude": 77.4194,
    "area": 1,
    "areaUnit": "acres",
    "ownerDeclaredValue": 20500000,
    "reviewedValue": 20000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli"
      ],
      "maxCashToPay": 1500000,
      "maxCashToReceive": 1500000
    }
  },
  {
    "id": "ASSET-003",
    "ownerId": "OWNER-003",
    "ownerName": "Deepa Narayan",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Jayalakshmipuram",
    "latitude": 12.3218,
    "longitude": 76.6267,
    "area": 2100,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 15000000,
    "reviewedValue": 15000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Mysuru",
        "Gokulam"
      ],
      "maxCashToPay": 1000000,
      "maxCashToReceive": 1000000
    }
  },
  {
    "id": "ASSET-004",
    "ownerId": "OWNER-004",
    "ownerName": "Raghavendra Rao",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Mysuru",
    "locality": "Gokulam",
    "latitude": 12.3323,
    "longitude": 76.6268,
    "area": 4000,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 15500000,
    "reviewedValue": 15000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Mysuru",
        "Jayalakshmipuram"
      ],
      "maxCashToPay": 2000000,
      "maxCashToReceive": 2000000
    }
  },
  {
    "id": "ASSET-005",
    "ownerId": "OWNER-005",
    "ownerName": "Manjunath Prasad",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Bengaluru",
    "locality": "Indiranagar",
    "latitude": 12.9784,
    "longitude": 77.6408,
    "area": 3200,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 35000000,
    "reviewedValue": 32000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Koramangala"
      ],
      "maxCashToPay": 5000000,
      "maxCashToReceive": 5000000
    }
  },
  {
    "id": "ASSET-006",
    "ownerId": "OWNER-006",
    "ownerName": "Geetha Mohan",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Bengaluru",
    "locality": "Koramangala",
    "latitude": 12.9352,
    "longitude": 77.6245,
    "area": 2800,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 29000000,
    "reviewedValue": 28000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Indiranagar"
      ],
      "maxCashToPay": 5000000,
      "maxCashToReceive": 5000000
    }
  },
  {
    "id": "ASSET-007",
    "ownerId": "OWNER-007",
    "ownerName": "Arun Deshmukh",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Bengaluru",
    "locality": "HSR Layout",
    "latitude": 12.9121,
    "longitude": 77.6446,
    "area": 3000,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 32000000,
    "reviewedValue": 30000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "apartment"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Jayanagar"
      ],
      "maxCashToPay": 15000000,
      "maxCashToReceive": 15000000
    }
  },
  {
    "id": "ASSET-008",
    "ownerId": "OWNER-008",
    "ownerName": "Bhavana Shetty",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Bengaluru",
    "locality": "Jayanagar",
    "latitude": 12.9308,
    "longitude": 77.5838,
    "area": 2400,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 21000000,
    "reviewedValue": 20000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Bidadi"
      ],
      "maxCashToPay": 10000000,
      "maxCashToReceive": 10000000
    }
  },
  {
    "id": "ASSET-009",
    "ownerId": "OWNER-009",
    "ownerName": "Chandrasekhar Gowda",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Ramanagara",
    "locality": "Bidadi",
    "latitude": 12.7967,
    "longitude": 77.3828,
    "area": 4,
    "areaUnit": "acres",
    "ownerDeclaredValue": 26000000,
    "reviewedValue": 25000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Bengaluru",
        "HSR Layout"
      ],
      "maxCashToPay": 10000000,
      "maxCashToReceive": 10000000
    }
  },
  {
    "id": "ASSET-010",
    "ownerId": "OWNER-010",
    "ownerName": "Kishore Kumar",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Kunigal",
    "latitude": 13.0238,
    "longitude": 77.0264,
    "area": 1.2,
    "areaUnit": "acres",
    "ownerDeclaredValue": 19000000,
    "reviewedValue": 18000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Mandya",
        "Maddur"
      ],
      "maxCashToPay": 3000000,
      "maxCashToReceive": 3000000
    }
  },
  {
    "id": "ASSET-011",
    "ownerId": "OWNER-011",
    "ownerName": "Laxman Murthy",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Mandya",
    "locality": "Maddur",
    "latitude": 12.5844,
    "longitude": 77.045,
    "area": 4500,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 16500000,
    "reviewedValue": 16000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar"
      ],
      "maxCashToPay": 3000000,
      "maxCashToReceive": 3000000
    }
  },
  {
    "id": "ASSET-012",
    "ownerId": "OWNER-012",
    "ownerName": "Meenakshi Sundaram",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1950,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 17500000,
    "reviewedValue": 17000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Kunigal"
      ],
      "maxCashToPay": 3000000,
      "maxCashToReceive": 3000000
    }
  },
  {
    "id": "ASSET-013",
    "ownerId": "OWNER-013",
    "ownerName": "Vikas Patil",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Bengaluru",
    "locality": "Whitefield",
    "latitude": 12.9698,
    "longitude": 77.75,
    "area": 1400,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 11000000,
    "reviewedValue": 11000000,
    "status": "draft",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Bengaluru"
      ]
    }
  },
  {
    "id": "ASSET-014",
    "ownerId": "OWNER-014",
    "ownerName": "Pooja Varma",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Bengaluru",
    "locality": "Hebbal",
    "latitude": 13.0358,
    "longitude": 77.597,
    "area": 2400,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 14000000,
    "reviewedValue": 14000000,
    "status": "under_review",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Bengaluru"
      ]
    }
  },
  {
    "id": "ASSET-015",
    "ownerId": "OWNER-015",
    "ownerName": "Shashank Joshi",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Mysuru",
    "locality": "Vijayanagar",
    "latitude": 12.3364,
    "longitude": 76.6083,
    "area": 2000,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 19000000,
    "status": "rejected",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Mysuru"
      ]
    }
  },
  {
    "id": "ASSET-016",
    "ownerId": "OWNER-016",
    "ownerName": "Girish Nayak",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Mandya",
    "locality": "Srirangapatna",
    "latitude": 12.4238,
    "longitude": 76.6947,
    "area": 3,
    "areaUnit": "acres",
    "ownerDeclaredValue": 18000000,
    "reviewedValue": 18000000,
    "status": "reviewed",
    "locked": true,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Mandya"
      ]
    }
  },
  {
    "id": "ASSET-017",
    "ownerId": "OWNER-017",
    "ownerName": "Radha Krishnan",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Chikkaballapur",
    "locality": "Bagepalli",
    "latitude": 13.7844,
    "longitude": 77.7942,
    "area": 2,
    "areaUnit": "acres",
    "ownerDeclaredValue": 12000000,
    "reviewedValue": 12000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Bagepalli"
      ],
      "maxCashToPay": 0,
      "maxCashToReceive": 0
    }
  },
  {
    "id": "ASSET-018",
    "ownerId": "OWNER-018",
    "ownerName": "Sanjay Dixit",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Tumakuru",
    "locality": "Tiptur",
    "latitude": 13.2564,
    "longitude": 76.4789,
    "area": 8000,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 45000000,
    "reviewedValue": 45000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Tiptur"
      ],
      "maxCashToPay": 50000,
      "maxCashToReceive": 50000
    }
  },
  {
    "id": "ASSET-019",
    "ownerId": "OWNER-019",
    "ownerName": "Anitha Katti",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1201.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 6500000,
    "reviewedValue": 6500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 1950000,
      "maxCashToReceive": 2275000
    }
  },
  {
    "id": "ASSET-020",
    "ownerId": "OWNER-020",
    "ownerName": "Ganesh Shetty",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 952.6,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 11000000,
    "reviewedValue": 11000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse",
        "agricultural_land"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 3300000,
      "maxCashToReceive": 3849999.9999999995
    }
  },
  {
    "id": "ASSET-021",
    "ownerId": "OWNER-021",
    "ownerName": "Madhav Deshpande",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Pandavapura",
    "latitude": 12.4939,
    "longitude": 76.6713,
    "area": 1803.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 20000000,
    "reviewedValue": 19500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Mandya",
        "Pandavapura",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-022",
    "ownerId": "OWNER-022",
    "ownerName": "Prakash Murthy",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Gubbi",
    "latitude": 13.3106,
    "longitude": 76.9405,
    "area": 1.7,
    "areaUnit": "acres",
    "ownerDeclaredValue": 25000000,
    "reviewedValue": 25000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land",
        "apartment"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Gubbi",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-023",
    "ownerId": "OWNER-023",
    "ownerName": "Roopa Urs",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Chikkaballapur Town",
    "latitude": 13.4355,
    "longitude": 77.7275,
    "area": 1506.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 32500000,
    "reviewedValue": 32500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Chikkaballapur Town",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-024",
    "ownerId": "OWNER-024",
    "ownerName": "Siddharth Hedge",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Hsr Layout",
    "latitude": 12.9121,
    "longitude": 77.6446,
    "area": 4.8,
    "areaUnit": "acres",
    "ownerDeclaredValue": 23500000,
    "reviewedValue": 23000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "commercial"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Hsr Layout",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-025",
    "ownerId": "OWNER-025",
    "ownerName": "Varun Prasad",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1209.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 21500000,
    "reviewedValue": 21500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-026",
    "ownerId": "OWNER-026",
    "ownerName": "Aditi Venkatesh",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 960.4,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 26000000,
    "reviewedValue": 26000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "plot_site"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-027",
    "ownerId": "OWNER-027",
    "ownerName": "Ashok Kamath",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Malavalli",
    "latitude": 12.3872,
    "longitude": 77.056,
    "area": 1811.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 35000000,
    "reviewedValue": 34500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Mandya",
        "Malavalli",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-028",
    "ownerId": "OWNER-028",
    "ownerName": "Gautam Reddy",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Tumakuru Town",
    "latitude": 13.3422,
    "longitude": 77.1017,
    "area": 1.5,
    "areaUnit": "acres",
    "ownerDeclaredValue": 15000000,
    "reviewedValue": 15000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "independent_house"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Tumakuru Town",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4500000,
      "maxCashToReceive": 5250000
    }
  },
  {
    "id": "ASSET-029",
    "ownerId": "OWNER-029",
    "ownerName": "Mahesh Acharya",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Gauribidanur",
    "latitude": 13.6127,
    "longitude": 77.5186,
    "area": 1514.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 47500000,
    "reviewedValue": 47500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Gauribidanur",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-030",
    "ownerId": "OWNER-030",
    "ownerName": "Prashanth Kulkarni",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Electronic City",
    "latitude": 12.8452,
    "longitude": 77.6602,
    "area": 4.6,
    "areaUnit": "acres",
    "ownerDeclaredValue": 11500000,
    "reviewedValue": 11000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse",
        "plot_site"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Electronic City",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 3300000,
      "maxCashToReceive": 3849999.9999999995
    }
  },
  {
    "id": "ASSET-031",
    "ownerId": "OWNER-031",
    "ownerName": "Sachin Shukla",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1216.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 15500000,
    "reviewedValue": 15500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4650000,
      "maxCashToReceive": 5425000
    }
  },
  {
    "id": "ASSET-032",
    "ownerId": "OWNER-032",
    "ownerName": "Smitha Gowda",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 968.2,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 19000000,
    "reviewedValue": 19000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land",
        "independent_house"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-033",
    "ownerId": "OWNER-033",
    "ownerName": "Vidya Naik",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Mandya Town",
    "latitude": 12.5226,
    "longitude": 76.8976,
    "area": 1819.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 17000000,
    "reviewedValue": 16500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Mandya",
        "Mandya Town",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4950000,
      "maxCashToReceive": 5775000
    }
  },
  {
    "id": "ASSET-034",
    "ownerId": "OWNER-034",
    "ownerName": "Ajay Vaidya",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Kunigal",
    "latitude": 13.0238,
    "longitude": 77.0264,
    "area": 1.3,
    "areaUnit": "acres",
    "ownerDeclaredValue": 30000000,
    "reviewedValue": 30000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment",
        "commercial"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Kunigal",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-035",
    "ownerId": "OWNER-035",
    "ownerName": "Balaji Iyengar",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Sidlaghatta",
    "latitude": 13.3917,
    "longitude": 77.8631,
    "area": 1522.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 62500000,
    "reviewedValue": 62500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Sidlaghatta",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-036",
    "ownerId": "OWNER-036",
    "ownerName": "Harish Puranik",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Koramangala",
    "latitude": 12.9352,
    "longitude": 77.6245,
    "area": 4.4,
    "areaUnit": "acres",
    "ownerDeclaredValue": 26500000,
    "reviewedValue": 26000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "apartment"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Koramangala",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-037",
    "ownerId": "OWNER-037",
    "ownerName": "Mamatha Yadav",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1224.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 9500000,
    "reviewedValue": 9500000,
    "status": "under_review",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 2850000,
      "maxCashToReceive": 3325000
    }
  },
  {
    "id": "ASSET-038",
    "ownerId": "OWNER-038",
    "ownerName": "Prathap Kashyap",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 976,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 12000000,
    "reviewedValue": 12000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "farmhouse"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 3600000,
      "maxCashToReceive": 4200000
    }
  },
  {
    "id": "ASSET-039",
    "ownerId": "OWNER-039",
    "ownerName": "Sandhya Sastry",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Maddur",
    "latitude": 12.5844,
    "longitude": 77.045,
    "area": 1827.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 32000000,
    "reviewedValue": 31500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Mandya",
        "Maddur",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-040",
    "ownerId": "OWNER-040",
    "ownerName": "Srinivas Bhat",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Tiptur",
    "latitude": 13.2564,
    "longitude": 76.4789,
    "area": 1.1,
    "areaUnit": "acres",
    "ownerDeclaredValue": 20000000,
    "reviewedValue": 20000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "agricultural_land"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Tiptur",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-041",
    "ownerId": "OWNER-041",
    "ownerName": "Vijay Kumar",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Bagepalli",
    "latitude": 13.7844,
    "longitude": 77.7942,
    "area": 1529.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 77500000,
    "reviewedValue": 77500000,
    "status": "reviewed",
    "locked": true,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Bagepalli",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-042",
    "ownerId": "OWNER-042",
    "ownerName": "Alok Somanna",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Indiranagar",
    "latitude": 12.9784,
    "longitude": 77.6408,
    "area": 4.2,
    "areaUnit": "acres",
    "ownerDeclaredValue": 14500000,
    "reviewedValue": 14000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "independent_house"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Indiranagar",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4200000,
      "maxCashToReceive": 4900000
    }
  },
  {
    "id": "ASSET-043",
    "ownerId": "OWNER-043",
    "ownerName": "Bharath Hebbar",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1232.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 24500000,
    "reviewedValue": 24500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-044",
    "ownerId": "OWNER-044",
    "ownerName": "Hemalatha Patil",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 983.8,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 27000000,
    "reviewedValue": 27000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "commercial"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-045",
    "ownerId": "OWNER-045",
    "ownerName": "Mohan Varma",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Srirangapatna",
    "latitude": 12.4238,
    "longitude": 76.6947,
    "area": 1835.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 14000000,
    "reviewedValue": 13500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Mandya",
        "Srirangapatna",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4050000,
      "maxCashToReceive": 4725000
    }
  },
  {
    "id": "ASSET-046",
    "ownerId": "OWNER-046",
    "ownerName": "Rajesh Joshi",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Sira",
    "latitude": 13.7447,
    "longitude": 76.9069,
    "area": 0.9,
    "areaUnit": "acres",
    "ownerDeclaredValue": 35000000,
    "reviewedValue": 35000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "plot_site"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Sira",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-047",
    "ownerId": "OWNER-047",
    "ownerName": "Santosh Rao",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Chintamani",
    "latitude": 13.4009,
    "longitude": 78.0569,
    "area": 1537.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 32500000,
    "reviewedValue": 32500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Chintamani",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-048",
    "ownerId": "OWNER-048",
    "ownerName": "Subhash Adiga",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Hsr Layout",
    "latitude": 12.9121,
    "longitude": 77.6446,
    "area": 4,
    "areaUnit": "acres",
    "ownerDeclaredValue": 29500000,
    "reviewedValue": 29000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment",
        "farmhouse"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Hsr Layout",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-049",
    "ownerId": "OWNER-049",
    "ownerName": "Vinay Katti",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1240.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 18500000,
    "reviewedValue": 18500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-050",
    "ownerId": "OWNER-050",
    "ownerName": "Amit Shetty",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 991.6,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 20000000,
    "reviewedValue": 20000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse",
        "agricultural_land"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-051",
    "ownerId": "OWNER-051",
    "ownerName": "Chetan Deshpande",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Pandavapura",
    "latitude": 12.4939,
    "longitude": 76.6713,
    "area": 1842.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 29000000,
    "reviewedValue": 28500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Mandya",
        "Pandavapura",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-052",
    "ownerId": "OWNER-052",
    "ownerName": "Jagadeesh Murthy",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Gubbi",
    "latitude": 13.3106,
    "longitude": 76.9405,
    "area": 0.7,
    "areaUnit": "acres",
    "ownerDeclaredValue": 25000000,
    "reviewedValue": 25000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land",
        "apartment"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Gubbi",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-053",
    "ownerId": "OWNER-053",
    "ownerName": "Nandini Urs",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Chikkaballapur Town",
    "latitude": 13.4355,
    "longitude": 77.7275,
    "area": 1545.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 47500000,
    "reviewedValue": 47500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Chikkaballapur Town",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-054",
    "ownerId": "OWNER-054",
    "ownerName": "Rakshith Hedge",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Electronic City",
    "latitude": 12.8452,
    "longitude": 77.6602,
    "area": 3.8,
    "areaUnit": "acres",
    "ownerDeclaredValue": 17500000,
    "reviewedValue": 17000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "commercial"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Electronic City",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 5950000
    }
  },
  {
    "id": "ASSET-055",
    "ownerId": "OWNER-055",
    "ownerName": "Shilpa Prasad",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1248.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 12500000,
    "reviewedValue": 12500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 3750000,
      "maxCashToReceive": 4375000
    }
  },
  {
    "id": "ASSET-056",
    "ownerId": "OWNER-056",
    "ownerName": "Suma Venkatesh",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 999.4,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 13000000,
    "reviewedValue": 13000000,
    "status": "under_review",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "plot_site"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 3900000,
      "maxCashToReceive": 4550000
    }
  },
  {
    "id": "ASSET-057",
    "ownerId": "OWNER-057",
    "ownerName": "Vinutha Kamath",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Malavalli",
    "latitude": 12.3872,
    "longitude": 77.056,
    "area": 1850.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 44000000,
    "reviewedValue": 43500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Mandya",
        "Malavalli",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-058",
    "ownerId": "OWNER-058",
    "ownerName": "Amrutha Reddy",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Tumakuru Town",
    "latitude": 13.3422,
    "longitude": 77.1017,
    "area": 0.5,
    "areaUnit": "acres",
    "ownerDeclaredValue": 15000000,
    "reviewedValue": 15000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "independent_house"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Tumakuru Town",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4500000,
      "maxCashToReceive": 5250000
    }
  },
  {
    "id": "ASSET-059",
    "ownerId": "OWNER-059",
    "ownerName": "Darshan Acharya",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Gauribidanur",
    "latitude": 13.6127,
    "longitude": 77.5186,
    "area": 1553.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 62500000,
    "reviewedValue": 62500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Gauribidanur",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-060",
    "ownerId": "OWNER-060",
    "ownerName": "Kavitha Kulkarni",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Koramangala",
    "latitude": 12.9352,
    "longitude": 77.6245,
    "area": 3.6,
    "areaUnit": "acres",
    "ownerDeclaredValue": 32500000,
    "reviewedValue": 32000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse",
        "plot_site"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Koramangala",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-061",
    "ownerId": "OWNER-061",
    "ownerName": "Nikhil Shukla",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1255.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 6500000,
    "reviewedValue": 6500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 1950000,
      "maxCashToReceive": 2275000
    }
  },
  {
    "id": "ASSET-062",
    "ownerId": "OWNER-062",
    "ownerName": "Rashmi Gowda",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1007.2,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 6000000,
    "reviewedValue": 6000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land",
        "independent_house"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 1800000,
      "maxCashToReceive": 2100000
    }
  },
  {
    "id": "ASSET-063",
    "ownerId": "OWNER-063",
    "ownerName": "Shivakumar Naik",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Mandya Town",
    "latitude": 12.5226,
    "longitude": 76.8976,
    "area": 1858.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 26000000,
    "reviewedValue": 25500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Mandya",
        "Mandya Town",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-064",
    "ownerId": "OWNER-064",
    "ownerName": "Tarun Vaidya",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Kunigal",
    "latitude": 13.0238,
    "longitude": 77.0264,
    "area": 2.3,
    "areaUnit": "acres",
    "ownerDeclaredValue": 30000000,
    "reviewedValue": 30000000,
    "status": "reviewed",
    "locked": true,
    "wants": {
      "propertyTypes": [
        "apartment",
        "commercial"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Kunigal",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-065",
    "ownerId": "OWNER-065",
    "ownerName": "Yogesh Iyengar",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Sidlaghatta",
    "latitude": 13.3917,
    "longitude": 77.8631,
    "area": 1561.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 77500000,
    "reviewedValue": 77500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Sidlaghatta",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-066",
    "ownerId": "OWNER-066",
    "ownerName": "Anand Puranik",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Indiranagar",
    "latitude": 12.9784,
    "longitude": 77.6408,
    "area": 3.4,
    "areaUnit": "acres",
    "ownerDeclaredValue": 20500000,
    "reviewedValue": 20000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "apartment"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Indiranagar",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-067",
    "ownerId": "OWNER-067",
    "ownerName": "Divya Yadav",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1263.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 21500000,
    "reviewedValue": 21500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-068",
    "ownerId": "OWNER-068",
    "ownerName": "Kiran Kashyap",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1015,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 21000000,
    "reviewedValue": 21000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "farmhouse"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-069",
    "ownerId": "OWNER-069",
    "ownerName": "Padma Sastry",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Maddur",
    "latitude": 12.5844,
    "longitude": 77.045,
    "area": 1866.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 41000000,
    "reviewedValue": 40500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Mandya",
        "Maddur",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-070",
    "ownerId": "OWNER-070",
    "ownerName": "Rohit Bhat",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Tiptur",
    "latitude": 13.2564,
    "longitude": 76.4789,
    "area": 2.1,
    "areaUnit": "acres",
    "ownerDeclaredValue": 20000000,
    "reviewedValue": 20000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "agricultural_land"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Tiptur",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-071",
    "ownerId": "OWNER-071",
    "ownerName": "Shruthi Kumar",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Bagepalli",
    "latitude": 13.7844,
    "longitude": 77.7942,
    "area": 1568.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 32500000,
    "reviewedValue": 32500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Bagepalli",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-072",
    "ownerId": "OWNER-072",
    "ownerName": "Uday Somanna",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Hsr Layout",
    "latitude": 12.9121,
    "longitude": 77.6446,
    "area": 3.2,
    "areaUnit": "acres",
    "ownerDeclaredValue": 8500000,
    "reviewedValue": 8000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "independent_house"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Hsr Layout",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 2400000,
      "maxCashToReceive": 2800000
    }
  },
  {
    "id": "ASSET-073",
    "ownerId": "OWNER-073",
    "ownerName": "Abhishek Hebbar",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1271.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 15500000,
    "reviewedValue": 15500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4650000,
      "maxCashToReceive": 5425000
    }
  },
  {
    "id": "ASSET-074",
    "ownerId": "OWNER-074",
    "ownerName": "Anitha Patil",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1022.8,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 14000000,
    "reviewedValue": 14000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "commercial"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4200000,
      "maxCashToReceive": 4900000
    }
  },
  {
    "id": "ASSET-075",
    "ownerId": "OWNER-075",
    "ownerName": "Ganesh Varma",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Srirangapatna",
    "latitude": 12.4238,
    "longitude": 76.6947,
    "area": 1874.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 23000000,
    "reviewedValue": 22500000,
    "status": "under_review",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Mandya",
        "Srirangapatna",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-076",
    "ownerId": "OWNER-076",
    "ownerName": "Madhav Joshi",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Sira",
    "latitude": 13.7447,
    "longitude": 76.9069,
    "area": 1.9,
    "areaUnit": "acres",
    "ownerDeclaredValue": 35000000,
    "reviewedValue": 35000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "plot_site"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Sira",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-077",
    "ownerId": "OWNER-077",
    "ownerName": "Prakash Rao",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Chintamani",
    "latitude": 13.4009,
    "longitude": 78.0569,
    "area": 1576.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 47500000,
    "reviewedValue": 47500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Chintamani",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-078",
    "ownerId": "OWNER-078",
    "ownerName": "Roopa Adiga",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Electronic City",
    "latitude": 12.8452,
    "longitude": 77.6602,
    "area": 3,
    "areaUnit": "acres",
    "ownerDeclaredValue": 23500000,
    "reviewedValue": 23000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment",
        "farmhouse"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Electronic City",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-079",
    "ownerId": "OWNER-079",
    "ownerName": "Siddharth Katti",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1279.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 9500000,
    "reviewedValue": 9500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 2850000,
      "maxCashToReceive": 3325000
    }
  },
  {
    "id": "ASSET-080",
    "ownerId": "OWNER-080",
    "ownerName": "Varun Shetty",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1030.6,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 7000000,
    "reviewedValue": 7000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse",
        "agricultural_land"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 2100000,
      "maxCashToReceive": 2450000
    }
  },
  {
    "id": "ASSET-081",
    "ownerId": "OWNER-081",
    "ownerName": "Aditi Deshpande",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Pandavapura",
    "latitude": 12.4939,
    "longitude": 76.6713,
    "area": 1881.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 38000000,
    "reviewedValue": 37500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Mandya",
        "Pandavapura",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-082",
    "ownerId": "OWNER-082",
    "ownerName": "Ashok Murthy",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Gubbi",
    "latitude": 13.3106,
    "longitude": 76.9405,
    "area": 1.7,
    "areaUnit": "acres",
    "ownerDeclaredValue": 25000000,
    "reviewedValue": 25000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land",
        "apartment"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Gubbi",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-083",
    "ownerId": "OWNER-083",
    "ownerName": "Gautam Urs",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Chikkaballapur Town",
    "latitude": 13.4355,
    "longitude": 77.7275,
    "area": 1584.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 62500000,
    "reviewedValue": 62500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Chikkaballapur Town",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-084",
    "ownerId": "OWNER-084",
    "ownerName": "Mahesh Hedge",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Koramangala",
    "latitude": 12.9352,
    "longitude": 77.6245,
    "area": 2.8,
    "areaUnit": "acres",
    "ownerDeclaredValue": 11500000,
    "reviewedValue": 11000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "commercial"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Koramangala",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 3300000,
      "maxCashToReceive": 3849999.9999999995
    }
  },
  {
    "id": "ASSET-085",
    "ownerId": "OWNER-085",
    "ownerName": "Prashanth Prasad",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1287.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 24500000,
    "reviewedValue": 24500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-086",
    "ownerId": "OWNER-086",
    "ownerName": "Sachin Venkatesh",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1038.4,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 22000000,
    "reviewedValue": 22000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "plot_site"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-087",
    "ownerId": "OWNER-087",
    "ownerName": "Smitha Kamath",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Malavalli",
    "latitude": 12.3872,
    "longitude": 77.056,
    "area": 1889.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 20000000,
    "reviewedValue": 19500000,
    "status": "reviewed",
    "locked": true,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Mandya",
        "Malavalli",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-088",
    "ownerId": "OWNER-088",
    "ownerName": "Vidya Reddy",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Tumakuru Town",
    "latitude": 13.3422,
    "longitude": 77.1017,
    "area": 1.5,
    "areaUnit": "acres",
    "ownerDeclaredValue": 15000000,
    "reviewedValue": 15000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "independent_house"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Tumakuru Town",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4500000,
      "maxCashToReceive": 5250000
    }
  },
  {
    "id": "ASSET-089",
    "ownerId": "OWNER-089",
    "ownerName": "Ajay Acharya",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Gauribidanur",
    "latitude": 13.6127,
    "longitude": 77.5186,
    "area": 1592.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 77500000,
    "reviewedValue": 77500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Gauribidanur",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-090",
    "ownerId": "OWNER-090",
    "ownerName": "Balaji Kulkarni",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Indiranagar",
    "latitude": 12.9784,
    "longitude": 77.6408,
    "area": 2.6,
    "areaUnit": "acres",
    "ownerDeclaredValue": 26500000,
    "reviewedValue": 26000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse",
        "plot_site"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Indiranagar",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-091",
    "ownerId": "OWNER-091",
    "ownerName": "Harish Shukla",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1294.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 18500000,
    "reviewedValue": 18500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-092",
    "ownerId": "OWNER-092",
    "ownerName": "Mamatha Gowda",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1046.2,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 15000000,
    "reviewedValue": 15000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land",
        "independent_house"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4500000,
      "maxCashToReceive": 5250000
    }
  },
  {
    "id": "ASSET-093",
    "ownerId": "OWNER-093",
    "ownerName": "Prathap Naik",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Mandya Town",
    "latitude": 12.5226,
    "longitude": 76.8976,
    "area": 1897.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 35000000,
    "reviewedValue": 34500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site"
      ],
      "preferredLocations": [
        "Mandya",
        "Mandya Town",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-094",
    "ownerId": "OWNER-094",
    "ownerName": "Sandhya Vaidya",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Kunigal",
    "latitude": 13.0238,
    "longitude": 77.0264,
    "area": 1.3,
    "areaUnit": "acres",
    "ownerDeclaredValue": 30000000,
    "reviewedValue": 30000000,
    "status": "under_review",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment",
        "commercial"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Kunigal",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-095",
    "ownerId": "OWNER-095",
    "ownerName": "Srinivas Iyengar",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Sidlaghatta",
    "latitude": 13.3917,
    "longitude": 77.8631,
    "area": 1600.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 32500000,
    "reviewedValue": 32500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Sidlaghatta",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-096",
    "ownerId": "OWNER-096",
    "ownerName": "Vijay Puranik",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Hsr Layout",
    "latitude": 12.9121,
    "longitude": 77.6446,
    "area": 2.4,
    "areaUnit": "acres",
    "ownerDeclaredValue": 14500000,
    "reviewedValue": 14000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "apartment"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Hsr Layout",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4200000,
      "maxCashToReceive": 4900000
    }
  },
  {
    "id": "ASSET-097",
    "ownerId": "OWNER-097",
    "ownerName": "Alok Yadav",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1302.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 12500000,
    "reviewedValue": 12500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 3750000,
      "maxCashToReceive": 4375000
    }
  },
  {
    "id": "ASSET-098",
    "ownerId": "OWNER-098",
    "ownerName": "Bharath Kashyap",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1054,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 8000000,
    "reviewedValue": 8000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "farmhouse"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 2400000,
      "maxCashToReceive": 2800000
    }
  },
  {
    "id": "ASSET-099",
    "ownerId": "OWNER-099",
    "ownerName": "Hemalatha Sastry",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Maddur",
    "latitude": 12.5844,
    "longitude": 77.045,
    "area": 1905.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 17000000,
    "reviewedValue": 16500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Mandya",
        "Maddur",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4950000,
      "maxCashToReceive": 5775000
    }
  },
  {
    "id": "ASSET-100",
    "ownerId": "OWNER-100",
    "ownerName": "Mohan Bhat",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Tiptur",
    "latitude": 13.2564,
    "longitude": 76.4789,
    "area": 1.1,
    "areaUnit": "acres",
    "ownerDeclaredValue": 20000000,
    "reviewedValue": 20000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "agricultural_land"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Tiptur",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-101",
    "ownerId": "OWNER-101",
    "ownerName": "Rajesh Kumar",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Bagepalli",
    "latitude": 13.7844,
    "longitude": 77.7942,
    "area": 1607.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 47500000,
    "reviewedValue": 47500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Bagepalli",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-102",
    "ownerId": "OWNER-102",
    "ownerName": "Santosh Somanna",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Electronic City",
    "latitude": 12.8452,
    "longitude": 77.6602,
    "area": 2.2,
    "areaUnit": "acres",
    "ownerDeclaredValue": 29500000,
    "reviewedValue": 29000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "plot_site",
        "independent_house"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Electronic City",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-103",
    "ownerId": "OWNER-103",
    "ownerName": "Subhash Hebbar",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1310.5,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 6500000,
    "reviewedValue": 6500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 1950000,
      "maxCashToReceive": 2275000
    }
  },
  {
    "id": "ASSET-104",
    "ownerId": "OWNER-104",
    "ownerName": "Vinay Patil",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1061.8,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 23000000,
    "reviewedValue": 23000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house",
        "commercial"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-105",
    "ownerId": "OWNER-105",
    "ownerName": "Amit Varma",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Srirangapatna",
    "latitude": 12.4238,
    "longitude": 76.6947,
    "area": 1913.1,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 32000000,
    "reviewedValue": 31500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "farmhouse"
      ],
      "preferredLocations": [
        "Mandya",
        "Srirangapatna",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-106",
    "ownerId": "OWNER-106",
    "ownerName": "Chetan Joshi",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Sira",
    "latitude": 13.7447,
    "longitude": 76.9069,
    "area": 0.9,
    "areaUnit": "acres",
    "ownerDeclaredValue": 35000000,
    "reviewedValue": 35000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial",
        "plot_site"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Sira",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-107",
    "ownerId": "OWNER-107",
    "ownerName": "Jagadeesh Rao",
    "category": "real_estate",
    "propertyType": "commercial",
    "district": "Chikkaballapur",
    "locality": "Chintamani",
    "latitude": 13.4009,
    "longitude": 78.0569,
    "area": 1615.7,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 62500000,
    "reviewedValue": 62500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land"
      ],
      "preferredLocations": [
        "Chikkaballapur",
        "Chintamani",
        "Bengaluru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-108",
    "ownerId": "OWNER-108",
    "ownerName": "Nandini Adiga",
    "category": "real_estate",
    "propertyType": "agricultural_land",
    "district": "Bengaluru",
    "locality": "Koramangala",
    "latitude": 12.9352,
    "longitude": 77.6245,
    "area": 2,
    "areaUnit": "acres",
    "ownerDeclaredValue": 17500000,
    "reviewedValue": 17000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "apartment",
        "farmhouse"
      ],
      "preferredLocations": [
        "Bengaluru",
        "Koramangala",
        "Ramanagara"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 5950000
    }
  },
  {
    "id": "ASSET-109",
    "ownerId": "OWNER-109",
    "ownerName": "Rakshith Katti",
    "category": "real_estate",
    "propertyType": "plot_site",
    "district": "Ramanagara",
    "locality": "Harohalli",
    "latitude": 12.6738,
    "longitude": 77.4665,
    "area": 1318.3,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 21500000,
    "reviewedValue": 21500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "independent_house"
      ],
      "preferredLocations": [
        "Ramanagara",
        "Harohalli",
        "Mysuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  },
  {
    "id": "ASSET-110",
    "ownerId": "OWNER-110",
    "ownerName": "Shilpa Shetty",
    "category": "real_estate",
    "propertyType": "apartment",
    "district": "Mysuru",
    "locality": "Kuvempunagar",
    "latitude": 12.2858,
    "longitude": 76.6256,
    "area": 1069.6,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 16000000,
    "reviewedValue": 16000000,
    "status": "reviewed",
    "locked": true,
    "wants": {
      "propertyTypes": [
        "farmhouse",
        "agricultural_land"
      ],
      "preferredLocations": [
        "Mysuru",
        "Kuvempunagar",
        "Mandya"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4800000,
      "maxCashToReceive": 5600000
    }
  },
  {
    "id": "ASSET-111",
    "ownerId": "OWNER-111",
    "ownerName": "Suma Deshpande",
    "category": "real_estate",
    "propertyType": "independent_house",
    "district": "Mandya",
    "locality": "Pandavapura",
    "latitude": 12.4939,
    "longitude": 76.6713,
    "area": 1920.9,
    "areaUnit": "sq_ft",
    "ownerDeclaredValue": 14000000,
    "reviewedValue": 13500000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "commercial"
      ],
      "preferredLocations": [
        "Mandya",
        "Pandavapura",
        "Tumakuru"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 4050000,
      "maxCashToReceive": 4725000
    }
  },
  {
    "id": "ASSET-112",
    "ownerId": "OWNER-112",
    "ownerName": "Vinutha Murthy",
    "category": "real_estate",
    "propertyType": "farmhouse",
    "district": "Tumakuru",
    "locality": "Gubbi",
    "latitude": 13.3106,
    "longitude": 76.9405,
    "area": 0.7,
    "areaUnit": "acres",
    "ownerDeclaredValue": 25000000,
    "reviewedValue": 25000000,
    "status": "reviewed",
    "locked": false,
    "wants": {
      "propertyTypes": [
        "agricultural_land",
        "apartment"
      ],
      "preferredLocations": [
        "Tumakuru",
        "Gubbi",
        "Chikkaballapur"
      ],
      "maxDistanceKm": 60,
      "maxCashToPay": 5000000,
      "maxCashToReceive": 6000000
    }
  }
];
