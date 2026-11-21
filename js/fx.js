// Effets « jeu rétro » : purement décoratifs.
// Coupés si le visiteur demande moins d'animations, et en mode administrateur
// (rien n'est ajouté dans les zones modifiables, pour ne pas finir dans la sauvegarde).
// Tout est dans un bloc pour ne pas entrer en conflit avec les noms de navigation.js.
{
const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const admin = new URLSearchParams(location.search).has('admin');
const survol = matchMedia('(hover: hover)').matches;

// --- Accueil : quelques étoiles pixel rares qui montent, avec un léger parallaxe à la souris ---
const ciel = document.querySelector('.hero-fx');
if (ciel) {
    const ctx = ciel.getContext('2d');
    const COULEURS = ['#EBC06A', '#C0B2D8', '#FFFFFF'];
    const ECHELLE = 4; // 1 pixel du canvas = 4 pixels à l'écran (rendu « pixelated »)
    let w, h, etoiles = [], mx = 0, my = 0, actif = false;

    function dimensionner() {
        w = ciel.width = Math.ceil(ciel.clientWidth / ECHELLE);
        h = ciel.height = Math.ceil(ciel.clientHeight / ECHELLE);
        etoiles = Array.from({ length: Math.round(w * h / 1400) }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            z: Math.random() * 0.8 + 0.2, // profondeur : vitesse, taille et opacité
            c: COULEURS[Math.random() * COULEURS.length | 0],
            p: Math.random() * 6, // phase du scintillement
        }));
        dessiner(0);
    }
    function dessiner(t) {
        ctx.clearRect(0, 0, w, h);
        for (const e of etoiles) {
            const scintille = Math.sin(t / 500 + e.p) > 0.7 ? 0.35 : 1;
            ctx.globalAlpha = e.z * scintille;
            ctx.fillStyle = e.c;
            ctx.fillRect(Math.round(e.x + mx * e.z * 6), Math.round(e.y + my * e.z * 6), 1, 1);
        }
    }
    function boucle(t) {
        if (!actif) return;
        for (const e of etoiles) {
            e.y -= e.z * 0.12;
            if (e.y < -2) { e.y = h + 2; e.x = Math.random() * w; }
        }
        dessiner(t);
        requestAnimationFrame(boucle);
    }
    dimensionner();
    new ResizeObserver(dimensionner).observe(ciel);
    if (!calme) {
        // ne tourne que lorsque l'accueil est visible
        new IntersectionObserver(([entree]) => {
            actif = entree.isIntersecting;
            if (actif) requestAnimationFrame(boucle);
        }).observe(ciel);
        if (survol) ciel.parentElement.addEventListener('pointermove', (e) => {
            mx = e.clientX / innerWidth - 0.5;
            my = e.clientY / innerHeight - 0.5;
        }, { passive: true });
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
