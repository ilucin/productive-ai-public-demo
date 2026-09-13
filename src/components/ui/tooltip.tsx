import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-base border border-border bg-bg-elevated px-2 py-1 text-2xs text-fg',
        'shadow-[var(--shadow-popover)]',
        'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = 'TooltipContent'

/**
 * Convenience wrapper for the common icon-button case. (Fantastic's version
 * also collapses into an overflow-menu row; that machinery is not ported.)
 */
export function Hint({
  label,
  children,
  side = 'bottom',
  delay,
}: {
  label: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
}) {
  return (
    <Tooltip delayDuration={delay}>
      <TooltipTrigger
        asChild
        // Radix opens a tooltip on focus of any kind; only keyboard focus
        // should bring one. `:focus-visible` is the browser's answer.
        onFocus={(event) => {
          if (!(event.target as HTMLElement).matches(':focus-visible')) event.preventDefault()
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
