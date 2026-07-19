import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface FieldBaseProps {
  label?: string
  id?: string
  className?: string
}

interface FieldAsInput extends FieldBaseProps {
  multiline?: false
}

interface FieldAsTextarea extends FieldBaseProps {
  multiline: true
  rows?: number
}

type FieldProps =
  | (FieldAsInput & Omit<InputHTMLAttributes<HTMLInputElement>, keyof FieldAsInput>)
  | (FieldAsTextarea &
      Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof FieldAsTextarea>)

/** Labelled input/textarea: mono-uppercase label above a surface-filled field. */
export function Field({ label, id, multiline, className = '', ...rest }: FieldProps) {
  const autoId = useId()
  const fieldId = id || autoId
  const inputClasses = `w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] transition-colors focus:border-[var(--accent)] ${className}`
  return (
    <div>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1.5 block font-mono text-xs uppercase text-[var(--ink-mute)]"
        >
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          id={fieldId}
          className={`${inputClasses} resize-y`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={fieldId}
          className={inputClasses}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
    </div>
  )
}
