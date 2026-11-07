import './styles.css';

const element = (id) => document.getElementById(id);
const icon = (name) => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
const currency = new Intl.NumberFormat('ar-YE', { numberingSystem: 'latn' });
const money = (value) => '<bdi>' + currency.format(value) + ' ر.ي</bdi>';
const html = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const storageKey = 'coatshal-cart-v1';

const productDialog = element('product-dialog');
const bagDialog = element('bag-dialog');
const checkoutForm = element('checkout-form');
const zoneSelect = checkoutForm.elements.zoneId;
const paymentSelect = checkoutForm.elements.paymentId;
const submitOrder = checkoutForm.querySelector('[type="submit"]');
const cartItems = element('cart-items');
const products = element('products');
const lookList = element('look-list');
const lookStage = element('look-stage');

let catalog;
let filter = 'all';
let featuredId;
const selectedShades = new Map();
let cart = readCart();
let stage = 'cart';
let request;
let submitting = false;

function readCart() {
  try {
    const entries = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (Array.isArray(entries)) {
      return entries.filter((line) => typeof line?.productId === 'string' &&
        typeof line.variantId === 'string' && Number.isInteger(line.quantity) &&
        line.quantity > 0 && line.quantity <= 20);
    }
  } catch {
    // The cart stays available in memory when storage is disabled.
  }
  return [];
}

function persistCart() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch {
    // The current tab can still use the cart.
  }
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  element('bag-count').textContent = currency.format(count);
  element('open-bag').setAttribute('aria-label', 'السلة، ' + count + ' قطعة');
}

function getItem(line) {
  const product = catalog?.products.find(({ id }) => id === line.productId);
  const variant = product?.variants.find(({ id }) => id === line.variantId);
  return variant ? { ...line, product, variant } : null;
}

function updateCart(line, quantity) {
  const index = cart.findIndex((item) => item.productId === line.productId && item.variantId === line.variantId);
  if (index >= 0) cart.splice(index, 1, ...(quantity > 0 ? [{ ...line, quantity }] : []));
  else if (quantity > 0) cart.push({ ...line, quantity });
  persistCart();
}

function showMessage(id, message = '') {
  const target = element(id);
  target.textContent = message;
  target.hidden = !message;
}

function colorOf(product, id) {
  return product.colors?.find((color) => color.id === id) ?? product.colors?.[0];
}

function shadePicker(product, color) {
  if (!product.colors?.length) return '<p class="look-shade">' + html(product.color ?? '') + '</p>';
  return `
    <fieldset class="shade-picker">
      <legend>اللون <strong>${html(color.name)}</strong></legend>
      <div class="swatches">${product.colors.map((shade) => `
        <button class="swatch" type="button" data-shade="${html(shade.id)}"
          aria-label="${html(shade.name)}" aria-pressed="${shade.id === color.id}">
          <svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="${html(shade.swatch)}"/></svg>
        </button>`).join('')}</div>
    </fieldset>`;
}

function lookPhoto(product, color, className = '') {
  const name = color?.name ?? product.color;
  return `<div class="look-photo ${className}" data-tone="${html(color?.id ?? 'full')}">
    <img src="${html(product.image)}" alt="${html([product.name, name].filter(Boolean).join('، '))}">
  </div>`;
}

async function loadCatalog() {
  const response = await fetch('/api/catalog', { cache: 'no-store' });
  if (!response.ok) throw new Error('Catalog unavailable');
  catalog = await response.json();
  const reconciled = [];
  for (const line of cart) {
    const item = getItem(line);
    if (item?.variant.stock > 0) {
      reconciled.push({ ...line, quantity: Math.min(line.quantity, item.variant.stock) });
    }
  }
  const changed = JSON.stringify(cart) !== JSON.stringify(reconciled);
  cart = reconciled;
  persistCart();
  renderProducts();
  renderOptions();
  if (changed) showMessage('cart-message', 'تم تحديث بعض كميات السلة حسب المخزون التجريبي المتاح.');
  return changed;
}

function renderProducts() {
  const matches = catalog.products.filter((product) => filter === 'all' || product.category === filter);
  showMessage('catalog-status', matches.length ? '' : 'لا توجد قطع في هذه الفئة حاليًا.');
  products.hidden = matches.length === 0;
  if (!matches.length) return;
  const active = matches.find(({ id }) => id === featuredId) ?? matches[0];
  featuredId = active.id;
  lookList.innerHTML = matches.map((product) => `
    <button class="look-tab" type="button" data-look="${html(product.id)}" aria-pressed="${product.id === featuredId}">
      <span class="look-thumb"><img src="${html(product.image)}" alt="" width="80" height="86" loading="lazy"></span>
      <span class="look-tab-text"><strong>${html(product.name)}</strong>
        <span>${product.category === 'coats' ? 'الأكوات' : 'الشيلان'}</span>
      </span>
      ${icon('arrow')}
    </button>`).join('');
  renderLook(active);
}

function renderLook(product) {
  const color = colorOf(product, selectedShades.get(product.id));
  const available = product.variants.some((variant) => variant.stock && (!color || variant.colorId === color.id));
  lookStage.innerHTML = `
    <article class="look-stage">
      <figure class="look-figure">
        ${lookPhoto(product, color)}
        <figcaption>من المِشجب <span>${html(color?.name ?? product.color)}</span></figcaption>
      </figure>
      <div class="look-copy">
        <h3>${html(product.name)}</h3>
        <p class="look-description">${html(product.description)}</p>
        ${shadePicker(product, color)}
        <p class="look-price">${money(product.price)} <span>سعر تجريبي</span></p>
        <button class="button button-dark full" type="button" data-product="${html(product.id)}">
          ${available ? 'اختر المقاس' : 'عرض المقاسات'} ${icon('arrow')}
        </button>
      </div>
    </article>`;
}

function renderSizes(form, product, color) {
  const sizes = product.variants.filter((variant) => !color || variant.colorId === color.id);
  const available = sizes.some((variant) => variant.stock > 0);
  form.querySelector('.variant-list').innerHTML = sizes.map((variant) => `
    <label class="variant">
      <input type="radio" name="variant" value="${html(variant.id)}" required
        ${variant.stock ? '' : 'disabled'} ${sizes.length === 1 && variant.stock ? 'checked' : ''}>
      <span>${html(variant.name)}</span>
    </label>`).join('');
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = !available;
  submit.innerHTML = (available ? 'أضف إلى السلة' : 'نفدت الكمية') + ' ' + icon('bag');
  form.querySelector('.form-message').hidden = true;
}

function openProduct(product) {
  let color = colorOf(product, selectedShades.get(product.id));
  const detail = element('product-detail');
  detail.innerHTML = `
    <div class="detail-layout">
      ${lookPhoto(product, color, 'detail-photo')}
      <div class="detail-copy">
        <h2 id="product-title">${html(product.name)}</h2>
        <p>${html(product.description)}</p>
        <p><strong>${money(product.price)}</strong> · سعر تجريبي</p>
        <form>
          <div class="detail-colors">${shadePicker(product, color)}</div>
          <fieldset>
            <legend>اختر المقاس</legend>
            <div class="variant-list"></div>
          </fieldset>
          <p class="form-message" role="status" hidden></p>
          <button class="button button-dark full" type="submit"></button>
        </form>
      </div>
    </div>`;

  const form = detail.querySelector('form');
  const colors = form.querySelector('.detail-colors');
  renderSizes(form, product, color);
  colors.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shade]');
    if (!button || button.dataset.shade === color?.id) return;
    color = colorOf(product, button.dataset.shade);
    selectedShades.set(product.id, color.id);
    colors.innerHTML = shadePicker(product, color);
    detail.querySelector('.detail-photo').outerHTML = lookPhoto(product, color, 'detail-photo');
    renderSizes(form, product, color);
    renderLook(product);
    colors.querySelector('[aria-pressed="true"]').focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const variantId = new FormData(form).get('variant');
    const variant = product.variants.find(({ id }) => id === variantId);
    if (!variant?.stock || (color && variant.colorId !== color.id)) return;
    const current = cart.find((line) => line.productId === product.id && line.variantId === variantId);
    const quantity = (current?.quantity ?? 0) + 1;
    if (quantity > Math.min(variant.stock, 20)) {
      const notice = form.querySelector('.form-message');
      notice.textContent = 'أضفت كامل الكمية المتاحة لهذا المقاس.';
      notice.hidden = false;
      return;
    }
    updateCart({ productId: product.id, variantId }, quantity);
    showMessage('cart-message');
    productDialog.close();
    openBag();
  });
  productDialog.showModal();
}

function cartSubtotal() {
  return cart.reduce((sum, line) => sum + (getItem(line)?.product.price ?? 0) * line.quantity, 0);
}

function renderCart() {
  const items = cart.map(getItem).filter(Boolean);
  element('cart-actions').hidden = items.length === 0;
  if (!items.length) {
    cartItems.innerHTML = catalog
      ? '<div class="empty"><p>سلتك فارغة.</p><a class="button button-outline" href="#collection" data-close>تصفّح التشكيلة</a></div>'
      : '<p class="empty">السلة بانتظار تحميل التشكيلة.</p>';
    return;
  }
  cartItems.innerHTML = items.map(({ product, variant, quantity }, index) => `
    <article class="cart-item">
      <img src="${html(product.image)}" alt="" width="78" height="89">
      <div>
        <h3>${html(product.name)}</h3>
        <p>${[colorOf(product, variant.colorId)?.name ?? product.color, variant.name].filter(Boolean).map(html).join(' · ')} · ${money(product.price * quantity)}</p>
        <div class="cart-item-controls">
          <div class="quantity" role="group" aria-label="كمية ${html(product.name)}">
            <button type="button" data-quantity="minus" data-line="${index}" aria-label="تقليل الكمية" ${quantity === 1 ? 'disabled' : ''}>${icon('minus')}</button>
            <bdi>${quantity}</bdi>
            <button type="button" data-quantity="plus" data-line="${index}" aria-label="زيادة الكمية" ${quantity >= Math.min(variant.stock, 20) ? 'disabled' : ''}>${icon('plus')}</button>
          </div>
          <button type="button" class="text-button" data-quantity="remove" data-line="${index}" aria-label="إزالة ${html(product.name)}">إزالة</button>
        </div>
      </div>
    </article>`).join('');
  element('cart-subtotal').innerHTML = money(cartSubtotal());
}

function renderOptions() {
  const options = (select, items, placeholder) => {
    const selected = select.value;
    select.innerHTML = '<option value="">' + placeholder + '</option>' +
      items.map(({ id, name }) => '<option value="' + html(id) + '">' + html(name) + '</option>').join('');
    if (items.some(({ id }) => id === selected)) select.value = selected;
  };
  options(zoneSelect, catalog.zones, 'حدّد المنطقة');
  options(paymentSelect, catalog.payments, 'حدّد طريقة التحويل');
}

function renderCheckout() {
  const zone = catalog?.zones.find(({ id }) => id === zoneSelect.value);
  const subtotal = cartSubtotal();
  element('checkout-summary').innerHTML = `
    <div class="totals"><span>المجموع الفرعي</span>${money(subtotal)}</div>
    <div class="totals"><span>التوصيل</span><span>${zone ? money(zone.fee) : 'حدّد المنطقة'}</span></div>
    <div class="totals grand-total"><span>الإجمالي التجريبي</span><span>${zone ? money(subtotal + zone.fee) : '—'}</span></div>`;
}

function showStage(next) {
  stage = next;
  for (const name of ['cart', 'checkout', 'receipt']) element(name + '-stage').hidden = name !== next;
  element('bag-title').textContent = {
    cart: 'سلة التسوّق', checkout: 'إتمام الطلب', receipt: 'تأكيد الطلب',
  }[next];
  if (next === 'cart') renderCart();
  if (next === 'checkout') renderCheckout();
  element('bag-title').focus();
  bagDialog.querySelector('.drawer-content').scrollTop = 0;
}

function openBag() {
  bagDialog.showModal();
  showStage(stage);
}

function renderReceipt(receipt) {
  const status = {
    pending_transfer_review: 'بانتظار مراجعة التحويل',
    transfer_confirmed: 'تم تأكيد التحويل',
    transfer_rejected: 'رُفض التحويل',
  }[receipt.status] ?? '';
  element('receipt-stage').innerHTML = `
    <span class="receipt-mark">${icon('check')}</span>
    <h3>تم تسجيل طلبك التجريبي.</h3>
    <p>${status} · ${money(receipt.total)}</p>
    <p class="receipt-reference">رقم الطلب <strong><bdi dir="ltr">${html(receipt.reference)}</bdi></strong></p>
    <p class="muted">هذا طلب للمعاينة فقط.</p>
    <a class="button button-outline" href="#collection" data-close>العودة إلى التشكيلة</a>`;
}

function applyFilter(category) {
  filter = category;
  for (const option of document.querySelectorAll('[data-filter]')) {
    option.setAttribute('aria-pressed', String(option.dataset.filter === filter));
  }
  if (catalog) renderProducts();
}

document.querySelector('.filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (button) applyFilter(button.dataset.filter);
});

document.querySelector('.outfit-pieces').addEventListener('click', (event) => {
  const link = event.target.closest('[data-show-category]');
  if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const { showCategory, showProduct, showShade } = link.dataset;
  if (showProduct) featuredId = showProduct;
  if (showProduct && showShade) selectedShades.set(showProduct, showShade);
  applyFilter(showCategory);
  element('collection-title').focus({ preventScroll: true });
});

lookList.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-look]');
  if (!trigger || trigger.dataset.look === featuredId) return;
  featuredId = trigger.dataset.look;
  for (const button of lookList.querySelectorAll('[data-look]')) {
    button.setAttribute('aria-pressed', String(button === trigger));
  }
  renderLook(catalog.products.find(({ id }) => id === featuredId));
});

lookStage.addEventListener('click', (event) => {
  const product = catalog.products.find(({ id }) => id === featuredId);
  const shade = event.target.closest('[data-shade]');
  if (shade && shade.getAttribute('aria-pressed') === 'false') {
    selectedShades.set(product.id, shade.dataset.shade);
    renderLook(product);
    lookStage.querySelector('[aria-pressed="true"]').focus();
  }
  if (event.target.closest('[data-product]')) openProduct(product);
});

element('open-bag').addEventListener('click', openBag);
for (const dialog of [productDialog, bagDialog]) {
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]') || event.target === dialog) {
      if (dialog === bagDialog && submitting) return;
      dialog.close();
    }
  });
}
productDialog.addEventListener('close', () => {
  if (!bagDialog.open) lookStage.querySelector('[data-product]')?.focus({ preventScroll: true });
});
bagDialog.addEventListener('cancel', (event) => {
  if (submitting) event.preventDefault();
});
bagDialog.addEventListener('close', () => {
  if (stage === 'receipt') stage = 'cart';
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-quantity]');
  const index = Number(button?.dataset.line);
  const line = cart.map(getItem).filter(Boolean)[index];
  if (!line) return;
  const { productId, variantId, quantity } = line;
  const action = button.dataset.quantity;
  const next = { remove: 0, plus: quantity + 1, minus: quantity - 1 }[action];
  updateCart({ productId, variantId }, next);
  renderCart();
  const match = (candidate) => Number(candidate.dataset.line) === index && !candidate.disabled;
  const buttons = [...cartItems.querySelectorAll('[data-quantity]')];
  (buttons.find((candidate) => match(candidate) && candidate.dataset.quantity === action) ??
    buttons.find(match) ?? element('bag-title')).focus();
});

element('start-checkout').addEventListener('click', () => {
  showMessage('checkout-error');
  showStage('checkout');
});
element('back-to-cart').addEventListener('click', () => {
  if (!submitting) showStage('cart');
});
zoneSelect.addEventListener('change', renderCheckout);

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const zone = catalog?.zones.find(({ id }) => id === zoneSelect.value);
  if (!zone || !cart.length || submitting) return;
  const order = {
    ...Object.fromEntries(new FormData(checkoutForm)),
    lines: cart,
    expectedTotal: cartSubtotal() + zone.fee,
  };
  const content = JSON.stringify(order);
  if (request?.content !== content) request = { content, key: crypto.randomUUID() };
  submitting = true;
  submitOrder.disabled = true;
  submitOrder.textContent = 'جارٍ تسجيل الطلب…';
  showMessage('checkout-error');
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...order, key: request.key }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.code === 'out_of_stock' || result.code === 'price_changed') {
        await loadCatalog();
        showStage('cart');
        showMessage('cart-message', result.message);
      } else showMessage('checkout-error', result.message);
      return;
    }
    cart = [];
    persistCart();
    request = undefined;
    checkoutForm.reset();
    renderReceipt(result);
    showStage('receipt');
    loadCatalog().catch(() => {});
  } catch {
    showMessage('checkout-error', 'تعذّر الاتصال بالمتجر. حاول تأكيد الطلب مرة أخرى.');
  } finally {
    submitting = false;
    submitOrder.disabled = false;
    submitOrder.textContent = 'تأكيد الطلب التجريبي';
  }
});

persistCart();
loadCatalog().then(() => {
  if (bagDialog.open && stage === 'cart') renderCart();
}).catch(() => {
  showMessage('catalog-status', 'تعذّر تحميل التشكيلة. أعد تحميل الصفحة للمحاولة مرة أخرى.');
});
