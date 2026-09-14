const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const prods = await prisma.product.findMany();
  console.log('Users count:', users.length, 'Products count:', prods.length);

  const nordVendor = users.find(u => u.vendorId === 'vendor_nordic_wear') || users.find(u => u.role === 'VENDOR');
  console.log('Vendor selected:', nordVendor ? nordVendor.vendorId : 'none');

  if (!nordVendor) return;

  const dates = [
    new Date('2026-06-12T10:00:00Z'),
    new Date('2026-06-25T14:30:00Z'),
    new Date('2026-07-08T11:15:00Z'),
    new Date('2026-07-20T16:20:00Z'),
    new Date('2026-08-04T09:40:00Z'),
    new Date('2026-08-18T13:00:00Z'),
    new Date('2026-09-02T15:10:00Z'),
    new Date('2026-09-11T12:00:00Z')
  ];

  const addresses = [
    '742 Evergreen Terrace, Seattle, WA 98101',
    '100 Congress Ave, Austin, TX 78701',
    '456 Market St, San Francisco, CA 94105',
    '1211 SW 5th Ave, Portland, OR 97204',
    '350 5th Ave, New York, NY 10118',
    '233 S Wacker Dr, Chicago, IL 60606',
    '742 Evergreen Terrace, Seattle, WA 98101',
    '100 Congress Ave, Austin, TX 78701'
  ];

  const targetProds = prods.filter(p => p.vendorId === nordVendor.vendorId);
  const p1 = targetProds[0] || prods[0];
  const p2 = targetProds[1] || prods[1];

  for (let i = 0; i < dates.length; i++) {
    const num = 'ORD-2026-SEED-' + (i + 10);
    const existing = await prisma.order.findUnique({ where: { orderNumber: num } });
    if (!existing) {
      const parent = await prisma.order.create({
        data: {
          orderNumber: num,
          customerName: 'Customer ' + (i + 1),
          customerEmail: 'customer' + (i + 1) + '@example.com',
          shippingAddress: addresses[i],
          paymentStatus: 'PAID',
          totalAmount: (p1.price * (i % 3 + 1)) + (p2 ? p2.price : 0),
          aggregateStatus: 'DELIVERED',
          createdAt: dates[i],
          updatedAt: dates[i],
          subOrders: {
            create: [
              {
                subOrderNumber: 'SUB-' + num + '-1',
                vendorId: p1.vendorId,
                status: 'DELIVERED',
                subtotal: p1.price * (i % 3 + 1),
                trackingNumber: 'TRK-' + (800000 + i),
                shippingCarrier: 'FedEx Express',
                createdAt: dates[i],
                updatedAt: dates[i],
                items: {
                  create: [
                    { productId: p1.id, quantity: (i % 3 + 1), price: p1.price }
                  ]
                }
              }
            ]
          }
        }
      });
      console.log('Created order:', parent.orderNumber);
    }
  }
}

main().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
