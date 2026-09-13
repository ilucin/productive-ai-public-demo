import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Hint } from '@/components/ui/tooltip'

/**
 * The row under a finished answer: copy it. Quiet until hovered, because
 * every answer carries the row. (Fantastic also has thumbs; the backend has
 * nowhere to store a rating, so they are not ported.)
 */
export function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard
      .writeText(text.trim())
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => toast.error('Could not copy the answer'))
  }

  return (
    <div className="flex items-center gap-0.5 pt-1 opacity-60 transition-opacity hover:opacity-100">
      <Hint label={copied ? 'Copied' : 'Copy to clipboard'}>
        <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Copy to clipboard">
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </Hint>
    </div>
  )
}
