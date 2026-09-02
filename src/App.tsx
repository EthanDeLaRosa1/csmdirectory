import React, { useEffect, useState } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { supabase } from "@/lib/supabase";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const email = session?.user?.email;
    if (email && !email.toLowerCase().endsWith("@copado.com")) {
      // Enforce domain restriction for existing sessions
      setError("Access restricted. You must use a @copado.com email address.");
      supabase.auth.signOut();
      setSession(null);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Enforce @copado.com email domain
    if (!email.toLowerCase().trim().endsWith("@copado.com")) {
      setError("Access restricted. You must use a @copado.com email address.");
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        alert("Account created! You can now log in.");
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground bg-background font-sans">
        Loading Command Center...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background font-sans">
        <div className="w-full max-w-sm border border-border p-6 rounded-2xl shadow-lg bg-card space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Copado CS Command Center</h2>
            <p className="text-xs text-muted-foreground">
              {isSignUp ? "Create an account with your" : "Sign in with your"}{" "}
              <strong className="text-foreground">@copado.com</strong> email
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs p-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                required
                placeholder="name@copado.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-xs hover:opacity-90 transition-all shadow-md"
            >
              {isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Renders the app's router once authenticated
  return <RouterProvider router={router} />;
}