const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 3535,
  path: '/api/clients/123',
  method: 'PUT'
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
