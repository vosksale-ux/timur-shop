var http = require('http');

var body1 = JSON.stringify({ password: 'timur2024' });
var req1 = http.request({
    hostname: 'localhost', port: 3000, path: '/api/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body1) }
}, function (res1) {
    var d1 = '';
    res1.on('data', function (c) { d1 += c; });
    res1.on('end', function () {
        console.log('Login:', res1.statusCode);
        if (res1.statusCode !== 200) { console.log(d1); process.exit(1); }
        var token = JSON.parse(d1).token;

        var boundary = '----TestBoundary';
        var body2 = '';
        [['name', 'TestProd'], ['desc', 'TestDesc'], ['price', '100'], ['category', 'accessories']].forEach(function (f) {
            body2 += '--' + boundary + '\r\nContent-Disposition: form-data; name="' + f[0] + '"\r\n\r\n' + f[1] + '\r\n';
        });
        body2 += '--' + boundary + '--\r\n';

        var req2 = http.request({
            hostname: 'localhost', port: 3000, path: '/api/products', method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data; boundary=' + boundary,
                'Content-Length': Buffer.byteLength(body2),
                'Authorization': 'Bearer ' + token
            }
        }, function (res2) {
            var d2 = '';
            res2.on('data', function (c) { d2 += c; });
            res2.on('end', function () {
                console.log('POST product:', res2.statusCode, d2);
                process.exit(res2.statusCode === 200 ? 0 : 1);
            });
        });
        req2.on('error', function (e) { console.log('Error:', e.message); process.exit(1); });
        req2.write(body2);
        req2.end();
    });
});
req1.on('error', function (e) { console.log('Error:', e.message); process.exit(1); });
req1.write(body1);
req1.end();
