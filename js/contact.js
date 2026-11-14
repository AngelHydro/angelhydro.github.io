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
    field.style.borderColor = '#FFA3A3';
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', field.id + '-error');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.id = field.id + '-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#FFA3A3';
    errorDiv.style.fontSize = '14px';
    errorDiv.style.marginTop = '5px';
    
    field.parentNode.appendChild(errorDiv);
}

// Suppression des erreurs
function clearFieldError(field) {
    field.style.borderColor = '';
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Notifications
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.setAttribute('role', type === 'success' ? 'status' : 'alert');
    
    // Styles de la notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 25px';
    notification.style.borderRadius = '8px';
    notification.style.color = 'white';
    notification.style.fontFamily = 'Pixelify Sans';
    notification.style.fontSize = '16px';
    notification.style.zIndex = '10000';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'transform 0.3s ease';
    
    if (type === 'success') {
        notification.style.background = '#2E7D32';
    } else {
        notification.style.background = '#C62828';
    }
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-suppression
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}
