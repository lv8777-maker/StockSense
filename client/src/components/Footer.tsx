import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-600">
        <p data-testid="text-footer-copyright">
          &copy; {new Date().getFullYear()} Maverick Telecom
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/help" className="hover:text-yellow-700 underline" data-testid="link-footer-help">
            Help &amp; FAQ
          </Link>
          <Link href="/privacy" className="hover:text-yellow-700 underline" data-testid="link-footer-privacy">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-yellow-700 underline" data-testid="link-footer-terms">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
