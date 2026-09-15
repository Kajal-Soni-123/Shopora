exports.id=637,exports.ids=[637],exports.modules={3764:e=>{function o(e){var o=Error("Cannot find module '"+e+"'");throw o.code="MODULE_NOT_FOUND",o}o.keys=()=>[],o.resolve=o,o.id=3764,e.exports=o},540:(e,o,t)=>{"use strict";t.d(o,{R:()=>n});var r=t(7070);class n{static success(e,o,t=200,n){let s={success:!0,...o&&{message:o},data:e,...n&&{meta:n}};return r.NextResponse.json(s,{status:t})}static created(e,o="Resource created successfully"){return n.success(e,o,201)}static error(e,o=500,t){let n={success:!1,error:e,statusCode:o,...t&&{details:t}};return r.NextResponse.json(n,{status:o})}static badRequest(e="Bad Request",o){return n.error(e,400,o)}static notFound(e="Resource not found"){return n.error(e,404)}static unauthorized(e="Unauthorized"){return n.error(e,401)}static forbidden(e="Forbidden"){return n.error(e,403)}static serverError(e="Internal Server Error",o){return n.error(e,500,o)}}},5456:(e,o,t)=>{"use strict";t.d(o,{I2:()=>y,MY:()=>S,Oe:()=>p,c_:()=>c,fT:()=>u,nX:()=>f,xn:()=>m});var r=t(8691),n=t(8670),s=t(1661),a=t(1615);let i=process.env.JWT_SECRET||"super-secret-jwt-key-ecommerce-2026-auth-token-key",d=new TextEncoder().encode(i),l="auth_token";async function c(e){return await r.ZP.hash(e,10)}async function p(e,o){return await r.ZP.compare(e,o)}async function u(e){return await new n.N({...e}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(d)}async function g(e){try{let{payload:o}=await (0,s._)(e,d);return{userId:o.userId,email:o.email,name:o.name,role:o.role,vendorId:o.vendorId||null}}catch(e){return null}}async function m(){let e=(0,a.cookies)(),o=e.get(l)?.value;return o?await g(o):null}async function f(e){return await m()}function S(e,o){e.cookies.set({name:l,value:o,httpOnly:!0,secure:!0,sameSite:"lax",path:"/",maxAge:604800})}function y(e){e.cookies.set({name:l,value:"",httpOnly:!0,secure:!0,sameSite:"lax",path:"/",maxAge:0})}},9741:(e,o,t)=>{"use strict";t.d(o,{Gn:()=>i,Od:()=>a});var r=t(8892);let n=[];function s(){let e=process.env.SMTP_HOST?.trim(),o=parseInt(process.env.SMTP_PORT?.trim()||"587",10),t=process.env.SMTP_USER?.trim(),n=process.env.SMTP_PASS?.trim(),s="true"===process.env.SMTP_SECURE?.trim()||465===o;return(console.log("\uD83D\uDD0D [SMTP DIAGNOSTIC] Config Check:",{host:e||"MISSING",port:o,user:t?`${t.slice(0,4)}...`:"MISSING",passSet:!!n,secure:s}),e&&t&&n)?r.ZP.createTransport({host:e,port:o,secure:s,auth:{user:t,pass:n},tls:{rejectUnauthorized:!1}}):(console.warn("⚠️ [SMTP WARNING] Missing required SMTP credentials (SMTP_HOST, SMTP_USER, or SMTP_PASS) in process.env"),null)}async function a(e){let o;let t=(process.env.ADMIN_EMAIL||"admin123@yopmail.com").trim(),r=(process.env.SMTP_FROM||process.env.SMTP_USER||"kajal.soni@esparkbizmail.com").trim(),a=`[Shopora Admin Alert] New Category Request: "${e.categoryName}" from ${e.vendorName}`;console.log("SMTP_HOST---------------->",process.env.SMTP_HOST),console.log("SMTP_PORT---------------->",process.env.SMTP_PORT),console.log("SMTP_PASS---------------->",process.env.SMTP_PASS),console.log("SMTP_SECURE---------------->",process.env.SMTP_SECURE),console.log("SMTP_FROM---------------->",process.env.SMTP_FROM);let i=e.fields&&e.fields.length>0?e.fields.map(e=>`  * ${e.label} (${e.type}${e.required?", Required":""})${e.options&&e.options.length?`: [${e.options.join(", ")}]`:""}`).join("\n"):"None suggested.",d=e.fields&&e.fields.length>0?`<ul style="margin: 4px 0 0 0; padding-left: 16px; font-size: 12px; color: #475569;">
        ${e.fields.map(e=>`<li><strong>${e.label}</strong> (<em>${e.type}</em>${e.required?", Required":""})${e.options&&e.options.length?`: Options [${e.options.join(", ")}]`:""}</li>`).join("")}
       </ul>`:"<em>None suggested</em>",l=`
===================================================================
📩 SHOPORA MARKETPLACE EMAIL NOTIFICATION (TO ADMIN)
===================================================================
To: ${t}
From: ${r}
Subject: ${a}
Date: ${new Date().toLocaleString()}

Hello Super Admin Team,

Merchant Partner "${e.vendorName}" (${e.vendorEmail}) has requested a new product category on Shopora.

REQUEST DETAILS:
- Category Name Requested: ${e.categoryName}
- Proposed Parent Category: ${e.suggestedParentName||"None (Top-Level Category)"}
- Justification / Business Reason: ${e.reason||"No specific description provided."}
- Suggested Category Form Fields:
${i}
- Request ID: ${e.requestId}
- Status: PENDING

ACTION REQUIRED:
Please log in to your Super Admin Dashboard > Category Requests tab to review and Approve or Reject this category request.

Best regards,
Shopora Merchant Operations Engine
===================================================================
  `.trim(),c=`
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
            Merchant Partner <strong>"${e.vendorName}"</strong> (<code>${e.vendorEmail}</code>) has requested a new product category.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #1e293b;">Request Summary:</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #334155;">
              <li><strong>Category Name:</strong> ${e.categoryName}</li>
              <li><strong>Proposed Parent:</strong> ${e.suggestedParentName||"None (Top-Level Category)"}</li>
              <li><strong>Justification:</strong> ${e.reason||"No description provided."}</li>
              <li><strong>Suggested Fields:</strong> ${d}</li>
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
  `,p=!1,u=s();if(u)try{let e=await u.sendMail({from:`"Shopora System Notifications" <${r}>`,replyTo:r,to:t,subject:a,text:l,html:c});p=!0,console.log(`✅ [SMTP SUCCESS] Category Request email accepted by SMTP server for ${t}:`,{messageId:e.messageId,accepted:e.accepted,rejected:e.rejected,response:e.response}),e.rejected&&e.rejected.length>0&&console.warn(`⚠️ [SMTP WARNING] Mail rejected for recipient(s):`,e.rejected)}catch(e){o=e.message||String(e),console.error(`❌ [SMTP ERROR] Failed to send email via SMTP to ${t}:`,e)}else console.log(`ℹ️ [SMTP NOTICE] Transporter could not be created. Logged email locally.`);let g={id:`email_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,to:t,from:r,subject:a,body:l,sentAt:new Date().toISOString(),smtpDelivered:p,errorDetails:o};return n.push(g),console.log("\n--- \uD83D\uDCE7 EMAIL NOTIFICATION DISPATCHED TO ADMIN ---"),console.log(l),console.log("------------------------------------------------\n"),g}async function i(e){let o;let t="APPROVED"===e.status,r=t?"APPROVED ✅":"REJECTED ❌",a=(process.env.SMTP_FROM||process.env.SMTP_USER||"kajal.soni@esparkbizmail.com").trim(),i=`[Shopora Category Request Update] Your request for "${e.categoryName}" has been ${e.status}`,d=`
===================================================================
📩 SHOPORA MARKETPLACE EMAIL NOTIFICATION (TO VENDOR)
===================================================================
To: ${e.vendorEmail}
From: ${a}
Subject: ${i}
Date: ${new Date().toLocaleString()}

Hello ${e.vendorName},

Your request to add the category "${e.categoryName}" to the Shopora Marketplace has been reviewed by the Super Admin team.

DECISION STATUS: ${r}

SUMMARY OF DETAILS:
- Category Name: ${e.categoryName}
- Suggested Parent: ${e.suggestedParentName||"None (Top-Level Category)"}
${e.adminNotes?`- Admin Feedback / Notes: "${e.adminNotes}"`:""}

${t?`🎉 GREAT NEWS!
The category "${e.categoryName}" has been approved and created in the database. You can now publish products under this category immediately from your Vendor Dashboard!`:`NEXT STEPS:
If you have questions regarding this decision or would like to revise your request details, please feel free to submit an updated category request from your Vendor Dashboard.`}

Best regards,
Super Admin Team
Shopora Marketplace Operations
===================================================================
  `.trim(),l=`
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: ${t?"#059669":"#e11d48"}; padding: 20px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Category Request ${t?"Approved":"Rejected"}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Shopora Merchant Partner Operations</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
            Hello <strong>${e.vendorName}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6;">
            Your category request for <strong>"${e.categoryName}"</strong> has been reviewed by the Super Admin team.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #1e293b;">Decision Details:</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #334155;">
              <li><strong>Category Name:</strong> ${e.categoryName}</li>
              <li><strong>Status:</strong> <span style="background: ${t?"#d1fae5":"#ffe4e6"}; color: ${t?"#065f46":"#9f1239"}; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">${e.status}</span></li>
              ${e.adminNotes?`<li><strong>Admin Notes:</strong> ${e.adminNotes}</li>`:""}
            </ul>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            ${t?"\uD83C\uDF89 <strong>Great news!</strong> The category is now active. You can publish products under this category immediately from your Vendor Dashboard.":"You can review admin feedback above and submit a new request if needed from your Vendor Dashboard."}
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          Shopora Marketplace Engine &copy; ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `,c=!1,p=s();if(p)try{let o=await p.sendMail({from:`"Shopora Admin Team" <${a}>`,replyTo:a,to:e.vendorEmail,subject:i,text:d,html:l});c=!0,console.log(`✅ [SMTP SUCCESS] Category Request status email accepted by SMTP server for ${e.vendorEmail}:`,{messageId:o.messageId,accepted:o.accepted,rejected:o.rejected,response:o.response}),o.rejected&&o.rejected.length>0&&console.warn(`⚠️ [SMTP WARNING] Mail rejected for recipient(s):`,o.rejected)}catch(t){o=t.message||String(t),console.error(`❌ [SMTP ERROR] Failed to send status email to ${e.vendorEmail}:`,t)}let u={id:`email_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,to:e.vendorEmail,from:a,subject:i,body:d,sentAt:new Date().toISOString(),smtpDelivered:c,errorDetails:o};return n.push(u),console.log("\n--- \uD83D\uDCE7 EMAIL NOTIFICATION DISPATCHED TO VENDOR ---"),console.log(d),console.log("--------------------------------------------------\n"),u}},3538:(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{"use strict";__webpack_require__.d(__webpack_exports__,{_:()=>prisma});var _prisma_client__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(3524),_prisma_client__WEBPACK_IMPORTED_MODULE_0___default=__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__),path__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(5315),path__WEBPACK_IMPORTED_MODULE_1___default=__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);let globalForPrisma=global;function getFreshPrismaClient(){try{let nativeRequire="undefined"!=typeof eval?eval("require"):__webpack_require__(3764),clientPath=path__WEBPACK_IMPORTED_MODULE_1___default().join(process.cwd(),"node_modules",".prisma","client");if(nativeRequire.cache&&nativeRequire.resolve)try{let resolved=nativeRequire.resolve(clientPath);delete nativeRequire.cache[resolved]}catch{}let{PrismaClient:DynamicPrismaClient}=nativeRequire(clientPath);return new DynamicPrismaClient({log:["error"]})}catch(e){return console.warn("Fallback to standard PrismaClient instantiation:",e),new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({log:["error"]})}}function getPrisma(){let e=globalForPrisma.prisma;return e&&void 0!==e.categoryRequest||(globalForPrisma.prisma=getFreshPrismaClient(),e=globalForPrisma.prisma),e}let prisma=new Proxy({},{get(e,o){let t=getPrisma(),r=t[o];return("categoryRequest"===o&&void 0===r&&(r=t.category_requests||t.CategoryRequest),"function"==typeof r)?r.bind(t):r}})}};