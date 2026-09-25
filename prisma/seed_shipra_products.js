const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Finding vendor Shipra...');
  
  // Find vendor by email shipra@yopmail.com
  let vendor = await prisma.vendor.findFirst({
    where: { email: 'shipra@yopmail.com' }
  });

  if (!vendor) {
    // Fallback: check user with role VENDOR
    const user = await prisma.user.findFirst({
      where: { email: 'shipra@yopmail.com' },
      include: { vendor: true }
    });
    if (user && user.vendor) {
      vendor = user.vendor;
    }
  }

  if (!vendor) {
    console.error('Error: Vendor user shipra@yopmail.com not found in database!');
    process.exit(1);
  }

  console.log(`Found vendor: ${vendor.name} (ID: ${vendor.id})`);

  // Fetch categories map by slug / name
  const allCategories = await prisma.category.findMany();
  const getCat = (identifier) => {
    const term = identifier.toLowerCase().trim();
    return allCategories.find(c => 
      c.slug.toLowerCase() === term || 
      c.name.toLowerCase() === term || 
      c.id === identifier
    );
  };

  const catFurniture = getCat('furniture');
  const catAppliances = getCat('electric-appliances');
  const catShirt = getCat('shirt') || getCat('men') || getCat('clothes');
  const catTankTop = getCat('tank-tops') || getCat('women') || getCat('clothes');
  const catSunscreen = getCat('suncreen') || getCat('skincare');
  const catMoisturiser = getCat('moisturiser') || getCat('skincare');
  const catFaceSerums = getCat('face-serums') || getCat('skincare');
  const catSerums = getCat('serums') || getCat('skincare');
  const catSkincare = getCat('skincare');
  const catClothes = getCat('clothes');

  console.log('Category lookups resolved:');
  console.log({
    furniture: catFurniture?.name,
    appliances: catAppliances?.name,
    shirt: catShirt?.name,
    tankTop: catTankTop?.name,
    sunscreen: catSunscreen?.name,
    moisturiser: catMoisturiser?.name,
    faceSerums: catFaceSerums?.name,
    serums: catSerums?.name,
  });

  const productsToSeed = [
    // --- FURNITURE ---
    {
      id: 'shipra_prod_teak_table',
      title: 'Handcrafted Teak Dining Table',
      description: 'Premium solid teak wood 6-seater dining table with natural oil finish and Scandinavian minimalist leg architecture.',
      price: 649.99,
      stock: 15,
      rating: 4.9,
      reviewsCount: 34,
      image: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1532323544230-7191fd51bc1b?auto=format&fit=crop&w=800&q=80'
      ],
      categoryId: catFurniture?.id,
      attributes: { material: 'Solid Teak Wood', height: 75, width: 180, color: 'Natural Teak' }
    },
    {
      id: 'shipra_prod_ergo_chair',
      title: 'Ergonomic High-Back Executive Mesh Chair',
      description: 'Professional ergonomic desk chair with 3D lumbar support, adjustable headrest, and breathable mesh back.',
      price: 229.50,
      stock: 40,
      rating: 4.8,
      reviewsCount: 52,
      image: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?auto=format&fit=crop&w=800&q=80'],
      categoryId: catFurniture?.id,
      attributes: { material: 'High-Density Mesh & Alloy', height: 120, width: 65, color: 'Obsidian Black' }
    },
    {
      id: 'shipra_prod_nordic_sofa',
      title: 'Nordic 3-Seater Velvet Lounge Sofa',
      description: 'Plush sapphire blue velvet sofa with solid oak tapered legs and high-resilience foam cushioning.',
      price: 899.00,
      stock: 8,
      rating: 4.95,
      reviewsCount: 29,
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'],
      categoryId: catFurniture?.id,
      attributes: { material: 'Velvet & Solid Oak', height: 85, width: 210, color: 'Sapphire Blue' }
    },
    {
      id: 'shipra_prod_oak_coffee_table',
      title: 'Minimalist Round Oak Coffee Table',
      description: 'Sleek circular coffee table crafted from sustainable white oak with smooth matte protective coating.',
      price: 189.00,
      stock: 25,
      rating: 4.7,
      reviewsCount: 18,
      image: 'https://images.unsplash.com/photo-1532323544230-7191fd51bc1b?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1532323544230-7191fd51bc1b?auto=format&fit=crop&w=800&q=80'],
      categoryId: catFurniture?.id,
      attributes: { material: 'White Oak', height: 45, width: 90, color: 'Natural Oak' }
    },
    {
      id: 'shipra_prod_armchair',
      title: 'Emerald Green Accent Armchair',
      description: 'Statement reading lounge armchair upholstered in soft emerald velvet with brushed gold stainless steel legs.',
      price: 349.99,
      stock: 12,
      rating: 4.85,
      reviewsCount: 41,
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'],
      categoryId: catFurniture?.id,
      attributes: { material: 'Velvet & Gold Steel', height: 90, width: 75, color: 'Emerald Green' }
    },

    // --- ELECTRIC APPLIANCES ---
    {
      id: 'shipra_prod_air_purifier',
      title: 'Ultra-Quiet HEPA Smart Air Purifier',
      description: 'True HEPA H13 filtration system removing 99.97% of airborne particles with real-time air quality indicator.',
      price: 159.99,
      stock: 50,
      rating: 4.8,
      reviewsCount: 88,
      image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80'],
      categoryId: catAppliances?.id,
      attributes: { warranty: '2 Years Manufacturer', guarantee: '30 Days Money Back', description: 'Covers up to 500 sq ft rooms efficiently.' }
    },
    {
      id: 'shipra_prod_espresso_maker',
      title: '15-Bar Professional Espresso Machine',
      description: 'Compact countertop espresso and cappuccino maker with integrated milk frother wand and PID temperature control.',
      price: 279.00,
      stock: 22,
      rating: 4.9,
      reviewsCount: 110,
      image: 'https://images.unsplash.com/photo-1517668808822-9ebe02f2a6e8?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1517668808822-9ebe02f2a6e8?auto=format&fit=crop&w=800&q=80'],
      categoryId: catAppliances?.id,
      attributes: { warranty: '3 Years Full Warranty', guarantee: '2 Years Service Guarantee', description: 'Italian 15-bar pressure pump.' }
    },
    {
      id: 'shipra_prod_robot_vacuum',
      title: 'Laser Navigation Smart Robot Vacuum & Mop',
      description: 'LiDAR Smart mapping robot vacuum with 4000Pa strong suction, auto-recharging, and app app scheduling.',
      price: 399.99,
      stock: 18,
      rating: 4.75,
      reviewsCount: 64,
      image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'],
      categoryId: catAppliances?.id,
      attributes: { warranty: '2 Years Warranty', guarantee: '1 Year Battery Protection', description: 'Cleans hardwood, tile, and low-pile carpets.' }
    },

    // --- MEN / SHIRT ---
    {
      id: 'shipra_prod_oxford_shirt',
      title: 'Premium Oxford Cotton Button-Down Shirt',
      description: '100% combed Oxford cotton tailored shirt with button-down collar and durable pearlized buttons.',
      price: 59.99,
      stock: 65,
      rating: 4.7,
      reviewsCount: 45,
      image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80'],
      categoryId: catShirt?.id,
      attributes: { size: 'LG', color: 'Classic Light Blue', material: '100% Oxford Cotton', description: 'Tailored regular fit shirt.' }
    },
    {
      id: 'shipra_prod_linen_shirt',
      title: 'Breathable Pure Linen Summer Shirt',
      description: 'Lightweight pre-washed 100% French linen relaxed fit casual shirt perfect for warm resort weather.',
      price: 69.50,
      stock: 40,
      rating: 4.85,
      reviewsCount: 37,
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80'],
      categoryId: catShirt?.id,
      attributes: { size: 'XL', color: 'Natural White', material: '100% French Linen', description: 'Garment washed for ultimate softness.' }
    },
    {
      id: 'shipra_prod_denim_shirt',
      title: 'Vintage Wash Slim Denim Shirt',
      description: 'Durable indigo washed cotton denim shirt featuring double chest snap pockets and Western yoke pattern.',
      price: 74.99,
      stock: 30,
      rating: 4.6,
      reviewsCount: 22,
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80'],
      categoryId: catShirt?.id,
      attributes: { size: 'SM', color: 'Vintage Indigo', material: 'Cotton Denim', description: 'Sturdy 8oz denim weave.' }
    },

    // --- WOMEN / TANK TOPS ---
    {
      id: 'shipra_prod_ribbed_tank',
      title: 'Seamless Micro-Ribbed Layering Tank',
      description: 'Ultra-stretch micro-ribbed cotton tank top with scooped neckline and moisture-wicking comfort.',
      price: 24.99,
      stock: 90,
      rating: 4.8,
      reviewsCount: 79,
      image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80'],
      categoryId: catTankTop?.id,
      attributes: { size: 'SM', material: 'Organic Ribbed Cotton Blend', description: 'Form-fitting soft essential tank.' }
    },
    {
      id: 'shipra_prod_racerback_tank',
      title: 'Athletic Dry-Fit Racerback Tank',
      description: 'Performance activewear tank engineered with 4-way stretch mesh back panel for workout mobility.',
      price: 29.50,
      stock: 60,
      rating: 4.9,
      reviewsCount: 43,
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'],
      categoryId: catTankTop?.id,
      attributes: { size: 'XS', material: 'Poly-Spandex DryFit', description: 'Quick-dry active gym tank.' }
    },
    {
      id: 'shipra_prod_cotton_tank',
      title: 'Organic Slub Cotton Casual Tank',
      description: 'Relaxed fit summer tank top made from certified organic slub cotton with subtle natural texture.',
      price: 22.00,
      stock: 75,
      rating: 4.75,
      reviewsCount: 31,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'],
      categoryId: catTankTop?.id,
      attributes: { size: 'LG', material: '100% Organic Cotton', description: 'Breathable airy feel.' }
    },

    // --- SKINCARE / SUNSCREEN ---
    {
      id: 'shipra_prod_sunscreen_spf50',
      title: 'Invisible Daily Fluid Sunscreen SPF 50+',
      description: 'Ultra-lightweight invisible facial sunscreen providing broad spectrum UVA/UVB protection without white cast.',
      price: 28.00,
      stock: 100,
      rating: 4.9,
      reviewsCount: 145,
      image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80'],
      categoryId: catSunscreen?.id,
      attributes: { size: '50ml / 1.7 fl. oz.' }
    },
    {
      id: 'shipra_prod_mineral_sunscreen',
      title: 'Hydrating Mineral Zinc Oxide SPF 30',
      description: 'Gentle 100% mineral sunscreen formula enriched with aloe vera and cucumber extract for sensitive skin.',
      price: 24.50,
      stock: 85,
      rating: 4.8,
      reviewsCount: 62,
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80'],
      categoryId: catSunscreen?.id,
      attributes: { size: '75ml / 2.5 fl. oz.' }
    },

    // --- SKINCARE / MOISTURISER ---
    {
      id: 'shipra_prod_moisturiser_hyaluronic',
      title: 'Hyaluronic Acid Deep Moisture Gel Cream',
      description: 'Oil-free gel moisturizer powered by triple-weight hyaluronic acid to plump skin and lock hydration for 72 hours.',
      price: 32.00,
      stock: 95,
      rating: 4.92,
      reviewsCount: 180,
      image: 'https://images.unsplash.com/photo-1608248597263-0007823f03b5?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1608248597263-0007823f03b5?auto=format&fit=crop&w=800&q=80'],
      categoryId: catMoisturiser?.id,
      attributes: {}
    },
    {
      id: 'shipra_prod_ceramide_cream',
      title: 'Barrier Repair Ceramide Rich Moisture Cream',
      description: 'Nourishing facial cream with 5 essential ceramides and squalane to restore compromised skin barrier.',
      price: 36.00,
      stock: 70,
      rating: 4.88,
      reviewsCount: 94,
      image: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80'],
      categoryId: catMoisturiser?.id,
      attributes: {}
    },

    // --- SKINCARE / FACE SERUMS & SERUMS ---
    {
      id: 'shipra_prod_vitc_serum',
      title: 'Vitamin C 20% + Ferulic Acid Glow Serum',
      description: 'Potent antioxidant serum targeting dark spots, hyperpigmentation, and uneven tone for radiant skin.',
      price: 42.00,
      stock: 80,
      rating: 4.95,
      reviewsCount: 210,
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80'],
      categoryId: catFaceSerums?.id,
      attributes: { size: '30ml / 1.0 fl. oz.', description: 'Use morning before SPF.' }
    },
    {
      id: 'shipra_prod_niacinamide_serum',
      title: 'Niacinamide 10% + Zinc 1% Pore Refining Serum',
      description: 'Concentrated serum formulated to minimize pore visibility, control excess sebum production, and smooth texture.',
      price: 26.00,
      stock: 110,
      rating: 4.85,
      reviewsCount: 165,
      image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80'],
      categoryId: catFaceSerums?.id,
      attributes: { size: '30ml / 1.0 fl. oz.', description: 'Blemish and oil control formula.' }
    },
    {
      id: 'shipra_prod_retinol_serum',
      title: 'Advanced Encapsulated 2% Retinol Night Serum',
      description: 'Time-release encapsulated retinol serum reducing fine lines and accelerating cellular turnover without irritation.',
      price: 48.00,
      stock: 65,
      rating: 4.9,
      reviewsCount: 115,
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80'],
      categoryId: catSerums?.id,
      attributes: { size: '30ml / 1.0 fl. oz.' }
    },
    {
      id: 'shipra_prod_peptide_serum',
      title: 'Copper Peptide Anti-Aging Youth Elixir Serum',
      description: 'Revitalizing peptide complex serum designed to boost collagen synthesis and firm skin elasticity.',
      price: 52.00,
      stock: 45,
      rating: 4.93,
      reviewsCount: 82,
      image: 'https://images.unsplash.com/photo-1567928256565-df048206d2dd?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1567928256565-df048206d2dd?auto=format&fit=crop&w=800&q=80'],
      categoryId: catSerums?.id,
      attributes: { size: '30ml / 1.0 fl. oz.' }
    }
  ];

  console.log(`Starting to seed ${productsToSeed.length} products for vendor ${vendor.name}...`);

  let count = 0;
  for (const item of productsToSeed) {
    if (!item.categoryId) {
      console.warn(`Warning: Missing categoryId for product ${item.title}, skipping...`);
      continue;
    }

    const data = {
      title: item.title,
      description: item.description,
      price: item.price,
      stock: item.stock,
      rating: item.rating,
      reviewsCount: item.reviewsCount,
      image: item.image,
      images: item.images,
      attributes: item.attributes,
      vendorId: vendor.id,
      categoryId: item.categoryId,
    };

    await prisma.product.upsert({
      where: { id: item.id },
      update: data,
      create: {
        id: item.id,
        ...data,
      }
    });

    count++;
  }

  console.log(`Successfully seeded ${count} products for Vendor ${vendor.name} (${vendor.email})!`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
