// Mode administrateur : index.html?admin
// Modifie les textes, les projets, les articles et les images directement sur la page,
// puis enregistre index.html (et les nouvelles images) dans le dépôt GitHub.
// Seules les zones entre <!-- edit:nom --> et <!-- /edit:nom --> sont réécrites.
// ponytail: jeton GitHub gardé le temps de l'onglet (sessionStorage) ; un vrai backend OAuth si plusieurs personnes éditent un jour.
// Jamais dans localStorage : les autres dépôts publiés sur angelhydro.github.io/<dépôt>/ partagent la même origine, donc le même stockage.

const REPO = 'AngelHydro/angelhydro.github.io';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${REPO}/contents/`;
const EDITABLE = 'h1, h2, h3, p, .tag, .blog-date';
let token = sessionStorage.getItem('admin-token');
let dirty = false;

// ---------- GitHub ----------
async function gh(path, options = {}) {
    const res = await fetch(API + path, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...options.headers },
    });
    if (!res.ok) throw new Error(`GitHub ${res.status} : ${(await res.json().catch(() => ({}))).message || res.statusText}`);
    return res.json();
}
const toBase64 = (bytes) => { let s = ''; bytes.forEach(b => (s += String.fromCharCode(b))); return btoa(s); };
const fromBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0)));
const put = (path, bytes, message, sha) =>
    gh(path, { method: 'PUT', body: JSON.stringify({ message, content: toBase64(bytes), branch: BRANCH, sha }) });

// ---------- Jeton ----------
function askToken() {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'admin-dialog';
        dialog.setAttribute('aria-labelledby', 'admin-title');
        dialog.innerHTML = `
            <form method="dialog">
                <h2 id="admin-title">Mode administrateur</h2>
                <p>Colle un jeton GitHub avec l'accès <em>Contents : Read and write</em> sur ${REPO}.
                <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Créer un jeton<span class="sr-only"> (nouvel onglet)</span></a></p>
                <label for="admin-token">Jeton</label>
                <input type="password" id="admin-token" required autocomplete="off">
                <p role="alert" id="admin-error"></p>
                <div class="actions"><button value="cancel" formnovalidate>Annuler</button><button class="primary" value="ok">Valider</button></div>
            </form>`;
        document.body.append(dialog);
        dialog.querySelector('form').addEventListener('submit', async (e) => {
            if (e.submitter?.value !== 'ok') return;
            e.preventDefault();
            token = dialog.querySelector('#admin-token').value.trim();
            try {
                const repo = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
                if (!repo.permissions?.push) throw new Error('Ce jeton ne peut pas écrire dans le dépôt.');
                sessionStorage.setItem('admin-token', token);
                dialog.close('ok');
            } catch (err) {
                dialog.querySelector('#admin-error').textContent = err.message === 'Failed to fetch' ? 'GitHub injoignable.' : err.message;
            }
        });
        dialog.addEventListener('close', () => { dialog.remove(); resolve(dialog.returnValue === 'ok'); });
        dialog.showModal();
    });
}

// ---------- Édition ----------
// Conteneurs dont le contenu est délimité par <!-- edit:nom -->
function zones() {
    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
    while (walker.nextNode()) {
        const m = walker.currentNode.data.trim().match(/^edit:(\w+)$/);
        if (m) found.push({ name: m[1], el: walker.currentNode.parentElement });
    }
    return found;
}

function button(label, onClick, changesContent = true) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', (e) => { onClick(e); if (changesContent) dirty = true; });
    return b;
}

function tools(...buttons) {
    const bar = document.createElement('div');
    bar.className = 'admin-ui';
    bar.append(...buttons);
    return bar;
}

function enableEditing(root) {
    root.querySelectorAll(EDITABLE).forEach(el => {
        if (el.closest('.admin-ui, .project-overlay') || el.isContentEditable) return;
        el.contentEditable = 'plaintext-only';
        el.spellcheck = true;
    });
    [root, ...root.querySelectorAll('*')].filter(el => el.matches('.project-card, .blog-card')).forEach(addCardTools);
    root.querySelectorAll('.about img').forEach(img => {
        if (!img.nextElementSibling?.classList.contains('admin-ui')) img.after(tools(button('Changer l’image', () => replaceImage(img))));
    });
}

function addCardTools(card) {
    if (card.querySelector(':scope > .admin-ui')) return;
    const list = [
        button('Dupliquer', () => { const copy = card.cloneNode(true); copy.querySelector(':scope > .admin-ui').remove(); card.after(copy); enableEditing(copy); }),
        button('Supprimer', () => { if (confirm('Supprimer cette carte ?')) card.remove(); }),
        button('+ étiquette', () => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = 'Nouveau';
            card.querySelector('.project-tags').append(tag);
            enableEditing(card);
            tag.focus();
        }),
    ];
    if (card.classList.contains('project-card')) {
        list.push(
            button('Image', () => replaceImage(card.querySelector('.project-image img'))),
            button('Lien', () => editLink(card)),
            button('Catégorie', () => {
                const value = prompt('Catégorie (web ou python) :', card.dataset.category);
                if (value) card.dataset.category = value.trim().toLowerCase();
            }),
        );
    }
    card.prepend(tools(...list));
}

function editLink(card) {
    const old = card.querySelector('.project-link');
    const url = prompt('Adresse du projet (vide pour retirer le bouton) :', old?.getAttribute('href') || 'https://');
    if (url === null) return;
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) return alert('Adresse refusée : elle doit commencer par https:// ou http://');
    card.querySelector('.project-overlay')?.remove();
    if (!url.trim()) return;
    const label = prompt('Texte du bouton :', old?.querySelector('span')?.textContent || 'Voir le projet');
    const overlay = document.createElement('div');
    overlay.className = 'project-overlay';
    overlay.innerHTML = '<a target="_blank" rel="noopener" class="project-link"><span></span><span class="sr-only"> (nouvel onglet)</span></a>';
    overlay.firstChild.href = url.trim();
    overlay.querySelector('span').textContent = label || 'Voir le projet';
    card.querySelector('.project-image').append(overlay);
}

// Les images sont converties en WebP (800 px max) avant l'envoi, comme celles du site
const pendingImages = new Map(); // chemin dans le dépôt -> octets

function replaceImage(img) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 800 / bitmap.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.82));
        const name = file.name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[^\w-]+/g, '-').toLowerCase() || 'image';
        const path = `data/img/${name}-${Date.now().toString(36)}.webp`;
        pendingImages.set(path, new Uint8Array(await blob.arrayBuffer()));
        img.src = URL.createObjectURL(blob);
        img.dataset.adminSrc = path;
        img.width = canvas.width;
        img.height = canvas.height;
        img.alt = prompt('Description de l’image (vide si décorative) :', img.alt) ?? img.alt;
        dirty = true;
    });
    input.click();
}

// ---------- Enregistrement ----------
// Copie propre d'une zone : sans les outils, ni l'état ajouté par les scripts du site
function cleanHTML(el) {
    const copy = el.cloneNode(true);
    copy.querySelectorAll('.admin-ui').forEach(n => n.remove());
    copy.querySelectorAll('[contenteditable]').forEach(n => { n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); });
    copy.querySelectorAll('.tag').forEach(n => { if (!n.textContent.trim()) n.remove(); });
    copy.querySelectorAll('.visible').forEach(n => n.classList.remove('visible'));
    copy.querySelectorAll('[class=""]').forEach(n => n.removeAttribute('class'));
    copy.querySelectorAll('.project-card, .blog-card').forEach(n => n.removeAttribute('style'));
    copy.querySelectorAll('img[data-admin-src]').forEach(n => { n.setAttribute('src', n.dataset.adminSrc); n.removeAttribute('data-admin-src'); });
    return copy.innerHTML;
}

function splice(source, name, html) {
    const start = `<!-- edit:${name} -->`, end = `<!-- /edit:${name} -->`;
    const i = source.indexOf(start), j = source.indexOf(end);
    const a = html.indexOf(start), b = html.indexOf(end);
    if (i < 0 || j < 0 || a < 0 || b < 0) throw new Error(`Zone « ${name} » introuvable`);
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    return source.slice(0, i + start.length) + html.slice(a + start.length, b).replace(/\r?\n/g, eol) + source.slice(j);
}

async function save(bar) {
    const status = bar.querySelector('[role=status]');
    const saveButton = bar.querySelector('.primary');
    saveButton.disabled = true;
    try {
        for (const [path, bytes] of pendingImages) {
            status.textContent = `Envoi de ${path}…`;
            await put(path, bytes, `Ajout de l'image ${path} (mode administrateur)`);
            pendingImages.delete(path);
        }
        status.textContent = 'Enregistrement…';
        const file = await gh(`index.html?ref=${BRANCH}`);
        let source = fromBase64(file.content);
        zones().forEach(({ name, el }) => { source = splice(source, name, cleanHTML(el)); });
        await put('index.html', new TextEncoder().encode(source), 'Mise à jour du contenu (mode administrateur)', file.sha);
        dirty = false;
        status.textContent = 'Enregistré. Le site en ligne sera à jour d’ici une à deux minutes.';
    } catch (err) {
        status.textContent = 'Échec : ' + err.message;
    } finally {
        saveButton.disabled = false;
    }
}

// ---------- Démarrage ----------
(async () => {
    // Refuse de s'ouvrir dans un cadre (une autre page pourrait faire cliquer à l'aveugle sur « Enregistrer »)
    if (window.top !== window) return;
    // Styles dans un fichier : la CSP n'autorise pas les styles en ligne
    const style = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'css/admin.css' });
    await new Promise(r => { style.onload = style.onerror = r; document.head.append(style); });
    if (!token && !(await askToken())) return;
    document.documentElement.dataset.admin = '';
    const bar = document.createElement('div');
    bar.className = 'admin-bar';
    bar.innerHTML = '<strong>Mode administrateur</strong><span role="status"></span>';
    const saveButton = button('Enregistrer', () => save(bar), false);
    saveButton.className = 'primary';
    bar.append(
        saveButton,
        button('Oublier le jeton', () => { sessionStorage.removeItem('admin-token'); location.search = ''; }, false),
        button('Quitter', () => { location.search = ''; }, false),
    );
    document.querySelector('nav').after(bar);
    // Hauteur de la barre : les sections arrivent dessous, comme sous le header
    new ResizeObserver(() => document.documentElement.style.setProperty('--admin-h', bar.offsetHeight + 'px')).observe(bar);
    zones().forEach(({ el }) => enableEditing(el));
    document.addEventListener('input', () => { dirty = true; });
    addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });
})();
