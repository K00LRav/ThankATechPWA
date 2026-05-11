import { useState } from "react";
import { useListJobs, useGetTechnicianStats, useGetStripeConnectStatus, useCreateStripeConnectOnboarding, useGetStripeConnectDashboardLink, useGetStripeEarnings, useGetTechnicianEarnings, useUpdateJob, useGetPointTransactions, useGetPoints, useListRewards, useRedeemPoints, getListJobsQueryKey, getGetTechnicianStatsQueryKey, getGetStripeConnectStatusQueryKey, getGetStripeConnectDashboardLinkQueryKey, getGetStripeEarningsQueryKey, getGetTechnicianEarningsQueryKey, getGetPointTransactionsQueryKey, getGetPointsQueryKey, getListRewardsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, DollarSign, CheckCircle2, TrendingUp, ExternalLink, ShieldCheck, AlertCircle, Landmark, ReceiptText, Check, X, Star, Sparkles, Tag, Gift, TableIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const REWARD_ICONS: Record<string, React.ReactNode> = {
  appreciation_star: <Star className="w-5 h-5 text-yellow-500" />,
  tip_discount_5: <Tag className="w-5 h-5 text-green-600" />,
  featured_profile: <TrendingUp className="w-5 h-5 text-blue-500" />,
};

export function TechnicianDashboard() {
  const { data: profileEnvelope } = useMyProfile();
  const profile = profileEnvelope?.profile;
  const technicianId = profile?.technicianId ?? undefined;
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const [redeeming, setRedeeming] = useState<string | null>(null);

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

  const { data: earnings, isLoading: isEarningsLoading } = useGetStripeEarnings({
    query: {
      enabled: !!technicianId,
      queryKey: getGetStripeEarningsQueryKey(),
    },
  });

  const { data: technicianEarnings, isLoading: isTechEarningsLoading } = useGetTechnicianEarnings(technicianId!, {
    query: {
      enabled: !!technicianId,
      queryKey: getGetTechnicianEarningsQueryKey(technicianId!),
    },
  });

  const profileId = profile?.profileId;
  const { data: pointTransactions, isLoading: isTransactionsLoading } = useGetPointTransactions(profileId!, {
    query: { enabled: !!profileId, queryKey: getGetPointTransactionsQueryKey(profileId!) }
  });

  const { data: points, isLoading: isPointsLoading } = useGetPoints(profileId!, {
    query: { enabled: !!profileId, queryKey: getGetPointsQueryKey(profileId!) }
  });

  const { data: rewards } = useListRewards({
    query: { queryKey: getListRewardsQueryKey() }
  });

  const redeemMutation = useRedeemPoints();

  const availableRewards = rewards?.filter(r => r.category === "all" || r.category === "technician") ?? [];
  const balance = points?.balance ?? 0;

  const createOnboarding = useCreateStripeConnectOnboarding();
  const updateJob = useUpdateJob();

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

  async function handleJobStatus(jobId: number, status: "confirmed" | "declined" | "completed") {
    try {
      await updateJob.mutateAsync({ id: jobId, data: { status } });
      await queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({}) });
      if (status === "confirmed") toast.success("Job accepted — the customer will be notified.");
      else if (status === "declined") toast.info("Job declined.");
      else if (status === "completed") toast.success("Job marked as complete!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  async function handleRedeem(rewardId: string) {
    if (!profileId) return;
    setRedeeming(rewardId);
    try {
      const result = await redeemMutation.mutateAsync({ userId: profileId, data: { rewardId } });
      await queryClient.invalidateQueries({ queryKey: getGetPointsQueryKey(profileId) });
      await queryClient.invalidateQueries({ queryKey: getGetPointTransactionsQueryKey(profileId) });
      toast.success(`Redeemed: ${result.reward.name}! You now have ${result.newBalance} pts.`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Redemption failed. Please try again.";
      toast.error(message);
    } finally {
      setRedeeming(null);
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

  const pendingJobs = jobs?.filter(j => j.status === 'pending') ?? [];
  const activeJobs = jobs?.filter(j => j.status === 'confirmed') ?? [];
  const completedJobs = jobs?.filter(j => j.status === 'completed') ?? [];

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
            <StatCard icon={<DollarSign className="text-green-600" />} title="Tips Earned" value={`$${stats?.totalEarned?.toFixed(2) || "0.00"}`} />
            <StatCard icon={<TrendingUp className="text-blue-500" />} title="Avg Tip" value={`$${stats?.avgTipAmount || 0}`} />
            <StatCard icon={<CheckCircle2 className="text-secondary" />} title="Jobs Completed" value={stats?.totalJobs || 0} />
          </div>
        )}

        <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-secondary/10 rounded-full flex-shrink-0">
                <Landmark className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Earnings</h2>
                <p className="text-sm text-muted-foreground">
                  Tips you've received (91% of each tip after the platform fee).
                </p>
              </div>
            </div>
            {stripeConnected && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-secondary/40 text-secondary hover:bg-secondary/10 flex-shrink-0"
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
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Total Earned</p>
              {isEarningsLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-secondary">${earnings?.totalEarned?.toFixed(2) ?? "0.00"}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Gross tips received</p>
            </div>
            <div className="bg-card rounded-xl border px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Payments</p>
              {isEarningsLoading ? (
                <Skeleton className="h-8 w-12 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{earnings?.tipCount ?? 0}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Completed tips</p>
            </div>
            <div className="bg-card rounded-xl border px-4 py-3 col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Net Payout</p>
              {isEarningsLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-secondary">
                  ${((earnings?.totalEarned ?? 0) * 0.91).toFixed(2)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">After 9% platform fee</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <ReceiptText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payout History</h3>
            </div>

            {isEarningsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : earnings && earnings.entries.length > 0 ? (
              <div className="space-y-2">
                {[...earnings.entries].reverse().map(entry => (
                  <div
                    key={entry.id}
                    className="bg-card rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{entry.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.jobTitle || "Job"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-secondary">${entry.tipAmount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-card rounded-xl border border-dashed">
                <DollarSign className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tips received yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Tips from customers will appear here once paid.</p>
              </div>
            )}

            {stripeConnected && (
              <p className="text-xs text-muted-foreground mt-3">
                Your Stripe Express dashboard shows your full payout schedule, upcoming transfers, and bank account details.
              </p>
            )}
          </div>
        </div>

        {/* Earnings Breakdown Table */}
        <div className="rounded-2xl border border-secondary/20 bg-card p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary/10 rounded-full flex-shrink-0">
              <TableIcon className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Earnings Breakdown</h2>
              <p className="text-sm text-muted-foreground">
                Per-job tip history — totals match your Tips Earned stat above.
              </p>
            </div>
          </div>

          {isTechEarningsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : technicianEarnings && technicianEarnings.entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="pb-2 font-medium pr-4">Job</th>
                    <th className="pb-2 font-medium pr-4">Customer</th>
                    <th className="pb-2 font-medium pr-4">Payment Date</th>
                    <th className="pb-2 font-medium pr-4 text-right">Tip</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {technicianEarnings.entries.map(entry => (
                    <tr key={entry.id} className="py-2">
                      <td className="py-3 pr-4 font-medium truncate max-w-[160px]">
                        {entry.jobTitle || `Job #${entry.jobId}`}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground truncate max-w-[120px]">
                        {entry.customerName}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-3 pr-4 text-right font-bold text-secondary whitespace-nowrap">
                        ${entry.tipAmount.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary">
                          {entry.paymentStatus === "succeeded" ? "Paid" : entry.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={3} className="pt-3 text-sm font-semibold text-muted-foreground">Total</td>
                    <td className="pt-3 text-right font-bold text-secondary text-sm">
                      ${technicianEarnings.totalEarned.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed">
              <TableIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No completed tips yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Earnings appear here once customers send a tip.</p>
            </div>
          )}
        </div>

        {/* Redeem Points Section */}
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800/40 p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex-shrink-0">
              <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Redeem Points</h2>
              <p className="text-sm text-muted-foreground">
                You have {isPointsLoading ? "..." : balance} pts — turn them into rewards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableRewards.map(reward => {
              const canAfford = balance >= reward.cost;
              const isRedeeming = redeeming === reward.id;
              return (
                <div
                  key={reward.id}
                  className={`bg-card rounded-xl border px-4 py-4 flex items-start gap-4 transition-all ${canAfford ? "border-yellow-200 dark:border-yellow-800/40" : "opacity-60"}`}
                >
                  <div className="p-2 bg-muted rounded-full flex-shrink-0 mt-0.5">
                    {REWARD_ICONS[reward.id] ?? <Gift className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{reward.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{reward.description}</p>
                    <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${canAfford ? "text-primary" : "text-muted-foreground"}`}>
                        {reward.cost} pts
                      </span>
                      <Button
                        size="sm"
                        variant={canAfford ? "default" : "outline"}
                        className="rounded-full text-xs h-8"
                        disabled={!canAfford || isRedeeming || !!redeeming}
                        onClick={() => handleRedeem(reward.id)}
                      >
                        {isRedeeming ? "Redeeming..." : canAfford ? "Redeem" : "Need more pts"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Points History */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-full flex-shrink-0">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Points History</h2>
              <p className="text-sm text-muted-foreground">A breakdown of how you've earned and spent your ThankYou Points.</p>
            </div>
          </div>

          {isTransactionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : pointTransactions && pointTransactions.length > 0 ? (
            <div className="space-y-2">
              {[...pointTransactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(tx => (
                <div
                  key={tx.id}
                  className="bg-card rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{tx.description || tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <p className={`font-bold flex-shrink-0 ${tx.amount < 0 ? "text-destructive" : "text-primary"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount} pts
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-card rounded-xl border border-dashed">
              <Star className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No points activity yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Complete jobs and receive thanks to start earning points!</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {isJobsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <>
                {pendingJobs.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                      Incoming Requests
                      <Badge className="bg-primary text-white rounded-full px-2 py-0.5 text-xs font-semibold">
                        {pendingJobs.length}
                      </Badge>
                    </h2>
                    {pendingJobs.map(job => (
                      <Card key={job.id} className="border-l-4 border-l-primary shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-2 gap-3 flex-wrap">
                            <h3 className="font-bold text-lg">{job.title}</h3>
                            <Badge className="bg-primary/10 text-primary border-primary/20 uppercase tracking-wide text-xs font-semibold">
                              Pending
                            </Badge>
                          </div>
                          {job.description && (
                            <p className="text-muted-foreground mb-3">{job.description}</p>
                          )}
                          {job.address && (
                            <p className="text-sm text-muted-foreground mb-1">
                              <span className="font-medium">Location:</span> {job.address}
                            </p>
                          )}
                          {job.scheduledDate && (
                            <p className="text-sm text-muted-foreground mb-3">
                              <span className="font-medium">Scheduled:</span>{" "}
                              {new Date(job.scheduledDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-4">
                            <span className="text-sm font-medium text-foreground">From: {job.customerName}</span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={updateJob.isPending}
                                onClick={() => handleJobStatus(job.id, "declined")}
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                className="rounded-full bg-secondary hover:bg-secondary/90 text-white"
                                disabled={updateJob.isPending}
                                onClick={() => handleJobStatus(job.id, "confirmed")}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Accept
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <h2 className="text-xl font-bold border-b pb-2">Active Jobs</h2>
                  {activeJobs.map(job => (
                    <Card key={job.id} className="border-l-4 border-l-secondary shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg">{job.title}</h3>
                          <Badge className="bg-secondary/10 text-secondary border-secondary/20 uppercase tracking-wide text-xs font-semibold">
                            Confirmed
                          </Badge>
                        </div>
                        {job.description && (
                          <p className="text-muted-foreground mb-4">{job.description}</p>
                        )}
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-foreground">Customer: {job.customerName}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={updateJob.isPending}
                            onClick={() => handleJobStatus(job.id, "completed")}
                          >
                            Mark Complete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {activeJobs.length === 0 && pendingJobs.length === 0 && (
                    <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                      <p className="text-muted-foreground">No active jobs right now.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">Recent Completed</h2>
            <div className="space-y-4">
              {completedJobs.slice(0, 5).map(job => (
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
              {completedJobs.length === 0 && (
                <div className="text-center py-8 bg-card rounded-xl border border-dashed">
                  <p className="text-sm text-muted-foreground">No completed jobs yet.</p>
                </div>
              )}
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
