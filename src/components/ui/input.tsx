import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // Taller on a phone, where 32px is an awkward thing to hit.
        'flex h-8 w-full rounded-base border border-border bg-bg px-2.5 text-sm text-fg',
        'max-md:h-11 max-md:px-3',
        'placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-100',
        'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-16 w-full resize-y rounded-base border border-border bg-bg px-2.5 py-2 text-sm text-fg',
      'max-md:min-h-20 max-md:px-3 max-md:py-2.5',
      'placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-100',
      'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

/** Borderless field that only reveals its chrome on hover/focus. */
export const InlineInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-base border border-transparent bg-transparent px-1.5 py-0.5 text-inherit',
      'max-md:py-1.5',
      'hover:border-border focus:border-accent focus:bg-bg focus:outline-none',
      'placeholder:text-fg-subtle',
      className,
    )}
    {...props}
  />
))
InlineInput.displayName = 'InlineInput'
