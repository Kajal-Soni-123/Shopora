import { DeliveryProvider } from './DeliveryProvider';
import { MockDeliveryProvider } from './MockDeliveryProvider';

/**
 * Factory to return configured DeliveryProvider instance based on env environment variables.
 * Default provider: 'mock'
 */
export function getDeliveryProvider(providerName?: string): DeliveryProvider {
  const selected = (providerName || process.env.DELIVERY_PROVIDER || 'mock').toLowerCase();

  switch (selected) {
    case 'mock':
      return new MockDeliveryProvider();

    // Future provider integrations can be plugged in here:
    // case 'shiprocket':
    //   return new ShiprocketProvider();
    // case 'delhivery':
    //   return new DelhiveryProvider();

    default:
      return new MockDeliveryProvider();
  }
}
