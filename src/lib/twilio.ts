import twilio from 'twilio';

/**
 * Twilio Service Engine for Shopora E-Commerce
 * Provides SMS & WhatsApp notification dispatch for customer order confirmations
 * and tracking updates.
 */

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const twilioWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

export function isTwilioConfigured(): boolean {
  return Boolean(
    accountSid &&
      authToken &&
      twilioPhone &&
      !accountSid.includes('sample') &&
      !authToken.includes('sample')
  );
}

function getTwilioClient() {
  if (!accountSid || !authToken) return null;
  try {
    return twilio(accountSid, authToken);
  } catch (err) {
    console.warn('[Twilio Service] Failed to initialize Twilio client:', err);
    return null;
  }
}

export interface OrderNotificationPayload {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  subOrderCount: number;
}

export interface ShippingNotificationPayload {
  orderNumber: string;
  subOrderNumber: string;
  vendorName: string;
  trackingNumber: string;
  shippingCarrier: string;
}

/**
 * Send SMS or WhatsApp Order Confirmation Notification
 */
export async function sendOrderConfirmationSMS(
  customerPhone: string,
  order: OrderNotificationPayload,
  channel: 'SMS' | 'WHATSAPP' = 'SMS'
): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const formattedPhone = customerPhone.startsWith('+') ? customerPhone : `+1${customerPhone.replace(/\D/g, '')}`;

  const messageText = `🛒 Shopora Order Confirmed! Hi ${order.customerName}, your order #${order.orderNumber} ($${order.totalAmount.toFixed(
    2
  )}) containing ${order.itemCount} item(s) in ${order.subOrderCount} package(s) is being processed. Track updates: https://shopora.com/orders/${order.orderNumber}`;

  if (isTwilioConfigured()) {
    const client = getTwilioClient();
    if (client) {
      try {
        const fromNumber = channel === 'WHATSAPP' ? twilioWhatsapp : twilioPhone;
        const toNumber = channel === 'WHATSAPP' ? `whatsapp:${formattedPhone}` : formattedPhone;
        const contentSid = process.env.TWILIO_CONTENT_SID || process.env.CONTENT_SID;

        const messagePayload: any = {
          from: fromNumber,
          to: toNumber,
        };

        if (channel === 'WHATSAPP' && contentSid) {
          messagePayload.contentSid = contentSid;
          messagePayload.contentVariables = JSON.stringify({
            '1': order.customerName,
            '2': order.orderNumber,
            '3': order.totalAmount.toFixed(2),
          });
        } else {
          messagePayload.body = messageText;
        }

        const res = await client.messages.create(messagePayload);

        console.log(`[Twilio ${channel}] Dispatched message ${res.sid} to ${toNumber}`);
        return { success: true, messageId: res.sid, simulated: false };
      } catch (error: any) {
        console.error(`[Twilio ${channel} Error]`, error?.message || error);
        return { success: false, error: error?.message || 'Twilio send failed' };
      }
    }
  }

  // Simulation Fallback mode when API keys are placeholders
  console.log(`\n================ [TWILIO ${channel} SIMULATION ENGINE] ================`);
  console.log(`Recipient: ${formattedPhone}`);
  console.log(`Payload Body:\n${messageText}`);
  console.log(`========================================================================\n`);

  return {
    success: true,
    messageId: `sim_msg_${Math.random().toString(36).substring(2, 10)}`,
    simulated: true,
  };
}

/**
 * Send SMS or WhatsApp Shipping & Tracking Update Notification
 */
export async function sendShippingUpdateSMS(
  customerPhone: string,
  shipping: ShippingNotificationPayload,
  channel: 'SMS' | 'WHATSAPP' = 'SMS'
): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const formattedPhone = customerPhone.startsWith('+') ? customerPhone : `+1${customerPhone.replace(/\D/g, '')}`;

  const messageText = `📦 Shopora Shipping Update: Package from ${shipping.vendorName} (Sub-Order #${shipping.subOrderNumber}) has shipped via ${shipping.shippingCarrier}! Tracking #: ${shipping.trackingNumber}. Track live: https://shopora.com/orders/${shipping.orderNumber}`;

  if (isTwilioConfigured()) {
    const client = getTwilioClient();
    if (client) {
      try {
        const fromNumber = channel === 'WHATSAPP' ? twilioWhatsapp : twilioPhone;
        const toNumber = channel === 'WHATSAPP' ? `whatsapp:${formattedPhone}` : formattedPhone;
        const contentSid = process.env.TWILIO_CONTENT_SID || process.env.CONTENT_SID;

        const messagePayload: any = {
          from: fromNumber,
          to: toNumber,
        };

        if (channel === 'WHATSAPP' && contentSid) {
          messagePayload.contentSid = contentSid;
          messagePayload.contentVariables = JSON.stringify({
            '1': shipping.vendorName,
            '2': shipping.subOrderNumber,
            '3': shipping.trackingNumber,
          });
        } else {
          messagePayload.body = messageText;
        }

        const res = await client.messages.create(messagePayload);

        console.log(`[Twilio Shipping ${channel}] Dispatched update ${res.sid} to ${toNumber}`);
        return { success: true, messageId: res.sid, simulated: false };
      } catch (error: any) {
        console.error(`[Twilio Shipping Error]`, error?.message || error);
        return { success: false, error: error?.message || 'Twilio send failed' };
      }
    }
  }

  // Simulation Fallback mode
  console.log(`\n============ [TWILIO SHIPPING ${channel} SIMULATION ENGINE] ============`);
  console.log(`Recipient: ${formattedPhone}`);
  console.log(`Payload Body:\n${messageText}`);
  console.log(`========================================================================\n`);

  return {
    success: true,
    messageId: `sim_ship_${Math.random().toString(36).substring(2, 10)}`,
    simulated: true,
  };
}
