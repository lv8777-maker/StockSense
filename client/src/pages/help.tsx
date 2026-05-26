import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Search, Mail, MessageCircle, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

const SUPPORT_EMAIL = "support@maverick.co.za";
const SUPPORT_PHONE = "0800 MAVERICK";

type Faq = { q: string; a: React.ReactNode };
type Category = { id: string; title: string; faqs: Faq[] };

const CATEGORIES: Category[] = [
  {
    id: "account",
    title: "Account & sign-in",
    faqs: [
      {
        q: "How do I create an account?",
        a: (
          <>
            On the home page tap <strong>Get Started</strong>, choose either phone
            sign-in or email/password, fill in your details, accept the Terms and
            Privacy Policy, and you're in. Email signups receive a 6-digit
            verification code in their inbox.
          </>
        ),
      },
      {
        q: "I didn't get my verification code. What now?",
        a: (
          <>
            Check your spam folder first. The code expires after 15 minutes — if it
            has, click <strong>Resend code</strong> on the verification screen. If
            it still doesn't arrive, email{" "}
            <a className="text-yellow-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </>
        ),
      },
      {
        q: "I forgot my password.",
        a: (
          <>
            On the sign-in screen tap <strong>Forgot your password?</strong>. We'll
            email you a reset link that's valid for one hour.
          </>
        ),
      },
      {
        q: "Can I change my email or phone number?",
        a: (
          <>
            Yes — open your <Link href="/profile" className="text-yellow-700 underline">
              profile
            </Link>{" "}
            and edit them directly. For security, we may ask you to verify the new
            address or number before the change takes effect.
          </>
        ),
      },
      {
        q: "How do I close my account?",
        a: (
          <>
            Email <a className="text-yellow-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            from the address on file. We'll close the account within 7 days. Note
            that unredeemed points are forfeited on closure.
          </>
        ),
      },
    ],
  },
  {
    id: "points",
    title: "Points & tiers",
    faqs: [
      {
        q: "How do I earn points?",
        a: (
          <>
            Upload a receipt or MTN tax invoice via{" "}
            <Link href="/upload-invoice" className="text-yellow-700 underline">
              Upload Invoice
            </Link>
            . Our scanner reads the products and amounts, and points are credited
            automatically. You can also earn from in-app promotions and tier
            bonuses.
          </>
        ),
      },
      {
        q: "What earns points and how much?",
        a: (
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Airtime &amp; data:</strong> base rate per Rand spent</li>
            <li><strong>Accessories:</strong> higher rate</li>
            <li><strong>Plans:</strong> highest rate, plus a sign-up bonus</li>
          </ul>
        ),
      },
      {
        q: "How do tiers work?",
        a: (
          <>
            There are four tiers — <strong>Starter</strong>,{" "}
            <strong>Explorer</strong>, <strong>Champion</strong>,{" "}
            <strong>Elite</strong>. Every member starts at Starter. As you earn
            points your tier progresses, unlocking better earn rates and rewards.
            Your current tier is shown on your{" "}
            <Link href="/dashboard" className="text-yellow-700 underline">dashboard</Link>.
          </>
        ),
      },
      {
        q: "Do my points expire?",
        a: <>Points expire 24 months after they were earned. Earning new points refreshes the clock on your balance.</>,
      },
      {
        q: "Why were my points reversed?",
        a: (
          <>
            Points may be reversed if a receipt was duplicated, the transaction was
            refunded, or we flagged suspected fraud. You'll see a matching reversal
            entry in your{" "}
            <Link href="/history" className="text-yellow-700 underline">history</Link>.
            Contact support if you think this was an error.
          </>
        ),
      },
    ],
  },
  {
    id: "receipts",
    title: "Receipts & invoices",
    faqs: [
      {
        q: "What kinds of receipts can I upload?",
        a: (
          <>
            Maverick Telecom till slips and MTN tax invoices. Photos must be clear
            and show the date, items, and total. We accept JPG, PNG and PDF up to
            10 MB.
          </>
        ),
      },
      {
        q: "My receipt was rejected — why?",
        a: (
          <ul className="list-disc pl-6 space-y-1">
            <li>The image is too blurry to read</li>
            <li>The receipt is older than 30 days</li>
            <li>The receipt was already claimed by someone else</li>
            <li>It's not from a recognised Maverick / MTN store</li>
          </ul>
        ),
      },
      {
        q: "How long does processing take?",
        a: <>Most receipts are scored within 30 seconds. Manual review (if triggered) can take up to 24 hours.</>,
      },
    ],
  },
  {
    id: "rewards",
    title: "Rewards & redemptions",
    faqs: [
      {
        q: "How do I redeem rewards?",
        a: (
          <>
            Open the{" "}
            <Link href="/rewards" className="text-yellow-700 underline">Rewards</Link>{" "}
            page, pick something you can afford, and tap{" "}
            <strong>Redeem</strong>. Points are deducted immediately and you'll get
            a confirmation in your{" "}
            <Link href="/history" className="text-yellow-700 underline">history</Link>.
          </>
        ),
      },
      {
        q: "Can I cancel a redemption?",
        a: <>Once redeemed, a reward cannot be cancelled unless we couldn't supply it. Please choose carefully.</>,
      },
      {
        q: "When will I receive my reward?",
        a: <>Digital rewards (airtime, data, vouchers) are delivered instantly. Physical rewards are couriered within 7 working days.</>,
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & security",
    faqs: [
      {
        q: "How is my information protected?",
        a: (
          <>
            Passwords are hashed with bcrypt and never stored in plain text. We use
            HTTPS, signed session cookies, CSRF protection, and rate limiting on
            sensitive endpoints. Full details are in our{" "}
            <Link href="/privacy" className="text-yellow-700 underline">
              Privacy Policy
            </Link>
            .
          </>
        ),
      },
      {
        q: "Who can see my information?",
        a: (
          <>
            Only Maverick staff with a documented need, via our role-based access
            control. Every sensitive admin action is recorded in an audit log.
          </>
        ),
      },
      {
        q: "How do I stop marketing emails or SMS?",
        a: (
          <>
            Open your <Link href="/profile" className="text-yellow-700 underline">
              profile
            </Link>{" "}
            and switch off Marketing messages, or use the unsubscribe link in any
            marketing email.
          </>
        ),
      },
      {
        q: "How do I request a copy of my data?",
        a: (
          <>
            Email{" "}
            <a className="text-yellow-700 underline" href="mailto:privacy@maverick.co.za">
              privacy@maverick.co.za
            </a>{" "}
            from your registered address. We'll respond within 30 days as required
            by POPIA.
          </>
        ),
      },
    ],
  },
];

export default function HelpPage() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES
      .map((cat) => ({
        ...cat,
        faqs: cat.faqs.filter(
          (f) =>
            f.q.toLowerCase().includes(q) ||
            String(f.a).toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.faqs.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && <Navbar />}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated && (
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Help &amp; FAQ</h1>
          <p className="text-gray-600 mt-2">Answers to the most common questions about Maverick Loyalty.</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the FAQ…"
            className="pl-10"
            data-testid="input-faq-search"
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-600">
              No results for "<strong>{query}</strong>". Try different words or contact us below.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filtered.map((cat) => (
              <Card key={cat.id} data-testid={`card-faq-${cat.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{cat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {cat.faqs.map((f, i) => (
                      <AccordionItem key={i} value={`${cat.id}-${i}`}>
                        <AccordionTrigger className="text-left text-sm font-medium" data-testid={`trigger-faq-${cat.id}-${i}`}>
                          {f.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-gray-700 leading-relaxed">
                          {f.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Still need help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-yellow-600" />
              <a className="text-yellow-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-yellow-600" />
              <span>{SUPPORT_PHONE}</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4 text-yellow-600" />
              <span>In-app chat coming soon</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
