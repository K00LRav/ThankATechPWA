import { Link } from "wouter";
import { useListJobs, useListThankMessages, getListJobsQueryKey, getListThankMessagesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Clock, AlertCircle, CheckCircle2, XCircle, Timer, Wrench, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/useMyProfile";

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

type JobStatus = "pending" | "confirmed" | "completed" | "declined";

const JOB_STEPS: { key: JobStatus | "thanked"; label: string; icon: React.ReactNode }[] = [
  { key: "pending",   label: "Requested",  icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "confirmed", label: "Accepted",   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: "completed", label: "In Progress", icon: <Wrench className="w-3.5 h-3.5" /> },
  { key: "thanked",   label: "Done",       icon: <ThumbsUp className="w-3.5 h-3.5" /> },
];

const STATUS_STEP_INDEX: Record<string, number> = {
  pending:   0,
  confirmed: 1,
  completed: 2,
  thanked:   3,
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

  const { data: jobs, isLoading: isJobsLoading } = useListJobs(
    {},
    { query: { enabled: !!profileId, queryKey: getListJobsQueryKey({}) } }
  );

  const { data: thankMessages } = useListThankMessages(
    { customerId: profileId },
    { query: { enabled: !!profileId, queryKey: getListThankMessagesQueryKey({ customerId: profileId }) } }
  );

  const retryableByJobId = new Map(
    (thankMessages ?? [])
      .filter(t => t.paymentStatus === "failed")
      .map(t => [t.jobId, { thankMessageId: t.id }])
  );

  const thankedByJobId = new Map(
    (thankMessages ?? []).map(t => [t.jobId, { thankMessageId: t.id, technicianId: t.technicianId }])
  );

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

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
      <div className="container mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">My Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{profile?.fullName ? `, ${profile.fullName}` : ""}! Manage your jobs and send gratitude.
          </p>
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
                const retryable = retryableByJobId.get(job.id);
                const hasRetryable = retryable !== undefined;
                const thanked = thankedByJobId.get(job.id);
                const hasThanked = thanked !== undefined;
                const timelineStatus = job.status === "completed" && hasThanked ? "thanked" : job.status;
                return (
                  <Card key={job.id} className="overflow-hidden transition-all hover:shadow-md">
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
                              <Link href={`/retry-tip/${retryable.thankMessageId}`}>
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

                        <div className="w-full md:w-auto flex flex-col gap-2">
                          {job.status === 'completed' && hasRetryable ? (
                            <Button asChild className="w-full md:w-auto rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-sm" size="lg">
                              <Link href={`/retry-tip/${retryable.thankMessageId}`}>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Retry tip payment
                              </Link>
                            </Button>
                          ) : job.status === 'completed' && hasThanked ? (
                            <Button asChild variant="outline" className="w-full md:w-auto rounded-full border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800/40 dark:text-green-400 dark:hover:bg-green-900/20" size="lg">
                              <Link href={`/technician/${thanked.technicianId}`}>
                                <Heart className="mr-2 h-4 w-4" fill="currentColor" />
                                View thanks
                              </Link>
                            </Button>
                          ) : job.status === 'completed' ? (
                            <Button asChild className="w-full md:w-auto rounded-full bg-primary hover:bg-primary/90 text-white shadow-sm" size="lg">
                              <Link href={`/thank/${job.id}`}>
                                <Heart className="mr-2 h-4 w-4" fill="currentColor" />
                                Say Thank You
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
