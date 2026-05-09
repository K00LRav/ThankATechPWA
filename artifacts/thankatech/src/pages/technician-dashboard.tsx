import { useListJobs, useGetTechnicianStats, getListJobsQueryKey, getGetTechnicianStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, DollarSign, CheckCircle2, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const DEMO_TECH_ID = 1;

export function TechnicianDashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetTechnicianStats(DEMO_TECH_ID, {
    query: { enabled: true, queryKey: getGetTechnicianStatsQueryKey(DEMO_TECH_ID) }
  });
  
  const { data: jobs, isLoading: isJobsLoading } = useListJobs(
    { technicianId: DEMO_TECH_ID },
    { query: { enabled: true, queryKey: getListJobsQueryKey({ technicianId: DEMO_TECH_ID }) } }
  );

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Tech Portal</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's how you're doing.</p>
        </div>

        {isStatsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Heart className="text-primary"/>} title="Total Thanks" value={stats?.totalThanks || 0} />
            <StatCard icon={<DollarSign className="text-green-600"/>} title="Tips Earned" value={`$${stats?.totalTips || 0}`} />
            <StatCard icon={<TrendingUp className="text-blue-500"/>} title="Avg Tip" value={`$${stats?.avgTipAmount || 0}`} />
            <StatCard icon={<CheckCircle2 className="text-secondary"/>} title="Jobs Completed" value={stats?.totalJobs || 0} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">Active Jobs</h2>
            
            {isJobsLoading ? (
              <div className="space-y-4">
                {[1,2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
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

function StatCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: string | number }) {
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