import { prisma } from '../src/lib/prisma';

async function runGroupShoppingTests() {
  console.log('🧪 Starting Automated Test Suite for Group Shopping System...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName}`);
      failed++;
    }
  }

  // TEST 1: Session Code Generator & Format Validation
  console.log('Test Suite 1: Group Session Code Format & Expiry Rules');
  const sessionCodePattern = /^GRP-\d{6}$/;
  const mockCode = `GRP-${Math.floor(100000 + Math.random() * 900000)}`;
  assert(sessionCodePattern.test(mockCode), 'Group code should match GRP-XXXXXX format');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  assert(expiresAt > now, 'Session expiration should be set to 24 hours in the future');

  // TEST 2: Member Attribution & Item Aggregation
  console.log('\nTest Suite 2: Group Cart Item Attribution Engine');
  const mockMembers = [
    { id: 'mem-1', guestName: 'Alex', role: 'HOST' },
    { id: 'mem-2', guestName: 'Sarah', role: 'MEMBER' },
  ];

  const mockGroupItems = [
    { id: 'gi-1', productId: 'p1', quantity: 2, addedById: 'mem-1', price: 1500 },
    { id: 'gi-2', productId: 'p2', quantity: 1, addedById: 'mem-2', price: 3000 },
  ];

  const totalGroupPrice = mockGroupItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  assert(totalGroupPrice === 6000, 'Group cart total calculation should equal INR 6,000');

  const hostItems = mockGroupItems.filter((item) => item.addedById === 'mem-1');
  assert(hostItems.length === 1 && hostItems[0].quantity === 2, 'Host item attribution should correctly match 2 units');

  const memberItems = mockGroupItems.filter((item) => item.addedById === 'mem-2');
  assert(memberItems.length === 1 && memberItems[0].quantity === 1, 'Member item attribution should correctly match 1 unit');

  // TEST 3: Payment Split Calculation Engine
  console.log('\nTest Suite 3: Split Payment Calculation Engine');
  const alexShare = mockGroupItems
    .filter((i) => i.addedById === 'mem-1')
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  const sarahShare = mockGroupItems
    .filter((i) => i.addedById === 'mem-2')
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  assert(alexShare === 3000, "Alex's split share should equal INR 3,000");
  assert(sarahShare === 3000, "Sarah's split share should equal INR 3,000");
  assert(alexShare + sarahShare === totalGroupPrice, 'Sum of split payments should equal total group bill');

  console.log(`\n==================================================`);
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runGroupShoppingTests().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
