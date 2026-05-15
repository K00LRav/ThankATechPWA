import { logger } from "./logger";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.BREVO_API_KEY) {
    logger.warn("BREVO_API_KEY not set — skipping email send");
    return;
  }
  const senderEmail = process.env.EMAIL_FROM ?? "noreply@thankatech.com";
  const senderName = process.env.EMAIL_FROM_NAME ?? "ThankATech";
  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ to, subject, status: res.status, body }, "Brevo API email failed");
    } else {
      logger.info({ to, subject }, "Email sent");
    }
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
  }
}

// ─── Shared layout ───────────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ThankATech</title>
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#FF6B35;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
            <span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ThankATech</span>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:0.5px;">Real thanks. Real tips. No ratings.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-left:1px solid #ede8e0;border-right:1px solid #ede8e0;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f0eb;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;border:1px solid #ede8e0;border-top:none;">
            <p style="margin:0;color:#9c8f7e;font-size:12px;line-height:1.6;">
              ThankATech · <a href="https://www.thankatech.com" style="color:#FF6B35;text-decoration:none;">www.thankatech.com</a><br/>
              You received this because you have an account on ThankATech.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, url: string, color = "#FF6B35"): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
    <tr><td style="background:${color};border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">${label}</a>
    </td></tr>
  </table>`;
}

function highlight(text: string): string {
  return `<div style="background:#fff8f5;border-left:4px solid #FF6B35;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;font-size:15px;color:#2d2926;font-style:italic;line-height:1.6;">${text}</div>`;
}

function stat(label: string, value: string): string {
  return `<td style="text-align:center;padding:16px 20px;">
    <p style="margin:0;font-size:24px;font-weight:800;color:#FF6B35;">${value}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9c8f7e;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
  </td>`;
}

// ─── Template: Job booked (→ customer) ───────────────────────────────────────

export function emailJobBooked(opts: {
  customerName: string;
  jobTitle: string;
  technicianName: string;
  description?: string | null;
  address?: string | null;
  scheduledDate?: string | null;
}): { subject: string; html: string } {
  const subject = `Booking confirmed — ${opts.jobTitle}`;
  const html = layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#2d2926;">Booking confirmed! ✅</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.customerName}, your request has been submitted and is waiting for the technician to accept.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;border-radius:10px;border:1px solid #ede8e0;margin-bottom:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#9c8f7e;text-transform:uppercase;letter-spacing:0.5px;">Job</p>
          <p style="margin:0;font-size:17px;font-weight:700;color:#2d2926;">${opts.jobTitle}</p>
          ${opts.description ? `<p style="margin:8px 0 0;font-size:14px;color:#6b5f53;">${opts.description}</p>` : ""}
        </td>
      </tr>
      <tr><td style="border-top:1px solid #ede8e0;padding:16px 24px;">
        <p style="margin:0 0 2px;font-size:12px;color:#9c8f7e;text-transform:uppercase;letter-spacing:0.5px;">Technician</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#2d2926;">${opts.technicianName}</p>
      </td></tr>
      ${opts.address ? `<tr><td style="border-top:1px solid #ede8e0;padding:16px 24px;">
        <p style="margin:0 0 2px;font-size:12px;color:#9c8f7e;text-transform:uppercase;letter-spacing:0.5px;">Address</p>
        <p style="margin:0;font-size:15px;color:#2d2926;">${opts.address}</p>
      </td></tr>` : ""}
      ${opts.scheduledDate ? `<tr><td style="border-top:1px solid #ede8e0;padding:16px 24px;">
        <p style="margin:0 0 2px;font-size:12px;color:#9c8f7e;text-transform:uppercase;letter-spacing:0.5px;">Scheduled</p>
        <p style="margin:0;font-size:15px;color:#2d2926;">${new Date(opts.scheduledDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </td></tr>` : ""}
    </table>

    <p style="margin:24px 0 0;color:#6b5f53;font-size:14px;line-height:1.6;">We'll let you know as soon as ${opts.technicianName} accepts. Keep an eye on your dashboard for updates.</p>
    ${btn("View my dashboard", "https://www.thankatech.com/customer/dashboard")}
  `);
  return { subject, html };
}

// ─── Template: Job accepted (→ customer) ─────────────────────────────────────

export function emailJobAccepted(opts: {
  customerName: string;
  jobTitle: string;
  technicianName: string;
  address?: string | null;
  scheduledDate?: string | null;
}): { subject: string; html: string } {
  const subject = `${opts.technicianName} accepted your booking!`;
  const html = layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#166534;">Your tech is on the way! 🎉</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.customerName}, great news — ${opts.technicianName} has accepted your request for <strong>${opts.jobTitle}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;margin-bottom:8px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Job</p>
        <p style="margin:0;font-size:17px;font-weight:700;color:#14532d;">${opts.jobTitle}</p>
      </td></tr>
      <tr><td style="border-top:1px solid #bbf7d0;padding:16px 24px;">
        <p style="margin:0 0 2px;font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Technician</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#14532d;">${opts.technicianName}</p>
      </td></tr>
      ${opts.scheduledDate ? `<tr><td style="border-top:1px solid #bbf7d0;padding:16px 24px;">
        <p style="margin:0 0 2px;font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Scheduled</p>
        <p style="margin:0;font-size:15px;color:#14532d;">${new Date(opts.scheduledDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </td></tr>` : ""}
    </table>

    <p style="margin:24px 0 0;color:#6b5f53;font-size:14px;line-height:1.6;">When the job is done, you'll be able to send ${opts.technicianName} a heartfelt thank you and optional tip right from your dashboard.</p>
    ${btn("View my dashboard", "https://www.thankatech.com/customer/dashboard", "#166534")}
  `);
  return { subject, html };
}

// ─── Template: Job declined (→ customer) ─────────────────────────────────────

export function emailJobDeclined(opts: {
  customerName: string;
  jobTitle: string;
  technicianName: string;
}): { subject: string; html: string } {
  const subject = `Booking update for ${opts.jobTitle}`;
  const html = layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#2d2926;">Booking unavailable</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.customerName}, unfortunately ${opts.technicianName} is not available for <strong>${opts.jobTitle}</strong> right now.</p>

    <div style="background:#fff8f5;border-radius:10px;border:1px solid #fde8dc;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:15px;color:#6b5f53;line-height:1.6;">No worries — there are plenty of great technicians available. Browse and book another one in seconds.</p>
    </div>

    ${btn("Find another technician", "https://www.thankatech.com/browse")}
  `);
  return { subject, html };
}

// ─── Template: Job complete — say thanks (→ customer) ────────────────────────

export function emailJobComplete(opts: {
  customerName: string;
  jobTitle: string;
  technicianName: string;
  technicianId: number;
}): { subject: string; html: string } {
  const subject = `Job done! Send ${opts.technicianName} a thank you`;
  const html = layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#2d2926;">Job complete! 🔧</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.customerName}, ${opts.technicianName} has marked <strong>${opts.jobTitle}</strong> as complete. Time to show some gratitude!</p>

    <div style="background:#fff8f5;border-radius:10px;border:1px solid #fde8dc;padding:24px;text-align:center;margin-bottom:8px;">
      <p style="margin:0 0 8px;font-size:36px;">❤️</p>
      <p style="margin:0;font-size:16px;color:#2d2926;font-weight:700;">Real thanks mean everything to a technician.</p>
      <p style="margin:8px 0 0;font-size:14px;color:#6b5f53;line-height:1.6;">Write a heartfelt message — and add an optional tip if you'd like to go the extra mile.</p>
    </div>

    ${btn("Send my thank you", `https://www.thankatech.com/thank/${opts.technicianId}`)}

    <p style="margin:24px 0 0;color:#9c8f7e;font-size:13px;line-height:1.6;">No ratings. No stars. Just genuine human appreciation.</p>
  `);
  return { subject, html };
}

// ─── Template: Thank you received (→ technician) ─────────────────────────────

export function emailThankReceived(opts: {
  technicianName: string;
  customerName: string;
  message: string;
  tipAmount: number;
  jobTitle: string;
}): { subject: string; html: string } {
  const hasTip = opts.tipAmount > 0;
  const subject = hasTip
    ? `${opts.customerName} thanked you and left a $${opts.tipAmount.toFixed(2)} tip!`
    : `${opts.customerName} sent you a thank you!`;

  const html = layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#2d2926;">You've been thanked! ❤️</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.technicianName}, <strong>${opts.customerName}</strong> sent you a heartfelt message for <em>${opts.jobTitle}</em>.</p>

    ${highlight(`"${opts.message}"`)}

    ${hasTip ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr style="background:#f0fdf4;border-radius:10px;">
        ${stat("Tip received", `$${opts.tipAmount.toFixed(2)}`)}
      </tr>
    </table>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:14px;line-height:1.6;">Your payout will be processed through Stripe. You'll receive <strong>$${(opts.tipAmount * 0.91).toFixed(2)}</strong> after the 9% platform fee.</p>
    ` : `<p style="margin:24px 0;color:#6b5f53;font-size:14px;line-height:1.6;">This message will be displayed on your public Wall of Thanks so future customers can see the great work you do.</p>`}

    ${btn("View my dashboard", "https://www.thankatech.com/technician/dashboard", "#166534")}
  `);
  return { subject, html };
}

// ─── Template: Welcome (→ new user after onboarding) ─────────────────────────

export function emailWelcome(opts: {
  fullName: string;
  userType: "customer" | "technician";
}): { subject: string; html: string } {
  const isCustomer = opts.userType === "customer";
  const subject = isCustomer
    ? `Welcome to ThankATech, ${opts.fullName}!`
    : `Welcome to ThankATech, ${opts.fullName} — you're now listed as a technician!`;

  const html = layout(isCustomer ? `
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#2d2926;">Welcome to ThankATech! 🎉</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.fullName}, you're all set. ThankATech is a gratitude-first marketplace built for the people who keep things running.</p>

    <div style="background:#fff8f5;border-radius:10px;border:1px solid #fde8dc;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#2d2926;">Here's how it works:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#6b5f53;vertical-align:top;">
            <span style="font-size:18px;margin-right:10px;">🔍</span> <strong style="color:#2d2926;">Browse</strong> — Find a skilled technician by specialty or area
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#6b5f53;vertical-align:top;">
            <span style="font-size:18px;margin-right:10px;">📋</span> <strong style="color:#2d2926;">Book</strong> — Request a job and wait for confirmation
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#6b5f53;vertical-align:top;">
            <span style="font-size:18px;margin-right:10px;">❤️</span> <strong style="color:#2d2926;">Thank</strong> — When the job's done, send a heartfelt message and optional tip
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 24px;color:#9c8f7e;font-size:13px;line-height:1.6;">No star ratings. No reviews to game. Just genuine human appreciation for a job well done.</p>
    ${btn("Browse technicians", "https://www.thankatech.com/browse")}
  ` : `
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#166534;">You're live on ThankATech! 🔧</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.fullName}, your technician profile is now active. Customers can find and book you right away.</p>

    <div style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#14532d;">What happens next:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#166534;vertical-align:top;">
            <span style="font-size:18px;margin-right:10px;">📬</span> <strong>Job requests</strong> — Customers will send you booking requests to accept or decline
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#166534;vertical-align:top;">
            <span style="font-size:18px;margin-right:10px;">✅</span> <strong>Mark complete</strong> — Once finished, mark the job done to prompt the customer to thank you
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#166534;vertical-align:top;">
            <span style="font-size:18px;margin-right:10px;">💵</span> <strong>Earn tips</strong> — Customers can leave optional tips paid directly via Stripe
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#166534;vertical-align:top;">
            <span style="font-size:18px;margin-right:10px;">❤️</span> <strong>Wall of Thanks</strong> — Every thank you message builds your public reputation
          </td>
        </tr>
      </table>
    </div>

    ${btn("Go to my dashboard", "https://www.thankatech.com/technician/dashboard", "#166534")}
  `);
  return { subject, html };
}

// ─── Template: Voucher redeemed (→ customer) ─────────────────────────────────

export function emailVoucherRedeemed(opts: {
  customerName: string;
  code: string;
  discountPercent: number;
  expiresAt: string;
}): { subject: string; html: string } {
  const subject = `Your ${opts.discountPercent}% tip discount code is ready!`;
  const html = layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#2d2926;">Your discount voucher is here! 🎉</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.customerName}, you've redeemed your ThankYou Points for a tip discount. Use the code below on your next thank you.</p>

    <div style="background:#fff8f5;border:2px dashed #FF6B35;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#9c8f7e;text-transform:uppercase;letter-spacing:1px;">Your discount code</p>
      <p style="margin:0;font-size:32px;font-weight:900;color:#FF6B35;letter-spacing:4px;font-family:'Courier New',monospace;">${opts.code}</p>
      <p style="margin:12px 0 0;font-size:14px;color:#6b5f53;">${opts.discountPercent}% off your next tip · expires ${new Date(opts.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>

    <p style="margin:0 0 16px;color:#6b5f53;font-size:14px;line-height:1.6;">Enter this code in the tip step of your next thank you flow to get ${opts.discountPercent}% off the tip amount. One-time use only.</p>
    ${btn("Send a thank you", "https://www.thankatech.com/browse")}
  `);
  return { subject, html };
}

// ─── Template: Tip payment failed (→ customer) ───────────────────────────────

export function emailTipPaymentFailed(opts: {
  customerName: string;
  technicianName: string;
  tipAmount: number;
  thankMessageId: number;
}): { subject: string; html: string } {
  const formattedAmount = opts.tipAmount.toFixed(2).replace(/\.00$/, '');
  const subject = `Your $${formattedAmount} tip to ${opts.technicianName} didn't go through`;
  const retryUrl = `https://www.thankatech.com/retry-tip/${opts.thankMessageId}`;
  const html = layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#2d2926;">Payment failed ⚠️</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.customerName}, unfortunately your <strong>$${formattedAmount} tip</strong> to <strong>${opts.technicianName}</strong> could not be processed.</p>

    <div style="background:#fff8f5;border-radius:10px;border:1px solid #fde8dc;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#2d2926;">What happened?</p>
      <p style="margin:0;font-size:14px;color:#6b5f53;line-height:1.6;">This can happen due to insufficient funds, an expired card, or a temporary issue with your bank. Retrying with the same or a different card usually resolves it.</p>
    </div>

    <p style="margin:0 0 24px;color:#6b5f53;font-size:14px;line-height:1.6;">${opts.technicianName} still received your thank you message — the tip just needs a second try.</p>

    ${btn("Retry my tip", retryUrl)}

    <p style="margin:24px 0 0;color:#9c8f7e;font-size:13px;line-height:1.6;">If you continue to have trouble, please check your card details or try a different payment method.</p>
  `);
  return { subject, html };
}

// ─── Template: Tip payment confirmed (→ technician) ──────────────────────────

export function emailTipConfirmed(opts: {
  technicianName: string;
  customerName: string;
  tipAmount: number;
  netAmount: number;
}): { subject: string; html: string } {
  const subject = `Your $${opts.tipAmount.toFixed(2)} tip from ${opts.customerName} is confirmed`;
  const html = layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#166534;">Tip payment confirmed 💵</h1>
    <p style="margin:0 0 24px;color:#6b5f53;font-size:15px;">Hi ${opts.technicianName}, the tip from <strong>${opts.customerName}</strong> has been successfully processed.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;margin-bottom:24px;">
      <tr>
        ${stat("Gross tip", `$${opts.tipAmount.toFixed(2)}`)}
        <td style="border-left:1px solid #bbf7d0;"></td>
        ${stat("Platform fee (9%)", `-$${(opts.tipAmount * 0.09).toFixed(2)}`)}
        <td style="border-left:1px solid #bbf7d0;"></td>
        ${stat("Your payout", `$${opts.netAmount.toFixed(2)}`)}
      </tr>
    </table>

    <p style="color:#6b5f53;font-size:14px;line-height:1.6;">Payouts are processed by Stripe and typically arrive within 2 business days depending on your bank.</p>
    ${btn("View Stripe dashboard", "https://www.thankatech.com/technician/dashboard", "#166534")}
  `);
  return { subject, html };
}
