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

async function uploadPhoto(file, path) {
  const { error } = await supabase.storage
    .from('coaches')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('coaches').getPublicUrl(path)
  return data.publicUrl
}

export async function saveCoach(formData, avatarFile, skiingFile) {
  const coach = await createCoach(formData)
  const updates = {}
  if (avatarFile) {
    const ext = avatarFile.name.split('.').pop().toLowerCase()
    updates.photo_url = await uploadPhoto(avatarFile, `${coach.id}.${ext}`)
  }
  if (skiingFile) {
    const ext = skiingFile.name.split('.').pop().toLowerCase()
    updates.skiing_photo_url = await uploadPhoto(skiingFile, `${coach.id}_skiing.${ext}`)
  }
  if (Object.keys(updates).length > 0) {
    return await updateCoach(coach.id, updates)
  }
  return coach
}

export async function editCoach(id, formData, avatarFile, skiingFile) {
  const updates = { ...formData }
  if (avatarFile) {
    const ext = avatarFile.name.split('.').pop().toLowerCase()
    updates.photo_url = await uploadPhoto(avatarFile, `${id}.${ext}`)
  }
  if (skiingFile) {
    const ext = skiingFile.name.split('.').pop().toLowerCase()
    updates.skiing_photo_url = await uploadPhoto(skiingFile, `${id}_skiing.${ext}`)
  }
  return await updateCoach(id, updates)
}
