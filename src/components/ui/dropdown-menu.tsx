import * as React from 'react'
import * as Primitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DropdownMenu = Primitive.Root
export const DropdownMenuTrigger = Primitive.Trigger
export const DropdownMenuGroup = Primitive.Group
export const DropdownMenuSub = Primitive.Sub

const contentClass = cn(
  'z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-bg-elevated surface-elevated p-1',
  'shadow-[var(--shadow-popover)]',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
  'data-[state=open]:zoom-in-95',
)

export const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(contentClass, className)}
      {...props}
    />
  </Primitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

const itemClass = cn(
  'relative flex cursor-default select-none items-center gap-2 rounded-base px-2 py-1.5 text-sm text-fg outline-none',
  'max-md:min-h-10 max-md:px-2.5 max-md:[&_svg]:size-4',
  'data-[highlighted]:bg-bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  '[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-fg-subtle',
)

export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      itemClass,
      destructive && 'text-danger data-[highlighted]:bg-danger-subtle [&_svg]:text-danger',
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ComponentRef<typeof Primitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.SubTrigger>
>(({ className, children, ...props }, ref) => (
  <Primitive.SubTrigger
    ref={ref}
    className={cn(itemClass, 'data-[state=open]:bg-bg-hover', className)}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </Primitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

export const DropdownMenuSubContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof Primitive.SubContent>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.SubContent
      ref={ref}
      sideOffset={sideOffset}
      className={cn(contentClass, className)}
      {...props}
    />
  </Primitive.Portal>
))
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof Primitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <Primitive.CheckboxItem ref={ref} className={cn(itemClass, 'pl-7', className)} {...props}>
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <Primitive.ItemIndicator>
        <Check className="size-3.5" />
      </Primitive.ItemIndicator>
    </span>
    {children}
  </Primitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

export const DropdownMenuLabel = React.forwardRef<
  React.ComponentRef<typeof Primitive.Label>,
  React.ComponentPropsWithoutRef<typeof Primitive.Label>
>(({ className, ...props }, ref) => (
  <Primitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-2xs font-medium uppercase tracking-wide text-fg-subtle', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

export const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof Primitive.Separator>,
  React.ComponentPropsWithoutRef<typeof Primitive.Separator>
>(({ className, ...props }, ref) => (
  <Primitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('ml-auto font-mono text-2xs tracking-widest text-fg-subtle', className)}
      {...props}
    />
  )
}
