import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="bg-background py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground">
          <section>
            <h2 className="font-heading text-xl font-semibold">1. Information We Collect</h2>
            <p className="mt-3">
              We collect information you provide directly when you register, place an order, submit an inquiry, or apply for a job — such as your name, email address, phone number, and shipping address. We also collect usage data (pages visited, device type, IP address) to improve our services and ensure security.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">2. How We Use Your Information</h2>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>To process and fulfil your orders and enquiries.</li>
              <li>To send transactional emails (order confirmations, password resets, email verification).</li>
              <li>To maintain the security of our platform and prevent fraud.</li>
              <li>To improve our website, products, and services.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">3. Data Sharing</h2>
            <p className="mt-3">
              We do not sell your personal data. We share information only with service providers necessary to operate our platform (Cloudflare for hosting and security, Neon for database services, Resend for email delivery). Each provider is bound by a data processing agreement.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">4. Cookies and Tracking</h2>
            <p className="mt-3">
              We use a single HttpOnly session cookie to keep you logged in. We do not use advertising trackers or third-party analytics cookies. Cloudflare may set a technical cookie for bot detection (Turnstile).
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">5. Data Retention</h2>
            <p className="mt-3">
              Account data is retained while your account is active. You may request deletion of your account and associated data by contacting us at the address below. Order records may be retained for up to seven years to comply with financial regulations.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">6. Your Rights</h2>
            <p className="mt-3">
              Depending on your jurisdiction, you may have the right to access, correct, port, or delete your personal data. To exercise these rights, contact us at <a href="mailto:info@jbagreengold.com" className="text-primary hover:underline">info@jbagreengold.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold">7. Security</h2>
            <p className="mt-3">
              We use industry-standard security measures including TLS encryption in transit, bcrypt password hashing, HttpOnly session cookies with CSRF protection, and access controls. No method of transmission over the Internet is 100% secure; we continuously work to protect your data.
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
