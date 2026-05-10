import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetJob,
  useGetTechnician,
  useCreateThankMessage,
  useCreateStripePaymentIntent,
  useRecordStripePaymentComplete,
  useGetStripeConfig,
  getGetJobQueryKey,
  getGetTechnicianQueryKey,
  getGetStripeConfigQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, DollarSign, CheckCircle, ArrowLeft, Star, Lock, ShieldAlert, Clock } from "lucide-react";
import { useMyProfile } from "@/hooks/useMyProfile";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const TIP_PRESETS = [5, 10, 20, 50];

type Step = "message" | "tip" | "payment" | "celebration";

function PaymentForm({
  clientSecret,
  paymentIntentId,
  thankMessageId,
  tipAmount,
  techName,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  paymentIntentId: string;
  thankMessageId: number;
  tipAmount: number;
  techName: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const recordComplete = useRecordStripePaymentComplete();
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
      await recordComplete.mutateAsync({
        data: { thankMessageId, paymentIntentId },
      });
      onSuccess();
    } catch {
      onError("Payment was processed but we couldn't save it. Please contact support.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Secure payment — 100% goes to {techName.split(" ")[0]}
        </p>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full h-12 text-base rounded-full bg-primary hover:bg-primary/90"
      >
        {isProcessing ? "Processing..." : `Pay $${tipAmount} tip`}
        <Heart className="w-4 h-4 ml-2" fill="currentColor" />
      </Button>
    </form>
  );
}

export function ThankFlow() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const jobId = Number(params.jobId);

  const [step, setStep] = useState<Step>("message");
  const [message, setMessage] = useState("");
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [thankMessageId, setThankMessageId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCancellingPayment, setIsCancellingPayment] = useState(false);

  const { data: myProfileData } = useMyProfile();
  const myProfile = myProfileData?.profile ?? null;

  const { data: job } = useGetJob(jobId, { query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId) } });
  const { data: tech } = useGetTechnician(
    job?.technicianId ?? 0,
    { query: { enabled: !!job?.technicianId, queryKey: getGetTechnicianQueryKey(job?.technicianId ?? 0) } }
  );
  const { data: stripeConfig } = useGetStripeConfig({
    query: { queryKey: getGetStripeConfigQueryKey(), retry: false },
  });

  const isNotOwner = job !== undefined && myProfile !== null && job.customerId !== myProfile.profileId;
  const isNotCompleted = job !== undefined && job.status !== "completed";

  useEffect(() => {
    if (stripeConfig?.publishableKey) {
      setStripePromise(loadStripe(stripeConfig.publishableKey));
    }
  }, [stripeConfig?.publishableKey]);

  const createThankMessage = useCreateThankMessage();
  const createPaymentIntent = useCreateStripePaymentIntent();

  const techName = tech?.fullName ?? job?.technicianName ?? "Your Technician";
  const techInitials = techName.split(" ").map((n: string) => n[0]).join("").slice(0, 2);

  const finalTip = tipAmount !== null ? tipAmount : (customTip ? parseFloat(customTip) || 0 : 0);

  async function handleSubmit(explicitTip?: number) {
    if (!job) return;
    setSubmitError(null);

    // Use explicitly-passed tip (e.g. from skip button) to avoid stale state
    const tipToCharge = explicitTip !== undefined ? explicitTip : finalTip;

    try {
      const result = await createThankMessage.mutateAsync({
        data: {
          jobId: job.id,
          customerId: job.customerId,
          technicianId: job.technicianId,
          message,
          tipAmount: tipToCharge,
        },
      });

      if (tipToCharge > 0 && job.technicianId) {
        try {
          const piResult = await createPaymentIntent.mutateAsync({
            data: {
              thankMessageId: result.id,
              amount: tipToCharge,
            },
          });
          setThankMessageId(result.id);
          setClientSecret(piResult.clientSecret);
          setPaymentIntentId(piResult.paymentIntentId);
          setStep("payment");
        } catch (piErr: unknown) {
          // PI creation failed (e.g. technician not onboarded, or network error).
          // The message was already saved — show an error and let them decide how to proceed.
          const msg = piErr instanceof Error ? piErr.message : "Unable to set up payment. You can skip the tip and your message will still be sent.";
          setThankMessageId(result.id);
          setSubmitError(msg);
        }
      } else {
        setStep("celebration");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setSubmitError("You don't have permission to send a thank you for this job. It may not belong to your account.");
      } else if (err instanceof ApiError && err.status === 409) {
        setSubmitError("This job isn't completed yet and can't be thanked. Go back to your dashboard to check its status.");
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setSubmitError(msg);
      }
    }
  }

  async function handleSkipPayment() {
    setIsCancellingPayment(true);
    if (thankMessageId) {
      try {
        await fetch("/api/stripe/payment-cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thankMessageId }),
        });
      } catch {
        // Non-fatal: if cancel fails, the PI will expire on Stripe's side automatically
      }
    }
    setIsCancellingPayment(false);
    setStep("celebration");
  }

  const isPending = createThankMessage.isPending || createPaymentIntent.isPending;

  if (isNotOwner) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">
              You can only send a thank you for jobs that belong to your account.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/customer/dashboard")}
            className="rounded-full px-8 bg-primary hover:bg-primary/90"
          >
            Back to dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  if (isNotCompleted) {
    const statusLabel =
      job?.status === "pending"
        ? "waiting for the technician to accept"
        : job?.status === "confirmed"
        ? "currently in progress"
        : job?.status === "declined"
        ? "declined"
        : "not yet complete";

    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Clock className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-foreground">Not ready yet</h1>
            <p className="text-muted-foreground">
              This job is {statusLabel}. You'll be able to send a thank you once it's marked as completed.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/customer/dashboard")}
            className="rounded-full px-8 bg-primary hover:bg-primary/90"
          >
            Back to dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {step === "message" && (
            <motion.div
              key="message"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <button
                onClick={() => setLocation("/customer/dashboard")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to dashboard
              </button>

              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Heart className="w-10 h-10 text-primary" fill="currentColor" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-foreground">
                    Say thank you to
                  </h1>
                  <p className="text-2xl font-serif font-semibold text-primary mt-1">{techName}</p>
                </div>
                <p className="text-muted-foreground">
                  For: <span className="font-medium text-foreground">{job?.title ?? "..."}</span>
                </p>
              </div>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-primary/10">
                      <AvatarFallback className="text-primary font-semibold text-sm">{techInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{techName}</p>
                      <p className="text-xs text-muted-foreground">{tech?.specialty ?? "Technician"}</p>
                    </div>
                  </div>
                  <Textarea
                    data-testid="input-thank-message"
                    placeholder={`Write a heartfelt message for ${techName.split(" ")[0]}... Tell them what their work meant to you.`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[140px] resize-none text-base border-border/60 focus-visible:ring-primary/30"
                  />
                </CardContent>
              </Card>

              <Button
                data-testid="button-next-to-tip"
                onClick={() => setStep("tip")}
                disabled={message.trim().length < 10}
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

          {step === "tip" && (
            <motion.div
              key="tip"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
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
                <p className="text-muted-foreground text-sm">
                  100% goes to {techName.split(" ")[0]}. Completely optional.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {TIP_PRESETS.map((amount) => (
                  <motion.button
                    key={amount}
                    whileTap={{ scale: 0.95 }}
                    data-testid={`button-tip-${amount}`}
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
                  data-testid="input-custom-tip"
                  placeholder="Custom amount"
                  value={customTip}
                  onChange={(e) => { setCustomTip(e.target.value); setTipAmount(null); }}
                  className="w-full h-12 pl-8 pr-4 rounded-xl border-2 border-border bg-card focus:border-primary outline-none text-base transition-colors"
                />
              </div>

              {submitError && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20">
                  {submitError}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  data-testid="button-send-thanks"
                  onClick={() => handleSubmit()}
                  disabled={isPending}
                  className="w-full h-12 text-base rounded-full bg-primary hover:bg-primary/90"
                >
                  {isPending ? "Preparing..." : `Send Thank You${finalTip > 0 ? ` + $${finalTip} tip` : ""}`}
                  <Heart className="w-4 h-4 ml-2" fill="currentColor" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleSubmit(0)}
                  disabled={isPending}
                  className="w-full h-10 text-sm text-muted-foreground rounded-full"
                >
                  Skip tip, just send the message
                </Button>
              </div>
            </motion.div>
          )}

          {step === "payment" && clientSecret && stripePromise && thankMessageId && paymentIntentId && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <button
                onClick={() => setStep("tip")}
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
                <h2 className="text-2xl font-serif font-bold">Complete your tip</h2>
                <p className="text-muted-foreground text-sm">
                  <span className="font-semibold text-foreground">${finalTip}</span> for {techName.split(" ")[0]}. Your message has been sent!
                </p>
              </div>

              {paymentError && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20">
                  {paymentError}
                </div>
              )}

              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  clientSecret={clientSecret}
                  paymentIntentId={paymentIntentId}
                  thankMessageId={thankMessageId}
                  tipAmount={finalTip}
                  techName={techName}
                  onSuccess={() => setStep("celebration")}
                  onError={(msg) => setPaymentError(msg)}
                />
              </Elements>

              <Button
                variant="ghost"
                onClick={handleSkipPayment}
                disabled={isCancellingPayment}
                className="w-full h-10 text-sm text-muted-foreground rounded-full"
              >
                {isCancellingPayment ? "Cancelling…" : "Skip payment, just send the message"}
              </Button>
            </motion.div>
          )}

          {step === "celebration" && (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="text-center space-y-8 py-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mx-auto w-28 h-28 rounded-full bg-primary flex items-center justify-center shadow-xl"
                >
                  <CheckCircle className="w-14 h-14 text-white" strokeWidth={2} />
                </motion.div>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0.5],
                      x: Math.cos((i / 6) * Math.PI * 2) * 80,
                      y: Math.sin((i / 6) * Math.PI * 2) * 80,
                    }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <Star className="w-5 h-5 text-primary fill-primary" />
                  </motion.div>
                ))}
              </div>

              <div className="space-y-3">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-serif font-bold text-foreground"
                >
                  Thank you sent!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-muted-foreground"
                >
                  {techName.split(" ")[0]} will feel this. You just made someone's day.
                </motion.p>
                {finalTip > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full font-semibold"
                  >
                    <DollarSign className="w-4 h-4" />
                    ${finalTip} tip on its way
                  </motion.div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-primary/5 rounded-2xl p-5 border border-primary/10"
              >
                <p className="text-sm font-medium text-primary mb-1">You earned ThankYou Points</p>
                <p className="text-3xl font-bold text-foreground">+15 pts</p>
                <p className="text-xs text-muted-foreground mt-1">Keep spreading gratitude to earn more</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <Button
                  onClick={() => setLocation("/customer/dashboard")}
                  className="rounded-full px-8 bg-primary hover:bg-primary/90"
                  data-testid="button-back-to-dashboard"
                >
                  Back to dashboard
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
