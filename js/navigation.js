const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
let menuOpen = false;

hamburger.addEventListener('click', () => {
    if (!menuOpen) {
        navLinks.classList.add('open');
        document.body.classList.add('no-scroll'); // Empêche le scroll
        menuOpen = true;
    } else {
        navLinks.classList.remove('open');
        document.body.classList.remove('no-scroll'); // Rétablit le scroll
        menuOpen = false;
    }
});

// Fonctionnalité de filtrage du portfolio
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Retirer la classe active de tous les boutons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        // Ajouter la classe active au bouton cliqué
        button.classList.add('active');
        
        const filter = button.getAttribute('data-filter');
        
        projectCards.forEach(card => {
            const category = card.getAttribute('data-category');
            
            if (filter === 'all' || category === filter) {
                card.style.display = 'block';
                card.style.animation = 'fadeInUp 0.6s ease forwards';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Animation au scroll pour les cartes de projets
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
        }
    });
}, observerOptions);

// Observer toutes les cartes de projets
projectCards.forEach(card => {
    observer.observe(card);
});