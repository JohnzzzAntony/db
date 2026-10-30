"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";

type FormActionFn = (prev: ActionState, form: FormData) => Promise<ActionState>;

/**
 * Runs a server action without React's automatic form reset, so a failed validation
 * keeps what the user typed. Pass `resetOnSuccess` for "add new" forms.
 */
export function useFormAction(action: FormActionFn, resetOnSuccess = false) {
  const [state, dispatch, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, pending, formProps: { ref, onSubmit } };
}

export function SubmitButton({
  children,
  pending,
  pendingText,
  className = "btn",
}: {
  children: React.ReactNode;
  pending: boolean;
  pendingText?: string;
  className?: string;
}) {
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

/** Submit button for plain `<form action={serverFn}>` forms (no ActionState). */
export function PendingButton({ children, pendingText, className = "btn" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-ok-bg text-ok-fg" : "bg-warn-bg text-warn-fg"}`}>
      {state.message}
    </p>
  );
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const msg = state?.errors?.[name];
  return msg ? (
    <p id={`${name}-error`} className="mt-1 text-xs text-danger">
      {msg}
    </p>
  ) : null;
}

/** Generic wrapper so server-rendered pages can use server actions; fields are children. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingText,
  className = "space-y-3",
  submitClassName,
  resetOnSuccess = false,
}: {
  action: FormActionFn;
  children: React.ReactNode;
  submitLabel?: string;
  pendingText?: string;
  className?: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
}) {
  const { state, pending, formProps } = useFormAction(action, resetOnSuccess);
  return (
    <form {...formProps} className={className}>
      {children}
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText={pendingText} className={submitClassName}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
