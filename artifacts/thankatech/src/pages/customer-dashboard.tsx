import { Link } from "wouter";
import { useListJobs, useListThankMessages, useGetPoints, getListJobsQueryKey, getListThankMessagesQueryKey, getGetPointsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Gift, Clock, AlertCircle, CheckCircle2, XCircle, Timer } from "lucide-react";
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

  const { data: points, isLoading: isPointsLoading } = useGetPoints(profileId!, {
    query: { enabled: !!profileId, queryKey: getGetPointsQueryKey(profileId!) }
  });

  const failedPaymentJobIds = new Set(
    (thankMessages ?? [])
      .filter(t => t.paymentStatus === "failed")
      .map(t => t.jobId)
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
                <p className="text-3xl font-bold">{isPointsLoading ? "..." : (points?.balance || 0)}</p>
              </div>
              <Gift size={32} className="opacity-50" />
            </CardContent>
          </Card>
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
