import { Link, useParams } from "wouter";
import { useGetJob, getGetJobQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Heart,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  Wrench,
  MapPin,
  Calendar,
  ThumbsUp,
  User,
  AlertCircle,
} from "lucide-react";

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
  pending:   0,
  confirmed: 1,
  completed: 2,
  thanked:   3,
};

function JobProgressTimeline({ status }: { status: string }) {
  const currentIndex = STATUS_STEP_INDEX[status] ?? 0;
  return (
    <div className="flex items-center gap-0">
      {JOB_STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === JOB_STEPS.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
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
                className={`text-xs font-medium whitespace-nowrap leading-tight text-center ${
                  isComplete || isCurrent ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`h-0.5 flex-1 mx-2 mb-5 rounded-full transition-colors ${
                  i < currentIndex ? "bg-primary" : "bg-muted-foreground/15"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function JobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = Number(params.id);

  const { data: job, isLoading, isError } = useGetJob(jobId, {
    query: {
      queryKey: getGetJobQueryKey(jobId),
      enabled: !isNaN(jobId),
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
        <div className="container mx-auto max-w-2xl space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Link href="/customer/dashboard">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="text-center py-16 bg-card rounded-xl border border-dashed">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-lg text-muted-foreground">Job not found or you don't have access to it.</p>
            <Button asChild className="mt-4">
              <Link href="/customer/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeStatuses = ["pending", "confirmed", "completed"];
  const showTimeline = activeStatuses.includes(job.status);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
      <div className="container mx-auto max-w-2xl space-y-6">
        <Link href="/customer/dashboard">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-serif font-bold">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          {job.description && (
            <p className="mt-2 text-muted-foreground">{job.description}</p>
          )}
        </div>

        {showTimeline && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Job Progress</p>
              <JobProgressTimeline status={job.status} />
              {job.status === "pending" && (
                <p className="mt-4 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800/40">
                  <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                  Waiting for the technician to accept — usually within a few hours.
                </p>
              )}
              {job.status === "confirmed" && (
                <p className="mt-4 text-sm text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Your booking is confirmed. The technician is on their way.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {job.status === "declined" && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 border border-destructive/20">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            The technician has declined this request. You can book another technician.
          </div>
        )}

        {job.status === "cancelled" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3 border">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            You cancelled this job request.
          </div>
        )}

        <Card>
          <CardContent className="p-5 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Details</p>

            {job.technicianName && (
              <DetailRow
                icon={<User className="w-4 h-4" />}
                label="Technician"
                value={job.technicianName}
              />
            )}

            {job.address && (
              <DetailRow
                icon={<MapPin className="w-4 h-4" />}
                label="Address"
                value={job.address}
              />
            )}

            {job.scheduledDate && (
              <DetailRow
                icon={<Calendar className="w-4 h-4" />}
                label="Scheduled Date"
                value={new Date(job.scheduledDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            )}

            <DetailRow
              icon={<Clock className="w-4 h-4" />}
              label="Requested On"
              value={new Date(job.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />

            {job.completedAt && (
              <DetailRow
                icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                label="Completed On"
                value={new Date(job.completedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            )}
          </CardContent>
        </Card>

        {job.status === "completed" && (
          <Button
            asChild
            className="w-full rounded-full bg-primary hover:bg-primary/90 text-white shadow-sm"
            size="lg"
          >
            <Link href={`/thank/${job.id}`}>
              <Heart className="mr-2 h-4 w-4" fill="currentColor" />
              Say Thank You
            </Link>
          </Button>
        )}

        {job.status === "declined" && (
          <Button asChild variant="outline" className="w-full rounded-full" size="lg">
            <Link href="/browse">Find Another Technician</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
