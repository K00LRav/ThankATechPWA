import { Link, useLocation } from "wouter";
import { Heart, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";
import { useMyProfile } from "@/hooks/useMyProfile";

declare function gtag_report_conversion(url?: string): boolean;

export function Navbar() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading, login, logout, user } = useAuth();
  const { data: profileEnvelope } = useMyProfile();

  const profile = profileEnvelope?.profile;

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
          <Link href="/browse" className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith('/browse') ? 'text-primary' : 'text-muted-foreground'}`}>
            Browse Techs
          </Link>
          <Link href="/about" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/about' ? 'text-primary' : 'text-muted-foreground'}`}>
            About
          </Link>
          {isAuthenticated && profile?.userType === "customer" && (
            <Link href="/customer/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/customer/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
              My Dashboard
            </Link>
          )}
          {isAuthenticated && profile?.userType === "technician" && (
            <Link href="/technician/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/technician/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
              Tech Portal
            </Link>
          )}
          {isAuthenticated && !profile && (
            <>
              <Link href="/customer/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/customer/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                My Dashboard
              </Link>
              <Link href="/technician/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/technician/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                Tech Portal
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-20 bg-muted animate-pulse rounded-full" />
          ) : isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={14} className="text-primary" />
                  </div>
                )}
                <span className="font-medium text-foreground">
                  {profile?.fullName || user?.firstName || "Account"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="rounded-full border-border hover:border-destructive hover:text-destructive transition-colors"
              >
                <LogOut size={14} className="mr-1.5" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={() => { gtag_report_conversion(); login(); }}
                className="text-sm font-medium hover:text-primary transition-colors hidden sm:block"
              >
                Sign In
              </button>
              <Button
                onClick={() => { gtag_report_conversion(); login(); }}
                className="rounded-full shadow-sm hover:shadow-md transition-all"
              >
                Join Free
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
