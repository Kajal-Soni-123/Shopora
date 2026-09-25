import { prisma } from '../src/lib/prisma';

async function runGenieCoShopTest() {
  console.log('🧪 Starting Shopora Genie (AI Co-Shopper) Test Suite...\n');

  try {
    // 1. Setup test session and host user
    const hostUser = await prisma.user.upsert({
      where: { email: 'genie_tester@shopora.com' },
      update: {},
      create: {
        name: 'Genie Test Host',
        email: 'genie_tester@shopora.com',
        password: 'hashed_password_123',
        role: 'CUSTOMER',
      },
    });

    const sessionCode = `GENIE-${Math.floor(100000 + Math.random() * 900000)}`;
    const session = await prisma.groupShoppingSession.create({
      data: {
        code: sessionCode,
        title: 'Genie AI Test Party',
        hostUserId: hostUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        members: {
          create: [
            {
              userId: hostUser.id,
              guestName: hostUser.name,
              guestEmail: hostUser.email,
              role: 'HOST',
              status: 'JOINED',
            },
          ],
        },
      },
    });
    console.log(`✅ Test Group Session created with code: ${sessionCode}`);

    // 2. Create virtual Genie bot member if not exists
    let genieMember = await prisma.groupSessionMember.create({
      data: {
        sessionId: session.id,
        guestName: 'Shopora Genie ✨',
        guestEmail: 'genie@shopora.ai',
        role: 'MEMBER',
        status: 'JOINED',
      },
    });
    console.log(`✅ Genie Bot Member created with ID: ${genieMember.id}`);

    // 3. Test Product Search & Intent Matching for "under $50"
    const dealsUnder50 = await prisma.product.findMany({
      where: {
        price: { lte: 50 },
        stock: { gt: 0 },
      },
      orderBy: { rating: 'desc' },
      take: 3,
    });

    console.log(`✅ Catalog Query for "under $50" returned ${dealsUnder50.length} matching products:`);
    dealsUnder50.forEach((p) => {
      console.log(`   - "${p.title}" | $${p.price.toFixed(2)} | Rating: ⭐ ${p.rating}`);
    });

    // 3b. Test Tank Top category matching
    const tankTopCategory = await prisma.category.findFirst({
      where: { name: { contains: 'Tank Tops', mode: 'insensitive' } },
    });
    if (tankTopCategory) {
      const tankTopProducts = await prisma.product.findMany({
        where: { categoryId: tankTopCategory.id },
        take: 3,
      });
      console.log(`✅ Tank Top Category Query returned ${tankTopProducts.length} matching clothing items:`);
      tankTopProducts.forEach((p) => {
        console.log(`   - "${p.title}" | $${p.price.toFixed(2)}`);
      });
    }

    // 4. Test Creating Genie Recommendation Message
    const topPick = dealsUnder50[0];
    const genieMsg = await prisma.groupChatMessage.create({
      data: {
        sessionId: session.id,
        senderId: genieMember.id,
        type: 'PRODUCT_SUGGESTION',
        content: `✨ I searched the catalog and found ${dealsUnder50.length} great options under $50! Here is my top recommendation:`,
        productId: topPick ? topPick.id : null,
        reactions: {},
        votes: {},
      },
      include: {
        sender: true,
        product: true,
      },
    });

    console.log(`\n✅ Genie Bot Message published to session ${sessionCode}:`);
    console.log(`   Sender: ${genieMsg.sender.guestName}`);
    console.log(`   Content: "${genieMsg.content}"`);
    console.log(`   Linked Product: ${genieMsg.product?.title} ($${genieMsg.product?.price})`);

    // 5. Verify Message Fetching
    const messages = await prisma.groupChatMessage.findMany({
      where: { sessionId: session.id },
      include: { sender: true, product: true },
    });

    if (messages.length === 0 || messages[0].sender.guestEmail !== 'genie@shopora.ai') {
      throw new Error('Failed to retrieve Genie message from session');
    }
    console.log(`\n✅ Successfully verified ${messages.length} session message from Genie!`);

    // Cleanup test data
    await prisma.groupShoppingSession.delete({ where: { id: session.id } });
    console.log(`\n🎉 SHOPORA GENIE AI CO-SHOPPER TEST SUITE PASSED SUCCESSFULLY!\n`);
  } catch (err) {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runGenieCoShopTest();
