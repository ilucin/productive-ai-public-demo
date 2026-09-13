import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { Bot } from 'lucide-react'
import { cn, hueFor, initials } from '@/lib/utils'

const SIZES = {
  xs: 'size-4 text-[8px]',
  sm: 'size-5 text-[9px]',
  md: 'size-6 text-2xs',
  lg: 'size-8 text-xs',
} as const

type Size = keyof typeof SIZES

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string | null | undefined
  src?: string | null
  size?: Size
  className?: string
}) {
  const seed = name ?? '?'
  const hue = React.useMemo(() => hueFor(seed), [seed])

  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold',
        SIZES[size],
        className,
      )}
      style={{
        backgroundColor: `oklch(0.82 0.08 ${hue})`,
        color: `oklch(0.32 0.09 ${hue})`,
      }}
    >
      {src && (
        <AvatarPrimitive.Image src={src} alt={seed} className="size-full object-cover" />
      )}
      <AvatarPrimitive.Fallback delayMs={src ? 300 : 0} className="leading-none">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

/** The agent's mark wherever a person's avatar would go — a robot on a squared tile. */
export function BotAvatar({ size = 'md', className }: { size?: Size; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Assistant"
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-[0.3rem] bg-accent-subtle text-accent',
        SIZES[size],
        className,
      )}
    >
      <Bot className="size-[70%]" strokeWidth={2} />
    </span>
  )
}
