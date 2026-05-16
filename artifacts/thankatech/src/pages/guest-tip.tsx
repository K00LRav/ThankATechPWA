import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetTechnician, useGetStripeConfig, getGetTechnicianQueryKey, getGetStripeConfigQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, DollarSign, CheckCircle, ArrowLeft, Lock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const TIP_PRESETS = [5, 10, 20, 50];

type Step = "message" | "tip" | "pay" | "done";

// ─── Inner Stripe payment form ────────────────────────────────────────────────

interface GuestPaymentFormProps {
  tipAmount: number;
  techName: string;
  guestTipId: number;
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function GuestPaymentForm({ tipAmount, techName, guestTipId, paymentIntentId, onSuccess, onError }: GuestPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/guest-tips/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestTipId, paymentIntentId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to confirm payment");
      }
      onSuccess();
    } catch (err) {
      onError("Payment processed but we couldn't save it. Please contact support.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Secure payment — 91% goes directly to {techName.split(" ")[0]}
        </p>
        <PaymentElement />
      </div>

      {(errorMessage) && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full h-12 text-base rounded-full bg-primary hover:bg-primary/90"
      >
        {isProcessing ? "Processing..." : `Pay $${tipAmount.toFixed(2)} tip`}
        <Heart className="w-4 h-4 ml-2" fill="currentColor" />
      </Button>
    </form>
  );
}

// ─── Main guest tip page ──────────────────────────────────────────────────────

export function GuestTip() {
  const params = useParams<{ technicianId: string }>();
  const [, setLocation] = useLocation();
  const technicianId = Number(params.technicianId);

  const [step, setStep] = useState<Step>("message");
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Payment state
  const [guestTipId, setGuestTipId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const { data: tech, isLoading: techLoading } = useGetTechnician(technicianId, {
    query: { enabled: !!technicianId, queryKey: getGetTechnicianQueryKey(technicianId) },
  });
  const { data: stripeConfig } = useGetStripeConfig({
    query: { queryKey: getGetStripeConfigQueryKey(), retry: false },
  });

  useEffect(() => {
    if (stripeConfig?.publishableKey) {
      setStripePromise(loadStripe(stripeConfig.publishableKey));
    }
  }, [stripeConfig?.publishableKey]);

  const techName = tech?.fullName ?? "Technician";
  const techInitials = techName.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
  const finalTip = tipAmount !== null ? tipAmount : (customTip ? parseFloat(customTip) || 0 : 0);

  // ── Step 2 → Step 3: initialise guest tip + optionally create PaymentIntent ──
  async function handleProceedToPayment(tip: number) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/guest-tips/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId,
          guestName: guestName.trim(),
          message: message.trim(),
          tipAmount: tip,
        }),
      });
      const body = await res.json() as {
        guestTipId?: number;
        clientSecret?: string;
        requiresPayment?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to submit");

      setGuestTipId(body.guestTipId ?? null);

      if (body.requiresPayment && body.clientSecret) {
        setClientSecret(body.clientSecret);
        // Extract PI id from client secret (format: pi_xxx_secret_yyy)
        setPaymentIntentId(body.clientSecret.split("_secret_")[0]);
        setStep("pay");
      } else {
        // No tip or message-only path already saved
        setStep("done");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSkipTip() {
    await handleProceedToPayment(0);
  }

  async function handleAddTip() {
    if (finalTip <= 0) return;
    await handleProceedToPayment(finalTip);
  }

  if (techLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium">Technician not found</p>
          <Button variant="outline" onClick={() => setLocation("/browse")}>Browse technicians</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background py-10 px-4">
      <div className="max-w-md mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            <Heart className="w-3 h-3" fill="currentColor" />
            ThankATech
          </div>
          <p className="text-sm text-muted-foreground">Send a thank you — no account needed</p>
        </div>

        {/* Technician card */}
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="w-14 h-14 bg-primary/10">
              {tech.avatarUrl && <AvatarImage src={tech.avatarUrl} alt={techName} />}
              <AvatarFallback className="text-primary font-semibold">{techInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{techName}</p>
              <p className="text-sm text-muted-foreground">{tech.specialty}</p>
              <p className="text-xs text-muted-foreground">{tech.serviceArea}</p>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <AnimatePresence mode="wait">

          {/* ── Step 1: Name + Message ── */}
          {step === "message" && (
            <motion.div
              key="message"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-serif font-bold">Write your message</h2>
                <p className="text-sm text-muted-foreground">Tell {techName.split(" ")[0]} what their work meant to you</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border-2 border-border bg-card focus:border-primary outline-none text-base transition-colors"
                />
                <Textarea
                  placeholder={`Write a heartfelt message for ${techName.split(" ")[0]}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[140px] resize-none text-base border-border/60 focus-visible:ring-primary/30"
                />
              </div>

              <Button
                onClick={() => setStep("tip")}
                disabled={!guestName.trim() || message.trim().length < 10}
                className="w-full h-12 text-base rounded-full bg-primary hover:bg-primary/90"
              >
                Continue
                <Heart className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Minimum 10 characters for a meaningful message
              </p>
            </motion.div>
          )}

          {/* ── Step 2: Tip amount ── */}
          {step === "tip" && (
            <motion.div
              key="tip"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <button
                onClick={() => setStep("message")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center"
                >
                  <DollarSign className="w-8 h-8 text-secondary" />
                </motion.div>
                <h2 className="text-2xl font-serif font-bold">Add a tip?</h2>
                <p className="text-sm text-muted-foreground">Show your appreciation. Completely optional.</p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {TIP_PRESETS.map((amount) => (
                  <motion.button
                    key={amount}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setTipAmount(tipAmount === amount ? null : amount); setCustomTip(""); }}
                    className={`h-14 rounded-xl font-semibold text-lg border-2 transition-all ${
                      tipAmount === amount
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-card hover:border-primary/50 text-foreground"
                    }`}
                  >
                    ${amount}
                  </motion.button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={customTip}
                  onChange={(e) => { setCustomTip(e.target.value); setTipAmount(null); }}
                  className="w-full h-12 pl-8 pr-4 rounded-xl border-2 border-border bg-card focus:border-primary outline-none text-base transition-colors"
                />
              </div>

              {finalTip > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-secondary/5 border border-secondary/20 rounded-2xl px-4 py-3 text-sm text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-1"
                >
                  <span>
                    <span className="font-medium text-foreground">{techName.split(" ")[0]} receives</span>{" "}
                    ${(finalTip * 0.91).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                  <span>Platform fee ${(finalTip * 0.09).toFixed(2)}</span>
                  <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                  <span><span className="font-medium text-foreground">Total</span> ${finalTip.toFixed(2)}</span>
                </motion.div>
              )}

              {submitError && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20">
                  {submitError}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleAddTip}
                  disabled={finalTip <= 0 || isSubmitting}
                  className="w-full h-12 text-base rounded-full bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? "Submitting..." : `Add $${finalTip > 0 ? finalTip.toFixed(2) : "—"} tip`}
                  <Heart className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkipTip}
                  disabled={isSubmitting}
                  className="w-full h-10 text-sm text-muted-foreground rounded-full"
                >
                  {isSubmitting ? "Submitting..." : "Skip tip, just send the message"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Stripe payment ── */}
          {step === "pay" && clientSecret && guestTipId && paymentIntentId && (
            <motion.div
              key="pay"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center"
                >
                  <DollarSign className="w-8 h-8 text-secondary" />
                </motion.div>
                <h2 className="text-2xl font-serif font-bold">Complete your tip</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">${finalTip.toFixed(2)}</span> for {techName.split(" ")[0]}. Your message has been sent!
                </p>
              </div>

              <div className="bg-secondary/5 border border-secondary/20 rounded-2xl px-4 py-3 text-sm text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-1">
                <span>
                  <span className="font-medium text-foreground">{techName.split(" ")[0]} receives</span>{" "}
                  ${(finalTip * 0.91).toFixed(2)}
                </span>
                <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                <span>Platform fee ${(finalTip * 0.09).toFixed(2)}</span>
                <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                <span><span className="font-medium text-foreground">Total</span> ${finalTip.toFixed(2)}</span>
              </div>

              {paymentError && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20">
                  {paymentError}
                </div>
              )}

              {stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <GuestPaymentForm
                    tipAmount={finalTip}
                    techName={techName}
                    guestTipId={guestTipId}
                    paymentIntentId={paymentIntentId}
                    onSuccess={() => setStep("done")}
                    onError={(msg) => setPaymentError(msg)}
                  />
                </Elements>
              )}
            </motion.div>
          )}

          {/* ── Step 4: Celebration ── */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="text-center space-y-6 py-8"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
              >
                {finalTip > 0
                  ? <Sparkles className="w-12 h-12 text-primary" />
                  : <CheckCircle className="w-12 h-12 text-primary" />
                }
              </motion.div>

              <div className="space-y-3">
                <h2 className="text-3xl font-serif font-bold">
                  {finalTip > 0 ? "Thank you sent!" : "Message sent!"}
                </h2>
                <p className="text-muted-foreground">
                  {finalTip > 0
                    ? `Your message and $${finalTip.toFixed(2)} tip are on their way to ${techName.split(" ")[0]}.`
                    : `Your heartfelt message is on its way to ${techName.split(" ")[0]}.`
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Great techs deserve recognition. Real thanks. Real tips. No ratings.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setLocation(`/technician/${technicianId}`)}
                  variant="outline"
                  className="w-full h-11 rounded-full"
                >
                  View {techName.split(" ")[0]}'s profile
                </Button>
                <Button
                  onClick={() => setLocation("/browse")}
                  variant="ghost"
                  className="w-full h-11 rounded-full text-muted-foreground"
                >
                  Browse other technicians
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
