import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from '@/lib/utils'

/**
 * Not in fantastic (it relies on native scrolling + the thin scrollbar rules
 * in `index.css`); added here in the same shadcn shape for the chat thread.
 */
export const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    viewportRef?: React.Ref<HTMLDivElement>
    viewportClassName?: string
  }
>(({ className, children, viewportRef, viewportClassName, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
    <ScrollAreaPrimitive.Viewport
      ref={viewportRef}
      className={cn('size-full rounded-[inherit] [&>div]:!block', viewportClassName)}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = 'ScrollArea'

export const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' && 'h-full w-2 border-l border-l-transparent p-px',
      orientation === 'horizontal' && 'h-2 flex-col border-t border-t-transparent p-px',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border-strong" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = 'ScrollBar'
