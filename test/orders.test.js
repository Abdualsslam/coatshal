import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { catalog as demoCatalog } from '../server/catalog.js';
import { createOrderStore } from '../server/order-store.js';

const catalog = {
  products: [{ id: 'coat', name: 'كوت', price: 12000, variants: [{ id: 'm', name: 'M', stock: 2 }] }],
  zones: [{ id: 'city', name: 'صنعاء', fee: 1500 }],
  payments: [{ id: 'wallet', name: 'محفظة' }],
};

const orderInput = {
  key: '26c90650-0472-47bc-aef0-ef14c2666484',
  lines: [{ productId: 'coat', variantId: 'm', quantity: 2 }],
  name: 'أحمد صالح', phone: '٧٧٠٠٠٠٠٠٠', zoneId: 'city',
  address: 'صنعاء، شارع الخمسين', paymentId: 'wallet', transferReference: 'DEMO-12345',
  expectedTotal: 25500,
};

function openStore(t, path = ':memory:') {
  const store = createOrderStore(path, catalog);
  t.after(() => store.close());
  return store;
}

test('saves an order and returns the same receipt after a retry and restart', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'coatshal-orders-'));
  const path = join(folder, 'orders.sqlite');
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const first = createOrderStore(path, catalog);
  let receipt;
  try {
    receipt = first.place(orderInput);
    assert.equal(receipt.status, 'pending_transfer_review');
    assert.equal(receipt.total, 25500);
  } finally {
    first.close();
  }
  const second = createOrderStore(path, catalog);
  try {
    assert.deepEqual(second.place(orderInput), receipt);
    assert.equal(second.list().length, 1);
    assert.equal(second.list()[0].phone, '770000000');
    assert.equal(second.catalog().products[0].variants[0].stock, 0);
    assert.throws(() => second.place({ ...orderInput, address: 'عنوان مختلف طويل' }), { code: 'retry_conflict' });
  } finally {
    second.close();
  }
});

test('checks the authoritative total and rolls back an order that exceeds stock', (t) => {
  const store = openStore(t);
  assert.throws(() => store.place({ ...orderInput, expectedTotal: 1 }), { code: 'price_changed' });
  assert.throws(() => store.place({ ...orderInput, lines: [
    { productId: 'coat', variantId: 'm', quantity: 3 },
  ], expectedTotal: 37500 }), { code: 'out_of_stock' });
  assert.equal(store.list().length, 0);
  assert.equal(store.catalog().products[0].variants[0].stock, 2);
});

test('accepts only a configured payment and a transfer reference', (t) => {
  const store = openStore(t);
  assert.throws(() => store.place({ ...orderInput, paymentId: 'card' }), { code: 'invalid_checkout' });
  assert.throws(() => store.place({ ...orderInput, transferReference: ' ' }), { code: 'invalid_checkout' });
});

test('reviews an order and returns stock once when a transfer is rejected', (t) => {
  const store = openStore(t);
  const receipt = store.place(orderInput);
  assert.equal(store.review(receipt.reference, 'reject'), true);
  assert.equal(store.review(receipt.reference, 'reject'), false);
  assert.equal(store.list()[0].status, 'transfer_rejected');
  assert.equal(store.catalog().products[0].variants[0].stock, 2);
});

test('preserves the original cart variant and reserves each color independently', (t) => {
  const store = createOrderStore(':memory:', demoCatalog);
  t.after(() => store.close());
  const stock = (id) => store.catalog().products[0].variants.find((variant) => variant.id === id)?.stock;
  const sandBefore = stock('sand-m');
  assert.ok(sandBefore > 0);
  const blackBefore = stock('m');

  store.place({
    ...orderInput, zoneId: 'sanaa', expectedTotal: 57500, lines: [
      { productId: 'classic-coat', variantId: 'm', quantity: 1 },
      { productId: 'classic-coat', variantId: 'sand-m', quantity: 1 },
    ],
  });
  assert.equal(stock('m'), blackBefore - 1);
  assert.equal(stock('sand-m'), sandBefore - 1);
  assert.equal(stock('sand-l'), 6);
  assert.deepEqual(store.list()[0].lines.map(({ color, variant }) => [color, variant]), [
    ['أسود', 'M'], ['رملي', 'M'],
  ]);
});
