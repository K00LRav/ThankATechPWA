import { useState } from "react";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { technicianPageTitle, technicianPageDescription, canonicalUrl } from "@/lib/seo";
import { toast } from "sonner";
import { 
  useGetTechnician, 
  useGetTechnicianWallOfThanks, 
  useGetTechnicianStats,
  useCreateJob,
  useSubmitClaimRequest,
  getGetTechnicianQueryKey,
  getGetTechnicianWallOfThanksQueryKey,
  getGetTechnicianStatsQueryKey
} from "@workspace/api-client-react";
import { useMyProfile } from "@/hooks/useMyProfile";
import { TechAvatar } from "@/components/TechAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, MapPin, Wrench, Award, DollarSign, CalendarPlus, CheckCircle, Clock, LayoutDashboard, Share2, Copy, Check, Flag, Phone, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

// ── Milestone badge definitions ───────────────────────────────────────────────
const MILESTONES = [
  { id: "first_thanks",        label: "First Thanks",        emoji: "🌱", min: 1   },
  { id: "rising_star",         label: "Rising Star",         emoji: "⭐", min: 10  },
  { id: "community_favorite",  label: "Community Favorite",  emoji: "💛", min: 25  },
  { id: "trusted_pro",         label: "Trusted Pro",         emoji: "🏅", min: 50  },
  { id: "elite_tech",          label: "Elite Tech",          emoji: "🏆", min: 100 },
] as const;

function getMilestoneBadge(totalThanks: number) {
  return [...MILESTONES].reverse().find(m => totalThanks >= m.min) ?? null;
}

type DialogStep = "form" | "confirmation";

export function TechnicianProfile() {
  const params = useParams();
  const id = Number(params.id);

  const { data: tech, isLoading: isTechLoading } = useGetTechnician(id, { query: { enabled: !!id, queryKey: getGetTechnicianQueryKey(id) }});
  const { data: stats, isLoading: isStatsLoading } = useGetTechnicianStats(id, { query: { enabled: !!id, queryKey: getGetTechnicianStatsQueryKey(id) }});
  const { data: thanks, isLoading: isThanksLoading } = useGetTechnicianWallOfThanks(id, { query: { enabled: !!id, queryKey: getGetTechnicianWallOfThanksQueryKey(id) }});
  const { data: profileEnvelope, isLoading: isProfileLoading } = useMyProfile();

  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<DialogStep>("form");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [confirmedTitle, setConfirmedTitle] = useState("");

  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [claimName, setClaimName] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPhone, setClaimPhone] = useState("");

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        setDialogStep("form");
        setTitle("");
        setDescription("");
        setAddress("");
        setConfirmedTitle("");
      }, 300);
    }
  }

  const { mutate: submitClaim, isPending: isClaimPending } = useSubmitClaimRequest({
    mutation: {
      onSuccess: () => {
        setClaimDone(true);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast.error(msg ?? "Failed to submit claim request");
      },
    },
  });

  function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    submitClaim({ id, data: { claimantName: claimName.trim(), claimantEmail: claimEmail.trim(), claimantPhone: claimPhone.trim() } });
  }

  const { mutate: createJob, isPending } = useCreateJob({
    mutation: {
      onSuccess: () => {
        setConfirmedTitle(title.trim());
        setDialogStep("confirmation");
      },
      onError: () => {
        toast.error("Failed to send request", {
          description: "Something went wrong. Please try again.",
        });
      },
    },
  });

  const profile = profileEnvelope?.profile;
  const isCustomer = profile?.userType === "customer";
  const profileSettled = !isProfileLoading;

  const profileUrl = `https://www.thankatech.com/technician/${id}`;

  function copyShareLink() {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.profileId || !id || !tech) return;
    createJob({
      data: {
        customerId: profile.profileId,
        technicianId: id,
        title: title.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
      },
    });
  }

  if (isTechLoading || isStatsLoading || isThanksLoading) {
    return <div className="p-8 space-y-8"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>;
  }

  if (!tech) return <div className="p-12 text-center text-muted-foreground">Technician not found</div>;

  const seoTitle = technicianPageTitle(tech.fullName, tech.specialty, tech.serviceArea);
  const seoDesc = technicianPageDescription(tech.fullName, tech.specialty, tech.serviceArea, stats?.totalThanks ?? 0);
  const seoCanonical = canonicalUrl(`/technician/${id}`);

  return (
    <>
    <Helmet>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      <link rel="canonical" href={seoCanonical} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDesc} />
      <meta property="og:url" content={seoCanonical} />
      <meta property="og:type" content="profile" />
      {tech.avatarUrl && <meta property="og:image" content={tech.avatarUrl} />}
    </Helmet>
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/10 pb-16">
      <div className="bg-primary/10 pt-16 pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
            <TechAvatar
              avatarUrl={tech.avatarUrl}
              fullName={tech.fullName}
              specialty={tech.specialty}
              className="w-32 h-32 border-4 border-background shadow-lg"
              iconSize={48}
            />
            <div className="space-y-4 flex-1">
              <div>
                <h1 className="text-4xl font-serif font-bold text-foreground">{tech.fullName}</h1>
                <p className="text-xl text-secondary font-medium mt-1">{tech.specialty}</p>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin size={16}/> {tech.serviceArea}</span>
                <span className="flex items-center gap-1.5 text-primary"><Heart size={16} fill="currentColor"/> {stats?.totalThanks || 0} Thanks</span>
                {tech.hourlyRate && <span className="flex items-center gap-1.5"><DollarSign size={16}/> ${tech.hourlyRate}/hr</span>}
                {tech.phone && (
                  <a href={`tel:${tech.phone}`} className="flex items-center gap-1.5 text-secondary font-medium hover:underline">
                    <Phone size={16}/> {tech.phone}
                  </a>
                )}
                {tech.website && (
                  <a href={tech.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-secondary font-medium hover:underline">
                    <Globe size={16}/> Website
                  </a>
                )}
                {(() => {
                  const badge = getMilestoneBadge(stats?.totalThanks ?? 0);
                  return badge ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {badge.emoji} {badge.label}
                    </span>
                  ) : null;
                })()}
              </div>
              {isCustomer && (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="mt-2 gap-2"
                  size="lg"
                >
                  <CalendarPlus size={18} />
                  Request Service
                </Button>
              )}
              {profileSettled && !profile && (
                <Link href="/login">
                  <Button variant="outline" size="lg" className="mt-2 gap-2">
                    <CalendarPlus size={18} />
                    Sign in to Request Service
                  </Button>
                </Link>
              )}

              {/* Share profile */}
              <div className="flex justify-center md:justify-start pt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-background/70 border-border">
                      <Share2 size={14} /> Share profile
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="start">
                    <div className="space-y-0.5">
                      <button
                        onClick={copyShareLink}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors text-left"
                      >
                        {shareLinkCopied ? <Check size={14} className="text-green-600 shrink-0" /> : <Copy size={14} className="shrink-0" />}
                        {shareLinkCopied ? "Copied!" : "Copy link"}
                      </button>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${tech.fullName} on ThankATech! ${profileUrl}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                      >
                        <span className="font-bold text-sm leading-none shrink-0 w-4 text-center">𝕏</span> Post on X
                      </a>
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                      >
                        <span className="font-bold text-sm leading-none shrink-0 w-4 text-center text-blue-600">f</span> Facebook
                      </a>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Check out ${tech.fullName} on ThankATech! ${profileUrl}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                      >
                        <span className="text-sm leading-none shrink-0 w-4 text-center">💬</span> WhatsApp
                      </a>
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                      >
                        <span className="font-bold text-sm leading-none shrink-0 w-4 text-center text-blue-700">in</span> LinkedIn
                      </a>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 -mt-8 space-y-8">

        {/* Unclaimed profile banner */}
        {tech.claimed === false && !tech.claimRequestPending && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Flag size={18} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">Is this your business? Claim this profile to manage it.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100" onClick={() => setClaimDialogOpen(true)}>
              Claim profile
            </Button>
          </div>
        )}
        {tech.claimRequestPending && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-center gap-3">
            <Clock size={18} className="text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800 font-medium">A claim request is pending review for this profile.</p>
          </div>
        )}

        <Card className="shadow-md border-0">
          <CardContent className="p-8 space-y-6">
            {/* Milestone badges strip */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Thank You Milestones</h2>
              <div className="flex flex-wrap gap-2">
                {MILESTONES.map(m => {
                  const earned = (stats?.totalThanks ?? 0) >= m.min;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        earned
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-muted/50 border-border text-muted-foreground opacity-50"
                      }`}
                      title={earned ? `Earned at ${m.min} thanks` : `Unlocks at ${m.min} thanks`}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                      {!earned && <span className="text-[10px] opacity-70">({m.min}+)</span>}
                    </div>
                  );
                })}
              </div>
            </div>

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-muted-foreground">— {thank.customerName}</p>
                      {(thank.customerBadges ?? []).includes("top_supporter") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ⭐ Top Supporter
                        </span>
                      )}
                    </div>
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <AnimatePresence mode="wait">
            {dialogStep === "form" ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Request Service</DialogTitle>
                  <DialogDescription>
                    Send a service request to {tech.fullName}. They'll be notified and can confirm your booking.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">What do you need help with? *</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Fix leaking kitchen faucet"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Additional details</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the issue or any other details..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Service address</Label>
                    <Input
                      id="address"
                      placeholder="e.g. 123 Main St, Springfield"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isPending}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending || !title.trim()}>
                      {isPending ? "Sending..." : "Send Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center text-center gap-6 py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                >
                  <CheckCircle className="w-16 h-16 text-secondary" strokeWidth={1.5} />
                </motion.div>

                <div className="space-y-1">
                  <h2 className="font-serif text-2xl font-bold text-foreground">Request Sent!</h2>
                  <p className="text-muted-foreground text-sm">
                    Your booking request is on its way to {tech.fullName}.
                  </p>
                </div>

                <div className="w-full rounded-xl border bg-muted/40 p-4 text-left space-y-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service</p>
                    <p className="font-semibold text-foreground">{confirmedTitle}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Technician</p>
                    <p className="font-semibold text-foreground">{tech.fullName}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Clock size={14} className="text-amber-500 shrink-0" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Pending review</span>
                    <span className="text-xs text-muted-foreground ml-auto">Waiting for technician</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  You'll be notified once {tech.fullName.split(" ")[0]} accepts your request. In the meantime you can track it on your dashboard.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Link href="/customer/dashboard" className="flex-1">
                    <Button className="w-full gap-2" onClick={() => handleDialogOpenChange(false)}>
                      <LayoutDashboard size={16} />
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Button variant="outline" className="flex-1" onClick={() => handleDialogOpenChange(false)}>
                    Stay here
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Claim profile dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={(open) => { setClaimDialogOpen(open); if (!open) { setClaimDone(false); setClaimName(""); setClaimEmail(""); setClaimPhone(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Claim this profile</DialogTitle>
            <DialogDescription>
              {claimDone
                ? "We've received your request and will review it shortly."
                : `Is "${tech.fullName}" your business? Submit your details and we'll verify and hand over the profile.`}
            </DialogDescription>
          </DialogHeader>

          {claimDone ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle className="w-14 h-14 text-secondary" strokeWidth={1.5} />
              <div>
                <p className="font-semibold text-lg">Request received!</p>
                <p className="text-muted-foreground text-sm mt-1">We'll reach out to you within 1–2 business days to verify ownership.</p>
              </div>
              <Button className="mt-2" onClick={() => setClaimDialogOpen(false)}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleClaimSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="claim-name">Your full name</Label>
                <Input id="claim-name" placeholder="Jane Smith" value={claimName} onChange={e => setClaimName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-email">Business email</Label>
                <Input id="claim-email" type="email" placeholder="you@yourbusiness.com" value={claimEmail} onChange={e => setClaimEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-phone">Business phone</Label>
                <Input id="claim-phone" type="tel" placeholder="+1 (555) 000-0000" value={claimPhone} onChange={e => setClaimPhone(e.target.value)} required />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setClaimDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isClaimPending} className="gap-2">
                  {isClaimPending ? "Submitting…" : "Submit claim request"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
