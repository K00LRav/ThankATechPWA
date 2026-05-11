import { useState } from "react";
import { Link } from "wouter";
import { useListJobs, useListThankMessages, useGetPoints, useGetPointTransactions, useListRewards, useRedeemPoints, getListJobsQueryKey, getListThankMessagesQueryKey, getGetPointsQueryKey, getGetPointTransactionsQueryKey, getListRewardsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Gift, Clock, AlertCircle, CheckCircle2, XCircle, Timer, Star, Sparkles, Tag, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function JobStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </Badge>
      );
    case "confirmed":
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Confirmed
        </Badge>
      );
    case "declined":
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Declined
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Timer className="w-3 h-3" />
          Pending
        </Badge>
      );
  }
}

const REWARD_ICONS: Record<string, React.ReactNode> = {
  appreciation_star: <Star className="w-5 h-5 text-yellow-500" />,
  tip_discount_5: <Tag className="w-5 h-5 text-green-600" />,
  featured_profile: <TrendingUp className="w-5 h-5 text-blue-500" />,
};

export function CustomerDashboard() {
  const { data: profileEnvelope } = useMyProfile();
  const profile = profileEnvelope?.profile;
  const profileId = profile?.profileId;
  const queryClient = useQueryClient();

  const [redeeming, setRedeeming] = useState<string | null>(null);

  const { data: jobs, isLoading: isJobsLoading } = useListJobs(
    {},
    { query: { enabled: !!profileId, queryKey: getListJobsQueryKey({}) } }
  );

  const { data: thankMessages } = useListThankMessages(
    { customerId: profileId },
    { query: { enabled: !!profileId, queryKey: getListThankMessagesQueryKey({ customerId: profileId }) } }
  );

  const { data: points, isLoading: isPointsLoading } = useGetPoints(profileId!, {
    query: { enabled: !!profileId, queryKey: getGetPointsQueryKey(profileId!) }
  });

  const { data: pointTransactions, isLoading: isTransactionsLoading } = useGetPointTransactions(profileId!, {
    query: { enabled: !!profileId, queryKey: getGetPointTransactionsQueryKey(profileId!) }
  });

  const { data: rewards } = useListRewards({
    query: { queryKey: getListRewardsQueryKey() }
  });

  const redeemMutation = useRedeemPoints();

  const availableRewards = rewards?.filter(r => r.category === "all" || r.category === "customer") ?? [];

  const failedPaymentJobIds = new Set(
    (thankMessages ?? [])
      .filter(t => t.paymentStatus === "failed")
      .map(t => t.jobId)
  );

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

  if (!profileId) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const balance = points?.balance ?? 0;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
      <div className="container mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold">My Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back{profile?.fullName ? `, ${profile.fullName}` : ""}! Manage your jobs and send gratitude.
            </p>
          </div>

          <Card className="bg-primary text-primary-foreground border-0 shadow-md min-w-[200px]">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">ThankYou Points</p>
                <p className="text-3xl font-bold">{isPointsLoading ? "..." : balance}</p>
              </div>
              <Gift size={32} className="opacity-50" />
            </CardContent>
          </Card>
        </div>

        {/* Redeem Points Section */}
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800/40 p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex-shrink-0">
              <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Redeem Points</h2>
              <p className="text-sm text-muted-foreground">Turn your {isPointsLoading ? "..." : balance} points into real rewards.</p>
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
              <p className="text-sm text-muted-foreground">See how you've earned and spent your ThankYou Points.</p>
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
              <p className="text-xs text-muted-foreground mt-1">Send a thank you to start earning points!</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-foreground border-b pb-2">Recent Jobs</h2>

          {isJobsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {jobs?.map(job => {
                const hasFailedPayment = failedPaymentJobIds.has(job.id);
                return (
                  <Card key={job.id} className="overflow-hidden transition-all hover:shadow-md">
                    <CardContent className="p-0">
                      <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-bold text-lg">{job.title}</h3>
                            <JobStatusBadge status={job.status} />
                            {hasFailedPayment && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Payment failed
                              </Badge>
                            )}
                          </div>
                          {job.description && (
                            <p className="text-muted-foreground">{job.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium pt-2">
                            <span className="flex items-center gap-1.5"><WrenchIcon size={14} /> {job.technicianName}</span>
                            <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(job.createdAt).toLocaleDateString()}</span>
                          </div>
                          {job.status === "declined" && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-destructive" />
                              The technician has declined this request. You can book another technician.
                            </p>
                          )}
                          {job.status === "pending" && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                              <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                              Waiting for the technician to accept your request.
                            </p>
                          )}
                          {hasFailedPayment && (
                            <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              Your tip payment didn't go through. Retry below or contact support.
                            </p>
                          )}
                        </div>

                        <div className="w-full md:w-auto">
                          {job.status === 'completed' ? (
                            <Button asChild className="w-full md:w-auto rounded-full bg-primary hover:bg-primary/90 text-white shadow-sm" size="lg">
                              <Link href={`/thank/${job.id}`}>
                                <Heart className="mr-2 h-4 w-4" fill="currentColor" />
                                {hasFailedPayment ? "Retry Thank You" : "Say Thank You"}
                              </Link>
                            </Button>
                          ) : job.status === 'declined' ? (
                            <Button asChild variant="outline" className="w-full md:w-auto rounded-full">
                              <Link href="/browse">
                                Find Another Tech
                              </Link>
                            </Button>
                          ) : (
                            <Button disabled variant="outline" className="w-full md:w-auto rounded-full">
                              {job.status === 'confirmed' ? 'In progress' : 'Awaiting confirmation'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {jobs?.length === 0 && (
                <div className="text-center py-16 bg-card rounded-xl border border-dashed">
                  <p className="text-lg text-muted-foreground mb-4">You don't have any jobs yet.</p>
                  <Button asChild>
                    <Link href="/browse">Find a Technician</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WrenchIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
  );
}
