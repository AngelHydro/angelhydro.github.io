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