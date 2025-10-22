// Home page JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
        
        lastScrollY = currentScrollY;
    });

    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinksContainer) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinksContainer.classList.toggle('mobile-active');
            
            const icon = this.querySelector('i');
            if (navLinksContainer.classList.contains('mobile-active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Animate feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Animate about section
    const aboutElements = document.querySelectorAll('.about-text > *, .salon-mockup');
    aboutElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(element);
    });

    // Counter animation for hero stats
    const animateCounter = (element, target) => {
        let current = 0;
        const increment = target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            if (target >= 1000) {
                element.textContent = Math.floor(current / 1000) + 'k+';
            } else if (target >= 100) {
                element.textContent = Math.floor(current) + '+';
            } else {
                element.textContent = current.toFixed(1) + '%';
            }
        }, 20);
    };

    // Trigger counter animation when hero section is visible
    const heroStats = document.querySelectorAll('.stat-number');
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach((stat, index) => {
                    const values = [500, 50, 99.9]; // Corresponding to the stats
                    setTimeout(() => {
                        animateCounter(stat, values[index]);
                    }, index * 200);
                });
                heroObserver.unobserve(entry.target);
            }
        });
    });

    const heroStatsContainer = document.querySelector('.hero-stats');
    if (heroStatsContainer) {
        heroObserver.observe(heroStatsContainer);
    }

    // Floating notification animation
    const floatingNotification = document.querySelector('.floating-notification');
    if (floatingNotification) {
        setInterval(() => {
            floatingNotification.style.transform = 'scale(1.05)';
            setTimeout(() => {
                floatingNotification.style.transform = 'scale(1)';
            }, 300);
        }, 3000);
    }

    // Add hover effects to appointment items
    const appointmentItems = document.querySelectorAll('.appointment-item');
    appointmentItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8faff';
            this.style.transform = 'translateX(8px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent';
            this.style.transform = 'translateX(0)';
        });
    });

    // Parallax effect for hero shapes
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroShapes = document.querySelectorAll('.hero-shape');
        
        heroShapes.forEach((shape, index) => {
            const speed = 0.5 + (index * 0.1);
            shape.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });

    // Form validation for potential contact forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const inputs = this.querySelectorAll('input[required], textarea[required]');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#ef4444';
                } else {
                    input.style.borderColor = '#d1d5db';
                }
            });
            
            if (!isValid) {
                e.preventDefault();
            }
        });
    });

    // Add loading states to CTA buttons
    const ctaButtons = document.querySelectorAll('.cta .btn');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.href && this.href.includes('signup')) {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
            }
        });
    });

    // Easter egg: Konami code for developer credits
    let konamiCode = [];
    const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // Up, Up, Down, Down, Left, Right, Left, Right, B, A
    
    document.addEventListener('keydown', function(e) {
        konamiCode.push(e.keyCode);
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.join(',') === konamiSequence.join(',')) {
            showEasterEgg();
        }
    });

    function showEasterEgg() {
        const existingEgg = document.querySelector('.easter-egg');
        if (existingEgg) return;
        
        const easterEgg = document.createElement('div');
        easterEgg.className = 'easter-egg';
        easterEgg.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #8B5CF6, #EC4899);
                color: white;
                padding: 30px;
                border-radius: 20px;
                text-align: center;
                z-index: 10000;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                animation: easterEggPop 0.5s ease-out;
            ">
                <h3 style="margin: 0 0 15px 0;">🎉 You found the easter egg!</h3>
                <p style="margin: 0; opacity: 0.9;">Made with ❤️ by the Salona development team</p>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    margin-top: 15px;
                    padding: 8px 16px;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                ">Close</button>
            </div>
            <style>
                @keyframes easterEggPop {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            </style>
        `;
        document.body.appendChild(easterEgg);
        
        setTimeout(() => {
            if (document.querySelector('.easter-egg')) {
                easterEgg.remove();
            }
        }, 5000);
    }

    console.log('🎨 Salona Home Page Loaded Successfully!');
    console.log('💡 Tip: Try the Konami code for a surprise!');
});
