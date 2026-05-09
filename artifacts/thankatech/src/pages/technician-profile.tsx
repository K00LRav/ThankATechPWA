import { useParams, Link } from "wouter";
import { 
  useGetTechnician, 
  useGetTechnicianWallOfThanks, 
  useGetTechnicianStats,
  getGetTechnicianQueryKey,
  getGetTechnicianWallOfThanksQueryKey,
  getGetTechnicianStatsQueryKey
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MapPin, Wrench, Award, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function TechnicianProfile() {
  const params = useParams();
  const id = Number(params.id);

  const { data: tech, isLoading: isTechLoading } = useGetTechnician(id, { query: { enabled: !!id, queryKey: getGetTechnicianQueryKey(id) }});
  const { data: stats, isLoading: isStatsLoading } = useGetTechnicianStats(id, { query: { enabled: !!id, queryKey: getGetTechnicianStatsQueryKey(id) }});
  const { data: thanks, isLoading: isThanksLoading } = useGetTechnicianWallOfThanks(id, { query: { enabled: !!id, queryKey: getGetTechnicianWallOfThanksQueryKey(id) }});

  if (isTechLoading || isStatsLoading || isThanksLoading) {
    return <div className="p-8 space-y-8"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>;
  }

  if (!tech) return <div className="p-12 text-center text-muted-foreground">Technician not found</div>;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 pb-16">
      <div className="bg-primary/10 pt-16 pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
            <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
              <AvatarImage src={tech.avatarUrl || ''} />
              <AvatarFallback className="text-4xl bg-primary text-primary-foreground font-serif">
                {tech.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-4 flex-1">
              <div>
                <h1 className="text-4xl font-serif font-bold text-foreground">{tech.fullName}</h1>
                <p className="text-xl text-secondary font-medium mt-1">{tech.specialty}</p>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin size={16}/> {tech.serviceArea}</span>
                <span className="flex items-center gap-1.5 text-primary"><Heart size={16} fill="currentColor"/> {stats?.totalThanks || 0} Thanks</span>
                {tech.hourlyRate && <span className="flex items-center gap-1.5"><DollarSign size={16}/> ${tech.hourlyRate}/hr</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 -mt-8 space-y-8">
        <Card className="shadow-md border-0">
          <CardContent className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-serif font-bold mb-3">About Me</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{tech.bio}</p>
            </div>
            
            {(tech.specialties?.length || tech.certifications?.length) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                {tech.specialties && tech.specialties.length > 0 && (
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3"><Wrench size={18} className="text-secondary"/> Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {tech.specialties.map(s => (
                        <span key={s} className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {tech.certifications && tech.certifications.length > 0 && (
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3"><Award size={18} className="text-primary"/> Certifications</h3>
                    <ul className="space-y-2">
                      {tech.certifications.map(c => (
                        <li key={c} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-3xl font-serif font-bold text-center flex items-center justify-center gap-3">
            <Heart className="text-primary" fill="currentColor" />
            Wall of Thanks
            <Heart className="text-primary" fill="currentColor" />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {thanks?.map((thank) => (
              <Card key={thank.id} className="bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <p className="text-lg italic text-foreground leading-relaxed">"{thank.message}"</p>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground">— {thank.customerName}</p>
                    {thank.tipAmount > 0 && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <DollarSign size={14} />
                        {thank.tipAmount} Tip
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {thanks?.length === 0 && (
              <div className="col-span-full text-center py-12 bg-muted/50 rounded-2xl border border-dashed">
                <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-lg text-muted-foreground">No thanks yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}