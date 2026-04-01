import { signIn, signOut, getSession, onAuthStateChange } from './auth.js'
import { getCoaches, saveCoach, editCoach, deleteCoach } from './api.js'

const TAG_MAP = {
  ski:       { label: '雙板 Ski',        cls: 'tag-ski' },
  snowboard: { label: '單板 Snowboard',  cls: 'tag-snowboard' },
  beginner:  { label: '初學者',          cls: 'tag-beginner' },
  advanced:  { label: '進階',            cls: 'tag-advanced' },
  kids:      { label: '兒童',            cls: 'tag-kids' },
  race:      { label: '競技',            cls: 'tag-race' },
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Coach card HTML ───────────────────────────────────────────────────────────

function buildCardHTML(c) {
  const avatarInner = c.photo_url
    ? `<img src="${c.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`
    : esc(c.name_cn ? c.name_cn.slice(-2) : '?')

  const tagsHTML = (c.tags || []).map(t => {
    const tm = TAG_MAP[t]
    return tm ? `<span class="tag ${tm.cls}">${tm.label}</span>` : ''
  }).join('')

  const svgMtn   = `<svg class="info-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1L2 13h12L8 1z"/></svg>`
  const svgGlobe = `<svg class="info-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 2v12M2 8h12"/></svg>`
  const svgClock = `<svg class="info-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l2.5 2.5"/></svg>`

  return `<div class="coach-card" data-id="${c.id}" style="cursor:pointer;">
    <div class="card-head">
      <div class="avatar">${avatarInner}</div>
      <div>
        <div class="coach-name">${esc(c.name_cn)}</div>
        ${c.name_en ? `<div class="coach-en">${esc(c.name_en)}</div>` : ''}
        <div class="coach-tags">${tagsHTML}</div>
      </div>
    </div>
    <div class="card-body">
      ${c.resort && c.resort.length ? `<div class="info-row">${svgMtn}<span class="info-lbl">雪場</span><span class="info-val">${esc(c.resort.join('・'))}</span></div>` : ''}
      ${c.languages  ? `<div class="info-row">${svgGlobe}<span class="info-lbl">語言</span><span class="info-val">${esc(c.languages)}</span></div>` : ''}
      ${c.experience ? `<div class="info-row">${svgClock}<span class="info-lbl">資歷</span><span class="info-val">${esc(c.experience)}</span></div>` : ''}
      ${c.cert       ? `<div class="info-row"><span class="cert-badge">⭐ ${esc(c.cert)}</span></div>` : ''}
      ${c.bio        ? `<div class="coach-bio">${esc(c.bio)}</div>` : ''}
    </div>
  </div>`
}

// ── State ─────────────────────────────────────────────────────────────────────

let coachesList = []
let editingCoachId = null
let pendingAvatarFile = null
let pendingSkiingFile = null

// ── Load coaches ──────────────────────────────────────────────────────────────

async function loadCoaches() {
  const grid = document.getElementById('coaches-grid')
  try {
    const coaches = await getCoaches()
    coachesList = coaches
    const statEl = document.getElementById('stat-count')
    if (statEl) statEl.textContent = coaches.length

    if (!coaches.length) {
      grid.innerHTML = '<div style="color:var(--gray);font-size:14px;padding:40px 0;text-align:center;grid-column:1/-1;">目前尚無教練資料</div>'
      return
    }
    grid.innerHTML = coaches.map(buildCardHTML).join('')
  } catch {
    grid.innerHTML = '<div style="color:var(--red);font-size:13px;padding:20px;text-align:center;grid-column:1/-1;">載入失敗，請重新整理頁面</div>'
  }
}

// Coach card click → open modal
document.getElementById('coaches-grid').addEventListener('click', e => {
  const card = e.target.closest('.coach-card')
  if (!card) return
  const coach = coachesList.find(c => c.id === card.dataset.id)
  if (coach) openCoachModal(coach)
})

// ── Coach modal ───────────────────────────────────────────────────────────────

function openCoachModal(coach) {
  // Skiing banner
  const bannerImg = document.getElementById('cm-banner-img')
  if (coach.skiing_photo_url) {
    bannerImg.src = coach.skiing_photo_url
    bannerImg.style.display = 'block'
  } else {
    bannerImg.style.display = 'none'
  }

  // Avatar
  const avatarEl = document.getElementById('cm-avatar-lg')
  if (coach.photo_url) {
    avatarEl.innerHTML = `<img src="${coach.photo_url}" style="width:100%;height:100%;object-fit:cover;" alt="">`
  } else {
    avatarEl.innerHTML = ''
    avatarEl.textContent = coach.name_cn ? coach.name_cn.slice(-2) : '?'
  }

  // Name
  document.getElementById('cm-name-cn').textContent = coach.name_cn || ''
  const enEl = document.getElementById('cm-name-en')
  enEl.textContent = coach.name_en || ''
  enEl.style.display = coach.name_en ? 'block' : 'none'

  // Tags
  document.getElementById('cm-tags-row').innerHTML = (coach.tags || []).map(t => {
    const tm = TAG_MAP[t]
    return tm ? `<span class="tag ${tm.cls}">${tm.label}</span>` : ''
  }).join('')

  // Stats (only show rows that have data)
  const statsData = [
    coach.resort && coach.resort.length && { lbl: '雪場', val: coach.resort.join('・') },
    coach.languages  && { lbl: '語言', val: coach.languages },
    coach.experience && { lbl: '資歷', val: coach.experience },
  ].filter(Boolean)

  const statsEl = document.getElementById('cm-stats')
  if (statsData.length) {
    statsEl.style.gridTemplateColumns = `repeat(${statsData.length}, 1fr)`
    statsEl.style.display = 'grid'
    statsEl.innerHTML = statsData.map(s => `
      <div class="cm-stat">
        <div class="cm-stat-lbl">${esc(s.lbl)}</div>
        <div class="cm-stat-val">${esc(s.val)}</div>
      </div>`).join('')
  } else {
    statsEl.style.display = 'none'
  }

  // Cert
  const certEl = document.getElementById('cm-cert')
  if (coach.cert) {
    certEl.style.display = 'block'
    certEl.innerHTML = `<span class="cert-badge">⭐ ${esc(coach.cert)}</span>`
  } else {
    certEl.style.display = 'none'
  }

  // Bio
  const bioSection = document.getElementById('cm-bio-section')
  if (coach.bio) {
    bioSection.style.display = 'block'
    document.getElementById('cm-bio-text').textContent = coach.bio
  } else {
    bioSection.style.display = 'none'
  }

  document.getElementById('coach-modal').classList.add('active')
  document.body.style.overflow = 'hidden'
}

function closeCoachModal() {
  document.getElementById('coach-modal').classList.remove('active')
  document.body.style.overflow = ''
}

document.getElementById('cm-close').addEventListener('click', closeCoachModal)
document.getElementById('coach-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('coach-modal')) closeCoachModal()
})
document.getElementById('cm-cta').addEventListener('click', () => {
  closeCoachModal()
  document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

// ── Admin list ────────────────────────────────────────────────────────────────

async function renderList() {
  const el = document.getElementById('list-items')
  el.innerHTML = '<div style="text-align:center;color:var(--gray);padding:16px;font-size:13px;">載入中...</div>'
  try {
    const coaches = await getCoaches()
    coachesList = coaches
    if (!coaches.length) {
      el.innerHTML = '<div style="text-align:center;color:var(--gray);padding:24px;font-size:13px;">尚無教練資料</div>'
      return
    }
    el.innerHTML = coaches.map(c => `
      <div class="list-item" id="coach-item-${c.id}">
        <div class="list-item-info">
          <div class="name">${esc(c.name_cn)}${c.name_en ? ` (${esc(c.name_en)})` : ''}</div>
          <div class="sub">${esc((c.resort || []).join('・'))}${c.experience ? ' · ' + esc(c.experience) : ''}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-edit" data-id="${c.id}">編輯</button>
          <button class="btn-del" data-id="${c.id}">刪除</button>
        </div>
      </div>`).join('')

    el.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const coach = coaches.find(c => c.id === btn.dataset.id)
        if (coach) enterEditMode(coach)
      })
    })

    el.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('確定刪除這位教練？此動作無法復原。')) return
        const id = btn.dataset.id
        btn.textContent = '刪除中...'
        btn.disabled = true
        try {
          await deleteCoach(id)
          document.getElementById(`coach-item-${id}`)?.remove()
          loadCoaches()
          showToast('已刪除教練')
        } catch (e) {
          btn.textContent = '刪除'
          btn.disabled = false
          showToast('刪除失敗：' + e.message)
        }
      })
    })
  } catch {
    el.innerHTML = '<div style="color:var(--red);padding:16px;font-size:13px;">載入失敗</div>'
  }
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

function enterEditMode(coach) {
  editingCoachId = coach.id

  // Fill text fields
  document.getElementById('f-cn').value = coach.name_cn || ''
  document.getElementById('f-en').value = coach.name_en || ''
  document.querySelectorAll('.rc').forEach(cb => { cb.checked = (coach.resort || []).includes(cb.value) })
  document.getElementById('f-lang').value = coach.languages || ''
  document.getElementById('f-exp').value = coach.experience || ''
  document.getElementById('f-cert').value = coach.cert || ''
  document.getElementById('f-bio').value = coach.bio || ''

  // Fill tags
  document.querySelectorAll('.tc').forEach(cb => {
    cb.checked = (coach.tags || []).includes(cb.value)
  })

  // Fill avatar preview
  if (coach.photo_url) {
    document.getElementById('photo-preview').src = coach.photo_url
    document.getElementById('photo-name').textContent = '目前照片'
    document.getElementById('photo-empty').style.display = 'none'
    document.getElementById('photo-filled').style.display = 'block'
    document.getElementById('photo-zone').classList.add('has-photo')
  } else {
    resetAvatar()
  }

  // Fill skiing photo preview
  if (coach.skiing_photo_url) {
    document.getElementById('skiing-photo-preview').src = coach.skiing_photo_url
    document.getElementById('skiing-photo-name').textContent = '目前照片'
    document.getElementById('skiing-photo-empty').style.display = 'none'
    document.getElementById('skiing-photo-filled').style.display = 'block'
    document.getElementById('skiing-photo-zone').classList.add('has-photo')
  } else {
    resetSkiing()
  }

  // Show edit bar, update button
  document.getElementById('edit-mode-bar').style.display = 'flex'
  document.getElementById('editing-coach-name').textContent = coach.name_cn
  document.getElementById('add-btn').textContent = '更新教練'

  // Switch to add tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'))
  document.querySelector('.tab-btn[data-tab="tab-add"]').classList.add('active')
  document.getElementById('tab-add').classList.add('active')
  document.querySelector('.admin-body').scrollTop = 0
}

function exitEditMode() {
  editingCoachId = null
  document.getElementById('edit-mode-bar').style.display = 'none'
  document.getElementById('add-btn').textContent = '新增教練'
  clearForm()
}

document.getElementById('cancel-edit-btn').addEventListener('click', exitEditMode)

// ── Photo helpers ─────────────────────────────────────────────────────────────

function resetAvatar() {
  pendingAvatarFile = null
  document.getElementById('f-photo').value = ''
  document.getElementById('photo-preview').src = ''
  document.getElementById('photo-name').textContent = ''
  document.getElementById('photo-empty').style.display = 'block'
  document.getElementById('photo-filled').style.display = 'none'
  document.getElementById('photo-zone').classList.remove('has-photo')
}

function resetSkiing() {
  pendingSkiingFile = null
  document.getElementById('f-skiing-photo').value = ''
  document.getElementById('skiing-photo-preview').src = ''
  document.getElementById('skiing-photo-name').textContent = ''
  document.getElementById('skiing-photo-empty').style.display = 'block'
  document.getElementById('skiing-photo-filled').style.display = 'none'
  document.getElementById('skiing-photo-zone').classList.remove('has-photo')
}

function clearForm() {
  ;['f-cn', 'f-en', 'f-lang', 'f-exp', 'f-cert', 'f-bio'].forEach(id => { document.getElementById(id).value = '' })
  document.querySelectorAll('.rc').forEach(cb => { cb.checked = false })
  document.querySelectorAll('.tc').forEach(cb => { cb.checked = false })
  resetAvatar()
  resetSkiing()
}

// Avatar upload
document.getElementById('f-photo').addEventListener('change', function () {
  const file = this.files[0]
  if (!file) return
  if (file.size > 3 * 1024 * 1024) { showToast('照片大小請勿超過 3MB'); this.value = ''; return }
  pendingAvatarFile = file
  const reader = new FileReader()
  reader.onload = e => {
    document.getElementById('photo-preview').src = e.target.result
    document.getElementById('photo-name').textContent = file.name
    document.getElementById('photo-empty').style.display = 'none'
    document.getElementById('photo-filled').style.display = 'block'
    document.getElementById('photo-zone').classList.add('has-photo')
  }
  reader.readAsDataURL(file)
})
document.getElementById('photo-remove').addEventListener('click', e => { e.stopPropagation(); resetAvatar() })

// Skiing photo upload
document.getElementById('f-skiing-photo').addEventListener('change', function () {
  const file = this.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { showToast('照片大小請勿超過 5MB'); this.value = ''; return }
  pendingSkiingFile = file
  const reader = new FileReader()
  reader.onload = e => {
    document.getElementById('skiing-photo-preview').src = e.target.result
    document.getElementById('skiing-photo-name').textContent = file.name
    document.getElementById('skiing-photo-empty').style.display = 'none'
    document.getElementById('skiing-photo-filled').style.display = 'block'
    document.getElementById('skiing-photo-zone').classList.add('has-photo')
  }
  reader.readAsDataURL(file)
})
document.getElementById('skiing-photo-remove').addEventListener('click', e => { e.stopPropagation(); resetSkiing() })

// ── Add / Update coach ────────────────────────────────────────────────────────

document.getElementById('add-btn').addEventListener('click', async () => {
  const nameCn = document.getElementById('f-cn').value.trim()
  if (!nameCn) { showToast('請填寫教練中文姓名'); return }

  const isEditing = editingCoachId !== null
  const btn = document.getElementById('add-btn')
  btn.textContent = '儲存中...'
  btn.disabled = true

  const formData = {
    name_cn:    nameCn,
    name_en:    document.getElementById('f-en').value.trim() || null,
    resort:     Array.from(document.querySelectorAll('.rc:checked')).map(cb => cb.value),
    languages:  document.getElementById('f-lang').value.trim() || null,
    experience: document.getElementById('f-exp').value.trim() || null,
    cert:       document.getElementById('f-cert').value.trim() || null,
    bio:        document.getElementById('f-bio').value.trim() || null,
    tags:       Array.from(document.querySelectorAll('.tc:checked')).map(cb => cb.value),
  }

  try {
    if (isEditing) {
      await editCoach(editingCoachId, formData, pendingAvatarFile, pendingSkiingFile)
      showToast('✅ 教練資料已更新！')
      exitEditMode()
      renderList()
    } else {
      await saveCoach(formData, pendingAvatarFile, pendingSkiingFile)
      showToast('✅ 教練已新增！')
      clearForm()
    }
    loadCoaches()
  } catch (e) {
    showToast((isEditing ? '更新' : '新增') + '失敗：' + e.message)
  } finally {
    btn.textContent = isEditing ? '更新教練' : '新增教練'
    btn.disabled = false
  }
})

document.getElementById('clear-btn').addEventListener('click', () => {
  if (editingCoachId) exitEditMode()
  else clearForm()
})

// ── Admin overlay ─────────────────────────────────────────────────────────────

const overlay = document.getElementById('admin-overlay')

function openAdmin() { overlay.classList.add('active'); document.body.style.overflow = 'hidden' }
function closeAdmin() { overlay.classList.remove('active'); document.body.style.overflow = '' }
function showLoginPane() {
  document.getElementById('pane-login').style.display = 'block'
  document.getElementById('pane-manage').style.display = 'none'
  document.getElementById('pw-err').style.display = 'none'
  document.getElementById('login-email').value = ''
  document.getElementById('pw-input').value = ''
}
function showManagePane() {
  document.getElementById('pane-login').style.display = 'none'
  document.getElementById('pane-manage').style.display = 'block'
}

document.getElementById('admin-btn').addEventListener('click', async () => {
  openAdmin()
  const session = await getSession()
  if (session) { showManagePane(); renderList() }
  else showLoginPane()
})
document.getElementById('admin-close').addEventListener('click', closeAdmin)
overlay.addEventListener('click', e => { if (e.target === overlay) closeAdmin() })

onAuthStateChange(session => {
  if (!overlay.classList.contains('active')) return
  if (session) { showManagePane(); renderList() }
  else showLoginPane()
})

// ── Login / logout ────────────────────────────────────────────────────────────

async function doLogin() {
  const email = document.getElementById('login-email').value.trim()
  const pw = document.getElementById('pw-input').value
  const errEl = document.getElementById('pw-err')
  const btn = document.getElementById('login-btn')
  errEl.style.display = 'none'
  btn.textContent = '登入中...'
  btn.disabled = true
  try {
    await signIn(email, pw)
    showManagePane()
    renderList()
  } catch {
    errEl.style.display = 'block'
  } finally {
    btn.textContent = '登入'
    btn.disabled = false
  }
}

document.getElementById('login-btn').addEventListener('click', doLogin)
document.getElementById('pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() })
document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut()
  showLoginPane()
})

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    const pane = document.getElementById(btn.dataset.tab)
    if (pane) pane.classList.add('active')
    if (btn.dataset.tab === 'tab-list') renderList()
  })
})

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2800)
}

// ── Smooth scroll nav ─────────────────────────────────────────────────────────

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault()
    const t = document.querySelector(a.getAttribute('href'))
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('nav-links').classList.remove('open')
  })
})
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open')
})

// ── Init ──────────────────────────────────────────────────────────────────────

loadCoaches()
