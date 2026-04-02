var cart = getCart();
var allProducts = [];

window.addEventListener('load', function() {
    loadProducts();
});

function loadProducts() {
    showSkeleton();
    fetch('/api/products')
        .then(function(res) {
            if (!res.ok) throw new Error('Ошибка загрузки товаров');
            return res.json();
        })
        .then(function(products) {
            allProducts = products;
            renderProducts(products);
            initTilt();
            updateCategoryCounts(products);
        })
        .catch(function(err) {
            showToast('Ошибка загрузки каталога');
        });
}

function showSkeleton() {
    var grid = document.getElementById('products-grid');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < 8; i++) {
        html += '<div class="product skeleton-card">' +
            '<div class="product-img skeleton-shimmer"></div>' +
            '<div class="product-info">' +
                '<div class="skeleton-line skeleton-shimmer" style="width:70%;height:18px;margin-bottom:8px"></div>' +
                '<div class="skeleton-line skeleton-shimmer" style="width:100%;height:14px;margin-bottom:8px"></div>' +
                '<div class="skeleton-line skeleton-shimmer" style="width:50%;height:14px;margin-bottom:12px"></div>' +
                '<div class="product-footer">' +
                    '<div class="skeleton-line skeleton-shimmer" style="width:80px;height:22px"></div>' +
                    '<div class="skeleton-line skeleton-shimmer" style="width:100px;height:36px;border-radius:4px"></div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }
    grid.innerHTML = html;
}

function updateCategoryCounts(products) {
    var counts = {};
    products.forEach(function(p) {
        counts[p.category] = (counts[p.category] || 0) + 1;
    });
    var map = { wallets: 'cat-wallets', belts: 'cat-belts', bags: 'cat-bags', covers: 'cat-covers', accessories: 'cat-accessories' };
    Object.keys(map).forEach(function(cat) {
        var el = document.getElementById(map[cat]);
        if (el) el.textContent = (counts[cat] || 0) + ' товаров';
    });
}

function renderProducts(products) {
    var grid = document.getElementById('products-grid');
    var html = '';
    products.forEach(function(p, pIdx) {
        var images = (p.images && p.images.length > 0) ? p.images : [];
        var carouselHtml;

        if (images.length === 0) {
            carouselHtml = '<span class="no-img-card">📦</span>';
        } else if (images.length === 1) {
            carouselHtml = '<img src="' + images[0] + '" alt="' + escapeHtml(p.name) + '" loading="lazy">';
        } else {
            var slides = images.map(function(src, i) {
                return '<img src="' + src + '" alt="' + escapeHtml(p.name) + '" class="carousel-slide' + (i === 0 ? ' active' : '') + '" loading="lazy">';
            }).join('');
            carouselHtml = slides +
                '<button class="carousel-arrow carousel-prev" onclick="event.stopPropagation(); carouselSlide(this, -1)">‹</button>' +
                '<button class="carousel-arrow carousel-next" onclick="event.stopPropagation(); carouselSlide(this, 1)">›</button>' +
                '<div class="carousel-dots">' + images.map(function(_, i) {
                    return '<span class="carousel-dot' + (i === 0 ? ' active' : '') + '" onclick="event.stopPropagation(); carouselGo(this, ' + i + ')"></span>';
                }).join('') + '</div>';
        }

        var descHtml;
        if (p.desc.length > 60) {
            descHtml = '<div class="desc-short">' +
                '<p>' + escapeHtml(p.desc.substring(0, 60)) + '...</p>' +
                '<button class="desc-toggle" onclick="event.stopPropagation(); this.parentElement.classList.add(\'open\')">Ещё</button>' +
            '</div>' +
            '<div class="desc-full">' + escapeHtml(p.desc) + '</div>';
        } else {
            descHtml = '<p>' + escapeHtml(p.desc) + '</p>';
        }

        var delay = (pIdx % 8) * 0.08;
        html += '<div class="product fade-up" data-category="' + p.category + '" onclick="openDetail(' + p.id + ')" style="transition-delay:' + delay + 's">' +
            '<div class="product-img">' + carouselHtml + '</div>' +
            '<div class="product-info">' +
                '<h3>' + escapeHtml(p.name) + '</h3>' +
                '<div class="product-desc">' + descHtml + '</div>' +
                '<div class="product-footer">' +
                    '<span class="price">' + p.price.toLocaleString('ru-RU') + ' ₽</span>' +
                    '<button class="add-to-cart" onclick="event.stopPropagation(); addToCart(' + p.id + ', \'' + p.name.replace(/'/g, "\\'") + '\', ' + p.price + ', \'' + (images.length > 0 ? images[0] : '') + '\')">В корзину</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    });
    grid.innerHTML = html;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
    grid.querySelectorAll('.product.fade-up').forEach(function(el) {
        observer.observe(el);
    });
}

function carouselSlide(btn, dir) {
    var container = btn.parentElement;
    var slides = container.querySelectorAll('.carousel-slide');
    var dots = container.querySelectorAll('.carousel-dot');
    var current = 0;
    slides.forEach(function(s, i) { if (s.classList.contains('active')) current = i; });
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    var next = (current + dir + slides.length) % slides.length;
    slides[next].classList.add('active');
    dots[next].classList.add('active');
}

function carouselGo(dot, idx) {
    var container = dot.parentElement.parentElement;
    var slides = container.querySelectorAll('.carousel-slide');
    var dots = container.querySelectorAll('.carousel-dot');
    slides.forEach(function(s) { s.classList.remove('active'); });
    dots.forEach(function(d) { d.classList.remove('active'); });
    slides[idx].classList.add('active');
    dots[idx].classList.add('active');
}

function filterProducts(category, btn) {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    if (category === 'all') {
        renderProducts(allProducts);
    } else {
        renderProducts(allProducts.filter(function(p) { return p.category === category; }));
    }
    initTilt();
}

function smoothScrollToCatalog(category, btnIndex) {
    if (window.lenisInstance) {
        window.lenisInstance.scrollTo('#catalog', { duration: 1.2, offset: -80 });
    }
    setTimeout(function() {
        var btn = document.querySelector('.filter-btn:nth-child(' + btnIndex + ')');
        if (btn) filterProducts(category, btn);
    }, 400);
}

var detailImages = [];
var detailIndex = 0;
var zoomImages = [];
var zoomIndex = 0;

function openDetail(id) {
    fetch('/api/products/' + id)
        .then(function(res) {
            if (!res.ok) throw new Error('Товар не найден');
            return res.json();
        })
        .then(function(p) {
            document.getElementById('detail-name').textContent = p.name;
            document.getElementById('detail-price').textContent = p.price.toLocaleString('ru-RU') + ' ₽';

            var descWrap = document.getElementById('detail-desc');
            if (p.desc.length > 120) {
                descWrap.innerHTML = '<span class="detail-desc-short">' + escapeHtml(p.desc.substring(0, 120)) + '...</span>' +
                    '<button class="desc-toggle" onclick="this.style.display=\'none\'; this.previousElementSibling.style.display=\'none\'; this.nextElementSibling.style.display=\'block\';">Читать далее</button>' +
                    '<span class="detail-desc-full">' + escapeHtml(p.desc) + '</span>';
            } else {
                descWrap.textContent = p.desc;
            }

            var cartBtn = document.getElementById('detail-cart-btn');
            cartBtn.onclick = function() {
                var img = (p.images && p.images.length > 0) ? p.images[0] : '';
                addToCart(p.id, p.name, p.price, img);
            };

            var container = document.getElementById('detail-carousel');
            container.innerHTML = '';

            if (p.images && p.images.length > 0) {
                detailImages = p.images;
                detailIndex = 0;

                var slidesHtml = p.images.map(function(src, i) {
                    return '<img src="' + src + '" alt="' + escapeHtml(p.name) + '" class="detail-slide' + (i === 0 ? ' active' : '') + '" onclick="openZoom(' + i + ')" loading="lazy">';
                }).join('');

                var arrows = '';
                if (p.images.length > 1) {
                    arrows = '<button class="detail-arrow detail-prev" onclick="detailSlide(-1)">‹</button>' +
                        '<button class="detail-arrow detail-next" onclick="detailSlide(1)">›</button>';
                }

                var dots = '';
                if (p.images.length > 1) {
                    dots = '<div class="detail-dots">' + p.images.map(function(_, i) {
                        return '<span class="detail-dot' + (i === 0 ? ' active' : '') + '" onclick="detailGo(' + i + ')"></span>';
                    }).join('') + '</div>';
                }

                container.innerHTML = slidesHtml + arrows + dots;
            } else {
                detailImages = [];
                container.innerHTML = '<span class="no-img-detail">📦</span>';
            }

            document.getElementById('detail-modal').style.display = 'block';
            document.body.style.overflow = 'hidden';
        })
        .catch(function(err) {
            showToast('Ошибка загрузки товара');
        });
}

function detailSlide(dir) {
    if (detailImages.length < 2) return;
    detailIndex = (detailIndex + dir + detailImages.length) % detailImages.length;
    detailRender();
}

function detailGo(idx) {
    detailIndex = idx;
    detailRender();
}

function detailRender() {
    var container = document.getElementById('detail-carousel');
    container.querySelectorAll('.detail-slide').forEach(function(s, i) {
        s.classList.toggle('active', i === detailIndex);
    });
    container.querySelectorAll('.detail-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === detailIndex);
    });
}

function closeDetail() {
    document.getElementById('detail-modal').style.display = 'none';
    document.body.style.overflow = '';
}

var zoomScale = 1;
var zoomMinScale = 1;
var zoomMaxScale = 5;
var zoomPanX = 0;
var zoomPanY = 0;
var zoomDragging = false;
var zoomDragStartX = 0;
var zoomDragStartY = 0;
var zoomPanStartX = 0;
var zoomPanStartY = 0;

function openZoom(idx) {
    if (detailImages.length === 0) return;
    zoomImages = detailImages;
    zoomIndex = idx || 0;
    zoomScale = 1;
    zoomPanX = 0;
    zoomPanY = 0;
    zoomRender();
    document.getElementById('zoom-overlay').style.display = 'flex';
    document.getElementById('zoom-hint').classList.remove('hide');
    setTimeout(function() { document.getElementById('zoom-hint').classList.add('hide'); }, 3000);
}

function zoomSlide(dir) {
    if (zoomImages.length < 2) return;
    zoomIndex = (zoomIndex + dir + zoomImages.length) % zoomImages.length;
    zoomScale = 1;
    zoomPanX = 0;
    zoomPanY = 0;
    zoomRender();
}

function zoomRender() {
    var carousel = document.getElementById('zoom-carousel');
    var dotsEl = document.getElementById('zoom-dots');
    carousel.innerHTML = zoomImages.map(function(src, i) {
        return '<img src="' + src + '" class="zoom-slide' + (i === zoomIndex ? ' active' : '') + '">';
    }).join('');
    applyZoomTransform();

    if (zoomImages.length > 1) {
        dotsEl.innerHTML = zoomImages.map(function(_, i) {
            return '<span class="zoom-dot' + (i === zoomIndex ? ' active' : '') + '" onclick="zoomIndex=' + i + ';zoomScale=1;zoomPanX=0;zoomPanY=0;zoomRender()"></span>';
        }).join('');
        dotsEl.style.display = 'flex';
    } else {
        dotsEl.innerHTML = '';
        dotsEl.style.display = 'none';
    }
}

function applyZoomTransform() {
    var carousel = document.getElementById('zoom-carousel');
    var active = carousel.querySelector('.zoom-slide.active');
    if (!active) return;
    active.style.transform = 'scale(' + zoomScale + ') translate(' + zoomPanX + 'px, ' + zoomPanY + 'px)';
    active.style.transition = zoomDragging ? 'none' : 'transform 0.2s';
    carousel.classList.toggle('zoomed', zoomScale > 1);
}

function zoomWheel(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.3 : 0.3;
    var newScale = Math.max(zoomMinScale, Math.min(zoomMaxScale, zoomScale + delta));
    if (newScale === zoomScale) return;
    zoomScale = newScale;
    if (zoomScale <= 1) {
        zoomPanX = 0;
        zoomPanY = 0;
    }
    applyZoomTransform();
}

function zoomMouseDown(e) {
    if (zoomScale <= 1) return;
    e.preventDefault();
    zoomDragging = true;
    zoomDragStartX = e.clientX;
    zoomDragStartY = e.clientY;
    zoomPanStartX = zoomPanX;
    zoomPanStartY = zoomPanY;
}

function zoomMouseMove(e) {
    if (!zoomDragging) return;
    e.preventDefault();
    var dx = (e.clientX - zoomDragStartX) / zoomScale;
    var dy = (e.clientY - zoomDragStartY) / zoomScale;
    zoomPanX = zoomPanStartX + dx;
    zoomPanY = zoomPanStartY + dy;
    applyZoomTransform();
}

function zoomMouseUp() {
    zoomDragging = false;
}

function closeZoom() {
    document.getElementById('zoom-overlay').style.display = 'none';
    zoomScale = 1;
    zoomPanX = 0;
    zoomPanY = 0;
    zoomDragging = false;
}

(function initZoomHandlers() {
    var carousel = document.getElementById('zoom-carousel');
    if (!carousel) return;
    carousel.addEventListener('wheel', zoomWheel, { passive: false });
    carousel.addEventListener('mousedown', zoomMouseDown);
    window.addEventListener('mousemove', zoomMouseMove);
    window.addEventListener('mouseup', zoomMouseUp);
    carousel.addEventListener('touchstart', function(e) {
        if (zoomScale <= 1) return;
        zoomDragging = true;
        zoomDragStartX = e.touches[0].clientX;
        zoomDragStartY = e.touches[0].clientY;
        zoomPanStartX = zoomPanX;
        zoomPanStartY = zoomPanY;
    }, { passive: false });
    carousel.addEventListener('touchmove', function(e) {
        if (!zoomDragging) return;
        e.preventDefault();
        var dx = (e.touches[0].clientX - zoomDragStartX) / zoomScale;
        var dy = (e.touches[0].clientY - zoomDragStartY) / zoomScale;
        zoomPanX = zoomPanStartX + dx;
        zoomPanY = zoomPanStartY + dy;
        applyZoomTransform();
    }, { passive: false });
    carousel.addEventListener('touchend', function() { zoomDragging = false; });
    carousel.addEventListener('dblclick', function() {
        if (zoomScale > 1) {
            zoomScale = 1; zoomPanX = 0; zoomPanY = 0;
        } else {
            zoomScale = 2.5;
        }
        applyZoomTransform();
    });
})();

function addToCart(id, name, price, image) {
    var existing = cart.find(function(item) { return item.id === id; });
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: id, name: name, price: price, qty: 1, image: image || '' });
    }
    saveCart(cart);
    updateCartCount();
    bounceCartCount();
    showToast(name + ' добавлен в корзину');
}

function bounceCartCount() {
    var el = document.getElementById('cart-count');
    if (!el) return;
    el.classList.remove('cart-bounce');
    void el.offsetWidth;
    el.classList.add('cart-bounce');
    var fab = document.getElementById('cart-fab');
    if (fab) {
        fab.classList.remove('cart-bounce');
        void fab.offsetWidth;
        fab.classList.add('cart-bounce');
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart(cart);
    updateCartCount();
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart(cart);
    updateCartCount();
}

function closeCart() {}

function sendOrder(e) { e.preventDefault(); window.location.href = 'cart.html'; }

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDetail();
        closeCart();
        closeZoom();
    }
});

window.addEventListener('click', function(event) {
    if (event.target === document.getElementById('detail-modal')) closeDetail();
    if (event.target === document.getElementById('zoom-overlay')) closeZoom();
});

(function initCounters() {
    var nums = document.querySelectorAll('.advantage-num[data-target]');
    if (!nums.length) return;
    var animated = false;
    function animateNums() {
        if (animated) return;
        var rect = nums[0].getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) {
            animated = true;
            nums.forEach(function(el) {
                var target = parseInt(el.getAttribute('data-target'));
                var current = 0;
                var step = Math.ceil(target / 60);
                var timer = setInterval(function() {
                    current += step;
                    if (current >= target) { current = target; clearInterval(timer); }
                    el.textContent = current;
                }, 25);
            });
        }
    }
    window.addEventListener('scroll', animateNums);
    animateNums();
})();

(function initReviewsSwiper() {
    var el = document.querySelector('.reviews-swiper');
    if (!el || typeof Swiper === 'undefined') return;
    new Swiper(el, {
        slidesPerView: 1,
        spaceBetween: 20,
        grabCursor: true,
        pagination: { el: '.swiper-pagination', clickable: true },
        breakpoints: {
            640: { slidesPerView: 2 },
            992: { slidesPerView: 3 }
        }
    });
})();

function initTilt() {
    var cards = document.querySelectorAll('.product');
    if (!cards.length) return;

    cards.forEach(function(card) {
        card.addEventListener('mousemove', function(e) {
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var centerX = rect.width / 2;
            var centerY = rect.height / 2;
            var rotateX = ((y - centerY) / centerY) * -6;
            var rotateY = ((x - centerX) / centerX) * 6;
            card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-6px)';
        });

        card.addEventListener('mouseleave', function() {
            card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

(function initHeroParallax() {
    var heroContent = document.querySelector('.hero-content');
    if (!heroContent) return;
    window.addEventListener('scroll', function() {
        var scrollY = window.scrollY;
        if (scrollY > 800) return;
        heroContent.style.transform = 'translateY(' + (scrollY * 0.25) + 'px)';
        heroContent.style.opacity = 1 - (scrollY / 600);
    });
})();
