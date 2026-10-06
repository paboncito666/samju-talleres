"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setIsSigningOut(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "No se pudo cerrar la sesión.",
      );
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
        variant="outline"
      >
        {isSigningOut ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <LogOut aria-hidden="true" size={16} />
        )}
        Cerrar sesión
      </Button>
      {error && (
        <p className="max-w-56 text-right text-xs text-rose-foreground" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
