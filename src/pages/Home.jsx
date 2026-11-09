import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Sparkles } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [eventName, setEventName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [creating, setCreating] = useState(false)

  const canCreate = eventName.trim() && startDate && endDate && startDate <= endDate

  const createEvent = async () => {
    if (!canCreate) return
    setCreating(true)

    const creatorToken = crypto.randomUUID()

    const { data, error } = await supabase
      .from('events')
      .insert([{
        name: eventName.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate,
        creator_token: creatorToken,
      }])
      .select()
      .single()

    if (error) {
      console.error(error)
      setCreating(false)
      return
    }

    localStorage.setItem(`w2h-creator-${data.id}`, creatorToken)
    navigate(`/event/${data.id}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && canCreate) createEvent()
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Glow background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-brand-600/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-24">
        {/* Logo */}
        <div className="flex items-center gap-2 text-brand-400 text-sm font-medium mb-10">
          <Sparkles size={16} />
          <span>when2hang</span>
        </div>

        {/* Sentence */}
        <div className="max-w-3xl w-full">
          <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-zinc-300 leading-relaxed sm:leading-relaxed md:leading-relaxed text-center">
            I want to find a time for{' '}
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="weekend trip"
              className="inline-block bg-transparent border-b-2 border-brand-500/40 focus:border-brand-500 text-white placeholder:text-zinc-600 outline-none text-center w-48 sm:w-56 md:w-64 pb-1 transition-colors"
            />{' '}
            between{' '}
            <span className="inline-flex items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-b-2 border-brand-500/40 focus:border-brand-500 text-white outline-none text-center pb-1 transition-colors text-lg sm:text-xl md:text-2xl cursor-pointer [color-scheme:dark]"
              />
            </span>{' '}
            and{' '}
            <span className="inline-flex items-center">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onKeyDown={handleKeyDown}
                min={startDate}
                className="bg-transparent border-b-2 border-brand-500/40 focus:border-brand-500 text-white outline-none text-center pb-1 transition-colors text-lg sm:text-xl md:text-2xl cursor-pointer [color-scheme:dark]"
              />
            </span>
          </p>
        </div>

        {/* Description (optional) */}
        <div className="mt-6 w-full max-w-md">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about the trip (optional)"
            rows={2}
            className="w-full bg-transparent border border-zinc-700/50 focus:border-brand-500/50 rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none resize-none transition-colors text-center"
          />
        </div>

        {/* Create button */}
        <button
          onClick={createEvent}
          disabled={!canCreate || creating}
          className={`
            mt-12 px-8 py-3.5 rounded-full font-semibold text-base transition-all cursor-pointer
            ${canCreate
              ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-500/30'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }
          `}
        >
          {creating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            'Create & Share'
          )}
        </button>

        {/* Hint */}
        <p className="mt-6 text-sm text-zinc-600 text-center max-w-md">
          Create a link, share it with friends, and watch availability fill in live. No accounts needed.
        </p>
      </div>
    </div>
  )
}
