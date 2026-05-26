import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "26 May 2026";
const OPERATOR_NAME = "Maverick Telecom (Pty) Ltd";
const PRIVACY_EMAIL = "privacy@maverick.co.za";
const SUPPORT_EMAIL = "support@maverick.co.za";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-10 space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mt-2">Last updated: {LAST_UPDATED}</p>
          </header>

          <section className="prose prose-sm max-w-none text-gray-700 space-y-4">
            <p>
              {OPERATOR_NAME} ("Maverick", "we", "us") operates the Maverick Loyalty
              programme ("the Programme"). We take your privacy seriously and process
              your personal information in line with the Protection of Personal
              Information Act, 2013 ("POPIA"). This policy explains what information we
              collect, why we collect it, how we use and protect it, and the rights you
              have over it.
            </p>
          </section>

          <Section title="1. Who is the Responsible Party">
            <p>
              {OPERATOR_NAME} is the responsible party (data controller) for the personal
              information processed through the Programme. You can contact our
              Information Officer at{" "}
              <a className="text-yellow-700 underline" href={`mailto:${PRIVACY_EMAIL}`}>
                {PRIVACY_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Information we collect">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account details:</strong> first and last name, South African
                cell phone number (+27 format), email address, password (stored only
                as a bcrypt hash), and your chosen membership plan.
              </li>
              <li>
                <strong>Loyalty activity:</strong> points balance, tier, transaction
                history, reward redemptions, and personalised offer interactions.
              </li>
              <li>
                <strong>Receipts &amp; invoices:</strong> images you upload for points
                rewards, the text extracted from them via OCR (Tesseract.js), and the
                resulting transaction record (merchant, amount, category, date).
              </li>
              <li>
                <strong>Authentication &amp; session data:</strong> session cookies
                (HTTP-only, signed), CSRF tokens, login timestamps, and IP address.
              </li>
              <li>
                <strong>Technical data:</strong> browser type, device, and basic
                request logs used for security and debugging.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> collect special personal information (race,
              health, biometrics, etc.) and we do not knowingly collect information
              from children under 18.
            </p>
          </Section>

          <Section title="3. Why we process your information (lawful basis)">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Contractual necessity</strong> — to register you, run your
                loyalty account, calculate points, process redemptions, and provide
                customer support.
              </li>
              <li>
                <strong>Legal obligation</strong> — to keep transaction records and
                respond to lawful requests.
              </li>
              <li>
                <strong>Legitimate interest</strong> — to secure the Programme against
                fraud and abuse (rate limiting, audit logging, CSRF protection).
              </li>
              <li>
                <strong>Consent</strong> — for personalised marketing offers,
                promotional emails, and SMS. You can withdraw consent at any time
                from your profile or by contacting us.
              </li>
            </ul>
          </Section>

          <Section title="4. How long we keep your information">
            <ul className="list-disc pl-6 space-y-1">
              <li>Account profile: while your account is active and for 12 months after closure.</li>
              <li>Transaction &amp; redemption records: 5 years (tax / audit purposes).</li>
              <li>Uploaded receipt images: 12 months from upload, then deleted.</li>
              <li>Session cookies: deleted on logout or after expiry (max 7 days).</li>
              <li>Admin audit log entries: 7 years for accountability.</li>
            </ul>
          </Section>

          <Section title="5. Who we share it with">
            <p>We share personal information only with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Operators (processors)</strong> acting on our instructions
                under written contracts — currently Neon (PostgreSQL hosting) and
                Replit (application hosting), and SendGrid (transactional email)
                where enabled.
              </li>
              <li>
                <strong>Our staff</strong> on a strict role-based access control
                (RBAC) basis — only admins and support agents with a documented need.
              </li>
              <li>
                <strong>Regulators &amp; law enforcement</strong> when legally required.
              </li>
            </ul>
            <p>We do not sell your personal information.</p>
          </Section>

          <Section title="6. Cross-border transfers">
            <p>
              Some of our processors host data outside South Africa (for example, in
              the EU or USA). Where this happens we ensure the recipient is subject
              to laws, binding rules, or contractual terms that provide an adequate
              level of protection, as required by section 72 of POPIA.
            </p>
          </Section>

          <Section title="7. How we protect your information">
            <ul className="list-disc pl-6 space-y-1">
              <li>Passwords hashed with bcrypt (10 salt rounds) — never stored in plain text.</li>
              <li>HTTP-only, signed session cookies served over HTTPS.</li>
              <li>CSRF protection (Double Submit Cookie pattern) on every state-changing request.</li>
              <li>Rate limiting on login and receipt-upload endpoints to deter brute force.</li>
              <li>Role-based admin access with a full audit log of sensitive actions.</li>
              <li>Encrypted database connections and encrypted storage at rest by our hosting providers.</li>
            </ul>
          </Section>

          <Section title="8. Your rights under POPIA">
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Be told what personal information we hold about you.</li>
              <li>Request a copy of that information.</li>
              <li>Ask us to correct or delete information that is wrong, incomplete, or no longer needed.</li>
              <li>Object to processing for direct marketing at any time, free of charge.</li>
              <li>Withdraw consent you previously gave.</li>
              <li>Lodge a complaint with the Information Regulator (see below).</li>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a className="text-yellow-700 underline" href={`mailto:${PRIVACY_EMAIL}`}>
                {PRIVACY_EMAIL}
              </a>
              . We will respond within 30 days. You can also update most of your
              details directly from your <Link href="/profile" className="text-yellow-700 underline">profile page</Link>.
            </p>
          </Section>

          <Section title="9. Cookies">
            <p>
              We use only essential cookies needed to keep you signed in and to
              protect against CSRF attacks. We do not use third-party advertising or
              tracking cookies.
            </p>
          </Section>

          <Section title="10. Direct marketing">
            <p>
              Where you have opted in, we may send you personalised offers by email
              or SMS. Every marketing message contains an opt-out link, and you can
              also opt out at any time from your profile or by emailing{" "}
              <a className="text-yellow-700 underline" href={`mailto:${PRIVACY_EMAIL}`}>
                {PRIVACY_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="11. Changes to this policy">
            <p>
              If we make material changes, we will notify you by email and/or by an
              in-app notice before the changes take effect. The "Last updated" date
              at the top of this page reflects the most recent version.
            </p>
          </Section>

          <Section title="12. Contact us">
            <p>
              <strong>Information Officer:</strong>{" "}
              <a className="text-yellow-700 underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
              <br />
              <strong>General support:</strong>{" "}
              <a className="text-yellow-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
            <p>
              <strong>Information Regulator (South Africa)</strong>
              <br />
              JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001
              <br />
              Website:{" "}
              <a
                className="text-yellow-700 underline"
                href="https://inforegulator.org.za"
                target="_blank"
                rel="noopener noreferrer"
              >
                inforegulator.org.za
              </a>
              <br />
              Complaints email:{" "}
              <a className="text-yellow-700 underline" href="mailto:POPIAComplaints@inforegulator.org.za">
                POPIAComplaints@inforegulator.org.za
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="text-sm text-gray-700 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}
