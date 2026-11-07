import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { catalog } from './catalog.js';
import { createOrderStore } from './order-store.js';

export function openDatabase() {
  const path = resolve(process.env.COATSHAL_DB || 'data/coatshal.sqlite');
  mkdirSync(dirname(path), { recursive: true });
  return createOrderStore(path, catalog);
}
