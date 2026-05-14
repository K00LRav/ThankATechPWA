import { Link } from "wouter";
import { Heart, Star, DollarSign, Shield, Users, Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function About() {
  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Heart size={14} fill="currentColor" />
            Real thanks. Real tips. No ratings.
          </div>
          <h1 className="font-serif text-5xl font-bold text-foreground mb-6 leading-tight">
            Gratitude-first,<br />not review-first
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            ThankATech is a marketplace built around one simple idea: when a technician does great work, they deserve to hear it — and to be tipped for it.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-3xl font-bold text-foreground mb-4">The broken status quo</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Most platforms make technicians anxious about star ratings. One difficult customer — maybe someone impossible to please — can tank a professional's reputation overnight, regardless of the quality of their work.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Technicians end up performing for the algorithm instead of focusing on the job. That's backwards. We built something different.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: Star, label: "No star ratings", desc: "No one-star revenge reviews from unreasonable customers" },
                { icon: Shield, label: "No public scores", desc: "Reputation built on real gratitude, not algorithmic rankings" },
                { icon: Users, label: "No anonymous reviews", desc: "Every thank you is a real message from a real customer" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex gap-4 p-4 rounded-xl border bg-muted/30">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{label}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl font-bold text-foreground mb-3">How it works</h2>
            <p className="text-muted-foreground">Simple for customers, meaningful for technicians.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            {/* Customer side */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Users size={15} className="text-white" />
                </div>
                <h3 className="font-semibold text-foreground">For customers</h3>
              </div>
              <ol className="space-y-5">
                {[
                  { step: "1", title: "Browse technicians", desc: "Search by specialty, name, or service area to find the right person for the job." },
                  { step: "2", title: "Book a job", desc: "Send a request with the job details. The technician accepts or declines." },
                  { step: "3", title: "Say thank you", desc: "When the job is complete, write a heartfelt message. Add an optional tip if you want to go the extra mile." },
                ].map(({ step, title, desc }) => (
                  <li key={step} className="flex gap-4">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {/* Technician side */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Wrench size={15} className="text-white" />
                </div>
                <h3 className="font-semibold text-foreground">For technicians</h3>
              </div>
              <ol className="space-y-5">
                {[
                  { step: "1", title: "Create your profile", desc: "List your specialties, service area, and bio. Your profile is public and searchable right away." },
                  { step: "2", title: "Accept jobs", desc: "Review incoming requests and accept the ones that fit your schedule and skills." },
                  { step: "3", title: "Earn tips & build your Wall of Thanks", desc: "Receive Stripe payouts directly. Every thank you message goes on your public Wall of Thanks." },
                ].map(({ step, title, desc }) => (
                  <li key={step} className="flex gap-4">
                    <span className="w-7 h-7 rounded-full bg-secondary/10 text-secondary text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Tips & payouts */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-8">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-5">
                <DollarSign size={22} className="text-secondary" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-foreground mb-3">Transparent tip payouts</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Tips go straight to the technician via Stripe. We take a small 9% platform fee — that's it. No hidden charges, no payment delays.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Customer tip", value: "$25.00" },
                  { label: "Platform fee", value: "–$2.25" },
                  { label: "Tech receives", value: "$22.75" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl p-3 border border-secondary/10">
                    <p className="font-bold text-lg text-secondary">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-serif text-3xl font-bold text-foreground mb-4">Built for the people who keep things running</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Electricians, HVAC techs, plumbers, appliance repair pros — the skilled tradespeople who show up, solve the problem, and get on with it. They rarely get a "thank you." ThankATech changes that.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                A genuine message from a satisfied customer, displayed publicly on their Wall of Thanks, is worth more than any star rating. We think skilled professionals deserve that recognition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-white/80 text-lg mb-10">
            Whether you need a technician or you are one — ThankATech is for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/browse">
              <Button size="lg" variant="secondary" className="rounded-full font-semibold px-8 gap-2">
                Find a technician
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="rounded-full font-semibold px-8 border-white text-white hover:bg-white hover:text-primary">
                Join as a technician
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
