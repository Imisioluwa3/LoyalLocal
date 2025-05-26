        // Set current year in footer
        document.getElementById('currentYear').textContent = new Date().getFullYear();

        // Mobile menu toggle
        function toggleMenu() {
            const navLinks = document.getElementById('navLinks');
            const menuToggle = document.querySelector('.menu-toggle');
            
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
            
            // Update button text
            if (navLinks.classList.contains('active')) {
                menuToggle.innerHTML = '✕';
            } else {
                menuToggle.innerHTML = '☰';
            }
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            const navbar = document.querySelector('.navbar');
            const navLinks = document.getElementById('navLinks');
            
            if (!navbar.contains(e.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        });

        // Close mobile menu when window is resized to desktop
        window.addEventListener('resize', function() {
            const navLinks = document.getElementById('navLinks');
            if (window.innerWidth > 768) {
                navLinks.classList.remove('active');
            }
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                if (this.pathname === window.location.pathname && this.hash) {
                    if (!this.href.includes('business/index.html')) { 
                        e.preventDefault();
                        document.querySelector(this.hash).scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });