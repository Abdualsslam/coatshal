import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import { openDatabase } from './database.js';

const dev = process.argv.includes('--dev');
const dist = resolve('dist');
if (!dev && !existsSync(resolve(dist, 'index.html'))) {
  throw new Error('Run npm run build before npm start.');
}

const store = openDatabase();
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!dev) {
    res.set('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  }
  next();
});

const api = express.Router();
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
api.get('/catalog', (req, res) => res.json(store.catalog()));
api.post('/orders', express.json({ limit: '12kb' }), (req, res) => {
  if (!req.is('application/json') || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(415).json({ message: 'تعذّر قراءة الطلب.' });
  }
  return res.status(201).json(store.place(req.body));
});
api.use((req, res) => res.status(404).json({ message: 'الصفحة غير موجودة.' }));
api.use((error, req, res, next) => {
  if (error.status >= 400 && error.status < 500) {
    const message = error.type ? 'تعذّر قراءة بيانات الطلب.' : error.message;
    return res.status(error.status).json({ code: error.code, message });
  }
  console.error('Order API failed', error);
  return res.status(500).json({ message: 'حدث خلل مؤقت. حاول مرة أخرى.' });
});
app.use('/api', api);

if (dev) {
  const { createServer } = await import('vite');
  const deny = [
    '.env', '.env.*', '*.{crt,pem,key}', '**/.git/**', '**/data/**',
    '**/*.sqlite*', '**/*.db*', '**/مصادر/**',
  ];
  if (process.env.COATSHAL_DB) deny.push(resolve(process.env.COATSHAL_DB).replaceAll('\\', '/'));
  const vite = await createServer({
    server: { middlewareMode: true, fs: { deny } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(dist));
}

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT ?? (dev ? 5173 : 4173));
const server = app.listen(port, host, () => {
  console.log('Coatshal preview  http://' + host + ':' + server.address().port);
});
