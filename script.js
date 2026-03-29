let cart = [];

window.onload = function () {
    const saved = localStorage.getItem('timur_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartCount();
    }
};

function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name, price, qty: 1 });
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
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
    updateCartCount();
    openCart();
}

function saveCart() {
    localStorage.setItem('timur_cart', JSON.stringify(cart));
}

function updateCartCount() {
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').textContent = total;
}

function openCart() {
    const modal = document.getElementById('cart-modal');
    const itemsDiv = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');

    itemsDiv.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        itemsDiv.innerHTML = '<p style="color:#888">Корзина пуста</p>';
    } else {
        cart.forEach(function (item, index) {
            const subtotal = item.price * item.qty;
            total += subtotal;
            itemsDiv.innerHTML += '<div class="cart-item">' +
                '<div class="cart-item-info">' +
                    '<span class="cart-item-name">' + item.name + '</span>' +
                    '<span class="cart-item-price">' + item.price + ' ₽</span>' +
                '</div>' +
                '<div class="cart-item-actions">' +
                    '<button class="qty-btn" onclick="changeQty(' + index + ', -1)">−</button>' +
                    '<span class="qty-value">' + item.qty + '</span>' +
                    '<button class="qty-btn" onclick="changeQty(' + index + ', 1)">+</button>' +
                    '<span class="cart-item-subtotal">' + subtotal + ' ₽</span>' +
                    '<button class="remove-btn" onclick="removeFromCart(' + index + ')">✕</button>' +
                '</div>' +
            '</div>';
        });
    }

    totalSpan.textContent = total;
    modal.style.display = 'block';
}

function closeCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

function sendOrder(e) {
    e.preventDefault();
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;

    let message = 'Здравствуйте, Тимур! Хочу заказать:%0A';
    let total = 0;

    cart.forEach(function (item) {
        const subtotal = item.price * item.qty;
        message += '- ' + item.name + ' x' + item.qty + ' (' + subtotal + ' ₽)%0A';
        total += subtotal;
    });

    message += '%0AИтого: ' + total + ' ₽%0AИмя: ' + name + '%0AТелефон: ' + phone;

    const myPhone = '79990000000';

    window.open('https://wa.me/' + myPhone + '?text=' + message, '_blank');

    cart = [];
    localStorage.removeItem('timur_cart');
    updateCartCount();
    closeCart();
    showToast('Заказ отправлен!');
}

function filterProducts(category) {
    const products = document.querySelectorAll('.product');
    const buttons = document.querySelectorAll('.filter-btn');

    buttons.forEach(function (btn) {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    products.forEach(function (product) {
        if (category === 'all' || product.dataset.category === category) {
            product.style.display = 'block';
        } else {
            product.style.display = 'none';
        }
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
        toast.classList.remove('show');
    }, 2500);
}

window.onclick = function (event) {
    const modal = document.getElementById('cart-modal');
    if (event.target === modal) {
        closeCart();
    }
};
