import { Link } from "wouter";

export function Privacy() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: May 14, 2025</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              ThankATech ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information when you use thankatech.com.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">2. Information We Collect</h2>
            <h3 className="font-semibold text-foreground mb-2">Information you provide directly:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed mb-4">
              <li>Name and profile information when you create an account</li>
              <li>Thank-you messages you write to technicians</li>
              <li>Payment information (processed by Stripe — we never store card numbers)</li>
              <li>Location (city/state) if provided during onboarding</li>
              <li>Bio and specialty details for technician profiles</li>
            </ul>
            <h3 className="font-semibold text-foreground mb-2">Information collected automatically:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>Browser type, device type, and operating system</li>
              <li>Pages visited and time spent on the Platform</li>
              <li>IP address and general geographic location</li>
              <li>Referral source (how you found ThankATech)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>To operate and maintain the Platform</li>
              <li>To process tip payments and payouts to technicians</li>
              <li>To display your profile and thank-you messages publicly on the Platform</li>
              <li>To send transactional emails (e.g. payment confirmations)</li>
              <li>To measure and improve Platform performance</li>
              <li>To detect and prevent fraudulent or abusive activity</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">4. What We Share</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell your personal information. We share data only in these circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li><strong>Stripe</strong> — to process payments and manage technician payouts</li>
              <li><strong>Google Analytics / Ads</strong> — aggregated, anonymized usage data for advertising measurement</li>
              <li><strong>Brevo</strong> — to send transactional emails</li>
              <li><strong>Law enforcement</strong> — if required by law or to protect rights and safety</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">5. Public Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Technician profiles (name, specialty, city, bio, Wall of Thanks) are publicly visible. Thank-you messages submitted by customers are displayed on technician profiles and in the platform's recent thanks feed. Do not include sensitive personal information in messages.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies to maintain your session after login. We also use Google's advertising cookies to measure ad performance. You can disable cookies in your browser settings, though this may affect Platform functionality.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting us. Payment records are retained as required by law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Lodge a complaint with a data protection authority</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, email us at <a href="mailto:privacy@thankatech.com" className="text-primary underline">privacy@thankatech.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              ThankATech is not directed to children under 13. We do not knowingly collect personal information from anyone under 13. If you believe a child has provided us with personal data, contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">10. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use industry-standard security measures including HTTPS encryption, secure session management, and access controls. No system is perfectly secure; we encourage you to use strong passwords and report any suspected security issues to us immediately.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. We will notify users of material changes by updating the date at the top of this page. Continued use of the Platform constitutes acceptance of the updated Policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about this Privacy Policy? Contact us at <a href="mailto:privacy@thankatech.com" className="text-primary underline">privacy@thankatech.com</a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t flex gap-6 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-primary transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
