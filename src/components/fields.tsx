// Inputs are nested inside their <label>, so pages can repeat a form without id collisions.
type Common = { name: string; label: string; className?: string };

export function TextField({ name, label, className, ...rest }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <input name={name} className="input" {...rest} />
    </label>
  );
}

export function TextArea({ name, label, className, ...rest }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <textarea name={name} className="input" rows={3} {...rest} />
    </label>
  );
}

export function SelectField({
  name,
  label,
  className,
  options,
  ...rest
}: Common & { options: readonly (readonly [string, string])[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <select name={name} className="input" {...rest}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </label>
  );
}

export const VERIFICATION_OPTIONS = [
  ["UNVERIFIED", "Unverified"],
  ["VERIFIED", "Verified"],
  ["REJECTED", "Rejected"],
] as const;
