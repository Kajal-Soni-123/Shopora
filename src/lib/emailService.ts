import { CloudCog } from 'lucide-react';
import nodemailer from 'nodemailer';

export interface CategoryRequestEmailPayload {
  requestId: string;
  categoryName: string;
  vendorName: string;
  vendorEmail: string;
  suggestedParentName?: string | null;
  reason?: string | null;
  fields?: Array<{ name: string; label: string; type: string; options?: string[]; required?: boolean }> | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string | null;
}

export interface SentEmailLog {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  sentAt: string;
  smtpDelivered?: boolean;
  errorDetails?: string;
}

// In-memory store for inspectable email logs during runtime
const emailLogsStore: SentEmailLog[] = [];

/**
 * Create Nodemailer Transporter using environment variables or fallback SMTP config
 */
function createSmtpTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const portStr = process.env.SMTP_PORT?.trim() || '587';
  const port = parseInt(portStr, 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const secureStr = process.env.SMTP_SECURE?.trim();
  const secure = secureStr === 'true' || port === 465;

  console.log('🔍 [SMTP DIAGNOSTIC] Config Check:', {
    host: host || 'MISSING',
    port,
    user: user ? `${user.slice(0, 4)}...` : 'MISSING',
    passSet: Boolean(pass),
    secure,
  });

  if (!host || !user || !pass) {
    console.warn('⚠️ [SMTP WARNING] Missing required SMTP credentials (SMTP_HOST, SMTP_USER, or SMTP_PASS) in process.env');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false, // Avoid self-signed certificate issues in dev/testing
    },
  });
}

/**
 * Shopora Brand HTML Email Layout Generator
 * Generates email designs matching Shopora's Indigo/Slate visual aesthetic.
 * Guaranteed 100% text contrast and readability across all webmail clients (Yopmail, Gmail, Outlook, Apple Mail).
 */
function renderShoporaEmailLayout({
  title,
  subtitle,
  headerBgColor = '#eef2ff',
  headerBorderColor = '#c7d2fe',
  badgeBgColor = '#4f46e5',
  badgeTextColor = '#ffffff',
  badgeText = 'SHOPORA MARKETPLACE',
  contentHtml,
  ctaText,
  ctaUrl,
}: {
  title: string;
  subtitle?: string;
  headerBgColor?: string;
  headerBorderColor?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  badgeText?: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color:#ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
              <!-- Header Bar (Light Surface with Dark Navy Title for 100% Visibility) -->
              <tr>
                <td bgcolor="${headerBgColor}" style="background-color: ${headerBgColor}; padding: 28px 24px; text-align: center; border-bottom: 2px solid ${headerBorderColor};">
                  <div style="display: inline-block; background-color: ${badgeBgColor}; padding: 5px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: ${badgeTextColor} !important; margin-bottom: 12px;">
                    <span style="color: ${badgeTextColor} !important; font-weight: 800;">🛍️ ${badgeText}</span>
                  </div>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #0f172a !important;">
                    <span style="color: #0f172a !important; font-weight: 800;">${title}</span>
                  </h1>
                  ${subtitle ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #475569 !important; font-weight: 600;"><span style="color: #475569 !important;">${subtitle}</span></p>` : ''}
                </td>
              </tr>

              <!-- Card Body Content -->
              <tr>
                <td style="padding: 32px 28px; color: #0f172a; font-size: 14px; line-height: 1.6;">
                  ${contentHtml}

                  ${ctaText && ctaUrl ? `
                    <!-- Table-based CTA Button for Universal Email Client Rendering -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 32px auto 8px auto;">
                      <tr>
                        <td align="center" bgcolor="#4f46e5" style="background-color: #4f46e5; border-radius: 12px; padding: 14px 32px; border: 2px solid #4338ca; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                          <a href="${ctaUrl}" target="_blank" style="color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; display: inline-block;">
                            <span style="color: #ffffff !important; font-weight: 800; font-size: 15px; text-decoration: none; letter-spacing: 0.3px;">${ctaText} &rarr;</span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  ` : ''}
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
                  <p style="margin: 0 0 6px 0; font-weight: 700; color: #475569;">Shopora Marketplace Platform</p>
                  <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Shopora Inc. All rights reserved. &bull; Secure Automated Notification</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send email notification to Admin when a vendor submits a new category request.
 */
export async function sendCategoryRequestToAdmin(payload: CategoryRequestEmailPayload): Promise<SentEmailLog> {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin123@yopmail.com').trim();
  const fromEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'kajal.soni@esparkbizmail.com').trim();
  const subject = `[Shopora Admin Alert] New Category Request: "${payload.categoryName}" from ${payload.vendorName}`;

  const fieldsFormattedText = payload.fields && payload.fields.length > 0
    ? payload.fields.map((f) => `  * ${f.label} (${f.type}${f.required ? ', Required' : ''})${f.options && f.options.length ? `: [${f.options.join(', ')}]` : ''}`).join('\n')
    : 'None suggested.';

  const fieldsFormattedHtml = payload.fields && payload.fields.length > 0
    ? `<ul style="margin: 6px 0 0 0; padding-left: 18px; font-size: 13px; color: #475569;">
        ${payload.fields.map((f) => `<li style="margin-bottom: 4px;"><strong>${f.label}</strong> (<em style="color: #6366f1;">${f.type}</em>${f.required ? ', <span style="color: #e11d48;">Required</span>' : ''})${f.options && f.options.length ? `: Options [${f.options.join(', ')}]` : ''}</li>`).join('')}
       </ul>`
    : '<em style="color: #94a3b8;">None suggested</em>';

  const plainTextBody = `
===================================================================
📩 SHOPORA MARKETPLACE EMAIL NOTIFICATION (TO ADMIN)
===================================================================
To: ${adminEmail}
From: ${fromEmail}
Subject: ${subject}

Hello Super Admin Team,

Merchant Partner "${payload.vendorName}" (${payload.vendorEmail}) has requested a new product category on Shopora.

REQUEST DETAILS:
- Category Name: ${payload.categoryName}
- Proposed Parent: ${payload.suggestedParentName || 'None (Top-Level Category)'}
- Justification: ${payload.reason || 'No description provided.'}
- Suggested Form Fields:
${fieldsFormattedText}
- Request ID: ${payload.requestId}
- Status: PENDING

ACTION REQUIRED:
Please log in to your Super Admin Dashboard > Category Requests tab to review and approve or reject this request.
===================================================================
  `.trim();

  const htmlBody = renderShoporaEmailLayout({
    title: 'New Category Request',
    subtitle: `Submitted by Merchant Partner ${payload.vendorName}`,
    badgeText: 'ADMIN ALERT',
    contentHtml: `
      <p style="margin-top: 0;">Hello <strong>Super Admin Team</strong>,</p>
      <p>Merchant Partner <strong>"${payload.vendorName}"</strong> (<code>${payload.vendorEmail}</code>) has submitted a request for a new product category.</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #1e293b; border-b: 1px solid #e2e8f0; padding-bottom: 8px;">Request Breakdown</h4>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Category Name:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${payload.categoryName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Proposed Parent:</td>
            <td style="padding: 6px 0; color: #334155;">${payload.suggestedParentName || 'None (Top-Level Category)'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Business Reason:</td>
            <td style="padding: 6px 0; color: #334155;">${payload.reason || 'No description provided.'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Custom Fields:</td>
            <td style="padding: 6px 0; color: #334155;">${fieldsFormattedHtml}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Review Status:</td>
            <td style="padding: 6px 0;">
              <span style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">PENDING REVIEW</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="color: #475569; font-size: 13px;">Please log in to your Super Admin Dashboard to review and action this request.</p>
    `,
  });

  let smtpDelivered = false;
  let errorDetails: string | undefined;

  const transporter = createSmtpTransporter();

  if (transporter) {
    try {
      const sendResult = await transporter.sendMail({
        from: `"Shopora Admin Notifications" <${fromEmail}>`,
        replyTo: fromEmail,
        to: adminEmail,
        subject,
        text: plainTextBody,
        html: htmlBody,
      });
      smtpDelivered = true;
      console.log(`✅ [SMTP SUCCESS] Category Request email delivered to ${adminEmail}:`, sendResult.messageId);
    } catch (smtpErr: any) {
      errorDetails = smtpErr.message || String(smtpErr);
      console.error(`❌ [SMTP ERROR] Failed to send email via SMTP:`, smtpErr);
    }
  }

  const logEntry: SentEmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: adminEmail,
    from: fromEmail,
    subject,
    body: plainTextBody,
    sentAt: new Date().toISOString(),
    smtpDelivered,
    errorDetails,
  };

  emailLogsStore.push(logEntry);
  return logEntry;
}

/**
 * Send email notification to Vendor when Admin approves or rejects their category request.
 */
export async function sendCategoryRequestStatusToVendor(payload: CategoryRequestEmailPayload): Promise<SentEmailLog> {
  const isApproved = payload.status === 'APPROVED';
  const fromEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'kajal.soni@esparkbizmail.com').trim();
  const subject = `[Shopora Category Request Update] Your request for "${payload.categoryName}" has been ${payload.status}`;

  const plainTextBody = `
===================================================================
📩 SHOPORA MARKETPLACE EMAIL NOTIFICATION (TO VENDOR)
===================================================================
To: ${payload.vendorEmail}
From: ${fromEmail}
Subject: ${subject}

Hello ${payload.vendorName},

Your request to add the category "${payload.categoryName}" to Shopora Marketplace has been reviewed by the Super Admin team.

DECISION STATUS: ${payload.status}

SUMMARY:
- Category Name: ${payload.categoryName}
${payload.adminNotes ? `- Admin Notes: "${payload.adminNotes}"` : ''}

${isApproved
  ? 'Great news! The category is now active. You can publish products under this category immediately.'
  : 'If you have questions regarding this decision, you can submit an updated category request from your Vendor Dashboard.'}
===================================================================
  `.trim();

  const htmlBody = renderShoporaEmailLayout({
    title: isApproved ? 'Category Request Approved! 🎉' : 'Category Request Update',
    subtitle: `Status update for "${payload.categoryName}"`,
    badgeText: isApproved ? 'APPROVAL NOTIFICATION' : 'REQUEST UPDATE',
    headerBgColor: isApproved ? '#ecfdf5' : '#fff1f2',
    headerBorderColor: isApproved ? '#a7f3d0' : '#fecdd3',
    badgeBgColor: isApproved ? '#059669' : '#e11d48',
    contentHtml: `
      <p style="margin-top: 0;">Hello <strong>${payload.vendorName}</strong>,</p>
      <p>Your request to add the product category <strong>"${payload.categoryName}"</strong> has been reviewed by our Super Admin team.</p>

      <div style="background-color: ${isApproved ? '#ecfdf5' : '#fff1f2'}; border: 1px solid ${isApproved ? '#a7f3d0' : '#fecdd3'}; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-weight: 700; color: ${isApproved ? '#065f46' : '#9f1239'}; font-size: 15px;">Decision Status:</span>
          <span style="background: ${isApproved ? '#10b981' : '#f43f5e'}; color: #ffffff; padding: 4px 14px; border-radius: 9999px; font-weight: 800; font-size: 12px; letter-spacing: 0.5px;">
            ${payload.status}
          </span>
        </div>
        ${payload.adminNotes ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: ${isApproved ? '#047857' : '#be123c'}; font-style: italic;">"&ZeroWidthSpace;${payload.adminNotes}"</p>` : ''}
      </div>

      <p style="color: #334155; line-height: 1.6;">
        ${isApproved
          ? '🎉 <strong>Great news!</strong> The category is now active in the database. You can publish products under this category immediately from your Vendor Dashboard.'
          : 'You can review the admin notes above and submit a revised category request from your Vendor Dashboard.'}
      </p>
    `,
  });

  let smtpDelivered = false;
  let errorDetails: string | undefined;

  const transporter = createSmtpTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Shopora Admin Team" <${fromEmail}>`,
        replyTo: fromEmail,
        to: payload.vendorEmail,
        subject,
        text: plainTextBody,
        html: htmlBody,
      });
      smtpDelivered = true;
    } catch (smtpErr: any) {
      errorDetails = smtpErr.message || String(smtpErr);
    }
  }

  const logEntry: SentEmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: payload.vendorEmail,
    from: fromEmail,
    subject,
    body: plainTextBody,
    sentAt: new Date().toISOString(),
    smtpDelivered,
    errorDetails,
  };

  emailLogsStore.push(logEntry);
  return logEntry;
}

/**
 * Send email notification for order cancellation.
 */
export async function sendOrderCancelledEmail(payload: {
  orderNumber: string;
  customerEmail: string;
  reason: string;
  refundAmount?: number;
}): Promise<SentEmailLog> {
  const fromEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'kajal.soni@esparkbizmail.com').trim();
  const subject = `[Shopora Order Cancelled] Confirmation for Order #${payload.orderNumber}`;

  const plainTextBody = `
===================================================================
📩 SHOPORA MARKETPLACE ORDER CANCELLATION
===================================================================
To: ${payload.customerEmail}
From: ${fromEmail}
Subject: ${subject}

Hello Customer,

Your order #${payload.orderNumber} has been successfully cancelled.

CANCELLATION DETAILS:
- Order Number: #${payload.orderNumber}
- Reason: ${payload.reason}
${payload.refundAmount ? `- Refund Initiated: INR ${payload.refundAmount}` : ''}

Thank you for shopping with Shopora.
===================================================================
  `.trim();

  const htmlBody = renderShoporaEmailLayout({
    title: 'Order Cancellation Confirmation',
    subtitle: `Order #${payload.orderNumber}`,
    badgeText: 'ORDER UPDATE',
    headerBgColor: '#f1f5f9',
    headerBorderColor: '#cbd5e1',
    badgeBgColor: '#475569',
    contentHtml: `
      <p style="margin-top: 0;">Hello Customer,</p>
      <p>This email confirms that your order <strong>#${payload.orderNumber}</strong> has been successfully cancelled.</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #1e293b;">Cancellation Summary</h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.8;">
          <li><strong>Order Reference:</strong> #${payload.orderNumber}</li>
          <li><strong>Reason:</strong> ${payload.reason}</li>
          ${payload.refundAmount ? `<li><strong>Refund Initiated:</strong> <span style="color: #059669; font-weight: 700;">INR ${payload.refundAmount.toFixed(2)}</span></li>` : ''}
        </ul>
      </div>

      <p style="color: #64748b; font-size: 13px;">If a payment was completed, your refund will be processed back to your original payment method within 3-5 business days.</p>
    `,
  });

  const transporter = createSmtpTransporter();
  let smtpDelivered = false;
  let errorDetails: string | undefined;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Shopora Orders" <${fromEmail}>`,
        to: payload.customerEmail,
        subject,
        text: plainTextBody,
        html: htmlBody,
      });
      smtpDelivered = true;
    } catch (err: any) {
      errorDetails = err.message || String(err);
    }
  }

  const logEntry: SentEmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: payload.customerEmail,
    from: fromEmail,
    subject,
    body: plainTextBody,
    sentAt: new Date().toISOString(),
    smtpDelivered,
    errorDetails,
  };

  emailLogsStore.push(logEntry);
  return logEntry;
}

/**
 * Send email notification when a Return Request status is updated.
 */
export async function sendReturnStatusUpdateEmail(payload: {
  returnId: string;
  customerEmail: string;
  status: string;
  productName: string;
  vendorNote?: string;
}): Promise<SentEmailLog> {
  const fromEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'kajal.soni@esparkbizmail.com').trim();
  const subject = `[Shopora Return Update] Status changed to ${payload.status} for "${payload.productName}"`;

  const plainTextBody = `
===================================================================
📩 SHOPORA RETURN STATUS UPDATE
===================================================================
To: ${payload.customerEmail}
From: ${fromEmail}
Subject: ${subject}

Hello Customer,

The status of your return request for "${payload.productName}" has been updated to: ${payload.status}.
${payload.vendorNote ? `Merchant Note: ${payload.vendorNote}` : ''}
===================================================================
  `.trim();

  const htmlBody = renderShoporaEmailLayout({
    title: 'Return Request Update',
    subtitle: `Status: ${payload.status}`,
    badgeText: 'RETURN TRACKER',
    contentHtml: `
      <p style="margin-top: 0;">Hello Customer,</p>
      <p>The status of your return request for <strong>"${payload.productName}"</strong> has been updated.</p>

      <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 14px; padding: 20px; margin: 20px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 700; color: #3730a3;">Current Status:</span>
          <span style="background: #4f46e5; color: #ffffff; padding: 3px 12px; border-radius: 9999px; font-weight: 700; font-size: 11px;">${payload.status}</span>
        </div>
        ${payload.vendorNote ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #4338ca; font-style: italic;">Merchant Note: "${payload.vendorNote}"</p>` : ''}
      </div>
    `,
  });

  const transporter = createSmtpTransporter();
  let smtpDelivered = false;
  let errorDetails: string | undefined;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Shopora Customer Care" <${fromEmail}>`,
        to: payload.customerEmail,
        subject,
        text: plainTextBody,
        html: htmlBody,
      });
      smtpDelivered = true;
    } catch (err: any) {
      errorDetails = err.message || String(err);
    }
  }

  const logEntry: SentEmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: payload.customerEmail,
    from: fromEmail,
    subject,
    body: plainTextBody,
    sentAt: new Date().toISOString(),
    smtpDelivered,
    errorDetails,
  };

  emailLogsStore.push(logEntry);
  return logEntry;
}

/**
 * Helper to send Group Shopping Session Email Invitations
 */
export async function sendGroupShoppingInviteEmail(payload: {
  recipientEmail: string;
  hostName: string;
  sessionTitle: string;
  groupCode: string;
  joinUrl: string;
}): Promise<SentEmailLog> {
  const subject = `🛍️ ${payload.hostName} invited you to Group Shopping on Shopora!`;

  const plainTextBody = `
Hi there!

${payload.hostName} has invited you to join their Group Shopping Party "${payload.sessionTitle}" on Shopora!

Group Code: ${payload.groupCode}
Join Link: ${payload.joinUrl}

Shop together, share a cart, and enjoy seamless shopping!

Happy Shopping,
The Shopora Team
  `.trim();

  const htmlBody = renderShoporaEmailLayout({
    title: `You're Invited to Co-Shop! 🛍️`,
    subtitle: `${payload.hostName} wants to shop together on Shopora`,
    badgeText: 'GROUP SHOPPING PARTY',
    headerBgColor: '#eef2ff',
    headerBorderColor: '#c7d2fe',
    badgeBgColor: '#4f46e5',
    badgeTextColor: '#ffffff',
    ctaText: 'Join Group Shopping Party',
    ctaUrl: payload.joinUrl,
    contentHtml: `
      <p style="margin-top: 0;">Hi there!</p>
      <p><strong>${payload.hostName}</strong> invited you to join their collaborative shopping session <strong>"${payload.sessionTitle}"</strong> on Shopora!</p>

      <div style="background-color: #f5f3ff; border: 1px dashed #8b5cf6; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; font-weight: 700; color: #6d28d9; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 6px;">Your Exclusive Group Code</span>
        <div style="font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #5b21b6; font-family: monospace;">
          ${payload.groupCode}
        </div>
      </div>

      <p style="color: #475569; font-size: 13px; text-align: center;">Click the button below to join the party, suggest products, chat live, and build a shared shopping cart together!</p>
    `,
  });

  let smtpDelivered = false;
  let errorDetails: string | undefined;

  const transporter = createSmtpTransporter();
  if (transporter) {
    try {
      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@shopora.com';
      await transporter.sendMail({
        from: `"Shopora Group Shopping" <${fromEmail}>`,
        to: payload.recipientEmail,
        subject,
        text: plainTextBody,
        html: htmlBody,
      });
      smtpDelivered = true;
    } catch (err: any) {
      errorDetails = err.message || String(err);
      console.log('errorDetails -------------------------------->', errorDetails);
    }
  }

  const logEntry: SentEmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: payload.recipientEmail,
    from: process.env.SMTP_FROM || 'no-reply@shopora.com',
    subject,
    body: plainTextBody,
    sentAt: new Date().toISOString(),
    smtpDelivered,
    errorDetails,
  };

  emailLogsStore.push(logEntry);
  return logEntry;
}

/**
 * Helper to retrieve email logs
 */
export function getSentEmailLogs(): SentEmailLog[] {
  return emailLogsStore;
}

/**
 * Send 6-digit Password Reset Verification Code OTP via email
 */
export async function sendPasswordResetEmail(payload: {
  email: string;
  name?: string | null;
  otpCode: string;
  expiresMinutes?: number;
}): Promise<SentEmailLog> {
  const fromEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@shopora.com').trim();
  const subject = `Password Reset Verification Code`;
  const name = payload.name || 'User';
  const expiresMinutes = payload.expiresMinutes || 10;

  const plainTextBody = `
===================================================================
🔒 SHOPORA SECURITY NOTICE: PASSWORD RESET VERIFICATION CODE
===================================================================
To: ${payload.email}
From: ${fromEmail}
Subject: ${subject}

Hello ${name},

Your password reset verification code is: ${payload.otpCode}

This verification code will expire in ${expiresMinutes} minutes.

If you did not request a password reset, please ignore this email or contact customer support if you suspect unauthorized activity on your account.

Thank you,
The Shopora Security Team
===================================================================
  `.trim();

  const htmlBody = renderShoporaEmailLayout({
    title: 'Password Reset Verification',
    subtitle: `Requested for ${payload.email}`,
    badgeText: 'SECURITY CODE',
    headerBgColor: '#eef2ff',
    headerBorderColor: '#c7d2fe',
    badgeBgColor: '#4f46e5',
    badgeTextColor: '#ffffff',
    contentHtml: `
      <p style="margin-top: 0;">Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your password for your Shopora account. Use the 6-digit verification code below to proceed with resetting your password.</p>

      <div style="background-color: #f5f3ff; border: 2px dashed #6366f1; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; font-weight: 700; color: #4f46e5; letter-spacing: 1.5px; text-transform: uppercase; display: block; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
        <div style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #312e81; font-family: 'Courier New', Courier, monospace;">
          ${payload.otpCode}
        </div>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600;">
          ⏱️ Code expires in <strong>${expiresMinutes} minutes</strong>
        </p>
      </div>

      <div style="background-color: #fff8f6; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 12px; color: #9a3412; line-height: 1.5;">
          <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `,
  });

  const transporter = createSmtpTransporter();
  let smtpDelivered = false;
  let errorDetails: string | undefined;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Shopora Security" <${fromEmail}>`,
        to: payload.email,
        subject,
        text: plainTextBody,
        html: htmlBody,
      });
      smtpDelivered = true;
      console.log(`✅ [SMTP SUCCESS] Password Reset OTP email delivered to ${payload.email}`);
    } catch (err: any) {
      errorDetails = err.message || String(err);
      console.error(`❌ [SMTP ERROR] Failed to send Password Reset OTP email:`, err);
    }
  }

  const logEntry: SentEmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to: payload.email,
    from: fromEmail,
    subject,
    body: plainTextBody,
    sentAt: new Date().toISOString(),
    smtpDelivered,
    errorDetails,
  };

  emailLogsStore.push(logEntry);
  return logEntry;
}

/**
 * Diagnostic helper to verify SMTP connection using Nodemailer transporter.verify()
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; host?: string; port?: number; user?: string; error?: string; details?: any }> {
  const transporter = createSmtpTransporter();
  const host = process.env.SMTP_HOST?.trim();
  const portStr = process.env.SMTP_PORT?.trim() || '587';
  const port = parseInt(portStr, 10);
  const user = process.env.SMTP_USER?.trim();

  if (!transporter) {
    return {
      success: false,
      host,
      port,
      user,
      error: 'Missing required SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS)',
    };
  }

  try {
    console.log(`⏳ [SMTP VERIFY] Running transporter.verify() for ${host}:${port}...`);
    const verifyResult = await transporter.verify();
    console.log('✅ [SMTP VERIFY SUCCESS] Transporter connection verified! Result:', verifyResult);
    return {
      success: true,
      host,
      port,
      user,
      details: verifyResult,
    };
  } catch (err: any) {
    console.error('❌ [SMTP VERIFY ERROR] transporter.verify() failed:', err);
    return {
      success: false,
      host,
      port,
      user,
      error: err.message || String(err),
      details: err,
    };
  }
}

