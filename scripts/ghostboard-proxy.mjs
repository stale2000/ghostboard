import http from 'node:http';
import httpProxy from 'http-proxy';

const target = 'http://127.0.0.1:8000';
const port = Number(process.env.GHOSTBOARD_PROXY_PORT || 8010);

const proxy = httpProxy.createProxyServer({
  target,
  ws: true,
  changeOrigin: true,
  xfwd: true
});

proxy.on('proxyRes', (proxyRes) => {
  proxyRes.headers['access-control-allow-origin'] = '*';
  proxyRes.headers['access-control-allow-methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
  proxyRes.headers['access-control-allow-headers'] = 'content-type,authorization';
});

proxy.on('error', (error, req, res) => {
  if (res && !res.headersSent) {
    res.writeHead(502, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    });
  }
  res?.end(JSON.stringify({ error: 'proxy_error', detail: error.message, url: req.url }));
});

const server = http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  proxy.web(req, res);
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(port, () => {
  console.log(`ghostboard proxy listening on http://127.0.0.1:${port} -> ${target}`);
});
