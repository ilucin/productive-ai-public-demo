import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-base font-medium transition-[background-color,border-color,color,box-shadow] duration-100 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
  {
    variants: {
      variant: {
        default:
          'surface-accent bg-accent text-accent-fg hover:brightness-110 active:brightness-95',
        secondary:
          'edge-grad bg-bg-elevated text-fg border border-border hover:bg-bg-hover active:bg-bg-active',
        ghost: 'text-fg-muted hover:bg-bg-hover hover:text-fg active:bg-bg-active',
        subtle: 'bg-bg-sunken text-fg hover:bg-bg-hover',
        accent: 'bg-accent-subtle text-accent hover:brightness-110',
        danger: 'bg-danger text-white hover:brightness-110',
        'danger-ghost': 'text-danger hover:bg-danger-subtle',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      // Every size grows on a phone: the desktop scale tops out at 36px, and a
      // fingertip is nearer 44.
      size: {
        xs: 'h-6 px-2 text-2xs max-md:h-8 max-md:px-2.5 [&_svg]:size-3',
        sm: 'h-7 px-2.5 text-xs max-md:h-9 max-md:px-3 [&_svg]:size-3.5 max-md:[&_svg]:size-4',
        md: 'h-8 px-3 text-sm max-md:h-10 max-md:px-3.5 [&_svg]:size-4',
        lg: 'h-9 px-4 text-base max-md:h-11 [&_svg]:size-4 max-md:[&_svg]:size-4.5',
        icon: 'size-7 max-md:size-10 [&_svg]:size-4 max-md:[&_svg]:size-4.5',
        'icon-sm': 'size-6 max-md:size-9 [&_svg]:size-3.5 max-md:[&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
