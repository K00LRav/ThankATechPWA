import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetThankMessage,
  useRetryStripePayment,
  useRecordStripePaymentComplete,
  useGetStripeConfig,
  getGetThankMessageQueryKey,
  getGetStripeConfigQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, DollarSign, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { getListThankMessagesQueryKey } from "@workspace/api-client-react";
import { useMyProfile } from "@/hooks/useMyProfile";

function RetryPaymentForm({
  paymentIntentId,
  thankMessageId,
  tipAmount,
  techName,
  onSuccess,
  onError,
}: {
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
          Secure payment — 91% goes to {techName.split(" ")[0]}
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
        {isProcessing ? "Processing..." : `Pay $${tipAmount.toFixed(2)} tip`}
      </Button>
    </form>
  );
}

export function RetryTip() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const thankMessageId = Number(params.thankMessageId);
  const queryClient = useQueryClient();

  const { data: profileEnvelope } = useMyProfile();
  const profileId = profileEnvelope?.profile?.profileId;

  const { data: thankMessage, isLoading, error: fetchError } = useGetThankMessage(thankMessageId, {
    query: { enabled: !!thankMessageId, queryKey: getGetThankMessageQueryKey(thankMessageId) },
  });

  const { data: stripeConfig } = useGetStripeConfig({
    query: { queryKey: getGetStripeConfigQueryKey(), retry: false },
  });

  const retryPayment = useRetryStripePayment();

  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [step, setStep] = useState<"init" | "payment" | "success">("init");
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (stripeConfig?.publishableKey) {
      setStripePromise(loadStripe(stripeConfig.publishableKey));
    }
  }, [stripeConfig?.publishableKey]);

  async function handleStartRetry() {
    setInitError(null);
    try {
      const result = await retryPayment.mutateAsync({
        data: { thankMessageId },
      });
      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.paymentIntentId);
      setStep("payment");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? "Failed to set up payment. Please try again.";
      setInitError(msg);
    }
  }

  function handleSuccess() {
    if (profileId) {
      queryClient.invalidateQueries({ queryKey: getListThankMessagesQueryKey({ customerId: profileId }) });
    }
    setStep("success");
  }

  function handlePaymentError(msg: string) {
    setInitError(msg);
    setStep("init");
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      </div>
    );
  }

  if (fetchError || !thankMessage) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold">Not found</h1>
            <p className="text-muted-foreground">
              This thank you message couldn't be found or doesn't belong to your account.
            </p>
          </div>
          <Button onClick={() => setLocation("/customer/dashboard")} className="rounded-full px-8 bg-primary hover:bg-primary/90">
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Only "failed" can be retried. "pending" means a live PI already exists —
  // creating another without canceling it risks a double charge.
  if (thankMessage.paymentStatus !== "failed") {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold">Nothing to retry</h1>
            <p className="text-muted-foreground">
              {thankMessage.paymentStatus === "succeeded"
                ? "Your tip payment already went through successfully."
                : "There is no failed payment to retry for this thank you."}
            </p>
          </div>
          <Button onClick={() => setLocation("/customer/dashboard")} className="rounded-full px-8 bg-primary hover:bg-primary/90">
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold">Tip sent!</h1>
            <p className="text-muted-foreground">
              Your ${(thankMessage.tipAmount as number).toFixed(2)} tip to{" "}
              <span className="font-semibold text-foreground">{thankMessage.technicianName}</span> is on its way.
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

  const tipAmount = thankMessage.tipAmount as number;
  const techName = thankMessage.technicianName ?? "your technician";

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <button
          onClick={() => setLocation("/customer/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
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
          <h1 className="text-2xl font-serif font-bold">Retry tip payment</h1>
          <p className="text-muted-foreground text-sm">
            Your thank you to <span className="font-semibold text-foreground">{techName}</span> was already sent.
            Complete the <span className="font-semibold text-foreground">${tipAmount.toFixed(2)}</span> tip below.
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40">
          <CardContent className="px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your previous tip payment failed. Your thank you message has already been delivered — this page only retries the payment.
            </p>
          </CardContent>
        </Card>

        {step === "init" && (
          <div className="space-y-4">
            {initError && (
              <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20">
                {initError}
              </div>
            )}
            <div className="bg-card rounded-2xl border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{techName.split(" ")[0]} receives (91%)</span>
                <span className="font-semibold">${(tipAmount * 0.91).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee (9%)</span>
                <span className="font-medium">${(tipAmount * 0.09).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>Total charged</span>
                <span>${tipAmount.toFixed(2)}</span>
              </div>
            </div>
            <Button
              onClick={handleStartRetry}
              disabled={retryPayment.isPending}
              className="w-full h-12 text-base rounded-full bg-primary hover:bg-primary/90"
            >
              {retryPayment.isPending ? "Setting up payment..." : "Continue to payment"}
            </Button>
          </div>
        )}

        {step === "payment" && clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <RetryPaymentForm
              paymentIntentId={paymentIntentId!}
              thankMessageId={thankMessageId}
              tipAmount={tipAmount}
              techName={techName}
              onSuccess={handleSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
