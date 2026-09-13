/** ---------------------------------------------------------------
 *  Minimal Markdown renderer — ported from fantastic-productive
 *  `src/components/markdown.tsx`, minus mentions and authed images.
 *
 *  Emits React nodes, never HTML, so nothing in an answer can inject
 *  markup. Covers headings, bullet/task lists, quotes, pipe tables,
 *  fenced code, bold/italic, inline code and links; anything else falls
 *  through as plain text.
 *  --------------------------------------------------------------- */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TICK = '✓'

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern =
    /(!\[[^\]]*\]\([^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g
  const out: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  let index = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index))
    const token = match[0]
    const key = `${keyPrefix}-i${index++}`

    if (token.startsWith('![')) {
      const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token)
      if (image && /^https?:/i.test(image[2])) {
        out.push(<img key={key} src={image[2]} alt={image[1]} className="my-2 max-w-full rounded" />)
      } else {
        out.push(token)
      }
    } else if (token.startsWith('**')) {
      out.push(
        <strong key={key} className="font-semibold text-fg">
          {token.slice(2, -2)}
        </strong>,
      )
    } else if (token.startsWith('`')) {
      out.push(
        <code key={key} className="rounded bg-bg-sunken px-1 py-px font-mono text-[0.9em] text-fg">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
      if (link) {
        const href = link[2]
        const safe = /^(https?:|mailto:)/i.test(href)
        out.push(
          safe ? (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2"
            >
              {link[1]}
            </a>
          ) : (
            <span key={key}>{link[1]}</span>
          ),
        )
      } else {
        out.push(token)
      }
    } else {
      out.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      )
    }
    cursor = match.index + token.length
  }

  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

type Align = 'left' | 'right' | 'center'

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim())
}

function delimiterAlignments(line: string): Align[] | null {
  if (!line.includes('-')) return null
  const cells = tableCells(line)
  if (!cells.length) return null

  const alignments: Align[] = []
  for (const cell of cells) {
    if (!/^:?-{1,}:?$/.test(cell)) return null
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    alignments.push(left && right ? 'center' : right ? 'right' : 'left')
  }
  return alignments
}

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export function Markdown({
  source,
  className,
  compact,
}: {
  source: string | null | undefined
  className?: string
  compact?: boolean
}) {
  if (!source?.trim()) return null

  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let listItems: { text: string; checked: boolean | null; ordered: boolean }[] = []
  let paragraph: string[] = []
  let key = 0

  const flushList = () => {
    if (!listItems.length) return
    const tasks = listItems.some((item) => item.checked != null)
    const ordered = listItems[0]?.ordered ?? false
    const Tag = ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag
        key={`ul-${key++}`}
        className={cn(
          tasks ? 'list-none pl-1' : ordered ? 'list-decimal pl-5' : 'list-disc pl-5',
          compact ? 'my-1' : 'my-2',
          'space-y-1',
        )}
      >
        {listItems.map((item, i) => (
          <li key={i} className={cn('leading-relaxed', item.checked != null && 'flex gap-1.5')}>
            {item.checked != null && (
              <span
                aria-hidden
                className={cn(
                  'mt-[0.15rem] flex size-3 shrink-0 items-center justify-center rounded-[3px] border',
                  item.checked
                    ? 'border-accent bg-accent text-[0.55rem] leading-none text-white'
                    : 'border-border',
                )}
              >
                {item.checked ? TICK : ''}
              </span>
            )}
            <span className={cn(item.checked && 'text-fg-subtle line-through')}>
              {renderInline(item.text, `li-${key}-${i}`)}
            </span>
          </li>
        ))}
      </Tag>,
    )
    listItems = []
  }

  const flushParagraph = () => {
    if (!paragraph.length) return
    const text = paragraph.join(' ')
    blocks.push(
      <p key={`p-${key++}`} className={cn('leading-relaxed', compact ? 'my-1' : 'my-2')}>
        {renderInline(text, `p-${key}`)}
      </p>,
    )
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]
    const line = raw.trimEnd()

    if (!line.trim()) {
      flushList()
      flushParagraph()
      continue
    }

    // A fenced code block, verbatim until the closing fence (or the end while
    // it is still being streamed).
    if (/^\s*```/.test(line)) {
      flushList()
      flushParagraph()
      const code: string[] = []
      let cursor = index + 1
      while (cursor < lines.length && !/^\s*```/.test(lines[cursor])) {
        code.push(lines[cursor])
        cursor += 1
      }
      blocks.push(
        <pre
          key={`code-${key++}`}
          className={cn(
            'overflow-x-auto rounded-lg bg-bg-sunken p-3 font-mono text-[0.8em] leading-relaxed text-fg',
            compact ? 'my-1.5' : 'my-2',
          )}
        >
          <code>{code.join('\n')}</code>
        </pre>,
      )
      index = cursor
      continue
    }

    if (/^\s*>/.test(line)) {
      flushList()
      flushParagraph()

      const quoted: string[] = []
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoted.push(lines[index].replace(/^\s*>[ \t]?/, ''))
        index += 1
      }
      index -= 1

      if (!quoted.join('\n').trim()) continue

      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className={cn(
            'border-l-2 border-border pl-3 text-fg-subtle',
            '[&>div>*:first-child]:mt-0 [&>div>*:last-child]:mb-0',
            compact ? 'my-1' : 'my-2',
          )}
        >
          <Markdown source={quoted.join('\n')} compact={compact} className="text-fg-subtle" />
        </blockquote>,
      )
      continue
    }

    const alignments = line.includes('|') ? delimiterAlignments(lines[index + 1] ?? '') : null
    if (alignments) {
      flushList()
      flushParagraph()

      const header = tableCells(line)
      const rows: string[][] = []
      let cursor = index + 2
      while (cursor < lines.length && lines[cursor].includes('|') && lines[cursor].trim()) {
        rows.push(tableCells(lines[cursor]))
        cursor += 1
      }

      const columns = Math.max(header.length, ...rows.map((row) => row.length))
      const alignAt = (column: number) => alignments[column] ?? 'left'
      const tableKey = key++

      blocks.push(
        <div key={`t-${tableKey}`} className={cn('overflow-x-auto', compact ? 'my-1.5' : 'my-2')}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {Array.from({ length: columns }, (_, i) => (
                  <th
                    key={i}
                    className={cn(
                      'border border-border bg-bg-sunken px-2 py-1 font-medium text-fg',
                      ALIGN_CLASS[alignAt(i)],
                    )}
                  >
                    {renderInline(header[i] ?? '', `th-${tableKey}-${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {Array.from({ length: columns }, (_, c) => (
                    <td
                      key={c}
                      className={cn('border border-border px-2 py-1 align-top', ALIGN_CLASS[alignAt(c)])}
                    >
                      {renderInline(row[c] ?? '', `td-${tableKey}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )

      index = cursor - 1
      continue
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushList()
      flushParagraph()
      blocks.push(<hr key={`hr-${key++}`} className={cn('border-border', compact ? 'my-2' : 'my-3')} />)
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      flushParagraph()
      const level = heading[1].length
      blocks.push(
        <p
          key={`h-${key++}`}
          className={cn(
            'font-semibold text-fg',
            compact ? 'mb-1 mt-3 first:mt-0' : 'mb-1.5 mt-4 first:mt-0',
            level <= 2 ? 'text-base' : 'text-sm',
          )}
        >
          {renderInline(heading[2], `h-${key}`)}
        </p>,
      )
      continue
    }

    const bullet = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(line)
    if (bullet) {
      flushParagraph()
      const ordered = /^\d+\.$/.test(bullet[1])
      if (listItems.length && (listItems[0]?.ordered ?? false) !== ordered) flushList()
      const task = /^\[([ xX])\]\s+(.*)$/.exec(bullet[2])
      listItems.push(
        task
          ? { text: task[2], checked: task[1].toLowerCase() === 'x', ordered }
          : { text: bullet[2], checked: null, ordered },
      )
      continue
    }

    flushList()
    paragraph.push(line.trim())
  }

  flushList()
  flushParagraph()

  return <div className={cn('text-sm text-fg', className)}>{blocks}</div>
}
