import { Link } from "wouter";

export function Terms() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-3">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: May 14, 2025</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using ThankATech ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. ThankATech is operated by its founders and may be updated from time to time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">2. What ThankATech Is</h2>
            <p className="text-muted-foreground leading-relaxed">
              ThankATech is a gratitude marketplace that connects customers with service technicians. Customers can send heartfelt thank-you messages and optional tips to technicians after a job is completed. ThankATech does not employ technicians, guarantee service quality, or act as a contractor.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">3. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old to use ThankATech. By registering, you represent that you meet this requirement and that the information you provide is accurate and current.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">4. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              Accounts are created via Replit's authentication system. You are responsible for maintaining the confidentiality of your account and for all activity that occurs under it. Notify us immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">5. Payments and Tips</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Tips are optional and processed securely through Stripe. ThankATech charges a platform fee (currently 9%) on each tip transaction to cover payment processing and platform costs. Technicians receive the remainder directly via Stripe Connect.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              All payments are final. Refunds are handled on a case-by-case basis and are at the discretion of ThankATech. Chargebacks initiated without contacting us first may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">6. ThankYou Points</h2>
            <p className="text-muted-foreground leading-relaxed">
              ThankYou Points are awarded for activity on the platform. Points have no cash value, are non-transferable, and may be modified or discontinued at any time at ThankATech's sole discretion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">7. Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are solely responsible for the messages and content you post. You agree not to post anything that is false, defamatory, harassing, obscene, or otherwise objectionable. ThankATech reserves the right to remove any content and suspend any account at its discretion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">8. Prohibited Conduct</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>Impersonating any person or entity</li>
              <li>Using the platform for fraudulent transactions</li>
              <li>Scraping or automated access without written permission</li>
              <li>Attempting to circumvent payment processing</li>
              <li>Posting spam, fake reviews, or fabricated thank-you messages</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">9. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              ThankATech is provided "as is" without warranties of any kind. We do not guarantee uninterrupted availability, accuracy of technician profiles, or the quality of any service performed. ThankATech is not liable for any disputes between customers and technicians.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, ThankATech shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including loss of tips, data, or business opportunities.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms at any time. Continued use of ThankATech after changes are posted constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at <a href="mailto:hello@thankatech.com" className="text-primary underline">hello@thankatech.com</a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-primary transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
