// Effets « jeu rétro » : purement décoratifs.
// Coupés si le visiteur demande moins d'animations, et en mode administrateur
// (rien n'est ajouté dans les zones modifiables, pour ne pas finir dans la sauvegarde).
// Tout est dans un bloc pour ne pas entrer en conflit avec les noms de navigation.js.
{
const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const admin = new URLSearchParams(location.search).has('admin');
const survol = matchMedia('(hover: hover)').matches;

// --- Accueil : trame qui ondule comme de l'eau au passage de la souris (ou du doigt) ---
// data-fond="points" : points dorés ; "caracteres" : caractères violets ;
// "mixte" : points dorés qui deviennent des caractères de code quand la vague passe.
const ciel = document.querySelector('.hero-fx');
if (ciel) {
    const ctx = ciel.getContext('2d');
    const enCaracteres = ciel.dataset.fond === 'caracteres';
    const mixte = ciel.dataset.fond === 'mixte'; // points au repos, caractères au passage de la vague
    const PAS = enCaracteres ? 22 : 24;            // écart entre deux cases de la trame
    const GLYPHES = '01{}<>/=+-*;:.#$';            // caractères de la trame, au hasard
    const DENSES = '.:+*#@';                        // du plus calme au plus agité
    const VITESSE = 420, LARGEUR = 46, DUREE = 2.2; // vague : px/s, épaisseur de l'anneau, secondes de vie
    let w, h, dpr, cases = [], ondes = [], souris = null, actif = false, enCours = false, dernier = 0;

    function dimensionner() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        w = ciel.clientWidth; h = ciel.clientHeight;
        ciel.width = Math.round(w * dpr); ciel.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = '600 14px "Pixelify Sans", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        cases = [];
        for (let y = PAS / 2; y < h; y += PAS) for (let x = PAS / 2; x < w; x += PAS) {
            cases.push({ x, y, g: GLYPHES[Math.random() * GLYPHES.length | 0] });
        }
        dessiner(performance.now());
    }
    function dessiner(t) {
        ctx.clearRect(0, 0, w, h);
        ondes = ondes.filter(o => (t - o.t) / 1000 < DUREE);
        for (const c of cases) {
            let force = 0, dx = 0, dy = 0;
            for (const o of ondes) {
                const age = (t - o.t) / 1000;
                const ex = c.x - o.x, ey = c.y - o.y, d = Math.hypot(ex, ey) || 1;
                const ecart = d - age * VITESSE;
                // anneau qui s'élargit, avec une petite crête secondaire, et qui s'éteint avec le temps
                const vague = Math.exp(-(ecart * ecart) / (LARGEUR * LARGEUR)) * Math.cos(ecart / 14) * Math.exp(-age * 1.6);
                force += Math.abs(vague);
                dx += ex / d * vague * 7; dy += ey / d * vague * 7;
            }
            if (souris) { // halo léger sous le pointeur
                const d = Math.hypot(c.x - souris.x, c.y - souris.y);
                force += Math.exp(-(d * d) / 9000) * 0.5;
            }
            force = Math.min(force, 1);
            const x = c.x + dx, y = c.y + dy;
            if (enCaracteres) {
                ctx.fillStyle = force > 0.55 ? '#EBC06A' : '#C0B2D8';
                ctx.globalAlpha = 0.16 + force * 0.84;
                ctx.fillText(force > 0.08 ? DENSES[Math.min(DENSES.length - 1, force * DENSES.length | 0)] : c.g, x, y);
            } else if (mixte && force > 0.12) {
                // la vague révèle le code caché sous les points
                ctx.fillStyle = force > 0.5 ? '#FFFFFF' : '#EBC06A';
                ctx.globalAlpha = 0.35 + force * 0.65;
                ctx.fillText(c.g, x, y);
            } else {
                const taille = 2 + Math.round(force * 4);
                ctx.fillStyle = '#EBC06A';
                ctx.globalAlpha = 0.22 + force * 0.78;
                ctx.fillRect(Math.round(x - taille / 2), Math.round(y - taille / 2), taille, taille);
            }
        }
        ctx.globalAlpha = 1;
    }
    // l'animation ne tourne que tant qu'une onde est en vie (sinon : image fixe, aucun calcul)
    function boucle(t) {
        dessiner(t);
        enCours = actif && (ondes.length > 0 || souris !== null);
        if (enCours) requestAnimationFrame(boucle);
    }
    function relancer() { if (actif && !enCours) { enCours = true; requestAnimationFrame(boucle); } }
    function onde(e, forcer) {
        const r = ciel.getBoundingClientRect();
        const p = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
        if (survol) souris = p;
        if (forcer || p.t - dernier > 140) { ondes.push(p); dernier = p.t; if (ondes.length > 12) ondes.shift(); }
        relancer();
    }
    dimensionner();
    new ResizeObserver(dimensionner).observe(ciel);
    document.fonts?.ready.then(dimensionner); // redessine une fois la police pixel chargée
    if (!calme) {
        new IntersectionObserver(([entree]) => { actif = entree.isIntersecting; relancer(); }).observe(ciel);
        const accueil = ciel.parentElement;
        accueil.addEventListener('pointermove', (e) => onde(e, false), { passive: true });
        accueil.addEventListener('pointerdown', (e) => onde(e, true), { passive: true });
        accueil.addEventListener('pointerleave', () => { souris = null; });
    }
}

// --- Terminal de l'accueil : phrases tapées puis effacées ---
const tape = document.querySelector('.hero-term .typed');
if (tape) {
    const phrases = ['crée des sites web', 'code en Python', 'apprend chaque jour', 'attend votre projet'];
    if (calme) {
        tape.textContent = phrases[0];
    } else {
        let n = 0, i = 0, efface = false;
        (function taper() {
            const phrase = phrases[n];
            i += efface ? -1 : 1;
            tape.textContent = phrase.slice(0, i);
            let delai = efface ? 35 : 70;
            if (!efface && i === phrase.length) { efface = true; delai = 1800; }
            else if (efface && i === 0) { efface = false; n = (n + 1) % phrases.length; delai = 400; }
            setTimeout(taper, delai);
        })();
    }
}

// --- Barre d'expérience : progression dans la page et niveau (section) en cours ---
const sections = [...document.querySelectorAll('#home, #about, #portfolio, #contact, #blog')];
if (sections.length) {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = '<span class="hud-niv"></span><span class="hud-barre"><span></span></span><span class="hud-xp"></span>';
    document.body.append(hud);
    const [niv, barre, xp] = [hud.querySelector('.hud-niv'), hud.querySelector('.hud-barre span'), hud.querySelector('.hud-xp')];
    function majHud() {
        const max = document.documentElement.scrollHeight - innerHeight;
        const p = max > 0 ? Math.min(1, scrollY / max) : 0;
        let n = 0;
        sections.forEach((s, k) => { if (s.getBoundingClientRect().top <= innerHeight * 0.4) n = k; });
        if (p > 0.995) n = sections.length - 1;
        niv.textContent = n === 0 ? 'START' : 'NIV. ' + n;
        barre.style.transform = `scaleX(${Math.round(p * 20) / 20})`; // avance par crans de 5 %
        xp.textContent = String(Math.round(p * 1000)).padStart(4, '0') + ' XP';
        hud.classList.toggle('hud-cache', scrollY < 40);
    }
    addEventListener('scroll', () => requestAnimationFrame(majHud), { passive: true });
    addEventListener('resize', majHud);
    majHud();
}

// --- Cartes : inclinaison 3D et reflet qui suivent la souris ---
if (!calme && !admin && survol) {
    document.querySelectorAll('.project-card, .blog-card').forEach(carte => {
        carte.addEventListener('pointermove', (e) => {
            const r = carte.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
            carte.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
            carte.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
            carte.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
            carte.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
        carte.addEventListener('pointerleave', () => {
            ['--rx', '--ry', '--mx', '--my'].forEach(p => carte.style.removeProperty(p));
        });
    });
}

// --- Clic : petite explosion de pixels ---
if (!calme && !admin) {
    const TEINTES = ['#EBC06A', '#C0B2D8', '#FFFFFF', '#E0AC45'];
    addEventListener('pointerdown', (e) => {
        for (let k = 0; k < 8; k++) {
            const px = document.createElement('i');
            const angle = k / 8 * Math.PI * 2 + Math.random() * 0.4;
            const dist = 28 + Math.random() * 22;
            px.className = 'px-eclat';
            px.style.left = e.clientX + 'px';
            px.style.top = e.clientY + 'px';
            px.style.background = TEINTES[k % TEINTES.length];
            px.style.setProperty('--dx', Math.round(Math.cos(angle) * dist / 4) * 4 + 'px');
            px.style.setProperty('--dy', Math.round(Math.sin(angle) * dist / 4) * 4 + 'px');
            px.addEventListener('animationend', () => px.remove());
            document.body.append(px);
        }
    }, { passive: true });
}

// --- Code Konami (↑ ↑ ↓ ↓ ← → ← → B A) : mode arcade ---
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
let rang = 0;
addEventListener('keydown', (e) => {
    const touche = e.key.toLowerCase();
    rang = touche === KONAMI[rang] ? rang + 1 : (touche === KONAMI[0] ? 1 : 0);
    if (rang < KONAMI.length) return;
    rang = 0;
    const on = document.documentElement.classList.toggle('arcade');
    if (typeof showNotification === 'function') {
        showNotification(on ? 'Code Konami : mode arcade activé ! +30 vies' : 'Mode arcade désactivé', 'success');
    }
});
}
