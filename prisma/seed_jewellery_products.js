const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('💎 Seeding Jewellery Products for Virtual Try-On...');

  // Ensure Jewellery main category & subcategories exist
  let jewelleryCategory = await prisma.category.findFirst({
    where: { slug: 'jewellery' }
  });

  if (!jewelleryCategory) {
    jewelleryCategory = await prisma.category.create({
      data: {
        name: 'Jewellery & Fine Accessories',
        slug: 'jewellery'
      }
    });
    console.log('Created main Jewellery category');
  }

  // Get or create vendor
  let vendor = await prisma.vendor.findFirst();

  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: 'Luxe Jewellery Studio',
        email: 'jewellery_luxe_' + Date.now() + '@luxe.com',
        warehouseLocation: 'New York, NY (Whse #808)',
        rating: 4.95
      }
    });
  }

  const jewelleryItems = [
    {
      id: 'jewel_prod_diamond_necklace',
      title: 'Royal Solitaire Diamond Pendant Necklace',
      description: 'Handcrafted 18k White Gold necklace featuring a brilliant-cut 1.5 carat solitaire diamond pendant on a delicate box chain.',
      price: 1299.00,
      stock: 10,
      rating: 4.95,
      reviewsCount: 48,
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80'
      ],
      tryOnImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      isTryOnAvailable: true,
      categoryId: jewelleryCategory.id,
      attributes: {
        jewelleryType: 'NECKLACE',
        metal: '18K White Gold',
        gemstone: 'Diamond',
        chainLength: '18 inches'
      }
    },
    {
      id: 'jewel_prod_emerald_earrings',
      title: 'Emerald Cut Vintage Drop Earrings',
      description: 'Elegant drop earrings set with genuine Colombian emeralds framed by halo micro-pave diamonds in platinum.',
      price: 850.00,
      stock: 15,
      rating: 4.9,
      reviewsCount: 32,
      image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80'
      ],
      tryOnImage: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
      isTryOnAvailable: true,
      categoryId: jewelleryCategory.id,
      attributes: {
        jewelleryType: 'EARRINGS',
        metal: 'Platinum',
        gemstone: 'Emerald & Diamond',
        fastening: 'Leverback'
      }
    },
    {
      id: 'jewel_prod_sapphire_ring',
      title: 'Eternity Ceylon Blue Sapphire Ring',
      description: 'Classic eternity band encrusted with oval Ceylon blue sapphires and alternating round diamonds in 14k rose gold.',
      price: 920.00,
      stock: 20,
      rating: 4.88,
      reviewsCount: 56,
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80'
      ],
      tryOnImage: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      isTryOnAvailable: true,
      categoryId: jewelleryCategory.id,
      attributes: {
        jewelleryType: 'RING',
        metal: '14K Rose Gold',
        gemstone: 'Blue Sapphire',
        ringSize: '7'
      }
    },
    {
      id: 'jewel_prod_gold_bracelet',
      title: 'Artisan Tennis Chain Gold Bracelet',
      description: 'Flexible 18k yellow gold tennis bracelet linked with brilliant round cubic zirconia and secure box clasp.',
      price: 490.00,
      stock: 25,
      rating: 4.85,
      reviewsCount: 41,
      image: 'https://images.unsplash.com/photo-1611591475140-be38b638eb31?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1611591475140-be38b638eb31?auto=format&fit=crop&w=800&q=80'
      ],
      tryOnImage: 'https://images.unsplash.com/photo-1611591475140-be38b638eb31?auto=format&fit=crop&w=800&q=80',
      isTryOnAvailable: true,
      categoryId: jewelleryCategory.id,
      attributes: {
        jewelleryType: 'BRACELET',
        metal: '18K Yellow Gold',
        length: '7 inches'
      }
    },
    {
      id: 'jewel_prod_luxury_watch',
      title: 'Chrono Luxe Rose Gold Automatic Watch',
      description: 'Swiss-movement automatic chronograph watch with skeleton dial, sapphire crystal glass, and Italian leather strap.',
      price: 1450.00,
      stock: 8,
      rating: 4.98,
      reviewsCount: 67,
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80'
      ],
      tryOnImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      isTryOnAvailable: true,
      categoryId: jewelleryCategory.id,
      attributes: {
        jewelleryType: 'WATCH',
        caseSize: '40mm',
        movement: 'Swiss Automatic',
        waterResistance: '50m'
      }
    }
  ];

  for (const item of jewelleryItems) {
    const data = {
      title: item.title,
      description: item.description,
      price: item.price,
      stock: item.stock,
      rating: item.rating,
      reviewsCount: item.reviewsCount,
      image: item.image,
      images: item.images,
      tryOnImage: item.tryOnImage,
      isTryOnAvailable: item.isTryOnAvailable,
      attributes: item.attributes,
      vendorId: vendor.id,
      categoryId: item.categoryId
    };

    await prisma.product.upsert({
      where: { id: item.id },
      update: data,
      create: {
        id: item.id,
        ...data
      }
    });
  }

  console.log('✅ Successfully seeded 5 jewellery items with try-on capabilities!');
}

main()
  .catch((e) => {
    console.error('Error seeding jewellery products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
