import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    // 1. Catch database trigger errors returned in URL hash from Supabase
    const hash = window.location.hash;
    if (hash.includes("error_description=")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const errDesc = params.get("error_description");
      if (errDesc) {
        setAuthError(decodeURIComponent(errDesc));
      }
    }

    // 2. Fetch current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 3. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Client-side domain enforcement
    if (!email.toLowerCase().trim().endsWith("@copado.com")) {
      setAuthError("Access restricted. You must use a @copado.com email address.");
      return;
    }

    if (isSigningUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else alert("Account created! Check your email for verification.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground bg-background">
        Loading Command Center...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Copado CS Command Center</h2>
            <p className="text-xs text-muted-foreground">
              Sign in with your <strong className="text-foreground">@copado.com</strong> email
            </p>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs p-3 rounded-xl leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Copado Email</label>
              <input
                type="email"
                required
                placeholder="name@copado.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-xs hover:opacity-90 transition-all shadow-md"
            >
              {isSigningUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSigningUp(!isSigningUp);
                setAuthError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              {isSigningUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}