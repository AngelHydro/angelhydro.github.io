const navLinks = document.querySelector('.nav-links');

// Hauteur réelle du header, utilisée en CSS pour que les sections arrivent juste dessous
const header = document.querySelector('nav');
function updateHeaderHeight() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
}
updateHeaderHeight();
addEventListener('resize', updateHeaderHeight);
if (document.fonts) document.fonts.ready.then(updateHeaderHeight);

// Liens internes (#section) : défilement vers la section sans recharger la page.
// Évite aussi le rechargement de la page entière quand le site est affiché dans un cadre.
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    if (navLinks.contains(link)) lockActive(target.id);
    target.scrollIntoView();
});

// Met en avant dans le menu la section affichée à l'écran
const sections = [...document.querySelectorAll('#home, #about, #portfolio, #contact, #blog')];
let lockedId = null;
let lockTimer;

function setActive(id) {
    navLinks.querySelectorAll('a').forEach(link => {
        if (link.getAttribute('href').endsWith('#' + id)) {
            link.setAttribute('aria-current', 'true');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// La section active est la dernière dont le haut a dépassé 40 % de l'écran
// (ou la dernière section quand on est tout en bas de la page)
function updateActive() {
    if (lockedId || !sections.length) return;
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    let current = sections[0];
    sections.forEach(section => {
        if (section.getBoundingClientRect().top <= innerHeight * 0.4) current = section;
    });
    setActive(atBottom ? sections[sections.length - 1].id : current.id);
}

// Après un clic dans le menu, garde le lien cliqué actif pendant le défilement
function lockActive(id) {
    lockedId = id;
    setActive(id);
    clearTimeout(lockTimer);
    lockTimer = setTimeout(releaseLock, 1200); // filet de sécurité si 'scrollend' n'existe pas
}
function releaseLock() {
    clearTimeout(lockTimer);
    lockedId = null;
    updateActive();
}
addEventListener('scrollend', () => { if (lockedId) releaseLock(); });
addEventListener('scroll', () => requestAnimationFrame(updateActive), { passive: true });
addEventListener('resize', updateActive);

// Fonctionnalité de filtrage du portfolio
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        const filter = button.getAttribute('data-filter');

        projectCards.forEach(card => {
            const category = card.getAttribute('data-category');

            if (filter === 'all' || category === filter) {
                card.style.display = '';
                card.style.animation = 'fadeInUp 0.6s ease forwards';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Système d'animations au scroll UNIFIÉ
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);


// Observer tous les éléments avec des classes d'animation
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.fade-in, .slide-up, .scale-in, .stagger-item');
    animatedElements.forEach(element => {
        scrollObserver.observe(element);
    });

    projectCards.forEach(card => {
        scrollObserver.observe(card);
    });

    updateActive();
});
