import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Replace with your actual main dashboard component import
import { GongItTab } from "@/components/gong-it"; 

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground bg-background font-sans">
        Loading Command Center...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4 bg-background font-sans">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Copado CS Command Center</h2>
        <p className="text-sm text-muted-foreground">
          Please sign in with your <strong className="text-foreground">@copado.com</strong> Google account to continue.
        </p>
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.origin },
            })
          }
          className="bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl shadow-md hover:opacity-90 transition-all text-xs"
        >
          Sign in with Google (@copado.com)
        </button>
      </div>
    );
  }

  // Render main app layout when authenticated
  return <GongItTab />;
}