import type * as React from 'react'
import { Toaster as Sonner } from 'sonner'

/** Where toasts appear, and what they look like — themed to the tokens. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      style={
        {
          '--toast-close-button-start': 'unset',
          '--toast-close-button-end': '8px',
          '--toast-close-button-transform': 'translateY(-50%)',
        } as React.CSSProperties
      }
      closeButton
      toastOptions={{
        style: {
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--fg)',
          fontSize: '13px',
          paddingRight: '34px',
        },
        classNames: {
          closeButton:
            'top-1/2! border-border bg-bg-elevated text-fg-muted hover:bg-bg-hover hover:text-fg',
        },
      }}
    />
  )
}
