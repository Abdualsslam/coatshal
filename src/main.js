import './styles.css';

const element = (id) => document.getElementById(id);
const icon = (name) => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
const currency = new Intl.NumberFormat('ar-YE', { numberingSystem: 'latn' });
const money = (value) => '<bdi>' + currency.format(value) + ' ر.ي</bdi>';
const html = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const storageKey = 'coatshal-cart-v1';

const productRoute = /^\/products\/([^/]+)\/?$/.exec(location.pathname);
const productPage = element('product-page');
element('storefront').hidden = Boolean(productRoute);
productPage.hidden = !productRoute;
if (productRoute) {
  const skipLink = element('skip-link');
  skipLink.href = '#product-page';
  skipLink.textContent = 'انتقل إلى تفاصيل المنتج';
}
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
let galleryView;
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
  const name = html(color ? product.name + '، ' + color.name : 'صورة ' + product.name);
  const crop = color?.crop;
  const picture = crop && product.imageSize
    ? `<svg role="img" aria-label="${name}" viewBox="${html(crop.join(' '))}" width="${crop[2]}" height="${crop[3]}" preserveAspectRatio="xMidYMid slice">
        <image href="${html(product.image)}" width="${product.imageSize[0]}" height="${product.imageSize[1]}"/>
      </svg>`
    : `<img src="${html(product.image)}" alt="${name}">`;
  return `<div class="look-photo ${className}" data-tone="${html(color?.id ?? 'full')}">
    ${picture}
  </div>`;
}

function productUrl(product, colorId) {
  return '/products/' + encodeURIComponent(product.id) + (colorId ? '?color=' + encodeURIComponent(colorId) : '');
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
  if (productRoute) renderProductPage();
  else renderProducts();
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
  const shadeId = selectedShades.get(product.id);
  const color = colorOf(product, shadeId);
  const url = html(productUrl(product, shadeId));
  lookStage.innerHTML = `
    <article class="look-stage">
      <figure class="look-figure">
        <a class="look-media-link" href="${url}" aria-label="عرض ${html(product.name)}">${lookPhoto(product, color)}</a>
        <figcaption>من المِشجب <span>${html(color?.name ?? product.color)}</span></figcaption>
      </figure>
      <div class="look-copy">
        <h3>${html(product.name)}</h3>
        <p class="look-description">${html(product.description)}</p>
        ${shadePicker(product, color)}
        <p class="look-price">${money(product.price)} <span>سعر تجريبي</span></p>
        <a class="button button-dark full" href="${url}">
          عرض المنتج ${icon('arrow')}
        </a>
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

function renderProductPage() {
  const detail = element('product-detail');
  const product = catalog.products.find(({ id }) => id === productRoute[1]);
  if (!product) {
    showMessage('product-status', 'المنتج غير موجود.');
    return;
  }
  document.title = product.name + ' | كوتشال';
  showMessage('product-status');
  const requested = new URLSearchParams(location.search).get('color');
  let color = colorOf(product, requested);
  galleryView ??= color && color.id === requested ? requested : 'full';
  const gallery = product.colors?.length ? [null, ...product.colors] : [];
  detail.innerHTML = `
    <div class="product-layout">
      <div class="product-gallery">
        <figure class="product-cover" id="product-cover"></figure>
        ${gallery.length ? `<div class="gallery-strip" role="group" aria-label="صور المنتج">${gallery.map((shade) => {
          const label = shade?.name ?? 'الصورة الكاملة';
          return `<button type="button" data-gallery="${html(shade?.id ?? 'full')}" aria-pressed="false">
            <span class="gallery-thumb" aria-hidden="true">${lookPhoto(product, shade)}</span>
            <span>${html(label)}</span>
          </button>`;
        }).join('')}</div>` : ''}
        ${product.colors?.some((shade) => shade.crop) ? '<p class="gallery-note">لقطات الألوان مقرّبة من صورة المعرض الأصلية.</p>' : ''}
      </div>
      <div class="product-copy">
        <h1 id="product-title">${html(product.name)}</h1>
        <p class="product-description">${html(product.description)}</p>
        <p class="product-price"><strong>${money(product.price)}</strong><span>سعر تجريبي</span></p>
        <form>
          <div class="detail-colors">${shadePicker(product, color)}</div>
          <fieldset>
            <legend>اختر المقاس</legend>
            <div class="variant-list"></div>
          </fieldset>
          <p class="form-message" role="status" hidden></p>
          <button class="button button-dark full" type="submit"></button>
          <p class="gallery-note">المقاسات والتوفّر في هذه المعاينة تجريبيان.</p>
        </form>
      </div>
    </div>`;

  const form = detail.querySelector('form');
  const colors = form.querySelector('.detail-colors');
  const cover = detail.querySelector('#product-cover');
  function renderCover() {
    const shade = product.colors?.find(({ id }) => id === galleryView);
    const label = shade?.name ?? 'الصورة الكاملة';
    cover.innerHTML = lookPhoto(product, shade, 'cover-photo') +
      '<figcaption>من صور كوتشال <span>' + html(label) + '</span></figcaption>';
    for (const thumb of detail.querySelectorAll('[data-gallery]')) {
      thumb.setAttribute('aria-pressed', String(thumb.dataset.gallery === galleryView));
    }
  }

  function selectShade(id) {
    const shade = product.colors?.find((item) => item.id === id);
    if (!shade) return;
    galleryView = shade.id;
    if (color?.id !== shade.id) {
      color = shade;
      colors.innerHTML = shadePicker(product, color);
      renderSizes(form, product, color);
    }
    history.replaceState(history.state, '', productUrl(product, shade.id));
    renderCover();
  }

  renderSizes(form, product, color);
  renderCover();
  colors.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shade]');
    if (!button) return;
    selectShade(button.dataset.shade);
    colors.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
  });
  detail.querySelector('.gallery-strip')?.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-gallery]');
    if (!thumb) return;
    if (thumb.dataset.gallery === 'full') {
      galleryView = 'full';
      renderCover();
    } else selectShade(thumb.dataset.gallery);
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
    stage = 'cart';
    openBag();
  });
}

function cartSubtotal() {
  return cart.reduce((sum, line) => sum + (getItem(line)?.product.price ?? 0) * line.quantity, 0);
}

function renderCart() {
  const items = cart.map(getItem).filter(Boolean);
  element('cart-actions').hidden = items.length === 0;
  if (!items.length) {
    cartItems.innerHTML = catalog
      ? '<div class="empty"><p>سلتك فارغة.</p><a class="button button-outline" href="/#collection" data-close>تصفّح التشكيلة</a></div>'
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
    <a class="button button-outline" href="/#collection" data-close>العودة إلى التشكيلة</a>`;
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
});

element('open-bag').addEventListener('click', openBag);
bagDialog.addEventListener('click', (event) => {
  if (!submitting && (event.target.closest('[data-close]') || event.target === bagDialog)) bagDialog.close();
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
function refreshPage() {
  return loadCatalog().then(() => {
    if (bagDialog.open && stage === 'cart') renderCart();
  }).catch(() => {
    showMessage(productRoute ? 'product-status' : 'catalog-status', 'تعذّر التحميل. أعد تحميل الصفحة للمحاولة مرة أخرى.');
  });
}

window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  cart = readCart();
  persistCart();
  refreshPage();
});
refreshPage();
