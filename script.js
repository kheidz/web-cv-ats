// ===================== ELEMENT REFERENCES =====================
const landingPage = document.getElementById('landingPage');
const appPage = document.getElementById('appPage');
const btnStart = document.getElementById('btnStart');

const cvForm = document.getElementById('cvForm');
const btnReset = document.getElementById('btnReset');
const btnEdit = document.getElementById('btnEdit');
const btnDownload = document.getElementById('btnDownload');
const cvPreview = document.getElementById('cvPreview');
const historyList = document.getElementById('historyList');
const STORAGE_KEY = 'atsCvHistory';

// Daftar field input yang dipakai berulang
const fields = {
  fullName: document.getElementById('fullName'),
  jobTitle: document.getElementById('jobTitle'),
  phone: document.getElementById('phone'),
  email: document.getElementById('email'),
  linkedin: document.getElementById('linkedin'),
  github: document.getElementById('github'),
  city: document.getElementById('city'),
  summary: document.getElementById('summary'),
  education: document.getElementById('education'),
  experience: document.getElementById('experience'),
  organization: document.getElementById('organization'),
  projects: document.getElementById('projects'),
  skills: document.getElementById('skills'),
  certificates: document.getElementById('certificates'),
  awards: document.getElementById('awards'),
  languages: document.getElementById('languages'),
};

// ===================== NAVIGASI HALAMAN =====================
btnStart.addEventListener('click', () => {
  landingPage.classList.add('hidden');
  appPage.classList.remove('hidden');
});

// ===================== UTILITAS FORMAT TEKS =====================

// Menghapus spasi berlebih di awal/akhir & di antara kata
function cleanText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

// Mengubah teks menjadi Title Case (huruf awal tiap kata kapital)
function toTitleCase(text) {
  return cleanText(text)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Memecah textarea menjadi array baris non-kosong, lalu dibersihkan
function getLines(rawText) {
  return rawText
    .split('\n')
    .map((line) => cleanText(line))
    .filter((line) => line.length > 0);
}

// Memecah string dipisah koma menjadi array item bersih
function getCommaItems(rawText) {
  return rawText
    .split(',')
    .map((item) => cleanText(item))
    .filter((item) => item.length > 0);
}

// Escape karakter HTML agar input pengguna aman ditampilkan
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Mengubah **teks** menjadi <strong>teks</strong> untuk kata kunci penting di summary
// Escape HTML dulu, lalu baru terapkan bold agar tidak ada celah XSS
function parseBold(text) {
  return escapeHTML(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// ===================== VALIDASI FORM =====================
function validateForm() {
  const requiredFields = [
    { el: fields.fullName, label: 'Nama Lengkap' },
    { el: fields.jobTitle, label: 'Jabatan yang Dilamar' },
    { el: fields.phone, label: 'Nomor Telepon' },
    { el: fields.email, label: 'Email' },
    { el: fields.city, label: 'Kota' },
  ];

  for (const item of requiredFields) {
    if (cleanText(item.el.value) === '') {
      alert(`Mohon isi field "${item.label}" terlebih dahulu.`);
      item.el.focus();
      return false;
    }
  }

  // Validasi format email sederhana
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(cleanText(fields.email.value))) {
    alert('Format email tidak valid.');
    fields.email.focus();
    return false;
  }

  return true;
}

// ===================== BUILDER SECTION CV =====================

// Membuat blok section dengan judul + konten, section kosong tidak dibuat
function buildSection(title, contentHTML) {
  if (!contentHTML) return '';
  return `
    <div class="cv-section">
      <div class="cv-section-title">${title}</div>
      ${contentHTML}
    </div>
  `;
}

// Membuat daftar bullet otomatis dari array teks
function buildBullets(items) {
  if (items.length === 0) return '';
  const listItems = items.map((item) => `<li>${escapeHTML(item)}</li>`).join('');
  return `<ul class="cv-bullets">${listItems}</ul>`;
}

// ===================== BUILDER SECTION (per tipe konten) =====================

// HELPER: baris 2-kolom (kiri + kanan)
function entryRow(leftHTML, rightText) {
  return `
    <div class="cv-entry-row">
      <span class="cv-entry-left">${leftHTML}</span>
      ${rightText ? `<span class="cv-entry-right">${escapeHTML(rightText)}</span>` : ''}
    </div>`;
}

// EDUCATION: "Universitas | Gelar | GPA | Kota | Tahun | Kegiatan1;Kegiatan2"
// Baris 1: Nama Universitas (bold, kiri) | Kota (kanan)
// Baris 2: Gelar italic [| GPA] (kiri)   | Tahun (kanan)
// Bullet: kegiatan kampus
function buildEducation(rawText) {
  const lines = getLines(rawText);
  if (lines.length === 0) return '';

  return lines.map(line => {
    const p = line.split('|').map(s => cleanText(s));
    const [institution = '', degree = '', gpa = '', city = '', date = '', activities = ''] = p;
    const degreeGpa = [degree, gpa].filter(Boolean).join(' | ');
    const actItems = activities ? activities.split(';').map(a => cleanText(a)).filter(Boolean) : [];

    return `
      <div class="cv-entry">
        ${entryRow(`<span class="cv-entry-title">${escapeHTML(institution)}</span>`, city)}
        ${degreeGpa || date ? entryRow(`<span class="cv-entry-subtitle">${escapeHTML(degreeGpa)}</span>`, date) : ''}
        ${buildBullets(actItems)}
      </div>`;
  }).join('');
}

// EXPERIENCE: "Perusahaan | Posisi | Kota | Tahun | Bullet1;Bullet2"
// Baris 1: Nama Perusahaan (bold, kiri) | Kota (kanan)
// Baris 2: Posisi italic (kiri)          | Tahun BOLD (kanan)
// Bullet: pencapaian
function buildExperience(rawText) {
  const lines = getLines(rawText);
  if (lines.length === 0) return '';

  return lines.map(line => {
    const p = line.split('|').map(s => cleanText(s));
    const [company = '', position = '', city = '', date = '', achievements = ''] = p;
    const bulletItems = achievements ? achievements.split(';').map(b => cleanText(b)).filter(Boolean) : [];

    return `
      <div class="cv-entry">
        ${entryRow(`<span class="cv-entry-title">${escapeHTML(company)}</span>`, city)}
        ${position || date ? `
        <div class="cv-entry-row">
          <span class="cv-entry-left cv-entry-subtitle">${escapeHTML(position)}</span>
          ${date ? `<span class="cv-entry-right cv-entry-date-bold">${escapeHTML(date)}</span>` : ''}
        </div>` : ''}
        ${buildBullets(bulletItems)}
      </div>`;
  }).join('');
}

// ORGANIZATION: "Nama Org | Jabatan | Kota | Tahun | Kegiatan1;Kegiatan2"
function buildOrganization(rawText) {
  const lines = getLines(rawText);
  if (lines.length === 0) return '';

  return lines.map(line => {
    const p = line.split('|').map(s => cleanText(s));
    const [orgName = '', position = '', city = '', date = '', activities = ''] = p;
    const actItems = activities ? activities.split(';').map(a => cleanText(a)).filter(Boolean) : [];

    return `
      <div class="cv-entry">
        ${entryRow(`<span class="cv-entry-title">${escapeHTML(orgName)}</span>`, city)}
        ${position || date ? entryRow(`<span class="cv-entry-subtitle">${escapeHTML(position)}</span>`, date) : ''}
        ${buildBullets(actItems)}
      </div>`;
  }).join('');
}

// PROJECTS: "Nama | Deskripsi | Kota/Remote | Tahun | Detail1;Detail2"
function buildProjects(rawText) {
  const lines = getLines(rawText);
  if (lines.length === 0) return '';

  return lines.map(line => {
    const p = line.split('|').map(s => cleanText(s));
    const [name = '', desc = '', city = '', date = '', details = ''] = p;
    const detailItems = details ? details.split(';').map(d => cleanText(d)).filter(Boolean) : [];

    return `
      <div class="cv-entry">
        ${entryRow(`<span class="cv-entry-title">${escapeHTML(name)}</span>`, city)}
        ${desc || date ? entryRow(`<span class="cv-entry-subtitle">${escapeHTML(desc)}</span>`, date) : ''}
        ${buildBullets(detailItems)}
      </div>`;
  }).join('');
}

// SKILLS: per baris, mendukung format "Kategori: item1, item2" (label bold)
// Jika tidak ada ":", tampilkan sebagai bullet biasa
function buildSkills(rawText) {
  const lines = getLines(rawText);
  if (lines.length === 0) return '';

  const listItems = lines.map(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const category = escapeHTML(cleanText(line.substring(0, colonIdx)));
      const content = escapeHTML(cleanText(line.substring(colonIdx + 1)));
      return `<li><strong>${category}:</strong> ${content}</li>`;
    }
    return `<li>${escapeHTML(line)}</li>`;
  }).join('');

  return `<ul class="cv-bullets">${listItems}</ul>`;
}

// CERTIFICATES / AWARDS / LANGUAGES: bullet list sederhana
function buildSimpleBulletSection(items) {
  if (items.length === 0) return '';
  return buildBullets(items);
}

// ===================== GENERATE CV UTAMA =====================
function generateCV() {
  // --- Data dasar ---
  // Nama ditampilkan ALL CAPS di CV (via JS, bukan CSS, agar teks di PDF juga uppercase)
  const fullName = toTitleCase(fields.fullName.value).toUpperCase();
  const jobTitle = cleanText(fields.jobTitle.value);
  const phone    = cleanText(fields.phone.value);
  const email    = cleanText(fields.email.value);
  const linkedin = cleanText(fields.linkedin.value);
  const github   = cleanText(fields.github.value);
  const city     = toTitleCase(fields.city.value);
  const summary  = cleanText(fields.summary.value);

  // Kontak: satu baris, pipe-separated (telepon | email | linkedin | github)
  const contactLine1 = [phone, email, linkedin, github].filter(Boolean).map(escapeHTML).join(' &nbsp;|&nbsp; ');
  // Lokasi: baris kedua jika ada
  const contactLine2 = city ? `<br>${escapeHTML(city)}` : '';
  const jobTitleBlock = jobTitle ? `<div class="cv-job-title">${escapeHTML(jobTitle)}</div>` : '';

  // --- Bangun setiap section ---
  // Summary: paragraf tanpa heading section (seperti referensi), mendukung **bold**
  const summaryBlock = summary
    ? `<div class="cv-summary">${parseBold(summary)}</div>`
    : '';

  const educationHTML     = buildEducation(fields.education.value);
  const experienceHTML    = buildExperience(fields.experience.value);
  const organizationHTML  = buildOrganization(fields.organization.value);
  const projectsHTML      = buildProjects(fields.projects.value);
  const skillsHTML        = buildSkills(fields.skills.value);
  const certificatesHTML  = buildSimpleBulletSection(getLines(fields.certificates.value));
  const awardsHTML        = buildSimpleBulletSection(getLines(fields.awards.value));
  const languagesHTML     = buildSimpleBulletSection(getCommaItems(fields.languages.value));

  // --- Rakit template CV ATS satu kolom ---
  // Urutan section mengikuti format referensi:
  // Education → Work Experience → Organizational Experience → Projects → Certification → Award → Skills → Languages
  const cvHTML = `
    <div class="cv-name">${escapeHTML(fullName)}</div>
    ${jobTitleBlock}
    <div class="cv-contact">${contactLine1}${contactLine2}</div>
    ${summaryBlock}

    ${buildSection('Education', educationHTML)}
    ${buildSection('Work Experience', experienceHTML)}
    ${buildSection('Organizational Experience', organizationHTML)}
    ${buildSection('Projects', projectsHTML)}
    ${buildSection('Certification', certificatesHTML)}
    ${buildSection('Award', awardsHTML)}
    ${buildSection('Skills', skillsHTML)}
    ${buildSection('Languages', languagesHTML)}
  `;

  cvPreview.innerHTML = cvHTML;
}

// ===================== HISTORY / PENYIMPANAN =====================
function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn('Gagal memuat history:', error);
    return [];
  }
}

function saveHistory() {
  const entry = {
    id: Date.now().toString(),
    fullName: cleanText(fields.fullName.value),
    jobTitle: cleanText(fields.jobTitle.value),
    phone: cleanText(fields.phone.value),
    email: cleanText(fields.email.value),
    linkedin: cleanText(fields.linkedin.value),
    github: cleanText(fields.github.value),
    city: cleanText(fields.city.value),
    summary: cleanText(fields.summary.value),
    education: fields.education.value,
    experience: fields.experience.value,
    organization: fields.organization.value,
    projects: fields.projects.value,
    skills: fields.skills.value,
    certificates: fields.certificates.value,
    awards: fields.awards.value,
    languages: fields.languages.value,
    createdAt: new Date().toISOString(),
  };

  const history = [entry, ...loadHistory()].slice(0, 8);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Gagal menyimpan history:', error);
  }

  renderHistory();
}

function renderHistory() {
  const history = loadHistory();

  if (!history.length) {
    historyList.innerHTML = '<p class="history-empty">Belum ada riwayat CV tersimpan.</p>';
    return;
  }

  historyList.innerHTML = history.map((entry) => {
    const createdAt = new Date(entry.createdAt).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return `
      <div class="history-item">
        <div class="history-main">
          <strong>${escapeHTML(entry.fullName || 'Tanpa nama')}</strong>
          <span>${escapeHTML(entry.jobTitle || '-')}</span>
        </div>
        <div class="history-meta">${escapeHTML(createdAt)}</div>
        <div class="history-actions">
          <button type="button" class="history-btn load-btn" data-action="load" data-id="${entry.id}">Load</button>
          <button type="button" class="history-btn delete-btn" data-action="delete" data-id="${entry.id}">Hapus</button>
        </div>
      </div>
    `;
  }).join('');
}

function populateFormFromHistory(entry) {
  Object.entries(fields).forEach(([key, field]) => {
    if (entry[key] !== undefined) {
      field.value = entry[key];
    }
  });

  setFormDisabled(false);
  generateCV();
  btnEdit.disabled = false;
  btnDownload.disabled = false;
}

function deleteHistoryEntry(id) {
  const history = loadHistory().filter((item) => item.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Gagal menghapus history:', error);
  }

  renderHistory();
}

historyList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === 'load') {
    const entry = loadHistory().find((item) => item.id === id);
    if (entry) populateFormFromHistory(entry);
  }

  if (action === 'delete') {
    deleteHistoryEntry(id);
  }
});

// ===================== EVENT: SUBMIT FORM (GENERATE) =====================
cvForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  generateCV();
  saveHistory();

  // Aktifkan tombol setelah CV berhasil dibuat
  btnEdit.disabled = false;
  btnDownload.disabled = false;

  // Kunci form (mode preview), kecuali tombol reset
  setFormDisabled(true);
});

// ===================== REAL-TIME PREVIEW (tiap field berubah) =====================
Object.values(fields).forEach((field) => {
  field.addEventListener('input', () => {
    // Hanya update preview otomatis jika nama & jabatan sudah ada (menghindari preview kosong aneh)
    if (cleanText(fields.fullName.value) !== '' || cleanText(fields.jobTitle.value) !== '') {
      generateCV();
    }
  });
});

// ===================== TOMBOL EDIT =====================
btnEdit.addEventListener('click', () => {
  setFormDisabled(false);
  fields.fullName.focus();
});

// Mengunci/membuka semua input form
function setFormDisabled(isDisabled) {
  Object.values(fields).forEach((field) => {
    field.disabled = isDisabled;
  });
}

// ===================== TOMBOL RESET FORM =====================
btnReset.addEventListener('click', () => {
  const confirmReset = confirm('Yakin ingin mengosongkan semua data form?');
  if (!confirmReset) return;

  cvForm.reset();
  setFormDisabled(false);

  cvPreview.innerHTML = '<p class="empty-state">Isi form di sebelah kiri untuk melihat preview CV Anda di sini secara real-time.</p>';

  btnEdit.disabled = true;
  btnDownload.disabled = true;
});

renderHistory();

// ===================== TOMBOL DOWNLOAD PDF =====================
// Menggunakan fitur print bawaan browser (Save as PDF) agar tanpa library tambahan
btnDownload.addEventListener('click', () => {
  document.title = `CV - ${cleanText(fields.fullName.value) || 'ATS'}`;
  window.print();
});
