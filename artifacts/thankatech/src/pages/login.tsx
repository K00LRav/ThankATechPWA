import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Wrench, User, Mail, Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

type Tab = "login" | "register";
type UserType = "customer" | "technician";

export function Login() {
  const [tab, setTab] = useState<Tab>("login");
  const [userType, setUserType] = useState<UserType>("customer");
  const [, setLocation] = useLocation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (userType === "customer") {
      setLocation("/customer/dashboard");
    } else {
      setLocation("/technician/dashboard");
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
          <h1 className="text-3xl font-serif font-bold">
            {tab === "login" ? "Welcome back" : "Join ThankATech"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {tab === "login"
              ? "Sign in to continue spreading gratitude"
              : "Start building meaningful connections through gratitude"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex rounded-xl border border-border/60 p-1 bg-muted/30">
                <button
                  data-testid="tab-login"
                  onClick={() => setTab("login")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    tab === "login"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  data-testid="tab-register"
                  onClick={() => setTab("register")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    tab === "register"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {tab === "register" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">I am a...</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      data-testid="button-type-customer"
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
                        I need service done
                      </span>
                    </button>
                    <button
                      data-testid="button-type-technician"
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
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === "register" && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      data-testid="input-fullname"
                      type="text"
                      placeholder="Full name"
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background focus:border-primary outline-none text-sm transition-colors"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    data-testid="input-email"
                    type="email"
                    placeholder="Email address"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background focus:border-primary outline-none text-sm transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    data-testid="input-password"
                    type="password"
                    placeholder="Password"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background focus:border-primary outline-none text-sm transition-colors"
                  />
                </div>

                <Button
                  data-testid="button-submit-auth"
                  type="submit"
                  className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-sm font-medium"
                >
                  {tab === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                {tab === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setTab(tab === "login" ? "register" : "login")}
                  className="text-primary hover:underline font-medium"
                >
                  {tab === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
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
