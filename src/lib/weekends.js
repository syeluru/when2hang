import {
  parseISO,
  format,
  eachDayOfInterval,
  isFriday,
  nextFriday,
  addDays,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns'

/**
 * Given an event date range, return all Fri-Sat-Sun weekend groups.
 * Each weekend is keyed by the Friday date.
 * Returns: [{ key: "2026-03-06", fri: Date, sat: Date, sun: Date, label: "Mar 6 – 8" }, ...]
 */
export function getWeekends(startDate, endDate) {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate

  const weekends = []

  // Find the first Friday on or after start
  let fri = getDay(start) === 5 ? start : nextFriday(start)

  while (!isBefore(end, fri)) {
    const sat = addDays(fri, 1)
    const sun = addDays(fri, 2)

    const friStr = format(fri, 'yyyy-MM-dd')
    const month = format(fri, 'MMMM yyyy')

    // Label: "Mar 6 – 8" or "Mar 29 – 31" or across months "Mar 28 – Apr 1" (edge case)
    const friMonth = format(fri, 'MMM')
    const sunMonth = format(sun, 'MMM')
    const label =
      friMonth === sunMonth
        ? `${format(fri, 'MMM d')} – ${format(sun, 'd')}`
        : `${format(fri, 'MMM d')} – ${format(sun, 'MMM d')}`

    weekends.push({
      key: friStr,
      fri,
      sat,
      sun,
      label,
      month,
    })

    fri = addDays(fri, 7)
  }

  return weekends
}

/**
 * Group weekends by month.
 * Returns: [{ month: "March 2026", weekends: [...] }, ...]
 */
export function groupByMonth(weekends) {
  const groups = []
  let current = null

  for (const w of weekends) {
    if (!current || current.month !== w.month) {
      current = { month: w.month, weekends: [] }
      groups.push(current)
    }
    current.weekends.push(w)
  }

  return groups
}

export const TRIP_TYPES = [
  { value: 'domestic', label: 'Domestic', color: 'bg-sky-500/15 text-sky-300 border-sky-500/25' },
  { value: 'international_nearby', label: 'Intl Nearby', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  { value: 'international_anywhere', label: 'Intl Anywhere', color: 'bg-purple-500/15 text-purple-300 border-purple-500/25' },
]
