var cart = [];
var allProducts = [];

window.onload = function () {
    loadProducts();
    var saved = localStorage.getItem('timur_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartCount();
    }
};

function loadProducts() {
    fetch('/api/products')
        .then(function (res) { return res.json(); })
        .then(function (products) {
            allProducts = products;
            renderProducts(products);
        });
}

function renderProducts(products) {
    var grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    products.forEach(function (p) {
        var imgHtml = p.images && p.images.length > 0
            ? '<img src="' + p.images[0] + '" alt="' + p.name + '">'
            : '📦';
        grid.innerHTML += '<div class="product" data-category="' + p.category + '" onclick="openDetail(' + p.id + ')">' +
            '<div class="product-img">' + imgHtml + '</div>' +
            '<div class="product-info">' +
                '<h3>' + p.name + '</h3>' +
                '<p>' + p.desc + '</p>' +
                '<div class="product-footer">' +
                    '<span class="price">' + p.price.toLocaleString('ru-RU') + ' ₽</span>' +
                    '<button class="add-to-cart" onclick="event.stopPropagation(); addToCart(\'' + p.name.replace(/'/g, "\\'") + '\', ' + p.price + ')">В корзину</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    });
}

function filterProducts(category, btn) {
    document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    if (category === 'all') {
        renderProducts(allProducts);
    } else {
        renderProducts(allProducts.filter(function (p) { return p.category === category; }));
    }
}

function openDetail(id) {
    fetch('/api/products/' + id)
        .then(function (res) { return res.json(); })
        .then(function (p) {
            document.getElementById('detail-name').textContent = p.name;
            document.getElementById('detail-price').textContent = p.price.toLocaleString('ru-RU') + ' ₽';
            document.getElementById('detail-desc').textContent = p.desc;

            var cartBtn = document.getElementById('detail-cart-btn');
            cartBtn.onclick = function () {
                addToCart(p.name, p.price);
            };

            var mainImg = document.getElementById('detail-main-img');
            var thumbs = document.getElementById('detail-thumbs');
            thumbs.innerHTML = '';

            if (p.images && p.images.length > 0) {
                mainImg.innerHTML = '<img src="' + p.images[0] + '" alt="' + p.name + '" onclick="openZoom(\'' + p.images[0] + '\')">';
                if (p.images.length > 1) {
                    p.images.forEach(function (src, idx) {
                        var activeClass = idx === 0 ? ' thumb-active' : '';
                        thumbs.innerHTML += '<img src="' + src + '" class="detail-thumb' + activeClass + '" onclick="switchDetailImg(\'' + src + '\', this)">';
                    });
                }
            } else {
                mainImg.innerHTML = '<span class="no-img-detail">📦</span>';
            }

            document.getElementById('detail-modal').style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
}

function switchDetailImg(src, thumbEl) {
    var mainImg = document.getElementById('detail-main-img');
    mainImg.innerHTML = '<img src="' + src + '" onclick="openZoom(\'' + src + '\')">';
    document.querySelectorAll('.detail-thumb').forEach(function (t) { t.classList.remove('thumb-active'); });
    thumbEl.classList.add('thumb-active');
}

function closeDetail() {
    document.getElementById('detail-modal').style.display = 'none';
    document.body.style.overflow = '';
}

function openZoom(src) {
    document.getElementById('zoom-img').src = src;
    document.getElementById('zoom-overlay').style.display = 'flex';
}

function closeZoom() {
    document.getElementById('zoom-overlay').style.display = 'none';
}

function addToCart(name, price) {
    var existing = cart.find(function (item) { return item.name === name; });
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name: name, price: price, qty: 1 });
    }
    saveCart();
    updateCartCount();
    showToast(name + ' добавлен в корзину');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartCount();
    openCart();
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    updateCartCount();
    openCart();
}

function saveCart() {
    localStorage.setItem('timur_cart', JSON.stringify(cart));
}

function updateCartCount() {
    var total = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    document.getElementById('cart-count').textContent = total;
}

function closeCart() {}

function sendOrder(e) { e.preventDefault(); window.location.href = 'cart.html'; }

function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2500);
}

window.onclick = function (event) {
    if (event.target === document.getElementById('detail-modal')) closeDetail();
    if (event.target === document.getElementById('zoom-overlay')) closeZoom();
};

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeZoom();
        closeDetail();
        closeCart();
    }
});
