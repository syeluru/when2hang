import { groupByMonth, TRIP_TYPES } from '../lib/weekends'
import { MessageSquareText } from 'lucide-react'

export default function WeekendForm({
  weekends,
  myData,
  onToggle,
  onToggleTripType,
  onSetNotes,
  disabled,
  heatmap,
  maxCount,
  totalResponses,
}) {
  const groups = groupByMonth(weekends)

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.month}>
          {/* Month header */}
          <div className="sticky top-14 z-10 bg-surface/90 backdrop-blur-sm pb-2 pt-1 mb-2">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              {group.month}
            </h2>
          </div>

          <div className="space-y-2">
            {group.weekends.map((weekend) => {
              const entry = myData[weekend.key]
              const status = entry?.status || (entry ? 'available' : null) // backward compat
              const isAvailable = status === 'available'
              const isMaybe = status === 'maybe'
              const isSelected = !!entry
              // Support both old tripType (string) and new tripTypes (array)
              const tripTypes = entry?.tripTypes || (entry?.tripType ? [entry.tripType] : [])
              const notes = entry?.notes || ''
              const count = heatmap[weekend.key] || 0
              const isHot = count > 0 && count >= maxCount && maxCount > 1

              return (
                <div
                  key={weekend.key}
                  className={`
                    rounded-xl border transition-all
                    ${isAvailable
                      ? 'bg-brand-500/[0.06] border-brand-500/20'
                      : isMaybe
                        ? 'bg-amber-500/[0.06] border-amber-500/20'
                        : 'bg-surface-2 border-border hover:border-border-hover'
                    }
                  `}
                >
                  {/* Clickable row */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!disabled) onToggle(weekend.key)
                    }}
                    onKeyDown={(e) => {
                      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onToggle(weekend.key)
                      }
                    }}
                    className={`
                      flex items-center gap-3 px-3 sm:px-4 py-3 min-h-[44px] select-none
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Checkbox: green check = available, amber ? = maybe, empty = unselected */}
                    <div
                      className={`
                        w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                        ${isAvailable
                          ? 'bg-brand-500 border-brand-500'
                          : isMaybe
                            ? 'bg-amber-500 border-amber-500'
                            : 'bg-transparent border-zinc-600'
                        }
                      `}
                    >
                      {isAvailable && (
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {isMaybe && (
                        <span className="text-[10px] font-bold text-white leading-none">?</span>
                      )}
                    </div>

                    {/* Weekend label */}
                    <span className={`flex-1 text-sm font-medium ${isAvailable ? 'text-white' : isMaybe ? 'text-amber-200' : 'text-zinc-400'}`}>
                      {weekend.label}
                    </span>

                    {/* Overlap indicator */}
                    {count > 0 && (
                      <div className={`
                        text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0
                        ${isHot
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/5 text-zinc-500'
                        }
                      `}>
                        {count}/{totalResponses}
                      </div>
                    )}
                  </div>

                  {/* Expanded section: trip type + notes */}
                  {isSelected && (
                    <div
                      className={`px-3 sm:px-4 pb-3.5 pt-0 space-y-3 border-t ${isMaybe ? 'border-amber-500/10' : 'border-brand-500/10'} mt-0`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="pt-2.5">
                        {/* Trip type pills (multi-select) */}
                        <div className="flex gap-1.5 flex-wrap">
                          {TRIP_TYPES.map((t) => {
                            const isSelected = tripTypes.includes(t.value)
                            return (
                              <button
                                key={t.value}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleTripType(weekend.key, t.value)
                                }}
                                className={`
                                  text-[11px] font-medium px-3 py-2 sm:py-1.5 rounded-lg border transition-all cursor-pointer
                                  ${isSelected
                                    ? t.color
                                    : 'bg-white/[0.03] text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                                  }
                                `}
                              >
                                {t.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="flex items-center gap-2">
                        <MessageSquareText size={12} className="text-zinc-600 shrink-0" />
                        <input
                          type="text"
                          value={notes}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onSetNotes(weekend.key, e.target.value)}
                          placeholder="Notes (e.g. thinking about Costa Rica)"
                          className="flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-700 outline-none border-b border-white/5 focus:border-zinc-600 py-1 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
