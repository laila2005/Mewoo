const https = require('https');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
let data = '';
data += '--' + boundary + '\r\n';
data += 'Content-Disposition: form-data; name="upload_preset"\r\n\r\n';
data += 'PetPulse\r\n';
data += '--' + boundary + '\r\n';
data += 'Content-Disposition: form-data; name="file"\r\n\r\n';
data += 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==\r\n';
data += '--' + boundary + '--\r\n';

const options = {
  hostname: 'api.cloudinary.com',
  port: 443,
  path: '/v1_1/dov42snih/image/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
