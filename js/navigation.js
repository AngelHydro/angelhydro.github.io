const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
let menuOpen = false;

hamburger.addEventListener('click', () => {
    if (!menuOpen) {
        navLinks.classList.add('open');
        document.body.classList.add('no-scroll');
        menuOpen = true;
    } else {
        navLinks.classList.remove('open');
        document.body.classList.remove('no-scroll');
        menuOpen = false;
    }
});

// Fonctionnalité de filtrage du portfolio
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
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
    // Observe les éléments avec nouvelles animations
    const animatedElements = document.querySelectorAll('.fade-in, .slide-up, .scale-in, .stagger-item');
    animatedElements.forEach(element => {
        scrollObserver.observe(element);
    });
    
    // Observe les cartes du portfolio pour les nouvelles animations
    projectCards.forEach(card => {
        scrollObserver.observe(card);
    });
});