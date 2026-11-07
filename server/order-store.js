import { createHash, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const messages = {
  invalid_checkout: 'راجع البيانات المدخلة وخيارات السلة.',
  out_of_stock: 'لم تعد الكمية المطلوبة متوفرة. حدّث الكمية في السلة.',
  price_changed: 'تغيّر إجمالي الطلب. راجع السلة قبل إعادة التأكيد.',
  retry_conflict: 'تغيّرت بيانات الطلب. راجع السلة وحاول مرة أخرى.',
};

function fail(code, status = 400) {
  throw Object.assign(new Error(messages[code]), { code, status });
}

function field(value, min, max) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (result.length < min || result.length > max) fail('invalid_checkout');
  return result;
}

function normalize(input, catalog) {
  const key = field(input?.key, 36, 36);
  if (!/^[a-f0-9-]{36}$/i.test(key)) fail('invalid_checkout');

  const name = field(input.name, 2, 80);
  const phone = field(input.phone, 7, 25)
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x0660 : 0x06f0)))
    .replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(phone)) fail('invalid_checkout');

  const zone = catalog.zones.find(({ id }) => id === input.zoneId);
  const payment = catalog.payments.find(({ id }) => id === input.paymentId);
  if (!zone || !payment) fail('invalid_checkout');
  const address = field(input.address, 8, 300);
  const transferReference = field(input.transferReference, 3, 64);
  if (!/^[\p{L}\p{N}_-]+$/u.test(transferReference)) fail('invalid_checkout');

  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 20) {
    fail('invalid_checkout');
  }
  const variants = new Set();
  const lines = input.lines.map((line) => {
    const product = catalog.products.find(({ id }) => id === line?.productId);
    const variant = product?.variants.find(({ id }) => id === line?.variantId);
    const quantity = line?.quantity;
    if (!variant || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      fail('invalid_checkout');
    }
    const stockKey = product.id + '/' + variant.id;
    if (variants.has(stockKey)) fail('invalid_checkout');
    variants.add(stockKey);
    const color = product.colors?.find(({ id }) => id === variant.colorId)?.name ?? product.color;
    return { stockKey, product: product.name, variant: variant.name, color, quantity, price: product.price };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const total = subtotal + zone.fee;
  const order = {
    name, phone, address, zone: zone.name, payment: payment.name, transferReference,
    lines, subtotal, deliveryFee: zone.fee, total,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify({
    name, phone, address, zoneId: zone.id, paymentId: payment.id, transferReference,
    lines: lines.map(({ stockKey, quantity }) => ({ stockKey, quantity })),
    expectedTotal: input.expectedTotal,
  })).digest('hex');
  return { key, fingerprint, order };
}

function receipt(row) {
  return {
    reference: row.reference,
    status: row.status,
    total: JSON.parse(row.details).total,
  };
}

export function createOrderStore(path, catalog) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');

  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  transaction(() => {
    if (db.prepare('PRAGMA user_version').get().user_version === 0) {
      db.exec(`
        CREATE TABLE stock (variant TEXT PRIMARY KEY, available INTEGER NOT NULL CHECK (available >= 0));
        CREATE TABLE orders (
          reference TEXT PRIMARY KEY,
          request_key TEXT NOT NULL UNIQUE,
          fingerprint TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending_transfer_review', 'transfer_confirmed', 'transfer_rejected')),
          created_at TEXT NOT NULL,
          details TEXT NOT NULL
        );
        PRAGMA user_version = 1;
      `);
    }
    const seed = db.prepare('INSERT OR IGNORE INTO stock (variant, available) VALUES (?, ?)');
    for (const product of catalog.products) {
      for (const variant of product.variants) seed.run(product.id + '/' + variant.id, variant.stock);
    }
  });

  const readStock = db.prepare('SELECT available FROM stock WHERE variant = ?');
  const reserve = db.prepare('UPDATE stock SET available = available - ? WHERE variant = ? AND available >= ?');
  const restore = db.prepare('UPDATE stock SET available = available + ? WHERE variant = ?');
  const byKey = db.prepare('SELECT reference, status, details, fingerprint FROM orders WHERE request_key = ?');
  const pending = db.prepare("SELECT details FROM orders WHERE reference = ? AND status = 'pending_transfer_review'");
  const update = db.prepare('UPDATE orders SET status = ? WHERE reference = ?');
  const list = db.prepare('SELECT reference, status, created_at, details FROM orders ORDER BY created_at DESC');
  const insert = db.prepare(`
    INSERT INTO orders (reference, request_key, fingerprint, status, created_at, details)
    VALUES (?, ?, ?, 'pending_transfer_review', ?, ?)
  `);

  return {
    catalog() {
      return {
        ...catalog,
        products: catalog.products.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            stock: readStock.get(product.id + '/' + variant.id).available,
          })),
        })),
      };
    },
    place(input) {
      const { key, fingerprint, order } = normalize(input, catalog);
      return transaction(() => {
        const existing = byKey.get(key);
        if (existing) {
          if (existing.fingerprint !== fingerprint) fail('retry_conflict', 409);
          return receipt(existing);
        }
        if (input.expectedTotal !== order.total) fail('price_changed', 409);
        for (const line of order.lines) {
          if (!reserve.run(line.quantity, line.stockKey, line.quantity).changes) fail('out_of_stock', 409);
        }
        const reference = 'CS-' + randomBytes(6).toString('hex').toUpperCase();
        insert.run(reference, key, fingerprint, new Date().toISOString(), JSON.stringify(order));
        return { reference, status: 'pending_transfer_review', total: order.total };
      });
    },
    list() {
      return list.all().map(({ reference, status, created_at, details }) => ({
        reference, status, createdAt: created_at, ...JSON.parse(details),
      }));
    },
    review(reference, action) {
      if (action !== 'confirm' && action !== 'reject') throw new RangeError('Unknown review action');
      return transaction(() => {
        const row = pending.get(reference);
        if (!row) return false;
        if (action === 'reject') {
          for (const line of JSON.parse(row.details).lines) restore.run(line.quantity, line.stockKey);
        }
        update.run(action === 'confirm' ? 'transfer_confirmed' : 'transfer_rejected', reference);
        return true;
      });
    },
    close() { db.close(); },
  };
}
