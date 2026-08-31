import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="bg-background py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground">
          <section>
            <h2 className="font-heading text-xl font-semibold">1. Acceptance</h2>
            <p className="mt-3">
              By accessing or using the JBA GreenGold Orchard website and services, you agree to these Terms &amp; Conditions. If you do not agree, please discontinue use immediately.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">2. Use of the Platform</h2>
            <p className="mt-3">
              You agree to use this platform only for lawful purposes. You must not attempt to gain unauthorised access, scrape data, submit false orders, or interfere with the security of the platform.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">3. Orders and Payments</h2>
            <p className="mt-3">
              Placing an order constitutes an offer to purchase. We reserve the right to refuse or cancel orders at our discretion. Prices are displayed in Ghana cedis (₵) and subject to change. Payment is due at the time of order confirmation unless otherwise agreed.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">4. Intellectual Property</h2>
            <p className="mt-3">
              All content on this website — including text, images, logos, and product descriptions — is the property of JBA GreenGold Orchard and may not be reproduced without written permission.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">5. Limitation of Liability</h2>
            <p className="mt-3">
              To the maximum extent permitted by law, JBA GreenGold Orchard shall not be liable for indirect, incidental, or consequential damages arising from use of this platform or products purchased through it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">6. Governing Law</h2>
            <p className="mt-3">
              These terms are governed by the laws of the Republic of Ghana. Any disputes shall be resolved in the courts of Ghana.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">7. Changes to Terms</h2>
            <p className="mt-3">
              We may update these terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">8. Contact</h2>
            <p className="mt-3">
              JBA GreenGold Orchard — Accra, Ghana.<br />
              Email: <a href="mailto:info@jbagreengold.com" className="text-primary hover:underline">info@jbagreengold.com</a>
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <Link to="/" className="text-sm text-primary hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
