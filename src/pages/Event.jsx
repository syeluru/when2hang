import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { Link2, Check, ArrowLeft, Users, Settings } from 'lucide-react'
import { getWeekends, TRIP_TYPES } from '../lib/weekends'
import WeekendForm from '../components/WeekendForm'
import EditEventModal from '../components/EditEventModal'

export default function Event() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [responses, setResponses] = useState([])
  const [name, setName] = useState(() => localStorage.getItem(`w2h-name-${id}`) || '')
  const [myData, setMyData] = useState({})
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hoveredParticipant, setHoveredParticipant] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const saveTimer = useRef(null)
  const nameTimer = useRef(null)

  const isCreator = event?.creator_token && localStorage.getItem(`w2h-creator-${id}`) === event.creator_token

  const fetchData = useCallback(async () => {
    const [eventRes, responsesRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('responses').select('*').eq('event_id', id),
    ])
    if (eventRes.data) setEvent(eventRes.data)
    if (responsesRes.data) setResponses(responsesRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // Dynamic page title + OG meta for link previews
  useEffect(() => {
    if (!event) return
    document.title = `${event.name} — when2hang`
    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (el) el.setAttribute('content', content)
    }
    setMeta('property', 'og:title', `${event.name} — when2hang`)
    setMeta('property', 'og:description', event.description || 'Find the perfect weekend for your group.')
    setMeta('name', 'twitter:title', `${event.name} — when2hang`)
    setMeta('name', 'twitter:description', event.description || 'Find the perfect weekend for your group.')
    return () => { document.title = 'when2hang' }
  }, [event])

  // Load existing data when name changes
  useEffect(() => {
    if (!name.trim()) return
    const existing = responses.find(
      (r) => r.participant_name.toLowerCase() === name.trim().toLowerCase()
    )
    if (existing) {
      // Support both old format (array of strings) and new format (object)
      const data = existing.available_dates
      if (Array.isArray(data)) {
        // Old format: convert to new
        const converted = {}
        for (const d of data) converted[d] = { tripType: null, notes: '' }
        setMyData(converted)
      } else if (data && typeof data === 'object') {
        setMyData(data)
      }
    }
  }, [name, responses.length])

  // Realtime + polling
  useEffect(() => {
    const channel = supabase
      .channel(`responses-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'responses', filter: `event_id=eq.${id}` },
        () => {
          supabase.from('responses').select('*').eq('event_id', id).then(({ data }) => {
            if (data) setResponses(data)
          })
        }
      )
      .subscribe()

    const poll = setInterval(() => {
      supabase.from('responses').select('*').eq('event_id', id).then(({ data }) => {
        if (data) setResponses(data)
      })
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [id])

  // Debounced save
  const saveData = useCallback(
    async (data, participantName) => {
      if (!participantName?.trim()) return
      setSaving(true)

      const hasEntries = Object.keys(data).length > 0

      if (!hasEntries) {
        await supabase
          .from('responses')
          .delete()
          .eq('event_id', id)
          .eq('participant_name', participantName.trim())
      } else {
        await supabase
          .from('responses')
          .upsert(
            [{
              event_id: id,
              participant_name: participantName.trim(),
              available_dates: data,
              updated_at: new Date().toISOString(),
            }],
            { onConflict: 'event_id,participant_name' }
          )
      }

      setSaving(false)
    },
    [id]
  )

  const scheduleSave = useCallback(
    (data) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveData(data, name)
      }, 600)
    },
    [name, saveData]
  )

  const handleToggle = useCallback(
    (weekendKey) => {
      setMyData((prev) => {
        const next = { ...prev }
        const current = next[weekendKey]
        if (!current) {
          // unselected → available
          next[weekendKey] = { status: 'available', tripTypes: [], notes: '' }
        } else if (current.status !== 'maybe') {
          // available → maybe
          next[weekendKey] = { ...current, status: 'maybe' }
        } else {
          // maybe → unselected
          delete next[weekendKey]
        }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave]
  )

  const handleToggleTripType = useCallback(
    (weekendKey, tripType) => {
      setMyData((prev) => {
        const next = { ...prev }
        if (next[weekendKey]) {
          const current = next[weekendKey].tripTypes || []
          const updated = current.includes(tripType)
            ? current.filter((t) => t !== tripType)
            : [...current, tripType]
          next[weekendKey] = { ...next[weekendKey], tripTypes: updated }
        }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave]
  )

  const handleSetNotes = useCallback(
    (weekendKey, notes) => {
      setMyData((prev) => {
        const next = { ...prev }
        if (next[weekendKey]) {
          next[weekendKey] = { ...next[weekendKey], notes }
        }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave]
  )

  const handleNameChange = (newName) => {
    setName(newName)
    localStorage.setItem(`w2h-name-${id}`, newName)

    if (nameTimer.current) clearTimeout(nameTimer.current)
    nameTimer.current = setTimeout(() => {
      if (newName.trim() && Object.keys(myData).length > 0) {
        saveData(myData, newName)
      }
    }, 1000)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Event not found</h2>
          <a href="/" className="text-brand-400 hover:text-brand-300 text-sm">Create a new event</a>
        </div>
      </div>
    )
  }

  const weekends = getWeekends(event.start_date, event.end_date)

  // Helper: get weekend keys from a response (handles both old array and new object format)
  const getResponseKeys = (r) => {
    const data = r.available_dates
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object') return Object.keys(data)
    return []
  }

  const getResponseEntry = (r, key) => {
    const data = r.available_dates
    if (Array.isArray(data)) return data.includes(key) ? { tripTypes: [], notes: '' } : null
    if (data && typeof data === 'object') return data[key] || null
    return null
  }

  // Weighted score per weekend: available=1.0, maybe=0.5
  const getWeight = (entry) => {
    if (!entry) return 0
    const status = entry.status || 'available' // backward compat
    return status === 'maybe' ? 0.5 : 1.0
  }

  // Heatmap: raw count (people who responded) and weighted score
  const heatmap = {}
  const weightedMap = {}
  let maxScore = 0
  for (const w of weekends) {
    const count = responses.filter((r) => getResponseKeys(r).includes(w.key)).length
    heatmap[w.key] = count
    const score = responses.reduce((sum, r) => sum + getWeight(getResponseEntry(r, w.key)), 0)
    weightedMap[w.key] = score
    if (score > maxScore) maxScore = score
  }

  // Best weekends (max weighted overlap)
  const bestWeekends = weekends
    .filter((w) => weightedMap[w.key] === maxScore && maxScore > 0)
    .slice(0, 6)

  // Overlap summary sorted by weighted score
  const overlapSorted = weekends
    .map((w) => ({ ...w, count: heatmap[w.key] || 0, score: weightedMap[w.key] || 0 }))
    .filter((w) => w.count > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-border bg-surface-2/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a href="/" className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors shrink-0">
              <ArrowLeft size={16} />
            </a>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white truncate">{event.name}</h1>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
                {format(parseISO(event.start_date), 'MMM d')} – {format(parseISO(event.end_date), 'MMM d, yyyy')}
                {' · '}{weekends.length} wknd{weekends.length !== 1 ? 's' : ''}
                {' · '}{responses.length} ppl
                {saving && <span className="ml-2 text-brand-400">saving...</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCreator && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Edit event settings"
              >
                <Settings size={15} />
              </button>
            )}
            <button
              onClick={copyLink}
              className="flex items-center gap-2 bg-surface-3 hover:bg-white/10 border border-border px-3 py-1.5 rounded-lg text-xs text-zinc-300 transition-colors cursor-pointer"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Link2 size={12} />}
              {copied ? 'Copied!' : 'Share Link'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 sm:gap-8">
          {/* Main form */}
          <div className="space-y-5">
            {/* Description */}
            {event.description && (
              <p className="text-sm text-zinc-400 bg-surface-2 border border-border rounded-xl px-4 py-3">
                {event.description}
              </p>
            )}

            {/* Name */}
            <div className="flex items-center gap-2 sm:gap-3 bg-surface-2 border border-border rounded-xl px-3 sm:px-4 py-3">
              <label className="text-xs sm:text-sm text-zinc-500 shrink-0">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Type your name to get started..."
                className="flex-1 bg-transparent text-white placeholder:text-zinc-600 outline-none text-sm"
              />
              {name.trim() && (
                <span className="text-[10px] text-zinc-600 shrink-0">
                  {Object.keys(myData).length} weekend{Object.keys(myData).length !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>

            {!name.trim() && (
              <div className="text-center py-12 text-zinc-600">
                <p className="text-sm">Enter your name above to start selecting weekends</p>
              </div>
            )}

            {/* Weekend list */}
            <WeekendForm
              weekends={weekends}
              myData={myData}
              onToggle={handleToggle}
              onToggleTripType={handleToggleTripType}
              onSetNotes={handleSetNotes}
              disabled={!name.trim()}
              heatmap={heatmap}
              maxCount={maxScore}
              totalResponses={responses.length}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Best weekends */}
            {bestWeekends.length > 0 && (
              <div className="bg-surface-2 border border-emerald-500/15 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                  Best Weekends
                </h3>
                <div className="space-y-1.5">
                  {bestWeekends.map((w) => {
                    // Collect trip type votes for this weekend (multi-select)
                    const votes = {}
                    for (const r of responses) {
                      const entry = getResponseEntry(r, w.key)
                      const types = entry?.tripTypes || (entry?.tripType ? [entry.tripType] : [])
                      for (const t of types) {
                        votes[t] = (votes[t] || 0) + 1
                      }
                    }
                    return (
                      <div key={w.key} className="bg-emerald-500/5 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-200">{w.label}</span>
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            {weightedMap[w.key] % 1 === 0 ? weightedMap[w.key] : weightedMap[w.key].toFixed(1)}/{responses.length}
                          </span>
                        </div>
                        {Object.keys(votes).length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {TRIP_TYPES.map((t) => {
                              const cnt = votes[t.value]
                              if (!cnt) return null
                              return (
                                <span key={t.value} className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded border ${t.color}`}>
                                  {t.label} ({cnt})
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {/* Notes from participants for this weekend */}
                        {(() => {
                          const notes = responses
                            .map((r) => {
                              const entry = getResponseEntry(r, w.key)
                              if (!entry?.notes) return null
                              return { name: r.participant_name, note: entry.notes }
                            })
                            .filter(Boolean)
                          if (notes.length === 0) return null
                          return (
                            <div className="mt-1.5 space-y-0.5">
                              {notes.map((n) => (
                                <p key={n.name} className="text-[10px] text-zinc-500 italic">
                                  <span className="text-zinc-400">{n.name}:</span> {n.note}
                                </p>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Overlap bars */}
            {overlapSorted.length > 0 && (
              <div className="bg-surface-2 border border-border rounded-xl p-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Overlap
                </h3>
                <div className="space-y-1.5">
                  {overlapSorted.map(({ key, label, count, score }) => (
                    <div key={key} className="flex items-center gap-2 text-[11px]">
                      <span className="text-zinc-500 w-20 shrink-0 text-right truncate">{label}</span>
                      <div className="flex-1 h-3 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-gradient-to-r from-emerald-600 to-emerald-400"
                          style={{ width: `${responses.length > 0 ? (score / responses.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-zinc-500 w-12 text-right">{score % 1 === 0 ? score : score.toFixed(1)}/{responses.length}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="bg-surface-2 border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users size={12} />
                Participants ({responses.length})
              </h3>
              {responses.length === 0 ? (
                <p className="text-sm text-zinc-600">No one has responded yet. Share the link!</p>
              ) : (
                <div className="space-y-1">
                  {responses
                    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
                    .map((r) => {
                      const keys = getResponseKeys(r)
                      let lastUpdate = null
                      try {
                        if (r.updated_at) {
                          lastUpdate = formatDistanceToNow(parseISO(r.updated_at), { addSuffix: true })
                        }
                      } catch {
                        lastUpdate = null
                      }

                      // Collect their trip type preferences (multi-select)
                      const typeCounts = {}
                      for (const k of keys) {
                        const entry = getResponseEntry(r, k)
                        const types = entry?.tripTypes || (entry?.tripType ? [entry.tripType] : [])
                        for (const t of types) {
                          typeCounts[t] = (typeCounts[t] || 0) + 1
                        }
                      }

                      const isHovered = hoveredParticipant === r.participant_name

                      return (
                        <div
                          key={r.id}
                          onMouseEnter={() => setHoveredParticipant(r.participant_name)}
                          onMouseLeave={() => setHoveredParticipant(null)}
                          className={`
                            px-3 py-2.5 rounded-lg transition-colors cursor-default
                            ${isHovered ? 'bg-brand-500/10' : 'hover:bg-white/[0.02]'}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isHovered ? 'text-white' : 'text-zinc-300'}`}>
                              {r.participant_name}
                            </span>
                            <span className="text-[10px] text-zinc-600">
                              {keys.length} wknd{keys.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex gap-1">
                              {TRIP_TYPES.map((t) => {
                                const cnt = typeCounts[t.value]
                                if (!cnt) return null
                                return (
                                  <span key={t.value} className={`text-[9px] px-1.5 py-0.5 rounded border ${t.color}`}>
                                    {t.label.split(' ')[0]} {cnt}
                                  </span>
                                )
                              })}
                            </div>
                            {lastUpdate && (
                              <span className="text-[10px] text-zinc-700">{lastUpdate}</span>
                            )}
                          </div>
                          {/* Notes from this participant */}
                          {isHovered && (() => {
                            const notes = keys
                              .map((k) => {
                                const entry = getResponseEntry(r, k)
                                if (!entry?.notes) return null
                                const wk = weekends.find((w) => w.key === k)
                                return { label: wk?.label || k, note: entry.notes }
                              })
                              .filter(Boolean)
                            if (notes.length === 0) return null
                            return (
                              <div className="mt-1.5 space-y-0.5">
                                {notes.map((n) => (
                                  <p key={n.label} className="text-[10px] text-zinc-500 italic">
                                    <span className="text-zinc-600">{n.label}:</span> {n.note}
                                  </p>
                                ))}
                              </div>
                            )
                          })()}
                          {/* Mini weekend dots */}
                          <div className="flex gap-0.5 mt-2 flex-wrap">
                            {weekends.map((w) => {
                              const e = getResponseEntry(r, w.key)
                              const s = e?.status || (e ? 'available' : null)
                              return (
                                <div
                                  key={w.key}
                                  className={`w-2 h-2 rounded-sm ${
                                    s === 'available' ? 'bg-emerald-400'
                                    : s === 'maybe' ? 'bg-amber-400'
                                    : 'bg-zinc-800'
                                  }`}
                                  title={`${w.label}${e?.notes ? ` — ${e.notes}` : ''}`}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <EditEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => setEvent(updated)}
        />
      )}
    </div>
  )
}
