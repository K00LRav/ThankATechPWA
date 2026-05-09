import { useListJobs, useGetTechnicianStats, useGetStripeConnectStatus, useCreateStripeConnectOnboarding, useGetStripeConnectDashboardLink, getListJobsQueryKey, getGetTechnicianStatsQueryKey, getGetStripeConnectStatusQueryKey, getGetStripeConnectDashboardLinkQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, DollarSign, CheckCircle2, TrendingUp, ExternalLink, ShieldCheck, AlertCircle, Landmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function TechnicianDashboard() {
  const { data: profileEnvelope } = useMyProfile();
  const profile = profileEnvelope?.profile;
  const technicianId = profile?.technicianId ?? undefined;
  const [location] = useLocation();

  const { data: stats, isLoading: isStatsLoading } = useGetTechnicianStats(technicianId!, {
    query: { enabled: !!technicianId, queryKey: getGetTechnicianStatsQueryKey(technicianId!) }
  });

  const { data: jobs, isLoading: isJobsLoading } = useListJobs(
    {},
    { query: { enabled: !!technicianId, queryKey: getListJobsQueryKey({}) } }
  );

  const { data: stripeStatus, refetch: refetchStripeStatus } = useGetStripeConnectStatus({
    query: {
      enabled: !!technicianId,
      queryKey: getGetStripeConnectStatusQueryKey(),
      retry: false,
    },
  });

  const { data: dashboardLink, isLoading: isDashboardLinkLoading, refetch: refetchDashboardLink } = useGetStripeConnectDashboardLink({
    query: {
      enabled: !!(technicianId && stripeStatus?.connected && stripeStatus?.onboardingComplete),
      queryKey: getGetStripeConnectDashboardLinkQueryKey(),
      retry: false,
      staleTime: 60_000,
    },
  });

  const createOnboarding = useCreateStripeConnectOnboarding();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "success" || params.get("stripe") === "refresh") {
      refetchStripeStatus();
    }
  }, [location, refetchStripeStatus]);

  async function handleStripeConnect() {
    try {
      const result = await createOnboarding.mutateAsync(undefined);
      window.location.href = result.url;
    } catch {
    }
  }

  if (!technicianId) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const stripeConnected = stripeStatus?.connected && stripeStatus?.onboardingComplete;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Tech Portal</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{profile?.fullName ? `, ${profile.fullName}` : ""}. Here's how you're doing.
          </p>
        </div>

        {stripeStatus !== undefined && (
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${stripeConnected ? "bg-secondary/5 border-secondary/20" : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"}`}>
            <div className={`p-3 rounded-full flex-shrink-0 ${stripeConnected ? "bg-secondary/10" : "bg-amber-100 dark:bg-amber-900/40"}`}>
              {stripeConnected ? (
                <ShieldCheck className="w-6 h-6 text-secondary" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {stripeConnected ? (
                <>
                  <p className="font-semibold text-secondary">Payouts enabled</p>
                  <p className="text-sm text-muted-foreground">Your bank account is connected. You'll receive tips directly.</p>
                </>
              ) : stripeStatus?.connected ? (
                <>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Finish setting up payouts</p>
                  <p className="text-sm text-muted-foreground">Complete your Stripe onboarding to receive tips to your bank account.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Set up payouts to receive tips</p>
                  <p className="text-sm text-muted-foreground">Link your bank account so customers can tip you directly. Takes 2 minutes.</p>
                </>
              )}
            </div>
            {!stripeConnected && (
              <Button
                onClick={handleStripeConnect}
                disabled={createOnboarding.isPending}
                size="sm"
                className="rounded-full flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                {createOnboarding.isPending ? "Loading..." : stripeStatus?.connected ? "Continue setup" : "Set up payouts"}
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        )}

        {isStatsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Heart className="text-primary" />} title="Total Thanks" value={stats?.totalThanks || 0} />
            <StatCard icon={<DollarSign className="text-green-600" />} title="Tips Earned" value={`$${stats?.totalTips || 0}`} />
            <StatCard icon={<TrendingUp className="text-blue-500" />} title="Avg Tip" value={`$${stats?.avgTipAmount || 0}`} />
            <StatCard icon={<CheckCircle2 className="text-secondary" />} title="Jobs Completed" value={stats?.totalJobs || 0} />
          </div>
        )}

        {stripeConnected && (
          <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-secondary/10 rounded-full flex-shrink-0">
                <Landmark className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Payouts</h2>
                <p className="text-sm text-muted-foreground">
                  Tips you receive are transferred directly to your bank account (91% of each tip after the platform fee).
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 bg-card rounded-xl border px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Total Earned</p>
                <p className="text-2xl font-bold text-secondary">${stats?.totalTips ?? "0"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gross tips received</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-secondary/40 text-secondary hover:bg-secondary/10 self-start sm:self-auto flex-shrink-0"
                disabled={isDashboardLinkLoading}
                onClick={() => {
                  if (dashboardLink?.url) {
                    window.open(dashboardLink.url, "_blank", "noopener,noreferrer");
                  } else {
                    refetchDashboardLink();
                  }
                }}
              >
                {isDashboardLinkLoading ? "Loading..." : dashboardLink ? "View Stripe Dashboard" : "Open Dashboard"}
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Your Stripe Express dashboard shows your full payout history, upcoming transfers, and bank account details.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">Active Jobs</h2>

            {isJobsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {jobs?.filter(j => j.status !== 'completed').map(job => (
                  <Card key={job.id} className="border-l-4 border-l-secondary shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{job.title}</h3>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary uppercase tracking-wide">
                          {job.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-4">{job.description}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-foreground">Customer: {job.customerName}</span>
                        {job.status === 'accepted' && (
                          <Button size="sm" variant="outline" className="rounded-full">Mark Complete</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {jobs?.filter(j => j.status !== 'completed').length === 0 && (
                  <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                    <p className="text-muted-foreground">No active jobs right now.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">Recent Completed</h2>
            <div className="space-y-4">
              {jobs?.filter(j => j.status === 'completed').slice(0, 5).map(job => (
                <div key={job.id} className="bg-card p-4 rounded-xl border shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium truncate pr-2">{job.title}</h4>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{job.customerName}</span>
                    <span>{new Date(job.completedAt || '').toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string | number }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6 flex items-center gap-4">
        <div className="p-3 bg-muted rounded-full">{icon}</div>
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
