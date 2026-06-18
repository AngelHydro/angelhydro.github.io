/* ===========================================================
   Portfolio Angel SANCHEZ — logique (vanilla JS)
   Rendu dynamique + mode administrateur sécurisé (côté client)
   =========================================================== */

/* -----------------------------------------------------------
   ⚠️ NOTE DE SÉCURITÉ IMPORTANTE
   GitHub Pages est un hébergement 100 % statique : tout ce code
   s'exécute dans le navigateur du visiteur. Les protections
   ci-dessous (hash du mot de passe, verrouillage, déconnexion
   auto) sont DISSUASIVES mais pas inviolables — un visiteur
   déterminé peut toujours lire/modifier les données dans SON
   propre navigateur. Pour une vraie sécurité, il faut un
   backend (Decap CMS, Supabase, Firebase…).
   ----------------------------------------------------------- */

// SHA-256 du mot de passe. Par défaut = "admin".
// Pour le changer : ouvre la console et tape  await sha256("ton-mot-de-passe")
// puis colle le résultat ci-dessous.
const PWD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60 * 1000;        // verrouillage 1 min après trop d'essais
const IDLE_MS = 10 * 60 * 1000;   // déconnexion auto après 10 min d'inactivité

const LS_PROJECTS = 'angel_portfolio_projects';
const LS_ARTICLES = 'angel_portfolio_articles';

/* ---------- Données par défaut ---------- */
function defaultProjects() {
  return [
    { id:'p1', title:'Club Couture', category:'web', image:'data/img/club_couture.png', link:'https://clubcouture.github.io/', linkLabel:'Voir le site', desc:"Site web pour le club couture de mon lycée, développé avec HTML, CSS et JavaScript.", tags:['HTML','CSS','JavaScript'] },
    { id:'p2', title:'Trophées NSI', category:'python', image:'data/img/rytmix.png', link:'#', linkLabel:'Voir le projet', desc:"Projet Python réalisé en classe de NSI, lauréat d'un prix aux Trophées NSI.", tags:['Python','NSI','Algorithmes'] },
    { id:'p3', title:'Portfolio Personnel', category:'web', image:'data/img/logo.png', link:'#', linkLabel:'Voir le code', desc:"Ce site portfolio développé avec une approche moderne et responsive.", tags:['HTML','CSS','JavaScript'] },
  ];
}
function defaultArticles() {
  return [
    { id:'a1', title:'Mes débuts en développement web', date:'15 janvier 2026', tags:['Parcours','Python'], excerpt:"Comment une petite blague en Python en troisième a fini par devenir une vraie passion pour le code.", content:"Tout a commencé avec de petits programmes Python qui ne servaient pas à grand-chose mais qui me faisaient rire. En seconde, les cours de SNT ont confirmé l'envie : je voulais créer des choses sur le web.\n\nMon stage chez MagicWeb m'a montré l'envers du décor — il y a bien plus de travail derrière un site que ce qu'on imagine. C'est là que tout s'est accéléré." },
    { id:'a2', title:'Retour sur les Trophées NSI', date:'2 mars 2026', tags:['NSI','Python'], excerpt:"On a gagné un prix… mais entre nous, je ne suis pas sûr qu'on l'ait vraiment mérité. Récit.", content:"En NSI cette année, on a monté un projet Python pour les Trophées NSI. L'organisation, le travail d'équipe, les nuits de debug : tout y est passé.\n\nLe jour de la remise, on a décroché un prix. La fierté était réelle, même si on plaisante souvent en disant que c'était un peu de la chance !" },
  ];
}

/* ---------- État ---------- */
let projects = load(LS_PROJECTS, defaultProjects);
let articles = load(LS_ARTICLES, defaultArticles);
let filter = 'all';
let adminMode = false;
let loginAttempts = 0;
let lockUntil = 0;
let lockInterval = null;
let idleTimer = null;
let editContext = null; // { type:'project'|'article', mode:'add'|'edit', id }

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return fallback();
}
function persist(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
window.sha256 = sha256; // pratique pour recalculer un hash depuis la console

/* ===========================================================
   RENDU
   =========================================================== */
function renderProjects() {
  const grid = document.getElementById('projects-grid');
  const visible = projects.filter(p => filter === 'all' || p.category === filter);
  let html = visible.map(p => {
    const media = (p.image && p.image.trim())
      ? `<img src="${esc(p.image)}" alt="${esc(p.title)}">`
      : `<div class="placeholder"><span>project shot</span></div>`;
    const tags = (p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
    const adminBtns = adminMode ? `
      <div class="admin-actions">
        <button class="admin-btn admin-edit" data-edit-project="${p.id}" title="Modifier">✏</button>
        <button class="admin-btn admin-del" data-del-project="${p.id}" title="Supprimer">🗑</button>
      </div>` : '';
    return `
      <div class="project-card">
        <div class="project-media">
          ${media}
          <a class="project-overlay" href="${esc(p.link || '#')}" target="_blank"><span>${esc(p.linkLabel || 'Voir')}</span></a>
        </div>
        <div class="project-body">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.desc)}</p>
          <div class="tag-row">${tags}</div>
        </div>
        ${adminBtns}
      </div>`;
  }).join('');

  if (adminMode) {
    html += `<button class="add-card" id="add-project"><span class="plus">+</span><span class="label">Ajouter un projet</span></button>`;
  }
  grid.innerHTML = html;
}

function renderArticles() {
  const grid = document.getElementById('blog-grid');
  let html = '';
  if (articles.length === 0 && !adminMode) {
    html = `<p class="blog-empty">Aucun article pour le moment.</p>`;
  }
  html += articles.map(a => {
    const tags = (a.tags || []).map(t => `<span class="article-tag">${esc(t)}</span>`).join('');
    const adminBtns = adminMode ? `
      <div class="admin-actions">
        <button class="admin-btn admin-edit" data-edit-article="${a.id}" title="Modifier">✏</button>
        <button class="admin-btn admin-del" data-del-article="${a.id}" title="Supprimer">🗑</button>
      </div>` : '';
    return `
      <article class="article-card">
        <div class="article-bar"></div>
        <div class="article-body">
          <span class="article-date">${esc(a.date)}</span>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.excerpt)}</p>
          <div class="tag-row" style="margin-bottom:14px;">${tags}</div>
          <button class="article-read" data-read-article="${a.id}">Lire l'article →</button>
        </div>
        ${adminBtns}
      </article>`;
  }).join('');

  if (adminMode) {
    html += `<button class="add-card article" id="add-article"><span class="plus">+</span><span class="label">Ajouter un article</span></button>`;
  }
  grid.innerHTML = html;
}

function renderAll() { renderProjects(); renderArticles(); }

/* ===========================================================
   ADMIN — connexion sécurisée
   =========================================================== */
const $ = (id) => document.getElementById(id);

function openLogin() {
  $('login-pwd').value = '';
  $('login-err').hidden = true;
  updateLockUI();
  $('login-overlay').hidden = false;
  $('login-pwd').focus();
}
function closeLogin() { $('login-overlay').hidden = true; }

function updateLockUI() {
  const locked = Date.now() < lockUntil;
  const lockEl = $('login-lock');
  const btn = $('login-submit');
  if (locked) {
    const secs = Math.ceil((lockUntil - Date.now()) / 1000);
    lockEl.textContent = `Trop de tentatives. Réessaie dans ${secs} s.`;
    lockEl.hidden = false;
    btn.disabled = true;
  } else {
    lockEl.hidden = true;
    btn.disabled = false;
  }
}

async function submitLogin() {
  if (Date.now() < lockUntil) return;
  const pwd = $('login-pwd').value;
  const hash = await sha256(pwd);
  if (hash === PWD_HASH) {
    adminMode = true;
    loginAttempts = 0;
    closeLogin();
    armIdleTimer();
    $('admin-bar').hidden = false;
    $('admin-entry').hidden = true;
    renderAll();
  } else {
    loginAttempts++;
    $('login-pwd').value = '';
    if (loginAttempts >= MAX_ATTEMPTS) {
      loginAttempts = 0;
      lockUntil = Date.now() + LOCK_MS;
      clearInterval(lockInterval);
      lockInterval = setInterval(() => {
        updateLockUI();
        if (Date.now() >= lockUntil) clearInterval(lockInterval);
      }, 1000);
      $('login-err').hidden = true;
      updateLockUI();
    } else {
      const left = MAX_ATTEMPTS - loginAttempts;
      const err = $('login-err');
      err.textContent = `Mot de passe incorrect. ${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}.`;
      err.hidden = false;
    }
  }
}

function logout() {
  adminMode = false;
  clearTimeout(idleTimer);
  $('admin-bar').hidden = true;
  $('admin-entry').hidden = false;
  closeEdit();
  renderAll();
}

/* déconnexion automatique sur inactivité */
function armIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (adminMode) { logout(); alert('Session administrateur expirée (inactivité). Reconnecte-toi.'); }
  }, IDLE_MS);
}
['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev =>
  window.addEventListener(ev, () => { if (adminMode) armIdleTimer(); }, { passive: true })
);

/* ===========================================================
   ADMIN — modale d'édition
   =========================================================== */
function openEdit(type, mode, id) {
  editContext = { type, mode, id };
  const isProject = type === 'project';
  $('project-fields').hidden = !isProject;
  $('article-fields').hidden = isProject;

  const titles = {
    'project-add': 'Nouveau projet', 'project-edit': 'Modifier le projet',
    'article-add': 'Nouvel article', 'article-edit': "Modifier l'article",
  };
  $('edit-title').textContent = titles[type + '-' + mode];

  // reset
  ['f-title','f-desc','f-image','f-link','f-linklabel','f-date','f-excerpt','f-content','f-tags'].forEach(i => $(i).value = '');
  $('f-category').value = 'web';
  $('f-linklabel').value = 'Voir le projet';
  $('f-link').value = '#';

  if (mode === 'edit') {
    if (isProject) {
      const p = projects.find(x => x.id === id);
      $('f-title').value = p.title || '';
      $('f-desc').value = p.desc || '';
      $('f-image').value = p.image || '';
      $('f-link').value = p.link || '';
      $('f-linklabel').value = p.linkLabel || '';
      $('f-category').value = p.category || 'web';
      $('f-tags').value = (p.tags || []).join(', ');
    } else {
      const a = articles.find(x => x.id === id);
      $('f-title').value = a.title || '';
      $('f-date').value = a.date || '';
      $('f-excerpt').value = a.excerpt || '';
      $('f-content').value = a.content || '';
      $('f-tags').value = (a.tags || []).join(', ');
    }
  }
  $('edit-overlay').hidden = false;
}
function closeEdit() { $('edit-overlay').hidden = true; editContext = null; }

function saveEdit() {
  if (!editContext) return;
  const { type, mode, id } = editContext;
  const tags = $('f-tags').value.split(',').map(s => s.trim()).filter(Boolean);

  if (type === 'project') {
    const data = {
      title: $('f-title').value || 'Sans titre',
      desc: $('f-desc').value || '',
      image: $('f-image').value.trim(),
      link: $('f-link').value || '#',
      linkLabel: $('f-linklabel').value || 'Voir',
      category: $('f-category').value || 'web',
      tags,
    };
    if (mode === 'add') projects.push({ id: uid(), ...data });
    else projects = projects.map(p => p.id === id ? { ...p, ...data } : p);
    persist(LS_PROJECTS, projects);
    renderProjects();
  } else {
    const data = {
      title: $('f-title').value || 'Sans titre',
      date: $('f-date').value || '',
      excerpt: $('f-excerpt').value || '',
      content: $('f-content').value || '',
      tags,
    };
    if (mode === 'add') articles.push({ id: uid(), ...data });
    else articles = articles.map(a => a.id === id ? { ...a, ...data } : a);
    persist(LS_ARTICLES, articles);
    renderArticles();
  }
  closeEdit();
}

/* ===========================================================
   LECTURE D'ARTICLE
   =========================================================== */
function openRead(id) {
  const a = articles.find(x => x.id === id);
  if (!a) return;
  $('read-date').textContent = a.date || '';
  $('read-title').textContent = a.title || '';
  $('read-content').textContent = a.content || '';
  $('read-overlay').hidden = false;
}
function closeRead() { $('read-overlay').hidden = true; }

/* ===========================================================
   ÉVÉNEMENTS
   =========================================================== */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-edit-project],[data-del-project],[data-edit-article],[data-del-article],[data-read-article],#add-project,#add-article');
  if (!t) return;
  if (t.id === 'add-project') openEdit('project', 'add');
  else if (t.id === 'add-article') openEdit('article', 'add');
  else if (t.dataset.editProject) openEdit('project', 'edit', t.dataset.editProject);
  else if (t.dataset.editArticle) openEdit('article', 'edit', t.dataset.editArticle);
  else if (t.dataset.delProject) { if (confirm('Supprimer ce projet ?')) { projects = projects.filter(p => p.id !== t.dataset.delProject); persist(LS_PROJECTS, projects); renderProjects(); } }
  else if (t.dataset.delArticle) { if (confirm('Supprimer cet article ?')) { articles = articles.filter(a => a.id !== t.dataset.delArticle); persist(LS_ARTICLES, articles); renderArticles(); } }
  else if (t.dataset.readArticle) openRead(t.dataset.readArticle);
});

// filtres
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderProjects();
  });
});

// login
$('admin-entry').addEventListener('click', openLogin);
$('login-cancel').addEventListener('click', closeLogin);
$('login-submit').addEventListener('click', submitLogin);
$('login-pwd').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitLogin(); });
$('login-overlay').addEventListener('click', (e) => { if (e.target === $('login-overlay')) closeLogin(); });
$('admin-logout').addEventListener('click', logout);

// édition
$('edit-cancel').addEventListener('click', closeEdit);
$('edit-save').addEventListener('click', saveEdit);
$('edit-overlay').addEventListener('click', (e) => { if (e.target === $('edit-overlay')) closeEdit(); });

// lecture
$('read-close').addEventListener('click', closeRead);
$('read-overlay').addEventListener('click', (e) => { if (e.target === $('read-overlay')) closeRead(); });

// formulaire de contact (démo)
$('contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Formulaire de démonstration — pour recevoir réellement les messages, connecte un service comme Formspree ou Netlify Forms.');
});

/* ===========================================================
   ANIMATIONS D'APPARITION
   =========================================================== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('revealed'); observer.unobserve(en.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));

/* ===========================================================
   INIT
   =========================================================== */
renderAll();
