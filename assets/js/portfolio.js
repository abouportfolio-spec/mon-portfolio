document.addEventListener('DOMContentLoaded', () => {
    
    // 1. GESTION DU THÈME (DARK/LIGHT)
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;

    // Vérifier si un choix a déjà été fait par l'utilisateur
    const savedTheme = localStorage.getItem('portfolio-theme');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark');
        if (themeIcon) themeIcon.classList.replace('bx-moon', 'bx-sun');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark');
            const isDark = body.classList.contains('dark');
            
            // Mise à jour de l'icône
            if (themeIcon) {
                themeIcon.classList.toggle('bx-sun', isDark);
                themeIcon.classList.toggle('bx-moon', !isDark);
            }

            // Sauvegarde de la préférence
            localStorage.setItem('portfolio-theme', isDark ? 'dark' : 'light');
        });
    }

    // 2. MISE À JOUR AUTOMATIQUE DE L'ANNÉE (FOOTER)
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // 3. ANIMATION DES CARTES AU SCROLL (Intersection Observer)
    // Cela donne un effet "Architecte" très pro lors du défilement
    const cards = document.querySelectorAll('.portfolio-card');
    
    const observerOptions = {
        threshold: 0.1
    };

    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                cardObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    cards.forEach(card => {
        // État initial pour l'animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(0.2, 0.9, 0.2, 1)';
        cardObserver.observe(card);
    });
});