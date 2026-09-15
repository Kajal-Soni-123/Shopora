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
 * Send email notification to Admin when a vendor submits a new category request.
 */
export async function sendCategoryRequestToAdmin(payload: CategoryRequestEmailPayload): Promise<SentEmailLog> {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin123@yopmail.com').trim();
  const fromEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'kajal.soni@esparkbizmail.com').trim();
  const subject = `[Shopora Admin Alert] New Category Request: "${payload.categoryName}" from ${payload.vendorName}`;
  console.log("SMTP_HOST---------------->", process.env.SMTP_HOST);
  console.log("SMTP_PORT---------------->", process.env.SMTP_PORT);
  console.log("SMTP_PASS---------------->", process.env.SMTP_PASS);
  console.log("SMTP_SECURE---------------->", process.env.SMTP_SECURE);
  console.log("SMTP_FROM---------------->", process.env.SMTP_FROM);

  const fieldsFormattedText = payload.fields && payload.fields.length > 0
    ? payload.fields.map((f) => `  * ${f.label} (${f.type}${f.required ? ', Required' : ''})${f.options && f.options.length ? `: [${f.options.join(', ')}]` : ''}`).join('\n')
    : 'None suggested.';

  const fieldsFormattedHtml = payload.fields && payload.fields.length > 0
    ? `<ul style="margin: 4px 0 0 0; padding-left: 16px; font-size: 12px; color: #475569;">
        ${payload.fields.map((f) => `<li><strong>${f.label}</strong> (<em>${f.type}</em>${f.required ? ', Required' : ''})${f.options && f.options.length ? `: Options [${f.options.join(', ')}]` : ''}</li>`).join('')}
       </ul>`
    : '<em>None suggested</em>';

  const plainTextBody = `
===================================================================
📩 SHOPORA MARKETPLACE EMAIL NOTIFICATION (TO ADMIN)
===================================================================
To: ${adminEmail}
From: ${fromEmail}
Subject: ${subject}
Date: ${new Date().toLocaleString()}

Hello Super Admin Team,

Merchant Partner "${payload.vendorName}" (${payload.vendorEmail}) has requested a new product category on Shopora.

REQUEST DETAILS:
- Category Name Requested: ${payload.categoryName}
- Proposed Parent Category: ${payload.suggestedParentName || 'None (Top-Level Category)'}
- Justification / Business Reason: ${payload.reason || 'No specific description provided.'}
- Suggested Category Form Fields:
${fieldsFormattedText}
- Request ID: ${payload.requestId}
- Status: PENDING

ACTION REQUIRED:
Please log in to your Super Admin Dashboard > Category Requests tab to review and Approve or Reject this category request.

Best regards,
Shopora Merchant Operations Engine
===================================================================
  `.trim();

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Shopora Admin Notification</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">New Merchant Category Request</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
            Hello <strong>Super Admin Team</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6;">
            Merchant Partner <strong>"${payload.vendorName}"</strong> (<code>${payload.vendorEmail}</code>) has requested a new product category.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #1e293b;">Request Summary:</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #334155;">
              <li><strong>Category Name:</strong> ${payload.categoryName}</li>
              <li><strong>Proposed Parent:</strong> ${payload.suggestedParentName || 'None (Top-Level Category)'}</li>
              <li><strong>Justification:</strong> ${payload.reason || 'No description provided.'}</li>
              <li><strong>Suggested Fields:</strong> ${fieldsFormattedHtml}</li>
              <li><strong>Status:</strong> <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">PENDING</span></li>
            </ul>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Log in to your <strong>Super Admin Dashboard &gt; Category Requests</strong> tab to review and approve or reject this request.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          Shopora Marketplace Engine &copy; ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;

  let smtpDelivered = false;
  let errorDetails: string | undefined;

  const transporter = createSmtpTransporter();

  if (transporter) {
    try {
      const sendResult = await transporter.sendMail({
        from: `"Shopora System Notifications" <${fromEmail}>`,
        replyTo: fromEmail,
        to: adminEmail,
        subject,
        text: plainTextBody,
        html: htmlBody,
      });
      smtpDelivered = true;
      console.log(`✅ [SMTP SUCCESS] Category Request email accepted by SMTP server for ${adminEmail}:`, {
        messageId: sendResult.messageId,
        accepted: sendResult.accepted,
        rejected: sendResult.rejected,
        response: sendResult.response,
      });
      if (sendResult.rejected && sendResult.rejected.length > 0) {
        console.warn(`⚠️ [SMTP WARNING] Mail rejected for recipient(s):`, sendResult.rejected);
      }
    } catch (smtpErr: any) {
      errorDetails = smtpErr.message || String(smtpErr);
      console.error(`❌ [SMTP ERROR] Failed to send email via SMTP to ${adminEmail}:`, smtpErr);
    }
  } else {
    console.log(`ℹ️ [SMTP NOTICE] Transporter could not be created. Logged email locally.`);
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

  console.log('\n--- 📧 EMAIL NOTIFICATION DISPATCHED TO ADMIN ---');
  console.log(plainTextBody);
  console.log('------------------------------------------------\n');

  return logEntry;
}

/**
 * Send email notification to Vendor when Admin approves or rejects their category request.
 */
export async function sendCategoryRequestStatusToVendor(payload: CategoryRequestEmailPayload): Promise<SentEmailLog> {
  const isApproved = payload.status === 'APPROVED';
  const statusBadge = isApproved ? 'APPROVED ✅' : 'REJECTED ❌';
  const fromEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || 'kajal.soni@esparkbizmail.com').trim();
  const subject = `[Shopora Category Request Update] Your request for "${payload.categoryName}" has been ${payload.status}`;

  const plainTextBody = `
===================================================================
📩 SHOPORA MARKETPLACE EMAIL NOTIFICATION (TO VENDOR)
===================================================================
To: ${payload.vendorEmail}
From: ${fromEmail}
Subject: ${subject}
Date: ${new Date().toLocaleString()}

Hello ${payload.vendorName},

Your request to add the category "${payload.categoryName}" to the Shopora Marketplace has been reviewed by the Super Admin team.

DECISION STATUS: ${statusBadge}

SUMMARY OF DETAILS:
- Category Name: ${payload.categoryName}
- Suggested Parent: ${payload.suggestedParentName || 'None (Top-Level Category)'}
${payload.adminNotes ? `- Admin Feedback / Notes: "${payload.adminNotes}"` : ''}

${isApproved
      ? `🎉 GREAT NEWS!\nThe category "${payload.categoryName}" has been approved and created in the database. You can now publish products under this category immediately from your Vendor Dashboard!`
      : `NEXT STEPS:\nIf you have questions regarding this decision or would like to revise your request details, please feel free to submit an updated category request from your Vendor Dashboard.`
    }

Best regards,
Super Admin Team
Shopora Marketplace Operations
===================================================================
  `.trim();

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: ${isApproved ? '#059669' : '#e11d48'}; padding: 20px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Category Request ${isApproved ? 'Approved' : 'Rejected'}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Shopora Merchant Partner Operations</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
            Hello <strong>${payload.vendorName}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6;">
            Your category request for <strong>"${payload.categoryName}"</strong> has been reviewed by the Super Admin team.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #1e293b;">Decision Details:</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #334155;">
              <li><strong>Category Name:</strong> ${payload.categoryName}</li>
              <li><strong>Status:</strong> <span style="background: ${isApproved ? '#d1fae5' : '#ffe4e6'}; color: ${isApproved ? '#065f46' : '#9f1239'}; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">${payload.status}</span></li>
              ${payload.adminNotes ? `<li><strong>Admin Notes:</strong> ${payload.adminNotes}</li>` : ''}
            </ul>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            ${isApproved
      ? '🎉 <strong>Great news!</strong> The category is now active. You can publish products under this category immediately from your Vendor Dashboard.'
      : 'You can review admin feedback above and submit a new request if needed from your Vendor Dashboard.'}
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          Shopora Marketplace Engine &copy; ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `;

  let smtpDelivered = false;
  let errorDetails: string | undefined;

  const transporter = createSmtpTransporter();

  if (transporter) {
    try {
      const sendResult = await transporter.sendMail({
        from: `"Shopora Admin Team" <${fromEmail}>`,
        replyTo: fromEmail,
        to: payload.vendorEmail,
        subject,
        text: plainTextBody,
        html: htmlBody,
      });
      smtpDelivered = true;
      console.log(`✅ [SMTP SUCCESS] Category Request status email accepted by SMTP server for ${payload.vendorEmail}:`, {
        messageId: sendResult.messageId,
        accepted: sendResult.accepted,
        rejected: sendResult.rejected,
        response: sendResult.response,
      });
      if (sendResult.rejected && sendResult.rejected.length > 0) {
        console.warn(`⚠️ [SMTP WARNING] Mail rejected for recipient(s):`, sendResult.rejected);
      }
    } catch (smtpErr: any) {
      errorDetails = smtpErr.message || String(smtpErr);
      console.error(`❌ [SMTP ERROR] Failed to send status email to ${payload.vendorEmail}:`, smtpErr);
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

  console.log('\n--- 📧 EMAIL NOTIFICATION DISPATCHED TO VENDOR ---');
  console.log(plainTextBody);
  console.log('--------------------------------------------------\n');

  return logEntry;
}

/**
 * Helper to retrieve email logs
 */
export function getSentEmailLogs(): SentEmailLog[] {
  return emailLogsStore;
}

/**
 * Diagnostic helper to verify SMTP connection
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; error?: string }> {
  const transporter = createSmtpTransporter();
  if (!transporter) {
    return { success: false, error: 'Missing required SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS)' };
  }
  try {
    await transporter.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

