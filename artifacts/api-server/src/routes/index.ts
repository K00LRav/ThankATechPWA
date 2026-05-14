import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import techniciansRouter from "./technicians";
import jobsRouter from "./jobs";
import thanksRouter from "./thanks";
import pointsRouter from "./points";
import platformRouter from "./platform";
import profileRouter from "./profile";
import stripeRouter from "./stripe";
import pushTokensRouter from "./push-tokens";
import nodemailer from "nodemailer";
import { emailJobBooked, emailJobAccepted, emailJobDeclined, emailJobComplete, emailThankReceived, emailTipConfirmed } from "../lib/mailer";

const router: IRouter = Router();

router.get("/admin/smtp-check", async (_req, res) => {
  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_SERVER ?? "smtp-relay.brevo.com",
    port: parseInt(process.env.BREVO_SMTP_PORT ?? "587"),
    secure: false,
    auth: { user: process.env.BREVO_SMTP_LOGIN, pass: process.env.BREVO_SMTP_KEY },
  });
  const keyPreview = process.env.BREVO_SMTP_KEY ? process.env.BREVO_SMTP_KEY.slice(0, 16) + "..." : "NOT_SET";
  try {
    await transporter.verify();
    res.json({ ok: true, login: process.env.BREVO_SMTP_LOGIN, keyPreview });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, login: process.env.BREVO_SMTP_LOGIN, keyPreview, error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/admin/send-test-emails", async (_req, res) => {
  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_SERVER ?? "smtp-relay.brevo.com",
    port: parseInt(process.env.BREVO_SMTP_PORT ?? "587"),
    secure: false,
    auth: { user: process.env.BREVO_SMTP_LOGIN, pass: process.env.BREVO_SMTP_KEY },
  });
  const FROM = `"ThankATech" <${process.env.EMAIL_FROM ?? "noreply@thankatech.com"}>`;
  const TO = "k00lrav@gmail.com";
  const templates = [
    { label: "1/6 Job Booked",     ...emailJobBooked({ customerName: "Sarah", jobTitle: "Fix my AC unit", technicianName: "Marcus Johnson", description: "Central AC making a rattling noise.", address: "123 Oak Street, Austin, TX 78701", scheduledDate: "2026-05-15" }) },
    { label: "2/6 Job Accepted",   ...emailJobAccepted({ customerName: "Sarah", jobTitle: "Fix my AC unit", technicianName: "Marcus Johnson", scheduledDate: "2026-05-15" }) },
    { label: "3/6 Job Declined",   ...emailJobDeclined({ customerName: "Sarah", jobTitle: "Fix my AC unit", technicianName: "Marcus Johnson" }) },
    { label: "4/6 Job Complete",   ...emailJobComplete({ customerName: "Sarah", jobTitle: "Fix my AC unit", technicianName: "Marcus Johnson", technicianId: 2 }) },
    { label: "5/6 Thank Received", ...emailThankReceived({ technicianName: "Marcus", customerName: "Sarah", message: "Marcus was incredible — showed up right on time and had the whole system running like new. Thank you so much!", tipAmount: 25, jobTitle: "Fix my AC unit" }) },
    { label: "6/6 Tip Confirmed",  ...emailTipConfirmed({ technicianName: "Marcus", customerName: "Sarah", tipAmount: 25, netAmount: 22.75 }) },
  ];
  const results: string[] = [];
  for (const tpl of templates) {
    try {
      await transporter.sendMail({ from: FROM, to: TO, subject: `[${tpl.label}] ${tpl.subject}`, html: tpl.html });
      results.push(`✅ ${tpl.label}`);
    } catch (err: unknown) {
      results.push(`❌ ${tpl.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  res.json({ results });
});

router.use(healthRouter);
router.use(authRouter);
router.use(techniciansRouter);
router.use(jobsRouter);
router.use(thanksRouter);
router.use(pointsRouter);
router.use(platformRouter);
router.use(profileRouter);
router.use(stripeRouter);
router.use(pushTokensRouter);

export default router;
