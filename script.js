        // Set current year in footer
        document.getElementById('currentYear').textContent = new Date().getFullYear();

        // Smooth scrolling for anchor links (optional)
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                // Check if the link is to an ID on the same page
                if (this.pathname === window.location.pathname && this.hash) {
                    // And not a link to another page with a hash
                    if (!this.href.includes('business/index.html')) { 
                        e.preventDefault();
                        document.querySelector(this.hash).scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });