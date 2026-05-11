import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Wrench, User, LogIn, ArrowRight, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";

type UserType = "customer" | "technician";

const IS_DEV = import.meta.env.DEV;

function devLogin(role: "customer" | "technician") {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/auth/dev-login";
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "role";
  input.value = role;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

function DevLoginButtons() {
  return (
    <div className="space-y-3 pt-2 border-t border-border/40">
      <p className="text-center text-xs font-medium text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
        Dev Preview — no login required
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => devLogin("customer")}
          className="h-10 text-xs rounded-full border-primary/40 text-primary hover:bg-primary/5"
        >
          <Eye className="w-3 h-3 mr-1.5" />
          Preview as Customer
        </Button>
        <Button
          variant="outline"
          onClick={() => devLogin("technician")}
          className="h-10 text-xs rounded-full border-secondary/40 text-secondary hover:bg-secondary/5"
        >
          <Eye className="w-3 h-3 mr-1.5" />
          Preview as Technician
        </Button>
      </div>
    </div>
  );
}

export function Login() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();

  if (!isLoading && isAuthenticated) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-7 h-7 text-primary" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-serif font-bold">Welcome to ThankATech</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to start spreading gratitude to the technicians who keep your world running.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 border border-border/40">
                  <User className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium">Customer</span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">Book services & say thank you</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 border border-border/40">
                  <Wrench className="w-6 h-6 text-secondary" />
                  <span className="text-sm font-medium">Technician</span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">Provide services & earn tips</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={login}
                  disabled={isLoading}
                  className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-sm font-medium"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoading ? "Loading..." : "Sign In to Continue"}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  New users will be asked to choose their role after signing in.
                </p>
              </div>

              {IS_DEV && <DevLoginButtons />}
            </CardContent>
          </Card>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground"
        >
          Free to join. Free for technicians. Always.
        </motion.p>
      </div>
    </div>
  );
}

export function Onboard() {
  const [userType, setUserType] = useState<UserType>("customer");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/profile/me", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType, fullName, specialty, serviceArea }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.userType === "technician") {
          setLocation("/technician/dashboard");
        } else {
          setLocation("/customer/dashboard");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-7 h-7 text-primary" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-serif font-bold">Almost there!</h1>
          <p className="text-muted-foreground text-sm">
            Tell us a bit about yourself to set up your account.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">I am a...</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserType("customer")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      userType === "customer"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <User className={`w-6 h-6 ${userType === "customer" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${userType === "customer" ? "text-primary" : "text-foreground"}`}>
                      Customer
                    </span>
                    <span className="text-xs text-muted-foreground text-center leading-tight">
                      I need services done
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("technician")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      userType === "technician"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Wrench className={`w-6 h-6 ${userType === "technician" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${userType === "technician" ? "text-primary" : "text-foreground"}`}>
                      Technician
                    </span>
                    <span className="text-xs text-muted-foreground text-center leading-tight">
                      I provide services
                    </span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background focus:border-primary outline-none text-sm transition-colors"
                  />
                </div>

                {userType === "technician" && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Specialty</label>
                      <input
                        type="text"
                        value={specialty}
                        onChange={e => setSpecialty(e.target.value)}
                        placeholder="e.g. Electrician, Plumber, HVAC"
                        className="w-full h-11 px-4 rounded-lg border border-border bg-background focus:border-primary outline-none text-sm transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Service Area</label>
                      <input
                        type="text"
                        value={serviceArea}
                        onChange={e => setServiceArea(e.target.value)}
                        placeholder="e.g. Downtown, Metro Area"
                        className="w-full h-11 px-4 rounded-lg border border-border bg-background focus:border-primary outline-none text-sm transition-colors"
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-sm font-medium"
                >
                  {isSubmitting ? "Setting up..." : "Get Started"}
                  {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
