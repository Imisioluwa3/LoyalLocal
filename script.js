// Set current year
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Mobile menu toggle
function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    const menuToggle = document.querySelector('.menu-toggle');
    
    navLinks.classList.toggle('active');
    menuToggle.classList.toggle('active');

    menuToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMenu();
        }
    });
    
    // Prevent body scroll when mobile nav is open
    if (navLinks.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

// Close mobile nav when clicking outside
document.addEventListener('click', function(event) {
    const navLinks = document.getElementById('navLinks');
    const menuToggle = document.querySelector('.menu-toggle');
    const navbar = document.querySelector('.navbar');
    
    if (navLinks.classList.contains('active') && 
        !navbar.contains(event.target)) {
        toggleMenu();
    }
});

// Handle smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Close mobile menu if open
            const navLinks = document.getElementById('navLinks');
            if (navLinks.classList.contains('active')) {
                toggleMenu();
            }
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards and steps
document.addEventListener('DOMContentLoaded', function() {
    // Add initial styles for animation
    const animatedElements = document.querySelectorAll('.feature-card, .step-card, .benefit-category');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Scroll-spy: Highlight current section in navigation
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    let currentSection = '';
    const scrollPosition = window.scrollY + 150; // Offset for better UX

    // Find which section is currently in view
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });

    // Update active class on nav links
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');

        // Handle hash links
        if (href && href.startsWith('#')) {
            if (href === `#${currentSection}`) {
                link.classList.add('active');
            }
        }
        // Handle page links (index.html, business/index.html, etc.)
        else if (href === window.location.pathname ||
                 (href === 'index.html' && window.location.pathname.endsWith('/'))) {
            // Only activate "Home" if we're at the top or no section is active
            if (!currentSection || scrollPosition < 300) {
                link.classList.add('active');
            }
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateActiveNavLink();
});

// Update on scroll
let scrollTimeout;
window.addEventListener('scroll', function() {
    // Debounce for performance
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveNavLink, 50);
});

// Update on hash change
window.addEventListener('hashchange', function() {
    updateActiveNavLink();
});