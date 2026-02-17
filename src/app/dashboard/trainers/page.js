'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../layout'

const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif"

function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 20, padding: 28,
          width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, multiline }) {
  const shared = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, fontFamily: font,
    outline: 'none', background: '#F9F9F9', boxSizing: 'border-box',
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: '#8E8E93',
        textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6,
      }}>{label}</div>
      {multiline ? (
        <textarea
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={3}
          style={{ ...shared, resize: 'vertical' }}
        />
      ) : (
        <input
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} style={shared}
        />
      )}
    </div>
  )
}

export default function TrainersPage() {
  const { supabase } = useUser()
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const accent = '#007AFF'

  async function loadTrainers() {
    const { data } = await supabase
      .from('trainers')
      .select('*')
      .order('name')
    setTrainers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadTrainers() }, [])

  function openAdd() {
    setEditing(null)
    setName('')
    setSpecialty('')
    setBio('')
    setModalOpen(true)
  }

  function openEdit(t) {
    setEditing(t)
    setName(t.name)
    setSpecialty(t.specialty || '')
    setBio(t.bio || '')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    if (editing) {
      await supabase
        .from('trainers')
        .update({ name: name.trim(), specialty: specialty.trim(), bio: bio.trim() })
        .eq('id', editing.id)
    } else {
      await supabase
        .from('trainers')
        .insert({ name: name.trim(), specialty: specialty.trim(), bio: bio.trim() })
    }

    setSaving(false)
    closeModal()
    loadTrainers()
  }

  async function handleDelete(id) {
    setDeleting(id)
    await supabase.from('trainers').delete().eq('id', id)
    setDeleting(null)
    loadTrainers()
  }

  const initials = (n) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: 0 }}>
          Trainers
        </h1>
        <button
          onClick={openAdd}
          style={{
            background: accent, color: '#FFF', border: 'none',
            padding: '10px 20px', borderRadius: 12, fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: font,
          }}
        >
          + Add Trainer
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#8E8E93', fontSize: 14, padding: 40 }}>
          Loading...
        </div>
      ) : trainers.length === 0 ? (
        <div style={{
          textAlign: 'center', color: '#8E8E93', fontSize: 14,
          padding: 60, background: '#FFF', borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          No trainers yet. Add your first trainer!
        </div>
      ) : (
        trainers.map(t => (
          <div
            key={t.id}
            style={{
              background: '#FFFFFF', borderRadius: 16, padding: 20,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16,
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: accent + '15', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: accent,
              flexShrink: 0,
            }}>
              {initials(t.name)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E' }}>
                {t.name}
              </div>
              {t.specialty && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: accent,
                  background: accent + '14', padding: '3px 8px',
                  borderRadius: 6, display: 'inline-block', marginTop: 4,
                }}>
                  {t.specialty}
                </span>
              )}
              {t.bio && (
                <div style={{
                  fontSize: 13, color: '#8E8E93', marginTop: 6,
                  lineHeight: 1.4, overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {t.bio}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => openEdit(t)}
                style={{
                  background: '#F2F2F7', border: 'none', color: '#3A3A3C',
                  padding: '8px 14px', borderRadius: 10, fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', fontFamily: font,
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                disabled={deleting === t.id}
                style={{
                  background: '#FF3B3014', border: 'none', color: '#FF3B30',
                  padding: '8px 14px', borderRadius: 10, fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', fontFamily: font,
                  opacity: deleting === t.id ? 0.5 : 1,
                }}
              >
                {deleting === t.id ? '...' : 'Remove'}
              </button>
            </div>
          </div>
        ))
      )}

      <Modal open={modalOpen} onClose={closeModal}>
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: '#1C1C1E',
          margin: '0 0 20px',
        }}>
          {editing ? 'Edit Trainer' : 'Add Trainer'}
        </h2>

        <Input label="Name" value={name} onChange={setName} placeholder="e.g. Sarah Chen" />
        <Input label="Specialty" value={specialty} onChange={setSpecialty} placeholder="e.g. Yoga & Meditation" />
        <Input label="Bio" value={bio} onChange={setBio} placeholder="Brief description..." multiline />

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button
            onClick={closeModal}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14,
              fontWeight: 600, border: '1px solid rgba(0,0,0,0.1)',
              background: '#FFF', color: '#3A3A3C', cursor: 'pointer',
              fontFamily: font,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14,
              fontWeight: 600, border: 'none', background: accent,
              color: '#FFF', cursor: 'pointer', fontFamily: font,
              opacity: !name.trim() || saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Trainer'}
          </button>
        </div>
      </Modal>
    </div>
  )
}