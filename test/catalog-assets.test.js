import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { catalog } from '../server/catalog.js';

test('every catalog image is a shipped public asset', () => {
  for (const product of catalog.products) {
    const images = [product.image, ...(product.colors ?? []).flatMap((color) =>
      [color.studioImage, color.rackFront, color.rackBack].filter(Boolean))];
    for (const image of images) {
      assert.ok(image.startsWith('/images/'), `Unexpected asset path: ${image}`);
      assert.ok(existsSync(resolve('public', image.slice(1))), `Missing catalog image: ${image}`);
    }
  }
});

test('each interactive coat color has front and rear PNGs with an alpha channel and purchasable variants', () => {
  const product = catalog.products.find(({ id }) => id === 'classic-coat');
  assert.equal(product.colors.length, 4);
  for (const color of product.colors) {
    assert.ok(product.variants.some((variant) => variant.colorId === color.id), `No variant for ${color.id}`);
    for (const path of [color.rackFront, color.rackBack]) {
      const image = readFileSync(resolve('public', path.slice(1)));
      assert.equal(image.subarray(1, 4).toString(), 'PNG');
      assert.equal(image[25], 6, `${path} must preserve RGBA transparency`);
      assert.ok(image.readUInt32BE(16) >= 700, `${path} is too small for the close view`);
    }
  }
});
