'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '../layout'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMES = ['6:00 AM', '7:30 AM', '9:00 AM', '10:30 AM', '12:00 PM', '4:00 PM', '5:30 PM', '7:00 PM']
const COLOR_OPTIONS = ['#007AFF', '#34C759', '#FF3B30', '#FF9500', '#5856D6', '#AF52DE', '#5AC8FA', '#FF2D55', '#30D158', '#FFD60A']

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
  color: '#1C1C1E', fontSize: 14, outline: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  boxSizing: 'border-box',
}
const labelStyle = { color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }

function Bdg({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '18', padding: '3px 8px', borderRadius: 6 }}>{text}</span>
}

export default function AdminClassesPage() {
  const { supabase, gym } = useUser()
  const fileRef = useRef(null)
  const [uploadingFor, setUploadingFor] = useState(null) // class_type id

  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [classTypes, setClassTypes] = useState([])
  const [typeImages, setTypeImages] = useState({}) // { class_type_name: image_url }
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)

  // Type modal
  const [typeModal, setTypeModal] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [typeName, setTypeName] = useState('')
  const [typeColor, setTypeColor] = useState('#007AFF')
  const [selectedTiers, setSelectedTiers] = useState([])
  const [typeLoading, setTypeLoading] = useState(false)

  // Class modal
  const [modal, setModal] = useState(false)
  const [newClass, setNewClass] = useState({ type: '', trainer_id: '', day: 'Mon', time: '9:00 AM', duration: 60, capacity: 20 })

  useEffect(() => { if (gym?.id) load() }, [gym?.id])

  async function load() {
    const [clsRes, trRes, ctRes, tierRes, imgRes] = await Promise.all([
      supabase.from('classes').select('*').eq('gym_id', gym.id).order('time'),
      supabase.from('trainers').select('*'),
      supabase.from('class_types').select('*').eq('gym_id', gym.id).order('name'),
      supabase.from('membership_tiers').select('*').eq('gym_id', gym.id).eq('is_active', true),
      supabase.from('class_type_images').select('*').eq('gym_id', gym.id),
    ])
    setClasses(clsRes.data || [])
    setTrainers(trRes.data || [])
    setClassTypes(ctRes.data || [])
    setTiers(tierRes.data || [])
    // Build lookup: class_type name → image_url
    const imgMap = {}
    for (const row of imgRes.data || []) imgMap[row.class_type] = row.image_url
    setTypeImages(imgMap)
    setNewClass(p => ({ ...p, trainer_id: trRes.data?.[0]?.id || '', type: ctRes.data?.[0]?.name || '' }))
    setLoading(false)
  }

  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA' }
  const getTypeColor = (name) => classTypes.find(ct => ct.name === name)?.color || '#8E8E93'

  // ── Image Upload ─────────────────────────────────────────

  async function handleImageUpload(e, ct) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFor(ct.id)

    const ext = file.name.split('.').pop()
    const path = `${gym.slug}/${ct.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('class-images').upload(path, file, { upsert: true })
    if (upErr) { console.error(upErr); setUploadingFor(null); return }

    const { data: { publicUrl } } = supabase.storage.from('class-images').getPublicUrl(path)

    // Upsert into class_type_images
    await supabase.from('class_type_images').upsert({
      gym_id: gym.id,
      class_type: ct.name,
      image_url: publicUrl,
    }, { onConflict: 'gym_id,class_type' })

    setTypeImages(prev => ({ ...prev, [ct.name]: publicUrl }))
    setUploadingFor(null)
  }

  // ── Class Type CRUD ──────────────────────────────────────

  function openNewType() {
    setEditingType(null); setTypeName(''); setTypeColor('#007AFF'); setSelectedTiers([]); setTypeModal(true)
  }

  async function openEditType(ct) {
    setEditingType(ct); setTypeName(ct.name); setTypeColor(ct.color || '#007AFF')
    const { data } = await supabase.from('tier_class_types').select('tier_id').eq('class_type', ct.name).in('tier_id', tiers.map(t => t.id))
    setSelectedTiers((data || []).map(r => r.tier_id))
    setTypeModal(true)
  }

  async function handleSaveType() {
    if (!typeName.trim()) return
    setTypeLoading(true)
    if (editingType) {
      await supabase.from('class_types').update({ name: typeName.trim(), color: typeColor }).eq('id', editingType.id)
      await supabase.from('tier_class_types').delete().eq('class_type', editingType.name).in('tier_id', tiers.map(t => t.id))
    } else {
      await supabase.from('class_types').insert({ gym_id: gym.id, name: typeName.trim(), color: typeColor })
    }
    if (selectedTiers.length > 0) {
      await supabase.from('tier_class_types').insert(selectedTiers.map(tid => ({ tier_id: tid, class_type: typeName.trim() })))
    }
    setTypeModal(false); setTypeLoading(false); load()
  }

  async function handleDeleteType(ct) {
    if (!confirm(`Delete "${ct.name}"? This won't delete existing classes of this type.`)) return
    await supabase.from('class_types').delete().eq('id', ct.id)
    await supabase.from('tier_class_types').delete().eq('class_type', ct.name).in('tier_id', tiers.map(t => t.id))
    await supabase.from('class_type_images').delete().eq('gym_id', gym.id).eq('class_type', ct.name)
    setClassTypes(prev => prev.filter(c => c.id !== ct.id))
    setTypeImages(prev => { const n = { ...prev }; delete n[ct.name]; return n })
  }

  const toggleTier = (tid) => setSelectedTiers(prev => prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid])

  // ── Class CRUD ───────────────────────────────────────────

  const handleAdd = async () => {
    if (!newClass.type) return
    const { data } = await supabase.from('classes').insert({
      gym_id: gym?.id, type: newClass.type, trainer_id: newClass.trainer_id,
      day: newClass.day, time: newClass.time, duration: newClass.duration, capacity: newClass.capacity,
    }).select().single()
    if (data) setClasses(prev => [...prev, data].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)))
    setModal(false)
    setNewClass({ type: classTypes[0]?.name || '', trainer_id: trainers[0]?.id || '', day: 'Mon', time: '9:00 AM', duration: 60, capacity: 20 })
  }

  const handleRemove = async (id) => {
    await supabase.from('classes').delete().eq('id', id)
    setClasses(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading...</div>

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const ct = classTypes.find(c => c.id === uploadingFor); if (ct) handleImageUpload(e, ct) }}
      />

      {/* ── Class Types ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Class Types</h2>
            <p style={{ color: '#8E8E93', fontSize: 13, margin: '2px 0 0' }}>Define the types of classes your venue offers</p>
          </div>
          <button onClick={openNewType} style={{
            background: '#007AFF', color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: 12, fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            Add Type
          </button>
        </div>

        {classTypes.length === 0 ? (
          <div style={{ background: '#F2F2F7', borderRadius: 16, padding: '32px 20px', textAlign: 'center', color: '#8E8E93', fontSize: 14 }}>
            No class types yet. Add your first one to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {classTypes.map(ct => {
              const img = typeImages[ct.name]
              const isUploading = uploadingFor === ct.id
              return (
                <div key={ct.id} style={{
                  background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  {/* Image strip */}
                  <div style={{
                    height: img ? 80 : 0, overflow: 'hidden',
                    transition: 'height 0.2s',
                  }}>
                    {img && <img src={img} alt={ct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>

                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: ct.color || '#007AFF', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: '#1C1C1E', fontSize: 15 }}>{ct.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setUploadingFor(ct.id); setTimeout(() => fileRef.current?.click(), 0) }}
                        style={{
                          background: '#F2F2F7', border: 'none', color: '#8E8E93',
                          padding: '6px 14px', borderRadius: 8, fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#8E8E93"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                        {isUploading ? 'Uploading...' : img ? 'Change' : 'Add Image'}
                      </button>
                      <button onClick={() => openEditType(ct)} style={{
                        background: '#F2F2F7', border: 'none', color: '#007AFF',
                        padding: '6px 14px', borderRadius: 8, fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>Edit</button>
                      <button onClick={() => handleDeleteType(ct)} style={{
                        background: '#FF3B3010', border: 'none', color: '#FF3B30',
                        padding: '6px 14px', borderRadius: 8, fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Schedule ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Schedule</h2>
          <p style={{ color: '#8E8E93', fontSize: 13, margin: '2px 0 0' }}>Manage your weekly class timetable</p>
        </div>
        <button onClick={() => setModal(true)} disabled={classTypes.length === 0} style={{
          background: classTypes.length === 0 ? '#C7C7CC' : '#007AFF',
          color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 12,
          fontSize: 14, fontWeight: 600, cursor: classTypes.length === 0 ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          Add Class
        </button>
      </div>

      {classTypes.length === 0 && (
        <div style={{ background: '#FFF9F0', border: '1px solid #FF950030', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#FF9500', fontSize: 13, fontWeight: 500 }}>
          Add at least one class type above before creating classes.
        </div>
      )}

      {classes.length === 0 && classTypes.length > 0 && (
        <div style={{ background: '#F2F2F7', borderRadius: 16, padding: '32px 20px', textAlign: 'center', color: '#8E8E93', fontSize: 14 }}>
          No classes yet. Hit "Add Class" to build your timetable.
        </div>
      )}

      {DAYS.map(day => {
        const dayClasses = classes.filter(c => c.day === day)
        if (!dayClasses.length) return null
        return (
          <div key={day} style={{ marginBottom: 24 }}>
            <h3 style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{day}</h3>
            {dayClasses.map(c => {
              const tr = getTrainer(c.trainer_id)
              const color = getTypeColor(c.type)
              const img = typeImages[c.type]
              return (
                <div key={c.id} style={{
                  background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 14, marginBottom: 6, overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center',
                }}>
                  {img && (
                    <div style={{ width: 52, height: 52, flexShrink: 0, margin: 10, borderRadius: 10, overflow: 'hidden' }}>
                      <img src={img} alt={c.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, padding: img ? '14px 14px 14px 0' : 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Bdg text={c.type} color={color} />
                      <span style={{ color: '#1C1C1E', fontSize: 13, fontWeight: 600 }}>{c.time} · {tr.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#8E8E93', fontSize: 12 }}>{c.duration}min · {c.capacity} spots</span>
                      <button onClick={() => handleRemove(c.id)} style={{
                        background: '#FF3B3010', border: 'none', color: '#FF3B30',
                        padding: '5px 12px', borderRadius: 8, fontSize: 11,
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>Remove</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* ── Type Modal ── */}
      {typeModal && (
        <div onClick={() => setTypeModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: 20, padding: 28,
            maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ color: '#1C1C1E', margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>
              {editingType ? 'Edit Class Type' : 'New Class Type'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="e.g. Yoga, HIIT, Boxing..." style={{ ...inputStyle, marginTop: 6 }} />
              </div>
              <div>
                <label style={labelStyle}>Colour</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setTypeColor(c)} style={{
                      width: 32, height: 32, borderRadius: '50%', background: c, border: 'none',
                      cursor: 'pointer', outline: typeColor === c ? `3px solid ${c}` : '3px solid transparent',
                      outlineOffset: 2,
                    }} />
                  ))}
                </div>
              </div>
              {tiers.length > 0 && (
                <div>
                  <label style={labelStyle}>Tier access</label>
                  <p style={{ color: '#8E8E93', fontSize: 12, margin: '2px 0 10px' }}>Which tiers can book this class type?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tiers.map(tier => {
                      const checked = selectedTiers.includes(tier.id)
                      return (
                        <button key={tier.id} onClick={() => toggleTier(tier.id)} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                          border: checked ? '2px solid #007AFF' : '2px solid rgba(0,0,0,0.08)',
                          background: checked ? '#007AFF0A' : '#F2F2F7',
                          fontFamily: 'inherit', textAlign: 'left',
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            background: checked ? '#007AFF' : '#fff',
                            border: checked ? 'none' : '2px solid #C7C7CC',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1C1C1E', fontSize: 14 }}>{tier.name}</div>
                            <div style={{ color: '#8E8E93', fontSize: 12 }}>${(tier.price_cents / 100).toFixed(2)}/mo</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setTypeModal(false)} style={{
                flex: 1, padding: 14, borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)',
                background: '#F2F2F7', color: '#1C1C1E', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button onClick={handleSaveType} disabled={typeLoading || !typeName.trim()} style={{
                flex: 2, padding: 14, borderRadius: 14, border: 'none',
                background: typeName.trim() ? '#007AFF' : '#C7C7CC',
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: typeName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              }}>
                {typeLoading ? 'Saving...' : editingType ? 'Save Changes' : 'Create Type'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Class Modal ── */}
      {modal && (
        <div onClick={() => setModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: 20, padding: 28,
            maxWidth: 460, width: '100%', border: '1px solid rgba(0,0,0,0.06)',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h2 style={{ color: '#1C1C1E', margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Add Class</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={newClass.type} onChange={e => setNewClass({ ...newClass, type: e.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
                  {classTypes.map(ct => <option key={ct.id} value={ct.name}>{ct.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Trainer</label>
                <select value={newClass.trainer_id} onChange={e => setNewClass({ ...newClass, trainer_id: e.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
                  {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Day</label>
                  <select value={newClass.day} onChange={e => setNewClass({ ...newClass, day: e.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Time</label>
                  <select value={newClass.time} onChange={e => setNewClass({ ...newClass, time: e.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Duration (min)</label>
                  <input type="number" value={newClass.duration} onChange={e => setNewClass({ ...newClass, duration: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, marginTop: 6 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Capacity</label>
                  <input type="number" value={newClass.capacity} onChange={e => setNewClass({ ...newClass, capacity: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, marginTop: 6 }} />
                </div>
              </div>
            </div>
            <button onClick={handleAdd} style={{
              width: '100%', padding: 16, borderRadius: 14, border: 'none',
              background: '#007AFF', color: '#fff', fontSize: 16,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Create Class</button>
          </div>
        </div>
      )}
    </div>
  )
}