import http from 'http';

const check = () => {
  const req = http.request('http://localhost:3000/metrics', { method: 'GET' }, (res) => {
    console.log(`[Metrics Check] Status: ${res.statusCode}`);
    if (res.statusCode === 401) {
      console.log('PASS: Metrics endpoint protected');
    } else {
      console.log('FAIL: Metrics endpoint exposed');
    }
  });
  req.on('error', (e) =>
    console.log('Server likely not running (expected if just built):', e.message)
  );
  req.end();

  const req2 = http.request('http://localhost:3000/', { method: 'GET' }, (res) => {
    console.log('--- Headers ---');
    console.log('CSP:', res.headers['content-security-policy']);
    console.log('HSTS:', res.headers['strict-transport-security']);
    console.log('X-Frame:', res.headers['x-frame-options']);

    if (res.headers['strict-transport-security']) {
      console.log('PASS: HSTS present');
    } else {
      console.log('FAIL: HSTS missing');
    }
  });
  req2.on('error', () => {});
  req2.end();
};

// Wait for server to potentially start if user runs this manually
setTimeout(check, 2000);
