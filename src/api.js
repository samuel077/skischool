import { supabase } from './supabase.js'

export async function getCoaches() {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createCoach(coachData) {
  const { data, error } = await supabase
    .from('coaches')
    .insert(coachData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCoach(id, fields) {
  const { data, error } = await supabase
    .from('coaches')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCoach(id) {
  const { error } = await supabase.from('coaches').delete().eq('id', id)
  if (error) throw error
}

export async function uploadCoachPhoto(file, coachId) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${coachId}.${ext}`
  const { error } = await supabase.storage
    .from('coaches')
    .upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('coaches').getPublicUrl(path)
  return data.publicUrl
}

export async function saveCoach(formData, photoFile) {
  const coach = await createCoach(formData)
  if (photoFile) {
    const photoUrl = await uploadCoachPhoto(photoFile, coach.id)
    return await updateCoach(coach.id, { photo_url: photoUrl })
  }
  return coach
}
