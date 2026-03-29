const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        var ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1000) + ext);
    }
});
var upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/api/products', upload.array('images', 10), function (req, res) {
    var products = readProducts();
    var name = req.body.name;
    var desc = req.body.desc;
    var price = req.body.price;
    var category = req.body.category;
    if (!name || !price || !category) {
        return res.status(400).json({ error: 'Заполните название, цену и категорию' });
    }
    var images = [];
    if (req.files) {
        images = req.files.map(function (f) { return '/uploads/' + f.filename; });
    }
    var product = { id: nextId(products), name: name, desc: desc || '', price: Number(price), category: category, images: images };
    products.push(product);
    writeProducts(products);
    res.json(product);
});

app.put('/api/products/:id', upload.array('images', 10), function (req, res) {
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
});

app.delete('/api/products/:id', function (req, res) {
    var products = readProducts();
    var id = Number(req.params.id);
    var index = products.findIndex(function (p) { return p.id === id; });
    if (index === -1) return res.status(404).json({ error: 'Товар не найден' });
    products.splice(index, 1);
    writeProducts(products);
    res.json({ ok: true });
});

app.delete('/api/products/:id/images', function (req, res) {
    var products = readProducts();
    var id = Number(req.params.id);
    var index = products.findIndex(function (p) { return p.id === id; });
    if (index === -1) return res.status(404).json({ error: 'Товар не найден' });
    var removeSrc = req.body.image;
    if (!removeSrc) return res.status(400).json({ error: 'Укажите image' });
    products[index].images = products[index].images.filter(function (img) { return img !== removeSrc; });
    writeProducts(products);
    var filePath = path.join(__dirname, 'public', removeSrc);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ ok: true });
});

app.listen(PORT, function () {
    console.log('TIMUR.SHOP запущен: http://localhost:' + PORT);
    console.log('Админка: http://localhost:' + PORT + '/admin.html');
});
