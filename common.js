function toggleMenu() {
    document.getElementById('burger').classList.toggle('active');
    document.getElementById('nav-links').classList.toggle('open');
}

document.querySelectorAll('#nav-links a').forEach(function(link) {
    link.addEventListener('click', function() {
        document.getElementById('burger').classList.remove('active');
        document.getElementById('nav-links').classList.remove('open');
    });
});

function scrollToTop() {
    if (window.lenisInstance) {
        window.lenisInstance.scrollTo(0, { duration: 1.5 });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function initLenis() {
    if (typeof Lenis === 'undefined') return;
    window.lenisInstance = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2
    });
    function raf(time) {
        window.lenisInstance.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
}

function initScrollTop() {
    var btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', function() {
        btn.classList.toggle('visible', window.scrollY > 500);
    });
}

function initScrollAnimations() {
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.fade-up, .fade-left, .fade-right, .fade-scale').forEach(function(el) {
        observer.observe(el);
    });
}

function getCart() {
    var saved = localStorage.getItem('timur_cart');
    return saved ? JSON.parse(saved) : [];
}

function saveCart(cart) {
    localStorage.setItem('timur_cart', JSON.stringify(cart));
}

function updateCartCount() {
    var cart = getCart();
    var total = cart.reduce(function(s, i) { return s + i.qty; }, 0);
    var el = document.getElementById('cart-count');
    if (el) el.textContent = total;
    var fabEl = document.getElementById('cart-fab-count');
    if (fabEl) fabEl.textContent = total;
}

function initCursorGlow() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
    var glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    var activated = false;
    document.addEventListener('mousemove', function(e) {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
        if (!activated) {
            activated = true;
            glow.classList.add('active');
        }
    });
    document.addEventListener('mouseleave', function() {
        glow.classList.remove('active');
    });
    document.addEventListener('mouseenter', function() {
        glow.classList.add('active');
    });
}

function initScrollProgress() {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    var fill = document.createElement('div');
    fill.className = 'scroll-progress-fill';
    bar.appendChild(fill);
    document.body.appendChild(bar);

    function updateProgress() {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        fill.style.width = pct + '%';
    }

    if (window.lenisInstance) {
        window.lenisInstance.on('scroll', updateProgress);
    } else {
        window.addEventListener('scroll', updateProgress);
    }
    updateProgress();
}

function initParticles() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var count = 18;
    for (var i = 0; i < count; i++) {
        var p = document.createElement('span');
        p.className = 'hero-particle';
        var size = 2 + Math.random() * 3;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = (Math.random() * 100) + '%';
        p.style.top = (30 + Math.random() * 60) + '%';
        p.style.setProperty('--p-travel', (40 + Math.random() * 160) + 'px');
        p.style.setProperty('--p-drift', (-30 + Math.random() * 60) + 'px');
        p.style.setProperty('--p-delay', (Math.random() * 5) + 's');
        p.style.animationDuration = (15 + Math.random() * 25) + 's';
        p.style.animationDelay = (Math.random() * 5) + 's';
        p.style.opacity = (0.2 + Math.random() * 0.4).toFixed(2);
        hero.appendChild(p);
    }
}

initLenis();
initScrollTop();
initScrollAnimations();
initCursorGlow();
initScrollProgress();
initParticles();
updateCartCount();
