import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function EditEventModal({ event, onClose, onSaved }) {
  const [name, setName] = useState(event.name)
  const [description, setDescription] = useState(event.description || '')
  const [startDate, setStartDate] = useState(event.start_date)
  const [endDate, setEndDate] = useState(event.end_date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const canSave = name.trim() && startDate && endDate && startDate <= endDate

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('events')
      .update({
        name: name.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate,
      })
      .eq('id', event.id)
      .select()
      .single()

    if (err) {
      setError('Failed to save changes')
      setSaving(false)
      return
    }

    onSaved(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-2 border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-white">Edit Event</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Event name */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the trip or event..."
              rows={3}
              className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
