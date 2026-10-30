"use client";

import { FieldError, FormMessage, SubmitButton, useFormAction } from "@/components/forms";
import { register } from "../actions";

export function RegisterForm() {
  const { state, pending, formProps } = useFormAction(register);
  return (
    <form {...formProps} className="space-y-4" noValidate>
      {(
        [
          ["name", "Full name", "text", "name"],
          ["email", "Email", "email", "email"],
          ["password", "Password (min. 10 characters)", "password", "new-password"],
        ] as const
      ).map(([name, label, type, autoComplete]) => (
        <div key={name}>
          <label htmlFor={name} className="label">{label}</label>
          <input
            id={name}
            name={name}
            type={type}
            autoComplete={autoComplete}
            required
            className="input"
            aria-invalid={Boolean(state?.errors?.[name])}
            aria-describedby={state?.errors?.[name] ? `${name}-error` : undefined}
          />
          <FieldError state={state} name={name} />
        </div>
      ))}
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Creating account…" className="btn w-full">Create account</SubmitButton>
    </form>
  );
}
