import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "26 May 2026";
const OPERATOR_NAME = "Maverick Telecom (Pty) Ltd";
const SUPPORT_EMAIL = "support@maverick.co.za";
const LEGAL_EMAIL = "legal@maverick.co.za";

export default function TermsOfService() {
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
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-500 mt-2">Last updated: {LAST_UPDATED}</p>
          </header>

          <section className="text-sm text-gray-700 leading-relaxed">
            <p>
              These Terms of Service ("Terms") govern your use of the Maverick Loyalty
              programme and related website and mobile experiences (together, "the
              Programme"), operated by {OPERATOR_NAME} ("Maverick", "we", "us"). By
              registering for an account or using the Programme, you agree to these
              Terms. If you do not agree, please don't use the Programme.
            </p>
          </section>

          <Section title="1. Eligibility">
            <ul className="list-disc pl-6 space-y-1">
              <li>You must be 18 years or older to join.</li>
              <li>You must be a South African resident with a valid South African cell phone number (+27 format).</li>
              <li>You may hold only one Maverick Loyalty account at a time.</li>
              <li>Employees of {OPERATOR_NAME} and its operators may join, subject to internal policy.</li>
            </ul>
          </Section>

          <Section title="2. Your account">
            <ul className="list-disc pl-6 space-y-1">
              <li>You are responsible for the accuracy of the details you provide and for keeping them up to date in your profile.</li>
              <li>You are responsible for keeping your password and verification codes confidential. Never share them.</li>
              <li>You must tell us promptly at <a className="text-yellow-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you suspect unauthorised access to your account.</li>
              <li>We may suspend or close accounts that breach these Terms, are inactive for more than 24 months, or that we reasonably suspect of fraud or abuse.</li>
            </ul>
          </Section>

          <Section title="3. How points work">
            <ul className="list-disc pl-6 space-y-1">
              <li>You earn points by uploading qualifying receipts and invoices, completing in-app activities, and through promotions we run from time to time.</li>
              <li>Points are calculated from the products and amounts we extract from your receipt using OCR. We use the categories <strong>Airtime</strong>, <strong>Accessories</strong>, and <strong>Plans</strong>. Earn rates per category are shown in the app and may change with reasonable notice.</li>
              <li>Points have no cash value, cannot be sold, transferred, or exchanged for cash.</li>
              <li>Points expire 24 months after they are earned unless we tell you otherwise.</li>
              <li>We may reverse points that were awarded in error, from a fraudulent or duplicate receipt, or for a transaction that was later refunded.</li>
            </ul>
          </Section>

          <Section title="4. Tiers">
            <p>The Programme has four tiers: <strong>Starter</strong>, <strong>Explorer</strong>, <strong>Champion</strong>, and <strong>Elite</strong>. Tier benefits, thresholds, and review periods are shown in the app and may be adjusted with at least 30 days' notice for any change that reduces a benefit.</p>
          </Section>

          <Section title="5. Receipts and invoices">
            <ul className="list-disc pl-6 space-y-1">
              <li>You may only upload receipts and tax invoices that belong to you and reflect a genuine, completed purchase.</li>
              <li>Each receipt may be claimed once. Duplicate, edited, fake, or stolen receipts will be rejected and may result in points reversal and account suspension.</li>
              <li>We may ask you to provide the original receipt for verification within 30 days of an upload.</li>
            </ul>
          </Section>

          <Section title="6. Redeeming rewards">
            <ul className="list-disc pl-6 space-y-1">
              <li>Rewards are subject to availability and to the terms shown on each reward's page.</li>
              <li>Once a reward is redeemed, the points are deducted immediately and the redemption cannot be reversed unless the reward could not be supplied.</li>
              <li>Some rewards may require additional verification (proof of identity, address, etc.) before they can be fulfilled.</li>
            </ul>
          </Section>

          <Section title="7. Acceptable use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Programme for any unlawful purpose.</li>
              <li>Attempt to bypass our security controls (rate limits, CSRF, authentication, RBAC).</li>
              <li>Use bots, scripts, scraping, or automated tools to interact with the Programme.</li>
              <li>Submit false, misleading, or fraudulent information, including manipulated receipts.</li>
              <li>Share your account or sell access to it.</li>
              <li>Interfere with other customers' use of the Programme.</li>
            </ul>
          </Section>

          <Section title="8. Personal information">
            <p>
              Your personal information is handled in line with our{" "}
              <Link href="/privacy" className="text-yellow-700 underline">Privacy Policy</Link>, which forms part of these Terms.
            </p>
          </Section>

          <Section title="9. Communications">
            <p>By creating an account you agree to receive service-related communications (verification codes, security alerts, transaction confirmations, important Programme updates). Marketing emails and SMS are sent only with your consent and can be turned off at any time from your profile.</p>
          </Section>

          <Section title="10. Changes to the Programme or Terms">
            <ul className="list-disc pl-6 space-y-1">
              <li>We may add, change, or remove Programme features at any time.</li>
              <li>We may update these Terms by posting a new version on this page and updating the "Last updated" date. Material changes will be notified to you by email or in-app notice at least 14 days before they take effect.</li>
              <li>If you keep using the Programme after a change takes effect, you accept the updated Terms. If you don't agree, you can close your account.</li>
            </ul>
          </Section>

          <Section title="11. Closing your account">
            <p>You can close your account at any time from your profile or by emailing <a className="text-yellow-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. When you close your account, any unredeemed points are forfeited.</p>
          </Section>

          <Section title="12. Suspension and termination by us">
            <p>We may suspend or terminate your account, withhold rewards, or reverse points if we reasonably believe you have breached these Terms, abused the Programme, or engaged in fraud. Where possible we will tell you the reason and give you a chance to respond.</p>
          </Section>

          <Section title="13. Liability">
            <ul className="list-disc pl-6 space-y-1">
              <li>The Programme is provided "as is". We don't promise it will always be available, error-free, or uninterrupted.</li>
              <li>To the maximum extent allowed by law, we are not liable for indirect, consequential, or incidental loss, or for any loss of points, profit, business, or data.</li>
              <li>Nothing in these Terms limits liability for fraud, gross negligence, death or personal injury caused by our negligence, or any liability that cannot be limited under South African law (including the Consumer Protection Act, 2008).</li>
            </ul>
          </Section>

          <Section title="14. Intellectual property">
            <p>The Programme, including the Maverick name, logo, branding, and the underlying software, is owned by or licensed to {OPERATOR_NAME}. You may use the Programme for its intended purpose only and may not copy, modify, reverse engineer, or redistribute any part of it without our written permission.</p>
          </Section>

          <Section title="15. Governing law and disputes">
            <p>These Terms are governed by the laws of the Republic of South Africa. Any dispute will be referred to the courts of South Africa. You may also lodge a complaint with the National Consumer Commission or, for privacy issues, the Information Regulator.</p>
          </Section>

          <Section title="16. Contact us">
            <p>
              <strong>Customer support:</strong>{" "}
              <a className="text-yellow-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              <br />
              <strong>Legal queries:</strong>{" "}
              <a className="text-yellow-700 underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
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
