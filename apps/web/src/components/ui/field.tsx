import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils'

interface FieldBaseProps {
  label?: string
  id?: string
  className?: string
  /** Inline error under the field; also sets aria-invalid. */
  error?: string | null
}

type FieldProps =
  | (FieldBaseProps & { multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, keyof FieldBaseProps>)
  | (FieldBaseProps & { multiline: true; rows?: number } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof FieldBaseProps>)

/** Labelled input or textarea: mono-uppercase label, shadcn field, optional inline error. */
export function Field({ label, id, className, error, ...rest }: FieldProps) {
  const { multiline, ...domProps } = rest as FieldProps & { multiline?: boolean }
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  const shared = {
    id: fieldId,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: cn('min-h-11 rounded-[10px] bg-surface text-sm', className),
  }
  return (
    <div>
      {label && (
        <Label htmlFor={fieldId} className="mb-1.5 block font-mono text-[11px] uppercase text-muted-foreground">
          {label}
        </Label>
      )}
      {multiline ? (
        <Textarea {...shared} {...(domProps as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <Input {...shared} {...(domProps as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
