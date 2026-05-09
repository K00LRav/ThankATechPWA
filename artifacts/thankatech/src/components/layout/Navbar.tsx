import { Link, useLocation } from "wouter";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground group-hover:scale-105 transition-transform">
            <Heart size={18} fill="currentColor" />
          </div>
          <span className="font-serif font-bold text-xl tracking-tight text-foreground">
            ThankATech
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/browse" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/browse' ? 'text-primary' : 'text-muted-foreground'}`}>
            Browse Techs
          </Link>
          <Link href="/customer/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/customer/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
            My Dashboard
          </Link>
          <Link href="/technician/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/technician/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
            Tech Portal
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">
            Sign In
          </Link>
          <Button asChild className="rounded-full shadow-sm hover:shadow-md transition-all">
            <Link href="/login">Join Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}