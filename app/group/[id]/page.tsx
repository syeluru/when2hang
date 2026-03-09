"use client"
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Users, Loader2 } from 'lucide-react'

const WEEKENDS = [
    { id: 1, label: 'Mar 14-15' }, { id: 2, label: 'Mar 21-22' },
    { id: 3, label: 'Mar 28-29' }, { id: 4, label: 'Apr 4-5' }
]

export default function GroupPage() {
    const { id } = useParams()
    const [name, setName] = useState('')
    const [selected, setSelected] = useState<number[]>([])
    const [groupData, setGroupData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch all responses for this group
    const fetchAvailability = async () => {
        const { data } = await supabase.from('availability').select('*').eq('group_id', id)
        if (data) setGroupData(data)
    }

    useEffect(() => { fetchAvailability() }, [id])

    const submitAvailability = async () => {
        if (!name) return alert("Enter your name first!")
        setLoading(true)
        await supabase.from('availability').insert([{
            group_id: id,
            user_name: name,
            weekends: selected
        }])
        await fetchAvailability()
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
                {/* Input Section */}
                <div className="space-y-6 bg-zinc-900/50 p-8 rounded-3xl border border-white/10">
                    <h2 className="text-2xl font-bold">Add Your Vibe</h2>
                    <input
                        placeholder="Your Name"
                        className="w-full bg-black border border-white/10 p-3 rounded-xl"
                        onChange={(e) => setName(e.target.value)}
                    />
                    <div className="grid gap-2">
                        {WEEKENDS.map(w => (
                            <button
                                key={w.id}
                                onClick={() => setSelected(prev => prev.includes(w.id) ? prev.filter(i => i !== w.id) : [...prev, w.id])}
                                className={`p-4 rounded-xl border transition-all ${selected.includes(w.id) ? 'bg-blue-500 border-blue-400' : 'bg-zinc-800 border-transparent'}`}
                            >
                                {w.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={submitAvailability} className="w-full bg-white text-black font-bold py-3 rounded-xl flex justify-center">
                        {loading ? <Loader2 className="animate-spin" /> : "Join the Group"}
                    </button>
                </div>

                {/* Heatmap Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Users /> Group Availability</h2>
                    {WEEKENDS.map(w => {
                        const count = groupData.filter(d => d.weekends.includes(w.id)).length
                        const intensity = count > 0 ? Math.min(count * 0.25, 1) : 0.05
                        return (
                            <div key={w.id} className="p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-blue-500 transition-all" style={{ opacity: intensity }} />
                                <div className="relative z-10 flex justify-between">
                                    <span>{w.label}</span>
                                    <span className="font-mono">{count} Free</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}