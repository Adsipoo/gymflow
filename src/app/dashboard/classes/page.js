'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../layout'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMES = ['6:00 AM', '7:30 AM', '9:00 AM', '10:30 AM', '12:00 PM', '4:00 PM', '5:30 PM', '7:00 PM']
const CLS_TYPES = ['Yoga', 'HIIT', 'Spin', 'Boxing', 'CrossFit', 'Meditation', 'Stretching', 'PT Session', 'Pilates']
const tc = { Yoga: '#34C759', HIIT: '#FF3B30', Spin: '#007AFF', Boxing: '#FF9500', CrossFit: '#5856D6', Meditation: '#5AC8FA', Stretching: '#30D158', 'PT Session': '#FF9500', Pilates: '#AF52DE' }

function Bdg({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '14', padding: '3px 8px', borderRadius: 6 }}>{text}</span>
}

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
  color: '#1C1C1E', fontSize: 14, outline: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  boxSizing: 'border-box',
}

export default function AdminClassesPage() {
  const { supabase, gym } = useUser()
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [newClass, setNewClass] = useState({ type: 'Yoga', trainer_id: '', day: 'Mon', time: '9:00 AM', duration: 60, capacity: 20 })

  useEffect(() => {
    async function load() {
      const [clsRes, trRes] = await Promise.all([
        supabase.from('classes').select('*').order('time'),
        supabase.from('trainers').select('*'),
      ])
      setClasses(clsRes.data || [])
      setTrainers(trRes.data || [])
      if (trRes.data?.length) setNewClass(p => ({ ...p, trainer_id: trRes.data[0].id }))
      setLoading(false)
    }
    load()
  }, [])

  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA' }

  const handleAdd = async () => {
    const { data } = await supabase.from('classes').insert({
      gym_id: gym?.id,
      type: newClass.type,
      trainer_id: newClass.trainer_id,
      day: newClass.day,
      time: newClass.time,
      duration: newClass.duration,
      capacity: newClass.capacity,
    }).select().single()

    if (data) setClasses(prev => [...prev, data].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)))
    setModal(false)
    setNewClass({ type: 'Yoga', trainer_id: trainers[0]?.id || '', day: 'Mon', time: '9:00 AM', duration: 60, capacity: 20 })
  }

  const handleRemove = async (id) => {
    await supabase.from('classes').delete().eq('id', id)
    setClasses(prev => prev.filter(c => c.id !== id))
  }

  if (loading) {
    return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: 0 }}>
          Classes
        </h1>
        <button onClick={() => setModal(true)} style={{
          background: '#007AFF', color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: 12, fontSize: 14,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          Add
        </button>
      </div>

      {DAYS.map(day => {
        const dayClasses = classes.filter(c => c.day === day)
        if (!dayClasses.length) return null
        return (
          <div key={day} style={{ marginBottom: 24 }}>
            <h3 style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {day}
            </h3>
            {dayClasses.map(c => {
              const tr = getTrainer(c.trainer_id)
              return (
                <div key={c.id} style={{
                  background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 14, padding: 14, marginBottom: 6,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Bdg text={c.type} color={tc[c.type]} />
                    <span style={{ color: '#1C1C1E', fontSize: 13, fontWeight: 600 }}>
                      {c.time} · {tr.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#8E8E93', fontSize: 12 }}>
                      {c.duration}min · {c.capacity} spots
                    </span>
                    <button onClick={() => handleRemove(c.id)} style={{
                      background: '#FF3B3010', border: 'none', color: '#FF3B30',
                      padding: '5px 12px', borderRadius: 8, fontSize: 11,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Add Class Modal */}
      {modal && (
        <div onClick={() => setModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: 20, padding: 28,
            maxWidth: 460, width: '100%', border: '1px solid rgba(0,0,0,0.06)',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h2 style={{ color: '#1C1C1E', margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Add Class</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Type</label>
                <select value={newClass.type} onChange={e => setNewClass({ ...newClass, type: e.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
                  {CLS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Trainer</label>
                <select value={newClass.trainer_id} onChange={e => setNewClass({ ...newClass, trainer_id: e.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
                  {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Day</label>
                  <select value={newClass.day} onChange={e => setNewClass({ ...newClass, day: e.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Time</label>
                  <select value={newClass.time} onChange={e => setNewClass({ ...newClass, time: e.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Duration (min)</label>
                  <input type="number" value={newClass.duration} onChange={e => setNewClass({ ...newClass, duration: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, marginTop: 6 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Capacity</label>
                  <input type="number" value={newClass.capacity} onChange={e => setNewClass({ ...newClass, capacity: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, marginTop: 6 }} />
                </div>
              </div>
            </div>

            <button onClick={handleAdd} style={{
              width: '100%', padding: 16, borderRadius: 14, border: 'none',
              background: '#007AFF', color: '#fff', fontSize: 16,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Create Class
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
