"use client";

import { FormMessage, SubmitButton, useFormAction } from "@/components/forms";
import { login } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, formProps } = useFormAction(login);
  return (
    <form {...formProps} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Signing in…" className="btn w-full">Sign in</SubmitButton>
    </form>
  );
}
