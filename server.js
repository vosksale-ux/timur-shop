const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ADMIN_TOKEN = crypto.randomBytes(32).toString('hex');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');

var storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1000) + path.extname(file.originalname));
    }
});
var upload = multer({ storage: storage });

app.use(express.json());

app.use(express.static(path.join(__dirname), {
    setHeaders: function (res, filePath) {
        if (filePath.endsWith('server.js') || filePath.endsWith('package.json') || filePath.endsWith('package-lock.json')) {
            res.status(404).end();
        }
    }
}));

app.use('/data', express.static(path.join(__dirname, 'data'), {
    setHeaders: function (res) { res.status(404).end(); }
}));

function readProducts() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeProducts(products) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

function nextId(products) {
    if (products.length === 0) return 1;
    return Math.max(...products.map(function (p) { return p.id; })) + 1;
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function adminAuth(req, res, next) {
    var token = req.headers['authorization'];
    if (token === 'Bearer ' + ADMIN_TOKEN) return next();
    res.status(401).json({ error: 'Не авторизован' });
}

app.post('/api/login', function (req, res) {
    var pass = req.body.password;
    if (pass === 'timur2024') {
        res.json({ token: ADMIN_TOKEN });
    } else {
        res.status(401).json({ error: 'Неверный пароль' });
    }
});

app.get('/api/products', function (req, res) {
    var products = readProducts();
    var category = req.query.category;
    if (category && category !== 'all') {
        return res.json(products.filter(function (p) { return p.category === category; }));
    }
    res.json(products);
});

app.get('/api/products/:id', function (req, res) {
    var products = readProducts();
    var id = Number(req.params.id);
    var product = products.find(function (p) { return p.id === id; });
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json(product);
});

app.post('/api/products', adminAuth, function (req, res, next) {
    upload.array('images', 10)(req, res, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        try {
            var products = readProducts();
            var name = req.body.name;
            var desc = req.body.desc || '';
            var priceStr = req.body.price;
            var category = req.body.category;
            if (!name || !priceStr || !category) {
                return res.status(400).json({ error: 'Заполните название, цену и категорию' });
            }
            var price = Number(priceStr);
            if (isNaN(price) || price <= 0) {
                return res.status(400).json({ error: 'Цена должна быть положительным числом' });
            }
            var images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map(function (f) { return '/uploads/' + f.filename; });
            }
            var product = { id: nextId(products), name: name, desc: desc, price: price, category: category, images: images };
            products.push(product);
            writeProducts(products);
            res.json(product);
        } catch (err) {
            console.error('POST error:', err);
            res.status(500).json({ error: err.message });
        }
    });
});

app.put('/api/products/:id', adminAuth, function (req, res, next) {
    upload.array('images', 10)(req, res, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        try {
            var products = readProducts();
            var id = Number(req.params.id);
            var index = products.findIndex(function (p) { return p.id === id; });
            if (index === -1) return res.status(404).json({ error: 'Товар не найден' });
            products[index].name = req.body.name || products[index].name;
            products[index].desc = req.body.desc !== undefined ? req.body.desc : products[index].desc;
            products[index].price = req.body.price !== undefined ? Number(req.body.price) : products[index].price;
            products[index].category = req.body.category || products[index].category;
            if (req.files && req.files.length > 0) {
                var newImages = req.files.map(function (f) { return '/uploads/' + f.filename; });
                products[index].images = products[index].images.concat(newImages);
            }
            writeProducts(products);
            res.json(products[index]);
        } catch (err) {
            console.error('PUT error:', err);
            res.status(500).json({ error: err.message });
        }
    });
});

app.delete('/api/products/:id', adminAuth, function (req, res) {
    var products = readProducts();
    var id = Number(req.params.id);
    var index = products.findIndex(function (p) { return p.id === id; });
    if (index === -1) return res.status(404).json({ error: 'Товар не найден' });
    var deleted = products[index];
    products.splice(index, 1);
    writeProducts(products);
    if (deleted.images && deleted.images.length > 0) {
        deleted.images.forEach(function (img) {
            var fp = path.join(__dirname, img.replace(/^\//, ''));
            if (fs.existsSync(fp) && fp.startsWith(UPLOAD_DIR)) fs.unlinkSync(fp);
        });
    }
    res.json({ ok: true });
});

app.delete('/api/products/:id/images', adminAuth, function (req, res) {
    var products = readProducts();
    var id = Number(req.params.id);
    var index = products.findIndex(function (p) { return p.id === id; });
    if (index === -1) return res.status(404).json({ error: 'Товар не найден' });
    var removeSrc = req.body.image;
    if (!removeSrc) return res.status(400).json({ error: 'Укажите image' });
    var cleanSrc = removeSrc.replace(/\.\./g, '').replace(/\/\//g, '/');
    products[index].images = products[index].images.filter(function (img) { return img !== cleanSrc; });
    writeProducts(products);
    var filePath = path.join(__dirname, cleanSrc);
    if (filePath.startsWith(UPLOAD_DIR) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ ok: true });
});

app.listen(PORT, function () {
    console.log('TIMUR.SHOP запущен: http://localhost:' + PORT);
    console.log('Админка: http://localhost:' + PORT + '/admin.html');
    console.log('Admin token: ' + ADMIN_TOKEN);
});
