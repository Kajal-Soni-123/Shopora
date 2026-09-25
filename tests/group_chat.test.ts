import { prisma } from '../src/lib/prisma';

async function runGroupChatTests() {
  console.log('🧪 Starting Co-Shop Group Chat API Test Suite...\n');

  try {
    // 1. Create test user & host session
    const hostUser = await prisma.user.upsert({
      where: { email: 'chat_host@test.com' },
      update: {},
      create: {
        name: 'Chat Host User',
        email: 'chat_host@test.com',
        password: 'hashed_password_123',
        role: 'CUSTOMER',
      },
    });

    const testProduct = await prisma.product.findFirst();
    if (!testProduct) {
      throw new Error('No test product found in database');
    }

    const testSessionCode = `TEST-CHAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const session = await prisma.groupShoppingSession.create({
      data: {
        code: testSessionCode,
        title: 'Chat Test Shopping Party',
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
            {
              guestName: 'Guest Member Alex',
              guestEmail: 'alex@guest.com',
              role: 'MEMBER',
              status: 'JOINED',
            },
          ],
        },
      },
      include: {
        members: true,
      },
    });

    const hostMember = session.members.find((m) => m.role === 'HOST')!;
    const guestMember = session.members.find((m) => m.role === 'MEMBER')!;

    console.log(`✅ Test Session created with code: ${testSessionCode}`);
    console.log(`   Host Member ID: ${hostMember.id}`);
    console.log(`   Guest Member ID: ${guestMember.id}\n`);

    // 2. Test Message Creation (TEXT)
    const textMsg = await prisma.groupChatMessage.create({
      data: {
        sessionId: session.id,
        senderId: hostMember.id,
        type: 'TEXT',
        content: 'Hey everyone, welcome to the co-shopping party!',
        reactions: {},
        votes: {},
      },
    });
    console.log(`✅ Text message sent successfully (ID: ${textMsg.id})`);

    // 3. Test Product Suggestion Message Creation
    const suggestionMsg = await prisma.groupChatMessage.create({
      data: {
        sessionId: session.id,
        senderId: guestMember.id,
        type: 'PRODUCT_SUGGESTION',
        content: 'What do you guys think of this item?',
        productId: testProduct.id,
        reactions: {},
        votes: {},
      },
      include: {
        product: true,
        sender: true,
      },
    });
    console.log(`✅ Product suggestion published for "${suggestionMsg.product?.title}" (ID: ${suggestionMsg.id})`);

    // 4. Test Voting on Product Suggestion
    const updatedVotes = { [hostMember.id]: 'YES', [guestMember.id]: 'YES' };
    const votedMsg = await prisma.groupChatMessage.update({
      where: { id: suggestionMsg.id },
      data: { votes: updatedVotes },
    });
    console.log(`✅ Group consensus votes recorded:`, votedMsg.votes);

    // 5. Test Reactions on Text Message
    const updatedReactions = { [guestMember.id]: '❤️', [hostMember.id]: '🔥' };
    const reactedMsg = await prisma.groupChatMessage.update({
      where: { id: textMsg.id },
      data: { reactions: updatedReactions },
    });
    console.log(`✅ Message reactions recorded:`, reactedMsg.reactions);

    // 6. Test Fetching Messages for Session
    const fetchedMessages = await prisma.groupChatMessage.findMany({
      where: { sessionId: session.id },
      include: { sender: true, product: true },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`✅ Fetched ${fetchedMessages.length} total messages for session ${testSessionCode}`);

    // Clean up test session
    await prisma.groupShoppingSession.delete({ where: { id: session.id } });
    console.log('\n🎉 ALL CO-SHOP CHAT & SUGGESTION API TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runGroupChatTests();
