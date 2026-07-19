import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type ButtonSize = 'md' | 'sm'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90',
  secondary:
    'border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-2)]',
  danger:
    'border border-[color-mix(in_oklab,var(--danger)_35%,transparent)] text-[var(--danger)] hover:bg-[color-mix(in_oklab,var(--danger)_12%,transparent)]',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 text-sm',
  sm: 'min-h-9 px-3.5 text-xs',
}

/** The single source of truth for Tack's pill button voice — used directly by Button, and by call sites (e.g. router Links) that can't render Button itself. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
) {
  return `group inline-flex items-center justify-center gap-2 rounded-full font-medium no-underline whitespace-nowrap transition-[opacity,background-color,transform] duration-200 active:translate-y-px disabled:opacity-45 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`
}

const arrowIcon = (
  <ArrowRight
    size={16}
    strokeWidth={2}
    className="transition-transform duration-200 group-hover:translate-x-0.5"
    aria-hidden="true"
  />
)

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  arrow?: boolean
  href?: string
  type?: 'button' | 'submit'
  children: ReactNode
  className?: string
}

/** Tack pill button/link. Primary = solid accent, secondary = hairline ghost, danger = danger-tinted outline. */
export function Button({
  variant = 'primary',
  size = 'md',
  arrow = false,
  href,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonProps> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonProps>) {
  const cls = buttonClasses(variant, size, className)
  const content = (
    <>
      {children}
      {arrow && arrowIcon}
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        className={cls}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    )
  }
  return (
    <button
      type={type}
      className={cls}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  )
}
