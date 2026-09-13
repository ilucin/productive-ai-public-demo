import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal

export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = 'DialogOverlay'

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean
    width?: string
    /** Renders the dimming overlay. Off for a non-modal panel. */
    overlay?: boolean
    /** Drops the default centered chrome so the caller can place the panel. */
    bare?: boolean
  }
>(
  (
    { className, children, hideClose, width = 'max-w-lg', overlay = true, bare, ...props },
    ref,
  ) => (
    <DialogPortal>
      {overlay && <DialogOverlay />}
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'z-50 border-border bg-bg-elevated surface-elevated shadow-[var(--shadow-popover)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'focus:outline-none',
          !bare && [
            'fixed left-1/2 top-[8%] w-[calc(100vw-2rem)] -translate-x-1/2',
            'max-md:top-[3%] max-md:w-[calc(100vw-1rem)]',
            width,
            'rounded-lg border',
            'data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98]',
          ],
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className={cn(
              'absolute right-3 top-3 rounded-base p-1 text-fg-subtle transition-colors',
              'hover:bg-bg-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus:outline-none',
              'max-md:right-2 max-md:top-2 max-md:p-2.5',
            )}
            aria-label="Close"
          >
            <X className="size-4 max-md:size-4.5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
)
DialogContent.displayName = 'DialogContent'

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 px-4 pb-3 pt-4', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-border px-4 py-3',
        className,
      )}
      {...props}
    />
  )
}

export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold tracking-[-0.01em] text-fg', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs text-fg-muted', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'
