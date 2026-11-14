// Gestion du formulaire de contact
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const submitBtn = contactForm.querySelector('.submit-btn');
    
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Vérifie tous les champs avant l'envoi, et place le curseur sur le premier en erreur
        const fields = [...contactForm.querySelectorAll('input[required], textarea[required], select[required]')];
        const invalid = fields.filter(field => !validateField(field));
        if (invalid.length) {
            invalid[0].focus();
            return;
        }

        // Affiche l'état de chargement
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        try {
            const endpoint = contactForm.getAttribute('action') || 'https://formspree.io/f/XXXXYYYY';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: new FormData(contactForm),
            });

            if (res.ok) {
                showNotification('Message envoyé avec succès !', 'success');
                contactForm.reset();
            } else {
                const data = await res.json().catch(() => null);
                const msg = data && data.errors ? data.errors.map(e => e.message).join(', ') : 'Erreur lors de l’envoi.';
                showNotification(msg, 'error');
            }
        } catch (err) {
            showNotification('Erreur réseau. Réessayez.', 'error');
        } finally {
            // Restaure le bouton
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
    
    // Validation en temps réel
    const inputs = contactForm.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
});

// Validation des champs
function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Supprime les anciennes erreurs
    clearFieldError(field);
    
    // Validation selon le type de champ
    switch (field.type) {
        case 'email':
            if (!value || !isValidEmail(value)) {
                isValid = false;
                errorMessage = 'Email invalide';
            }
            break;
        case 'text':
        case 'textarea':
            if (!value) {
                isValid = false;
                errorMessage = 'Ce champ est requis';
            }
            break;
        case 'select-one':
            if (!value) {
                isValid = false;
                errorMessage = 'Veuillez sélectionner une option';
            }
            break;
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

// Validation email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Affichage des erreurs
function showFieldError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', field.id + '-error');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.id = field.id + '-error';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

// Suppression des erreurs
function clearFieldError(field) {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Notifications : zone d'annonce présente dès le chargement (role="status" dans index.html),
// pour que les lecteurs d'écran annoncent le texte quand il change.
const notification = document.getElementById('notification');
let notificationTimer;
function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => {
        notification.classList.remove('show');
        notification.textContent = '';
    }, 8000); // 8 s : le temps de lire
}
