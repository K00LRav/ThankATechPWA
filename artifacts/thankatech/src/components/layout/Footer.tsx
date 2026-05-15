import { Link } from "wouter";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 py-8 px-4 mt-auto">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Heart size={14} className="text-primary" fill="currentColor" />
          <span className="font-medium text-foreground">ThankATech</span>
          <span>— Real thanks. Real tips. No ratings.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hover:text-primary transition-colors">About</Link>
          <Link href="/browse" className="hover:text-primary transition-colors">Browse Techs</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          <a href="mailto:hello@thankatech.com" className="hover:text-primary transition-colors">Contact</a>
        </div>
        <div className="text-xs">
          © {new Date().getFullYear()} ThankATech. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
