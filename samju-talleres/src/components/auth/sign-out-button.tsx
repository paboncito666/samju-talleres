"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LogOut, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/auth/actions";

export function SignOutButton() {
  const [state, action] = useActionState(signOutAction, {});

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <SignOutSubmitButton />
      {state.error && (
        <p className="max-w-56 text-right text-xs text-rose-foreground" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

function SignOutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant="outline">
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
      ) : (
        <LogOut aria-hidden="true" size={16} />
      )}
      Cerrar sesión
    </Button>
  );
}
