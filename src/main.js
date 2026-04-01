import { signIn, signOut, getSession, onAuthStateChange } from './auth.js'
import { getCoaches, saveCoach, deleteCoach } from './api.js'

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

function buildCardHTML(c) {
  const avatarInner = c.photo_url
    ? `<img src="${c.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`
    : esc(c.name_cn ? c.name_cn.slice(-2) : '?')

  const tagsHTML = (c.tags || []).map(t => {
    const tm = TAG_MAP[t]
    return tm ? `<span class="tag ${tm.cls}">${tm.label}</span>` : ''
  }).join('')

  const svgMtn = `<svg class="info-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1L2 13h12L8 1z"/></svg>`
  const svgGlobe = `<svg class="info-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 2v12M2 8h12"/></svg>`
  const svgClock = `<svg class="info-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l2.5 2.5"/></svg>`

  return `<div class="coach-card">
    <div class="card-head">
      <div class="avatar">${avatarInner}</div>
      <div>
        <div class="coach-name">${esc(c.name_cn)}</div>
        ${c.name_en ? `<div class="coach-en">${esc(c.name_en)}</div>` : ''}
        <div class="coach-tags">${tagsHTML}</div>
      </div>
    </div>
    <div class="card-body">
      ${c.resort     ? `<div class="info-row">${svgMtn}<span class="info-lbl">雪場</span><span class="info-val">${esc(c.resort)}</span></div>` : ''}
      ${c.languages  ? `<div class="info-row">${svgGlobe}<span class="info-lbl">語言</span><span class="info-val">${esc(c.languages)}</span></div>` : ''}
      ${c.experience ? `<div class="info-row">${svgClock}<span class="info-lbl">資歷</span><span class="info-val">${esc(c.experience)}</span></div>` : ''}
      ${c.cert       ? `<div class="info-row"><span class="cert-badge">⭐ ${esc(c.cert)}</span></div>` : ''}
      ${c.bio        ? `<div class="coach-bio">${esc(c.bio)}</div>` : ''}
    </div>
  </div>`
}

// ── Load coaches onto the main page ──────────────────────────────────────────

async function loadCoaches() {
  const grid = document.getElementById('coaches-grid')
  try {
    const coaches = await getCoaches()
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

// ── Admin list tab ────────────────────────────────────────────────────────────

async function renderList() {
  const el = document.getElementById('list-items')
  el.innerHTML = '<div style="text-align:center;color:var(--gray);padding:16px;font-size:13px;">載入中...</div>'
  try {
    const coaches = await getCoaches()
    if (!coaches.length) {
      el.innerHTML = '<div style="text-align:center;color:var(--gray);padding:24px;font-size:13px;">尚無教練資料</div>'
      return
    }
    el.innerHTML = coaches.map(c => `
      <div class="list-item" id="coach-item-${c.id}">
        <div class="list-item-info">
          <div class="name">${esc(c.name_cn)}${c.name_en ? ` (${esc(c.name_en)})` : ''}</div>
          <div class="sub">${esc(c.resort || '')}${c.experience ? ' · ' + esc(c.experience) : ''}</div>
        </div>
        <button class="btn-del" data-id="${c.id}">刪除</button>
      </div>
    `).join('')

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

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2800)
}

// ── Admin overlay open/close ──────────────────────────────────────────────────

const overlay = document.getElementById('admin-overlay')

function openAdmin() {
  overlay.classList.add('active')
  document.body.style.overflow = 'hidden'
}
function closeAdmin() {
  overlay.classList.remove('active')
  document.body.style.overflow = ''
}
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

// ── Photo upload preview ──────────────────────────────────────────────────────

let pendingPhotoFile = null

function resetPhoto() {
  pendingPhotoFile = null
  document.getElementById('f-photo').value = ''
  document.getElementById('photo-preview').src = ''
  document.getElementById('photo-name').textContent = ''
  document.getElementById('photo-empty').style.display = 'block'
  document.getElementById('photo-filled').style.display = 'none'
  document.getElementById('photo-zone').classList.remove('has-photo')
}

document.getElementById('f-photo').addEventListener('change', function () {
  const file = this.files[0]
  if (!file) return
  if (file.size > 3 * 1024 * 1024) { showToast('照片大小請勿超過 3MB'); this.value = ''; return }
  pendingPhotoFile = file
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
document.getElementById('photo-remove').addEventListener('click', e => { e.stopPropagation(); resetPhoto() })

// ── Add coach ─────────────────────────────────────────────────────────────────

document.getElementById('add-btn').addEventListener('click', async () => {
  const nameCn = document.getElementById('f-cn').value.trim()
  if (!nameCn) { showToast('請填寫教練中文姓名'); return }
  const btn = document.getElementById('add-btn')
  btn.textContent = '儲存中...'
  btn.disabled = true
  try {
    await saveCoach({
      name_cn:    nameCn,
      name_en:    document.getElementById('f-en').value.trim() || null,
      resort:     document.getElementById('f-resort').value.trim() || null,
      languages:  document.getElementById('f-lang').value.trim() || null,
      experience: document.getElementById('f-exp').value.trim() || null,
      cert:       document.getElementById('f-cert').value.trim() || null,
      bio:        document.getElementById('f-bio').value.trim() || null,
      tags:       Array.from(document.querySelectorAll('.tc:checked')).map(cb => cb.value),
    }, pendingPhotoFile)

    showToast('✅ 教練已新增！')
    ;['f-cn', 'f-en', 'f-lang', 'f-exp', 'f-cert', 'f-bio'].forEach(id => { document.getElementById(id).value = '' })
    document.getElementById('f-resort').value = '手稻滑雪場'
    document.querySelectorAll('.tc').forEach(cb => { cb.checked = false })
    resetPhoto()
    loadCoaches()
  } catch (e) {
    showToast('新增失敗：' + e.message)
  } finally {
    btn.textContent = '新增教練'
    btn.disabled = false
  }
})

document.getElementById('clear-btn').addEventListener('click', () => {
  ;['f-cn', 'f-en', 'f-lang', 'f-exp', 'f-cert', 'f-bio'].forEach(id => { document.getElementById(id).value = '' })
  document.getElementById('f-resort').value = '手稻滑雪場'
  document.querySelectorAll('.tc').forEach(cb => { cb.checked = false })
  resetPhoto()
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
