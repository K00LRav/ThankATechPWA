import { Link } from "wouter";
import { useGetPlatformStats, useGetRecentThanks } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, ThumbsUp, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import { useMyProfile } from "@/hooks/useMyProfile";

export function Home() {
  const { data: stats } = useGetPlatformStats();
  const { data: recentThanks } = useGetRecentThanks();
  const { user } = useAuth();
  const { data: profileData } = useMyProfile();
  const profile = profileData?.profile;

  const heroCTAs = (() => {
    if (user && profile) {
      if (profile.userType === "technician") {
        return (
          <Button size="lg" asChild className="rounded-full text-base px-8">
            <Link href="/technician/dashboard">Tech Portal</Link>
          </Button>
        );
      }
      return (
        <Button size="lg" asChild className="rounded-full text-base px-8">
          <Link href="/customer/dashboard">My Dashboard</Link>
        </Button>
      );
    }
    return (
      <>
        <Button size="lg" asChild className="rounded-full text-base px-8">
          <Link href="/browse">Find a Technician</Link>
        </Button>
        <Button size="lg" variant="outline" asChild className="rounded-full text-base px-8 bg-background">
          <Link href="/login">Join as Technician</Link>
        </Button>
      </>
    );
  })();

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col">
      <section className="bg-primary/5 py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-tight">
              Real thanks. <br />
              <span className="text-primary">Real tips.</span> <br />
              No ratings.
            </h1>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Replace toxic review systems with genuine human gratitude. Send heartfelt messages and optional tips to the technicians who make your life easier.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-wrap justify-center gap-4">
            {heroCTAs}
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StatsCard icon={<Heart className="text-primary" />} label="Total Thanks" value={stats?.totalThanks?.toLocaleString() || "..."} />
            <StatsCard icon={<Users className="text-secondary" />} label="Technicians" value={stats?.totalTechnicians?.toLocaleString() || "..."} />
            <StatsCard icon={<DollarSign className="text-green-600" />} label="Tips Sent" value={`$${(stats?.totalTipsAmount || 0).toLocaleString()}`} />
            <StatsCard icon={<ThumbsUp className="text-blue-500" />} label="Jobs Completed" value={stats?.totalJobs?.toLocaleString() || "..."} />
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-muted/30 flex-1">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-serif font-bold text-center mb-12">Recent Gratitude</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentThanks?.map((thank, i) => (
              <motion.div key={thank.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="h-full bg-background/50 backdrop-blur border-primary/10 hover:shadow-md transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">To: {thank.technicianName}</p>
                        <p className="text-sm text-muted-foreground">From: {thank.customerName}</p>
                      </div>
                      {thank.tipAmount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <DollarSign size={12} />
                          {thank.tipAmount} Tip
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground italic leading-relaxed">"{thank.message}"</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatsCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 space-y-2 rounded-2xl bg-card border shadow-sm">
      <div className="p-3 bg-muted rounded-full">
        {icon}
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}