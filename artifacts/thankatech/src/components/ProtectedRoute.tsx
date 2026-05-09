import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
  requireUserType?: "customer" | "technician";
}

export function ProtectedRoute({
  children,
  requireProfile = false,
  requireUserType,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profileEnvelope, isLoading: profileLoading } = useMyProfile();
  const [, setLocation] = useLocation();

  const profile = profileEnvelope?.profile;
  const isLoading = authLoading || (requireProfile && profileLoading);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (!requireProfile) return;
    if (profileLoading) return;
    if (profileEnvelope && !profile) {
      setLocation("/onboard");
      return;
    }
    if (requireUserType && profile && profile.userType !== requireUserType) {
      if (requireUserType === "customer") setLocation("/technician/dashboard");
      else setLocation("/customer/dashboard");
    }
  }, [authLoading, isAuthenticated, profileLoading, profileEnvelope, profile, requireProfile, requireUserType, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] py-8 px-4">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requireProfile && !profile) return null;
  if (requireUserType && profile?.userType !== requireUserType) return null;

  return <>{children}</>;
}
