import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#/lib/utils"
import { Slot } from "radix-ui"

/**
 * Tack's button voice on shadcn's Button: fully pill-shaped, the accent
 * does the work of primary actions, secondary is a hairline outline,
 * destructive is an outline in --danger (never a red fill).
 */
const buttonVariants = cva(
  "group inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap no-underline transition-[opacity,background-color,transform,box-shadow] duration-200 outline-none active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        outline: "border border-border bg-transparent text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border border-destructive/35 bg-transparent text-destructive hover:bg-destructive/10 focus-visible:ring-destructive",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-5 text-sm",
        sm: "min-h-9 px-3.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 px-6 text-base",
        icon: "size-9",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
