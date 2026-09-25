import { checkCodAvailability } from '../src/lib/shipping/codService';
import { checkReturnEligibility, calculateItemRefundAmount } from '../src/lib/returns/returnService';

async function runTests() {
  console.log('🧪 Starting Automated Tests for COD, Cancellation, & Returns System...\n');

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

  // TEST 1: COD Pincode Serviceability Check
  console.log('Test Suite 1: Cash on Delivery Validation');
  const codValid = await checkCodAvailability({
    pincode: '400001',
    orderAmount: 1500,
    vendorIds: ['vendor-1'],
  });
  assert(codValid.allowed === true, 'Pincode 400001 under INR 50,000 should be COD eligible');

  const codHighAmount = await checkCodAvailability({
    pincode: '400001',
    orderAmount: 60000,
    vendorIds: ['vendor-1'],
  });
  assert(codHighAmount.allowed === false, 'Order over INR 50,000 should be rejected for COD');

  const codBlacklistedPin = await checkCodAvailability({
    pincode: '999999',
    orderAmount: 1500,
    vendorIds: ['vendor-1'],
  });
  assert(codBlacklistedPin.allowed === false, 'Non-serviceable pincode 999999 should be rejected for COD');

  // TEST 2: Return Eligibility Verification
  console.log('\nTest Suite 2: Product Return Eligibility');
  const deliveredDate = new Date();
  deliveredDate.setDate(deliveredDate.getDate() - 3); // 3 days ago

  const returnEligible = checkReturnEligibility(
    { id: 'item-1', quantity: 2, price: 500, status: 'DELIVERED' },
    { status: 'DELIVERED', shipments: [{ deliveredAt: deliveredDate }] }
  );
  assert(returnEligible.eligible === true, 'Delivered item within 7-day window should be return eligible');

  const oldDeliveredDate = new Date();
  oldDeliveredDate.setDate(oldDeliveredDate.getDate() - 10); // 10 days ago
  const returnExpired = checkReturnEligibility(
    { id: 'item-1', quantity: 2, price: 500, status: 'DELIVERED' },
    { status: 'DELIVERED', shipments: [{ deliveredAt: oldDeliveredDate }] }
  );
  assert(returnExpired.eligible === false, 'Delivered item older than 7 days should NOT be return eligible');

  const processingReturn = checkReturnEligibility(
    { id: 'item-1', quantity: 2, price: 500, status: 'PROCESSING' },
    { status: 'PROCESSING' }
  );
  assert(processingReturn.eligible === false, 'Item not yet delivered should NOT be return eligible');

  // TEST 3: Refund Amount Calculation
  console.log('\nTest Suite 3: Refund Calculation Engine');
  const refundAmount = calculateItemRefundAmount(2000, 2);
  assert(refundAmount === 4000, 'Refund for 2 items at INR 2000 each should equal 4000');

  console.log(`\n==================================================`);
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
