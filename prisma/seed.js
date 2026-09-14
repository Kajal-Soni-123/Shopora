const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const vendors = [
  {
    id: 'vendor_urban_tech',
    name: 'UrbanTech Gear Studio',
    email: 'fulfillment@urbantech.com',
    warehouseLocation: 'Seattle, WA (Whse #101)',
    rating: 4.9,
  },
  {
    id: 'vendor_nordic_wear',
    name: 'Nordic Apparel Co.',
    email: 'shipping@nordicapparel.io',
    warehouseLocation: 'Portland, OR (Whse #402)',
    rating: 4.8,
  },
  {
    id: 'vendor_luxe_audio',
    name: 'Luxe Acoustic Labs',
    email: 'logistics@luxeacoustics.com',
    warehouseLocation: 'Austin, TX (Whse #205)',
    rating: 4.95,
  },
];

const categories = [
  { id: 'cat_outerwear', name: 'Outerwear', slug: 'outerwear' },
  { id: 'cat_audio', name: 'Audio', slug: 'audio' },
  { id: 'cat_bags', name: 'Bags & Packs', slug: 'bags' },
  { id: 'cat_footwear', name: 'Footwear', slug: 'footwear' },
  { id: 'cat_accessories', name: 'Accessories', slug: 'accessories' },
];

const sampleCustomers = [
  { id: 'usr_cust_alex', name: 'Alex Johnson', email: 'alex.j@example.com', role: 'CUSTOMER' },
  { id: 'usr_cust_sarah', name: 'Sarah Jenkins', email: 'sarah.j@example.com', role: 'CUSTOMER' },
  { id: 'usr_cust_michael', name: 'Michael Chen', email: 'michael.c@example.com', role: 'CUSTOMER' },
  { id: 'usr_cust_emily', name: 'Emily Davis', email: 'emily.d@example.com', role: 'CUSTOMER' },
  { id: 'usr_cust_david', name: 'David Miller', email: 'david.m@example.com', role: 'CUSTOMER' },
  { id: 'usr_cust_sophia', name: 'Sophia Wilson', email: 'sophia.w@example.com', role: 'CUSTOMER' },
];

async function main() {
  console.log('Seeding database vendors, categories, customers, and product reviews...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Seed Vendors
  for (const v of vendors) {
    await prisma.vendor.upsert({
      where: { id: v.id },
      update: v,
      create: v,
    });
  }

  // 2. Seed Categories
  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }

  // 3. Seed Sample Customers
  const createdCustomers = [];
  for (const cust of sampleCustomers) {
    const u = await prisma.user.upsert({
      where: { email: cust.email },
      update: { name: cust.name, role: cust.role },
      create: {
        id: cust.id,
        name: cust.name,
        email: cust.email,
        password: hashedPassword,
        role: cust.role,
      },
    });
    createdCustomers.push(u);
  }

  // 4. Ensure products exist for vendors
  const allVendors = await prisma.vendor.findMany();
  const sampleProductsData = [
    {
      id: 'prod_arctic_parka',
      title: 'Nordic Expedition Arctic Parka',
      description: 'Heavyweight waterproof down jacket with storm flap hood and thermal lining.',
      price: 289.99,
      stock: 45,
      image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80',
      vendorId: 'vendor_nordic_wear',
      categoryId: 'cat_outerwear',
    },
    {
      id: 'prod_merino:sweater',
      title: 'Merino Wool Minimalist Sweater',
      description: 'Ultra-soft breathable 100% merino wool knit sweater designed in Stockholm.',
      price: 139.50,
      stock: 60,
      image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
      vendorId: 'vendor_nordic_wear',
      categoryId: 'cat_outerwear',
    },
    {
      id: 'prod_anc_headphones',
      title: 'Studio Pro Wireless ANC Headphones',
      description: 'Active noise cancelling wireless over-ear headphones with 40-hour battery life.',
      price: 249.00,
      stock: 30,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      vendorId: 'vendor_luxe_audio',
      categoryId: 'cat_audio',
    },
    {
      id: 'prod_commuter_backpack',
      title: 'UrbanTech Modular Commuter Pack',
      description: 'Water-resistant rolltop backpack with padded laptop sleeve and magnetic locks.',
      price: 119.99,
      stock: 80,
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      vendorId: 'vendor_urban_tech',
      categoryId: 'cat_bags',
    },
  ];

  for (const p of sampleProductsData) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        title: p.title,
        description: p.description,
        price: p.price,
        stock: p.stock,
        image: p.image,
      },
      create: p,
    });
  }

  // Also include any custom vendor products created earlier (e.g. Kajal's Shop)
  const allProducts = await prisma.product.findMany();

  // 5. Seed Multi-Month Reviews & Comments
  console.log('Seeding multi-month reviews and comments...');
  
  const reviewsSeedData = [
    // June 2026 Reviews
    {
      productId: 'prod_arctic_parka',
      userEmail: 'alex.j@example.com',
      rating: 5,
      comment: 'Kept me extremely warm during my sub-zero camping trip! Amazing build quality and pocket design.',
      date: new Date('2026-06-12T10:30:00Z'),
    },
    {
      productId: 'prod_arctic_parka',
      userEmail: 'sarah.j@example.com',
      rating: 5,
      comment: 'Worth every penny. The waterproof finish is fantastic in heavy downpours.',
      date: new Date('2026-06-25T14:15:00Z'),
    },
    {
      productId: 'prod_merino:sweater',
      userEmail: 'michael.c@example.com',
      rating: 4,
      comment: 'Super soft material and comfortable fit. A bit fitted on the shoulders.',
      date: new Date('2026-06-18T09:00:00Z'),
    },
    {
      productId: 'prod_anc_headphones',
      userEmail: 'emily.d@example.com',
      rating: 5,
      comment: 'Noise cancellation is astonishingly good! Crisp highs and deep punchy bass.',
      date: new Date('2026-06-28T16:45:00Z'),
    },

    // July 2026 Reviews
    {
      productId: 'prod_arctic_parka',
      userEmail: 'david.m@example.com',
      rating: 5,
      comment: 'Hands down the best winter parka I have ever owned. High quality zippers.',
      date: new Date('2026-07-05T11:20:00Z'),
    },
    {
      productId: 'prod_merino:sweater',
      userEmail: 'sophia.w@example.com',
      rating: 5,
      comment: 'Elegant minimalist style. Washes easily and retains warmth without feeling bulky.',
      date: new Date('2026-07-14T18:10:00Z'),
    },
    {
      productId: 'prod_merino:sweater',
      userEmail: 'alex.j@example.com',
      rating: 5,
      comment: 'Bought two colors. The texture of merino wool is unmatched.',
      date: new Date('2026-07-22T13:40:00Z'),
    },
    {
      productId: 'prod_commuter_backpack',
      userEmail: 'sarah.j@example.com',
      rating: 4,
      comment: 'Fits my 16-inch laptop snugly. Love the sleek matte black aesthetic.',
      date: new Date('2026-07-29T08:30:00Z'),
    },

    // August 2026 Reviews
    {
      productId: 'prod_anc_headphones',
      userEmail: 'michael.c@example.com',
      rating: 5,
      comment: 'Battery life easily lasts 3 full days of heavy remote work and travel.',
      date: new Date('2026-08-04T15:00:00Z'),
    },
    {
      productId: 'prod_anc_headphones',
      userEmail: 'sophia.w@example.com',
      rating: 5,
      comment: 'Unbelievable audio clarity! Seamless Bluetooth multipoint pairing.',
      date: new Date('2026-08-11T12:00:00Z'),
    },
    {
      productId: 'prod_arctic_parka',
      userEmail: 'emily.d@example.com',
      rating: 4,
      comment: 'Very thick insulation. Slightly heavier than expected but ultra protective.',
      date: new Date('2026-08-19T17:25:00Z'),
    },
    {
      productId: 'prod_commuter_backpack',
      userEmail: 'david.m@example.com',
      rating: 5,
      comment: 'Modular attachments are a game changer for daily commutes.',
      date: new Date('2026-08-27T10:15:00Z'),
    },

    // September 2026 Reviews
    {
      productId: 'prod_arctic_parka',
      userEmail: 'sophia.w@example.com',
      rating: 5,
      comment: 'Customer support was great and jacket exceeded expectations!',
      date: new Date('2026-09-02T09:30:00Z'),
    },
    {
      productId: 'prod_merino:sweater',
      userEmail: 'emily.d@example.com',
      rating: 5,
      comment: 'Luxurious feel, highly recommend for fall wardrobe.',
      date: new Date('2026-09-08T14:50:00Z'),
    },
    {
      productId: 'prod_commuter_backpack',
      userEmail: 'alex.j@example.com',
      rating: 5,
      comment: 'Extremely durable fabric, zero water leaks during heavy storms.',
      date: new Date('2026-09-10T16:00:00Z'),
    },
  ];

  // Add reviews for any remaining products (including vendor products like Kajal's Shop products)
  const extraProduct = allProducts.find(p => !sampleProductsData.some(sp => sp.id === p.id));
  if (extraProduct) {
    reviewsSeedData.push(
      {
        productId: extraProduct.id,
        userEmail: 'alex.j@example.com',
        rating: 5,
        comment: 'Beautiful fabric and fast dispatch from the merchant!',
        date: new Date('2026-08-15T11:00:00Z'),
      },
      {
        productId: extraProduct.id,
        userEmail: 'sarah.j@example.com',
        rating: 5,
        comment: 'Loved the stitching and detail work. Fits true to size.',
        date: new Date('2026-09-05T13:30:00Z'),
      }
    );
  }

  for (const rev of reviewsSeedData) {
    const user = createdCustomers.find(u => u.email === rev.userEmail) || createdCustomers[0];
    const targetProd = allProducts.find(p => p.id === rev.productId);

    if (targetProd && user) {
      // Check if review exists to prevent duplicates
      const existing = await prisma.review.findFirst({
        where: {
          userId: user.id,
          productId: targetProd.id,
          comment: rev.comment,
        },
      });

      if (!existing) {
        await prisma.review.create({
          data: {
            rating: rev.rating,
            comment: rev.comment,
            userId: user.id,
            productId: targetProd.id,
            createdAt: rev.date,
            updatedAt: rev.date,
          },
        });
      }
    }
  }

  // 6. Recalculate rating and reviewsCount for all products
  console.log('Recalculating product ratings and review counts...');
  for (const prod of allProducts) {
    const productReviews = await prisma.review.findMany({
      where: { productId: prod.id },
    });

    if (productReviews.length > 0) {
      const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
      await prisma.product.update({
        where: { id: prod.id },
        data: {
          rating: Number(avgRating.toFixed(1)),
          reviewsCount: productReviews.length,
        },
      });
    }
  }

  // 7. Seed Multi-Month Customer Orders & Vendor Sub-Orders with Diverse Shipping Locations
  console.log('Seeding multi-month customer orders & vendor sub-orders across diverse states...');

  const ordersSeedData = [
    // June 2026 Orders
    {
      orderNumber: 'ORD-2026-JUN-01',
      customerName: 'Alex Johnson',
      customerEmail: 'alex.j@example.com',
      shippingAddress: '742 Evergreen Terrace, Seattle, WA 98101',
      date: new Date('2026-06-10T11:00:00Z'),
      items: [
        { productId: 'prod_arctic_parka', quantity: 2, price: 289.99 },
        { productId: 'prod_commuter_backpack', quantity: 1, price: 119.99 },
      ],
    },
    {
      orderNumber: 'ORD-2026-JUN-02',
      customerName: 'Sarah Jenkins',
      customerEmail: 'sarah.j@example.com',
      shippingAddress: '100 Congress Ave, Austin, TX 78701',
      date: new Date('2026-06-22T15:30:00Z'),
      items: [
        { productId: 'prod_anc_headphones', quantity: 1, price: 249.00 },
        { productId: 'prod_merino:sweater', quantity: 2, price: 139.50 },
      ],
    },

    // July 2026 Orders
    {
      orderNumber: 'ORD-2026-JUL-01',
      customerName: 'Michael Chen',
      customerEmail: 'michael.c@example.com',
      shippingAddress: '456 Market St, San Francisco, CA 94105',
      date: new Date('2026-07-04T09:15:00Z'),
      items: [
        { productId: 'prod_commuter_backpack', quantity: 3, price: 119.99 },
        { productId: 'prod_anc_headphones', quantity: 1, price: 249.00 },
      ],
    },
    {
      orderNumber: 'ORD-2026-JUL-02',
      customerName: 'Emily Davis',
      customerEmail: 'emily.d@example.com',
      shippingAddress: '1211 SW 5th Ave, Portland, OR 97204',
      date: new Date('2026-07-18T14:20:00Z'),
      items: [
        { productId: 'prod_arctic_parka', quantity: 1, price: 289.99 },
        { productId: 'prod_merino:sweater', quantity: 1, price: 139.50 },
      ],
    },
    {
      orderNumber: 'ORD-2026-JUL-03',
      customerName: 'David Miller',
      customerEmail: 'david.m@example.com',
      shippingAddress: '350 5th Ave, New York, NY 10118',
      date: new Date('2026-07-28T16:40:00Z'),
      items: [
        { productId: 'prod_anc_headphones', quantity: 2, price: 249.00 },
      ],
    },

    // August 2026 Orders
    {
      orderNumber: 'ORD-2026-AUG-01',
      customerName: 'Sophia Wilson',
      customerEmail: 'sophia.w@example.com',
      shippingAddress: '233 S Wacker Dr, Chicago, IL 60606',
      date: new Date('2026-08-05T10:00:00Z'),
      items: [
        { productId: 'prod_merino:sweater', quantity: 3, price: 139.50 },
        { productId: 'prod_commuter_backpack', quantity: 2, price: 119.99 },
      ],
    },
    {
      orderNumber: 'ORD-2026-AUG-02',
      customerName: 'Alex Johnson',
      customerEmail: 'alex.j@example.com',
      shippingAddress: '742 Evergreen Terrace, Seattle, WA 98101',
      date: new Date('2026-08-16T12:45:00Z'),
      items: [
        { productId: 'prod_arctic_parka', quantity: 3, price: 289.99 },
      ],
    },
    {
      orderNumber: 'ORD-2026-AUG-03',
      customerName: 'Sarah Jenkins',
      customerEmail: 'sarah.j@example.com',
      shippingAddress: '100 Congress Ave, Austin, TX 78701',
      date: new Date('2026-08-25T18:10:00Z'),
      items: [
        { productId: 'prod_commuter_backpack', quantity: 4, price: 119.99 },
        { productId: 'prod_anc_headphones', quantity: 1, price: 249.00 },
      ],
    },

    // September 2026 Orders
    {
      orderNumber: 'ORD-2026-SEP-01',
      customerName: 'Michael Chen',
      customerEmail: 'michael.c@example.com',
      shippingAddress: '456 Market St, San Francisco, CA 94105',
      date: new Date('2026-09-03T11:20:00Z'),
      items: [
        { productId: 'prod_anc_headphones', quantity: 3, price: 249.00 },
        { productId: 'prod_merino:sweater', quantity: 1, price: 139.50 },
      ],
    },
    {
      orderNumber: 'ORD-2026-SEP-02',
      customerName: 'Emily Davis',
      customerEmail: 'emily.d@example.com',
      shippingAddress: '742 Evergreen Terrace, Seattle, WA 98101',
      date: new Date('2026-09-09T14:00:00Z'),
      items: [
        { productId: 'prod_arctic_parka', quantity: 2, price: 289.99 },
        { productId: 'prod_commuter_backpack', quantity: 2, price: 119.99 },
      ],
    },
  ];

  for (const ordData of ordersSeedData) {
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber: ordData.orderNumber },
    });

    if (!existingOrder) {
      // Calculate total amount
      const totalAmount = ordData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const parentOrder = await prisma.order.create({
        data: {
          orderNumber: ordData.orderNumber,
          customerName: ordData.customerName,
          customerEmail: ordData.customerEmail,
          shippingAddress: ordData.shippingAddress,
          paymentStatus: 'PAID',
          totalAmount,
          aggregateStatus: 'DELIVERED',
          createdAt: ordData.date,
          updatedAt: ordData.date,
        },
      });

      // Split into sub-orders per vendor
      const itemsByVendor = {};
      for (const item of ordData.items) {
        const prod = allProducts.find((p) => p.id === item.productId);
        if (prod) {
          if (!itemsByVendor[prod.vendorId]) {
            itemsByVendor[prod.vendorId] = [];
          }
          itemsByVendor[prod.vendorId].push({
            productId: prod.id,
            quantity: item.quantity,
            price: item.price,
          });
        }
      }

      for (const [vId, vItems] of Object.entries(itemsByVendor)) {
        const subtotal = vItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const subOrderNum = `SUB-${ordData.orderNumber}-${vId.substring(0, 6)}`;

        await prisma.subOrder.create({
          data: {
            subOrderNumber: subOrderNum,
            orderId: parentOrder.id,
            vendorId: vId,
            status: 'DELIVERED',
            subtotal,
            trackingNumber: `TRK-${Math.floor(Math.random() * 899999 + 100000)}`,
            shippingCarrier: 'FedEx Express',
            createdAt: ordData.date,
            updatedAt: ordData.date,
            items: {
              create: vItems.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                price: i.price,
              })),
            },
          },
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
