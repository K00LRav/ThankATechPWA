import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListJobs, useListThankMessages, useUpdateJob,
  useGetPointTransactions, useGetPoints, useListRewards, useRedeemPoints,
  getListJobsQueryKey, getListThankMessagesQueryKey,
  getGetPointTransactionsQueryKey, getGetPointsQueryKey, getListRewardsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Heart, Clock, AlertCircle, CheckCircle2, XCircle, Timer, Wrench,
  ThumbsUp, Star, Sparkles, Tag, TrendingUp, Gift, Search, Copy, Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const REWARD_ICONS: Record<string, React.ReactNode> = {
  tip_discount_5:   <Tag className="w-5 h-5 text-green-600" />,
  top_supporter:    <Star className="w-5 h-5 text-yellow-500" />,
  featured_profile: <TrendingUp className="w-5 h-5 text-blue-500" />,
  top_tech_badge:   <Star className="w-5 h-5 text-primary" />,
};

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
    case "cancelled":
      return (
        <Badge variant="secondary" className="flex items-center gap-1 opacity-70">
          <XCircle className="w-3 h-3" />
          Cancelled
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

type JobStatus = "pending" | "confirmed" | "completed" | "declined" | "cancelled";

const JOB_STEPS: { key: JobStatus | "thanked"; label: string; icon: React.ReactNode }[] = [
  { key: "pending",   label: "Requested",   icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "confirmed", label: "Accepted",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: "completed", label: "In Progress", icon: <Wrench className="w-3.5 h-3.5" /> },
  { key: "thanked",   label: "Done",        icon: <ThumbsUp className="w-3.5 h-3.5" /> },
];

const STATUS_STEP_INDEX: Record<string, number> = {
  pending: 0, confirmed: 1, completed: 2, thanked: 3,
};

function JobProgressTimeline({ status }: { status: string }) {
  const currentIndex = STATUS_STEP_INDEX[status] ?? 0;
  return (
    <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
      <div className="flex items-center gap-0">
        {JOB_STEPS.map((step, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isLast = i === JOB_STEPS.length - 1;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isComplete
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted border-muted-foreground/20 text-muted-foreground/40"
                  }`}
                >
                  {step.icon}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap leading-tight text-center ${
                    isComplete || isCurrent ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-colors ${
                    i < currentIndex ? "bg-primary" : "bg-muted-foreground/15"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CustomerDashboard() {
  const { data: profileEnvelope } = useMyProfile();
  const profile = profileEnvelope?.profile;
  const profileId = profile?.profileId;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [voucherDialog, setVoucherDialog] = useState<{ code: string; expiresAt: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [cancelConfirmJobId, setCancelConfirmJobId] = useState<number | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<number | null>(null);

  const updateJobMutation = useUpdateJob();

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

  const { data: pointTransactions } = useGetPointTransactions(profileId!, {
    query: { enabled: !!profileId, queryKey: getGetPointTransactionsQueryKey(profileId!) }
  });

  const { data: rewards } = useListRewards({
    query: { queryKey: getListRewardsQueryKey() }
  });

  const redeemMutation = useRedeemPoints();

  const retryableByJobId = new Map(
    (thankMessages ?? [])
      .filter(t => t.paymentStatus === "failed")
      .map(t => [t.jobId, { thankMessageId: t.id }])
  );

  const thankedByJobId = new Map(
    (thankMessages ?? []).map(t => [t.jobId, { thankMessageId: t.id, technicianId: t.technicianId }])
  );

  const totalTipsSent = (thankMessages ?? []).reduce((sum, t) => sum + Number(t.tipAmount ?? 0), 0);
  const totalThanksSent = (thankMessages ?? []).length;
  const totalJobs = (jobs ?? []).length;
  const pointBalance = points?.balance ?? 0;

  async function handleCancelJob(jobId: number) {
    setCancellingJobId(jobId);
    try {
      await updateJobMutation.mutateAsync({ id: jobId, data: { status: "cancelled" } });
      await queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({}) });
      toast.success("Job cancelled successfully.");
    } catch {
      toast.error("Could not cancel the job. Please try again.");
    } finally {
      setCancellingJobId(null);
      setCancelConfirmJobId(null);
    }
  }

  async function handleRedeem(rewardId: string) {
    if (!profileId) return;
    setRedeeming(rewardId);
    try {
      const result = await redeemMutation.mutateAsync({ userId: profileId, data: { rewardId } }) as {
        voucherCode?: string;
        voucherExpiresAt?: string;
        reward?: { name?: string };
        newBalance?: number;
      };
      await queryClient.invalidateQueries({ queryKey: getGetPointsQueryKey(profileId) });
      await queryClient.invalidateQueries({ queryKey: getGetPointTransactionsQueryKey(profileId) });
      if (result?.voucherCode && result?.voucherExpiresAt) {
        setVoucherDialog({ code: result.voucherCode, expiresAt: result.voucherExpiresAt });
      } else {
        toast.success(`Reward redeemed! You now have ${result?.newBalance ?? 0} pts.`);
      }
    } catch {
      toast.error("Could not redeem reward. Make sure you have enough points.");
    } finally {
      setRedeeming(null);
    }
  }

  function copyVoucherCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  if (!profileId) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
      <div className="container mx-auto max-w-5xl space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold">My Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back{profile?.fullName ? `, ${profile.fullName}` : ""}! Manage your jobs and send gratitude.
            </p>
          </div>
          <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-sm self-start sm:self-auto">
            <Link href="/browse">
              <Search className="mr-2 h-4 w-4" />
              Find a Tech
            </Link>
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Jobs Booked</span>
              </div>
              {isJobsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-3xl font-bold">{totalJobs}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-rose-500" fill="currentColor" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Thanks Sent</span>
              </div>
              <p className="text-3xl font-bold">{totalThanksSent}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">$</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">Tips Sent</span>
              </div>
              <p className="text-3xl font-bold">
                ${totalTipsSent.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">ThankYou Points</span>
              </div>
              {isPointsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-secondary">{pointBalance.toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Jobs list */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground border-b pb-2">Recent Jobs</h2>

          {isJobsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {jobs?.map(job => {
                const retryable = retryableByJobId.get(job.id);
                const hasRetryable = retryable !== undefined;
                const thanked = thankedByJobId.get(job.id);
                const hasThanked = thanked !== undefined;
                const timelineStatus = job.status === "completed" && hasThanked ? "thanked" : job.status;
                return (
                  <Card
                    key={job.id}
                    className="overflow-hidden transition-all hover:shadow-md cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <CardContent className="p-0">
                      <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-bold text-lg">{job.title}</h3>
                            <JobStatusBadge status={job.status} />
                            {job.status === "completed" && hasThanked && (
                              <Badge className="bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Thanks sent
                              </Badge>
                            )}
                            {hasRetryable && (
                              <Link
                                href={`/retry-tip/${retryable.thankMessageId}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Badge variant="destructive" className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                                  <AlertCircle className="w-3 h-3" />
                                  Payment failed — tap to retry
                                </Badge>
                              </Link>
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
                          {job.status === "cancelled" && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              You cancelled this job request.
                            </p>
                          )}
                          {job.status === "pending" && (
                            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mt-1 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800/40">
                              <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                              Waiting for the technician to accept — usually within a few hours.
                            </p>
                          )}
                          {job.status === "confirmed" && (
                            <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mt-1">
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                              Your booking is confirmed. The technician is on their way.
                            </p>
                          )}
                          {(job.status === "pending" || job.status === "confirmed" || job.status === "completed") && (
                            <JobProgressTimeline status={timelineStatus} />
                          )}
                          {hasRetryable && (
                            <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              Your tip payment didn't go through. Your thank you was delivered — retry the payment to complete your tip.
                            </p>
                          )}
                        </div>

                        <div
                          className="w-full md:w-auto flex flex-col gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {job.status === "completed" && hasRetryable ? (
                            <Button asChild className="w-full md:w-auto rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-sm" size="lg">
                              <Link href={`/retry-tip/${retryable.thankMessageId}`}>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Retry tip payment
                              </Link>
                            </Button>
                          ) : job.status === "completed" && hasThanked ? (
                            <Button asChild variant="outline" className="w-full md:w-auto rounded-full border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800/40 dark:text-green-400 dark:hover:bg-green-900/20" size="lg">
                              <Link href={`/technician/${thanked.technicianId}`}>
                                <Heart className="mr-2 h-4 w-4" fill="currentColor" />
                                View thanks
                              </Link>
                            </Button>
                          ) : job.status === "completed" ? (
                            <Button asChild className="w-full md:w-auto rounded-full bg-primary hover:bg-primary/90 text-white shadow-sm" size="lg">
                              <Link href={`/thank/${job.id}`}>
                                <Heart className="mr-2 h-4 w-4" fill="currentColor" />
                                Say Thank You
                              </Link>
                            </Button>
                          ) : job.status === "declined" ? (
                            <Button asChild variant="outline" className="w-full md:w-auto rounded-full">
                              <Link href="/browse">Find Another Tech</Link>
                            </Button>
                          ) : job.status === "cancelled" ? (
                            <Button disabled variant="outline" className="w-full md:w-auto rounded-full opacity-60">
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelled
                            </Button>
                          ) : job.status === "pending" ? (
                            <Button
                              variant="outline"
                              className="w-full md:w-auto rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
                              size="lg"
                              disabled={cancellingJobId === job.id}
                              onClick={() => setCancelConfirmJobId(job.id)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              {cancellingJobId === job.id ? "Cancelling..." : "Cancel Job"}
                            </Button>
                          ) : (
                            <Button disabled variant="outline" className="w-full md:w-auto rounded-full">
                              In progress
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

        {/* ThankYou Points */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-xl font-bold text-foreground">ThankYou Points</h2>
            <div className="flex items-center gap-2 text-secondary font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>{pointBalance.toLocaleString()} pts</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* How you earn */}
            <Card className="rounded-2xl border-0 shadow-sm bg-card">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-semibold text-foreground mb-3">How you earn points</p>
                {[
                  { label: "Send a thank you message", pts: "+5 pts" },
                  { label: "Include a tip", pts: "+10 pts" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-secondary">{item.pts}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent point activity */}
            <Card className="rounded-2xl border-0 shadow-sm bg-card">
              <CardContent className="p-5">
                <p className="text-sm font-semibold text-foreground mb-3">Recent activity</p>
                {(pointTransactions ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No points earned yet — send your first thank you!</p>
                ) : (
                  <div className="space-y-2">
                    {(pointTransactions ?? []).slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate pr-2">{tx.description}</span>
                        <span className={`font-semibold flex-shrink-0 ${Number(tx.amount) > 0 ? "text-secondary" : "text-destructive"}`}>
                          {Number(tx.amount) > 0 ? "+" : ""}{tx.amount} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Rewards */}
        {(rewards ?? []).filter(r => r.category === "customer").length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b pb-2">Redeem Rewards</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(rewards ?? []).filter(r => r.category === "customer").map(reward => {
                const canAfford = pointBalance >= (reward.cost ?? 0);
                const icon = REWARD_ICONS[reward.id ?? ""] ?? <Gift className="w-5 h-5 text-primary" />;
                return (
                  <Card key={reward.id} className={`rounded-2xl border shadow-sm transition-all ${canAfford ? "border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent" : "opacity-60"}`}>
                    <CardContent className="p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          {icon}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{reward.name}</p>
                          <p className="text-xs text-muted-foreground">{reward.cost?.toLocaleString()} pts required</p>
                        </div>
                      </div>
                      {reward.description && (
                        <p className="text-xs text-muted-foreground">{reward.description}</p>
                      )}
                      <Button
                        size="sm"
                        className="rounded-full mt-auto"
                        variant={canAfford ? "default" : "outline"}
                        disabled={!canAfford || redeeming === reward.id}
                        onClick={() => reward.id && handleRedeem(reward.id)}
                      >
                        {redeeming === reward.id ? "Redeeming..." : canAfford ? "Redeem" : "Not enough points"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <AlertDialog open={cancelConfirmJobId !== null} onOpenChange={(open) => { if (!open) setCancelConfirmJobId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your pending job request. The technician will be notified. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Job</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => { if (cancelConfirmJobId !== null) handleCancelJob(cancelConfirmJobId); }}
            >
              Cancel Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Voucher code dialog */}
      <Dialog open={!!voucherDialog} onOpenChange={(open) => { if (!open) setVoucherDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Your discount code is ready! 🎉</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Use this code in the tip step of your next thank you to get 5% off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl p-5 text-center space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Your voucher code</p>
              <p className="text-3xl font-black text-primary tracking-widest font-mono">{voucherDialog?.code}</p>
              {voucherDialog?.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  5% off your next tip · expires {new Date(voucherDialog.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <Button
              className="w-full rounded-full gap-2"
              variant="outline"
              onClick={() => voucherDialog && copyVoucherCode(voucherDialog.code)}
            >
              {codeCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {codeCopied ? "Copied!" : "Copy code"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A copy has also been sent to your email for safekeeping. One-time use only.
            </p>
            <Button className="w-full rounded-full" onClick={() => setVoucherDialog(null)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WrenchIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
