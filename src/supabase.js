import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  url && key ? createClient(url, key) : null

export async function saveLead(payload) {
  if (supabase) {
    const { error } = await supabase.from('skin_test_leads').insert(payload)
    if (error) throw error
    return { mode: 'supabase' }
  }

  const current = JSON.parse(localStorage.getItem('soully_skin_leads') || '[]')
  current.push({ ...payload, saved_at: new Date().toISOString() })
  localStorage.setItem('soully_skin_leads', JSON.stringify(current))
  return { mode: 'local' }
}
