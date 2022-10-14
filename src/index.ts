import plugin from 'tailwindcss/plugin'
import { normalize } from 'tailwindcss/lib/util/dataTypes'

export = plugin(function containerQueries({ matchUtilities, matchVariant, theme }) {
  let values: Record<string, string> = theme('containers') ?? {}

  function parseValue(value: string): {
    raw: string
    sortable: boolean
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null {
    // _ -> space
    value = normalize(value)

    // If just a number then it's a min-width
    let numericValue = value.match(/^(\d+\.\d+|\d+|\.\d+)\D+/)?.[1] ?? null
    if (numericValue !== null) {
      value = `(min-width: ${value})`
    }

    // Support for shorthand syntax(es)
    // Pending change on extractor ignoring @[min-w:stuff]
    // value = value.replace(/^min-w:(.*)$/, '(min-width:\1)')
    // value = value.replace(/^max-h:(.*)$/, '(max-width:\1)')
    // value = value.replace(/^min-y:(.*)$/, '(min-height:\1)')
    // value = value.replace(/^max-h:(.*)$/, '(max-height:\1)')

    // If it doesn't start / end with parens then it's not valid (for now)
    if (!value.startsWith('(') || !value.endsWith(')')) {
      return null
    }

    // Parse the value into {minX, minY, maxX, maxY, raw} values
    // This will make suring simpler
    let minX = value.match(/min-width:\s*(\d+\.\d+|\d+|\.\d+)\D+/)?.[1] ?? null
    let maxX = value.match(/max-width:\s*(\d+\.\d+|\d+|\.\d+)\D+/)?.[1] ?? null
    let minY = value.match(/min-height:\s*(\d+\.\d+|\d+|\.\d+)\D+/)?.[1] ?? null
    let maxY = value.match(/max-height:\s*(\d+\.\d+|\d+|\.\d+)\D+/)?.[1] ?? null

    let minXf = minX === null ? Number.MIN_SAFE_INTEGER : parseFloat(minX)
    let maxXf = maxX === null ? Number.MAX_SAFE_INTEGER : parseFloat(maxX)
    let minYf = minY === null ? Number.MIN_SAFE_INTEGER : parseFloat(minY)
    let maxYf = maxY === null ? Number.MAX_SAFE_INTEGER : parseFloat(maxY)

    return {
      raw: value,
      sortable: minX !== null || maxX !== null || minY !== null || maxY !== null,
      minX: minXf,
      maxX: maxXf,
      minY: minYf,
      maxY: maxYf,
    }
  }

  matchUtilities(
    {
      container: (value, { modifier }) => {
        return {
          'container-type': value,
          'container-name': modifier,
        }
      },
    },
    {
      values: {
        DEFAULT: 'inline',
        block: 'block',
        inline: 'inline',
      },
      modifiers: 'any',
    }
  )

  matchVariant(
    '@',
    (value = '', { modifier }) => {
      let parsed = parseValue(value)

      return parsed !== null ? `@container ${modifier ?? ''} ${parsed.raw}` : []
    },
    {
      values,
      sort(aVariant, bVariant) {
        let a = parseValue(aVariant.value)
        let b = parseValue(bVariant.value)

        if (a === null || b === null) return 0

        let aLabel = aVariant.modifier ?? ''
        let bLabel = bVariant.modifier ?? ''

        // Put "raw" values at the end
        if (a.sortable === false && b.sortable === false) {
          return 0
        } else if (a.sortable === false) {
          return 1
        } else if (b.sortable === false) {
          return -1
        }

        // Order by min width / height and max width / height
        let order = a.minX - b.minX || a.minY - b.minY || b.maxX - a.maxX || b.maxY - a.maxY
        if (order !== 0) {
          return order
        }

        // Explicitly move empty labels to the end
        if (aLabel === '' && bLabel !== '') {
          return 1
        } else if (aLabel !== '' && bLabel === '') {
          return -1
        }

        // Sort labels alphabetically in the English locale
        // We are intentionally overriding the locale because we do not want the sort to
        // be affected by the machine's locale (be it a developer or CI environment)
        return aLabel.localeCompare(bLabel, 'en', { numeric: true })
      },
    }
  )
})
