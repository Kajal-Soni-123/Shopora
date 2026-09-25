import assert from 'assert';
import { MockDeliveryProvider } from '../src/lib/shipping/MockDeliveryProvider';
import {
  isValidFulfillmentTransition,
  isValidShipmentTransition,
  deriveAggregateOrderStatus,
} from '../src/lib/shipping/fulfillmentLifecycle';
import { mapProviderStatusToInternal } from '../src/lib/shipping/statusMapper';

async function runShippingTests() {
  console.log('🧪 Starting Shipping & Delivery System Unit Tests...\n');

  // Test 1: MockDeliveryProvider Serviceability Check
  console.log('Test 1: MockDeliveryProvider - Serviceability Check');
  const provider = new MockDeliveryProvider();
  const serviceability = await provider.checkServiceability({
    deliveryPincode: '400001',
    pickupPincode: '110001',
    weight: 0.5,
    cod: true,
  });
  assert.strictEqual(serviceability.serviceable, true, 'Pincode 400001 should be serviceable');
  assert.strictEqual(serviceability.codAvailable, true, 'COD should be available for 400001');
  assert(serviceability.shippingCharge > 0, 'Shipping charge should be positive');
  console.log('  ✅ Passed');

  // Test 2: MockDeliveryProvider Shipment Creation & Label Generation
  console.log('Test 2: MockDeliveryProvider - Shipment Creation & Label Generation');
  const shipmentResult = await provider.createShipment({
    fulfillmentId: 'subord_test123',
    orderNumber: 'ORD-9999',
    subOrderNumber: 'SUB-9999-1',
    vendorId: 'vend_test1',
    pickupAddress: { name: 'Vendor 1', email: 'v1@test.com', address: 'Warehouse A', pincode: '110001' },
    deliveryAddress: { name: 'Customer A', email: 'c1@test.com', address: 'Street B', pincode: '400001' },
    items: [{ name: 'Test Product', quantity: 1, price: 500 }],
    dimensions: { weight: 0.5, length: 10, breadth: 10, height: 10 },
    totalAmount: 500,
  });
  assert.strictEqual(shipmentResult.provider, 'mock');
  assert(shipmentResult.awbNumber.startsWith('AWB-'), 'AWB number should start with AWB-');
  assert.strictEqual(shipmentResult.status, 'CREATED');

  const labelResult = await provider.generateLabel('ship_123', shipmentResult.awbNumber);
  assert.strictEqual(labelResult.shipmentId, 'ship_123');
  assert(labelResult.labelUrl.includes('label'), 'Label URL should contain label');
  console.log('  ✅ Passed');

  // Test 3: Fulfillment Lifecycle & State Machine Validation
  console.log('Test 3: Fulfillment Lifecycle State Machine Validation');
  assert.strictEqual(isValidFulfillmentTransition('PENDING', 'CONFIRMED'), true);
  assert.strictEqual(isValidFulfillmentTransition('CONFIRMED', 'PROCESSING'), true);
  assert.strictEqual(isValidFulfillmentTransition('PROCESSING', 'PACKED'), true);
  assert.strictEqual(isValidFulfillmentTransition('PACKED', 'READY_FOR_PICKUP'), true);
  assert.strictEqual(isValidFulfillmentTransition('READY_FOR_PICKUP', 'SHIPPED'), true);
  // Invalid transition check: PENDING directly to DELIVERED or SHIPPED
  assert.strictEqual(isValidFulfillmentTransition('PENDING', 'DELIVERED'), false);
  console.log('  ✅ Passed');

  // Test 4: Shipment State Machine Validation
  console.log('Test 4: Shipment State Machine Validation');
  assert.strictEqual(isValidShipmentTransition('CREATED', 'LABEL_GENERATED'), true);
  assert.strictEqual(isValidShipmentTransition('LABEL_GENERATED', 'PICKUP_SCHEDULED'), true);
  assert.strictEqual(isValidShipmentTransition('PICKUP_SCHEDULED', 'PICKED_UP'), true);
  assert.strictEqual(isValidShipmentTransition('PICKED_UP', 'IN_TRANSIT'), true);
  assert.strictEqual(isValidShipmentTransition('IN_TRANSIT', 'OUT_FOR_DELIVERY'), true);
  assert.strictEqual(isValidShipmentTransition('OUT_FOR_DELIVERY', 'DELIVERED'), true);
  console.log('  ✅ Passed');

  // Test 5: Status Mapper (Shiprocket, Delhivery, Mock)
  console.log('Test 5: Delivery Provider Status Mapper');
  assert.strictEqual(mapProviderStatusToInternal('shiprocket', 'OUT FOR DELIVERY'), 'OUT_FOR_DELIVERY');
  assert.strictEqual(mapProviderStatusToInternal('shiprocket', 'DELIVERED'), 'DELIVERED');
  assert.strictEqual(mapProviderStatusToInternal('delhivery', 'MANIFESTED'), 'LABEL_GENERATED');
  assert.strictEqual(mapProviderStatusToInternal('mock', 'IN_TRANSIT'), 'IN_TRANSIT');
  console.log('  ✅ Passed');

  // Test 6: Aggregate Order Status Derivation
  console.log('Test 6: Aggregate Order Status Derivation');
  assert.strictEqual(deriveAggregateOrderStatus(['DELIVERED', 'DELIVERED']), 'DELIVERED');
  assert.strictEqual(deriveAggregateOrderStatus(['SHIPPED', 'PROCESSING']), 'SHIPPED');
  assert.strictEqual(deriveAggregateOrderStatus(['CANCELLED', 'CANCELLED']), 'CANCELLED');
  assert.strictEqual(deriveAggregateOrderStatus(['PROCESSING', 'PACKED']), 'PROCESSING');
  console.log('  ✅ Passed');

  console.log('\n🎉 All Shipping Unit Tests Passed Successfully!\n');
}

runShippingTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
