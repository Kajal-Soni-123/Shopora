export const PRODUCTS = [
  {
    id: "p1",
    name: "AeroTech Cyber Parka v2",
    category: "Outerwear",
    price: 240,
    rating: 4.9,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
    description: "Waterproof cyberpunk modular jacket with built-in thermal regulates and LED trim accents.",
    tags: ["Cyberpunk", "Techwear", "Waterproof"],
    inStock: true,
    suggestedBy: "Alex (Host)",
    reactions: { fire: 14, heart: 9, buy: 8 }
  },
  {
    id: "p2",
    name: "Neo Matrix High-Top Runners",
    category: "Footwear",
    price: 185,
    rating: 4.8,
    reviews: 94,
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80",
    description: "Ultralight carbon-fiber midsole sneakers designed for maximum urban agility and shock absorption.",
    tags: ["Futuristic", "Footwear", "Limited Drop"],
    inStock: true,
    suggestedBy: null,
    reactions: { fire: 22, heart: 18, buy: 15 }
  },
  {
    id: "p3",
    name: "Prism Polarized HUD Visor Glasses",
    category: "Accessories",
    price: 110,
    rating: 4.7,
    reviews: 62,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80",
    description: "Titanium frame polarized sunglasses with iridescent photochromic lens technology.",
    tags: ["Accessories", "UV400", "Titanium"],
    inStock: true,
    suggestedBy: "Sam",
    reactions: { fire: 8, heart: 11, buy: 5 }
  },
  {
    id: "p4",
    name: "Tactical Modular Utility Vest",
    category: "Outerwear",
    price: 160,
    rating: 4.9,
    reviews: 45,
    image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=800&q=80",
    description: "Detachable magnetic pouch system crafted from 1000D Cordura ballistic nylon.",
    tags: ["Tactical", "Streetwear"],
    inStock: true,
    suggestedBy: null,
    reactions: { fire: 5, heart: 3, buy: 2 }
  },
  {
    id: "p5",
    name: "Quantum Noise-Canceling Headphones",
    category: "Audio",
    price: 295,
    rating: 5.0,
    reviews: 210,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    description: "Spatial audio wireless headset featuring 40-hour battery life and custom equalizer tuning.",
    tags: ["Audio", "Spatial Sound", "Hi-Fi"],
    inStock: true,
    suggestedBy: "Alex (Host)",
    reactions: { fire: 30, heart: 25, buy: 19 }
  },
  {
    id: "p6",
    name: "Urban Minimalist Rolltop Backpack",
    category: "Bags",
    price: 135,
    rating: 4.6,
    reviews: 78,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    description: "Water-resistant commuter backpack with magnetic Fidlock buckle and padded 16\" laptop sleeve.",
    tags: ["Commuter", "Minimalist"],
    inStock: true,
    suggestedBy: null,
    reactions: { fire: 12, heart: 14, buy: 9 }
  }
];

export const INITIAL_ROOM_MEMBERS = [
  { id: "m1", name: "Kajal (You)", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80", status: "Active in Catalog", isHost: false, micOn: true, color: "#6366F1" },
  { id: "m2", name: "Alex (Host)", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80", status: "Viewing AeroTech Parka", isHost: true, micOn: true, color: "#EC4899" },
  { id: "m3", name: "Sam", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", status: "Building Outfit Canvas", isHost: false, micOn: false, color: "#10B981" }
];
