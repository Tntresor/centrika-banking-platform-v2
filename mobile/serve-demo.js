const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'interactive-demo.html');
  
  // Log which file we're trying to serve
  console.log('Serving file:', filePath);
  
  // Enable CORS for API calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/' || req.url === '/demo') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading demo');
        return;
      }
      res.end(content);
    });
  } else if (req.url === '/portal') {
    const portalPath = path.join(__dirname, 'web-demo.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.readFile(portalPath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading portal');
        return;
      }
      res.end(content);
    });
  } else if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'Centrika Mobile Banking Demo',
      status: 'running',
      port: PORT,
      timestamp: new Date().toISOString(),
      features: ['User Registration', 'Login', 'P2P Transfers', 'Live Supabase Data']
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      message: "Endpoint not found",
      availableEndpoints: ["/", "/status"],
      requestedUrl: req.url
    }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Centrika Mobile App Demo running on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}`);
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});