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

initLenis();
initScrollTop();
initScrollAnimations();
updateCartCount();
