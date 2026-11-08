import './coat-rack.css';

// Each cutout includes the wooden Coatshal hanger from the shop reference.
// Keep the hanger and garment together throughout the rail's movement.
export function mountCoatRack(container, product, { selectedColorId, onSelect, html, money, productUrl, icon }) {
  const colors = product.colors;
  let selected = Math.max(0, colors.findIndex(({ id }) => id === selectedColorId));
  let focused = false;
  let reversed = false;
  let pointerStart;
  let suppressClickUntil = 0;
  const events = new AbortController();
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  container.innerHTML = `
    <article class="coat-rack" aria-label="مشجب ${html(product.name)}">
      <div class="rack-scene" data-focused="false" data-reversed="false">
        <div class="rack-toolbar">
          <p class="rack-instruction"><span class="rack-desktop-hint">مرّر على قطعة، واضغط لتراها عن قرب</span><span class="rack-touch-hint">اسحب لتختار لونًا، واضغط لتقترب</span></p>
          <button class="rack-return" type="button" hidden>${icon('arrow')} العودة للمشجب</button>
          <button class="rack-flip" type="button" aria-pressed="false" hidden>
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a8 8 0 0 1 14-3l2 2M20 3v5h-5M20 15a8 8 0 0 1-14 3l-2-2M4 21v-5h5"/></svg>
            <span>الجهة الخلفية</span>
          </button>
        </div>
        <div class="rack-bar" aria-hidden="true"><img src="/images/classic-coat/rack/brass-rail.png" alt="" width="2048" height="680" loading="lazy" decoding="async"></div>
        <div class="rack-track" role="group" aria-label="ألوان الكوت على المشجب">
          ${colors.map((color, index) => `
            <button class="rack-item" type="button" data-rack-index="${index}"
              aria-label="معاينة ${html(product.name)} باللون ${html(color.name)}" aria-pressed="${index === selected}">
              <span class="rack-garment">
                <span class="rack-turn">
                  <span class="rack-face rack-front"><img src="${html(color.rackFront)}" data-fallback="${html(color.studioImage)}" alt="" width="1024" height="1024" loading="lazy" decoding="async" draggable="false"></span>
                  <span class="rack-face rack-back"><img data-src="${html(color.rackBack)}" alt="" width="1024" height="1024" draggable="false"></span>
                </span>
              </span>
              <span class="rack-color-label">${html(color.name)}</span>
            </button>`).join('')}
        </div>
        <div class="rack-navigation" role="group" aria-label="التنقل بين ألوان الكوت">
          <button class="icon-button rack-previous" type="button" aria-label="اللون السابق">${icon('arrow')}</button>
          <span class="rack-count" aria-hidden="true"></span>
          <button class="icon-button rack-next" type="button" aria-label="اللون التالي">${icon('arrow')}</button>
        </div>
      </div>
      <div class="rack-details">
        <div class="rack-product-title"><h3>${html(product.name)}</h3><p>أربع درجات. حضور تختاره.</p></div>
        <fieldset class="rack-shades">
          <legend>اللون <strong class="rack-selected-name"></strong></legend>
          <div class="swatches">${colors.map((color, index) => `
            <button class="swatch" type="button" data-rack-color="${index}" aria-label="${html(color.name)}" aria-pressed="${index === selected}">
              <svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="${html(color.swatch)}"/></svg>
            </button>`).join('')}</div>
        </fieldset>
        <div class="rack-purchase"><p class="look-price">${money(product.price)} <span>سعر تجريبي</span></p>
          <div class="rack-actions"><button class="button button-outline rack-open" type="button">عن قرب ${icon('plus')}</button>
          <a class="button button-dark rack-product-link" href="${html(productUrl(product, colors[selected].id))}">اختر المقاس ${icon('arrow')}</a></div>
        </div>
      </div>
      <p class="rack-disclosure">تصوّرات مولّدة للمعاينة، بما فيها الجهة الخلفية. راجع صورة المعرض في صفحة المنتج للتفاصيل الفعلية.</p>
      <p class="rack-status visually-hidden" role="status" aria-live="polite"></p>
    </article>`;

  const rack = container.querySelector('.coat-rack');
  const scene = rack.querySelector('.rack-scene');
  const track = rack.querySelector('.rack-track');
  const items = [...rack.querySelectorAll('.rack-item')];
  const swatches = [...rack.querySelectorAll('[data-rack-color]')];
  const returnButton = rack.querySelector('.rack-return');
  const flipButton = rack.querySelector('.rack-flip');
  const openButton = rack.querySelector('.rack-open');
  const instruction = rack.querySelector('.rack-instruction');
  const count = rack.querySelector('.rack-count');
  const status = rack.querySelector('.rack-status');
  const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: events.signal });

  function position() {
    const center = track.clientWidth / 2;
    const mobile = matchMedia('(max-width: 600px)').matches;
    const selectedItem = items[selected];
    track.style.setProperty('--rack-pan', mobile ? `${center - selectedItem.offsetLeft - selectedItem.offsetWidth / 2}px` : '0px');
    items.forEach((item, index) => {
      const offset = index - selected;
      const shift = focused && !mobile && index === selected ? center - item.offsetLeft - item.offsetWidth / 2 : 0;
      item.style.setProperty('--rack-shift', `${shift}px`);
      item.style.setProperty('--rack-yaw', `${offset === 0 ? 0 : offset < 0 ? -26 : 26}deg`);
      item.style.setProperty('--rack-nudge', `${offset === 0 ? 0 : offset < 0 ? 18 : -18}px`);
      item.style.zIndex = index === selected ? colors.length + 1 : colors.length - index;
      item.dataset.active = String(index === selected);
      item.setAttribute('aria-pressed', String(index === selected));
      // In the close view, only the centered garment is interactive.
      item.disabled = focused && index !== selected;
    });
  }

  function select(index, announce = true) {
    selected = (index + colors.length) % colors.length;
    const color = colors[selected];
    reversed = false;
    scene.dataset.reversed = 'false';
    flipButton.setAttribute('aria-pressed', 'false');
    flipButton.querySelector('span').textContent = 'الجهة الخلفية';
    rack.querySelector('.rack-selected-name').textContent = color.name;
    rack.querySelector('.rack-product-link').href = productUrl(product, color.id);
    count.textContent = `${selected + 1} / ${colors.length}`;
    swatches.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
    onSelect(color.id);
    position();
    if (announce) status.textContent = `${product.name}، ${color.name}`;
    if (focused) loadBack();
  }

  function loadBack() {
    const image = items[selected].querySelector('.rack-back img');
    if (!image.src && image.dataset.src) image.src = image.dataset.src;
    flipButton.disabled = !image.complete || image.naturalWidth === 0;
    flipButton.title = image.dataset.failed ? 'تعذّر تحميل الجهة الخلفية' : '';
  }

  function setFocused(value, keyboard = false) {
    focused = value;
    reversed = false;
    scene.dataset.focused = String(value);
    scene.dataset.reversed = 'false';
    instruction.hidden = value;
    returnButton.hidden = !value;
    flipButton.hidden = !value;
    openButton.hidden = value;
    flipButton.setAttribute('aria-pressed', 'false');
    flipButton.querySelector('span').textContent = 'الجهة الخلفية';
    position();
    if (value) loadBack();
    if (keyboard) (value ? returnButton : items[selected]).focus({ preventScroll: true });
    status.textContent = value ? `معاينة ${colors[selected].name} عن قرب، الجهة الأمامية` : 'العودة إلى المشجب';
  }

  items.forEach((item, index) => {
    listen(item, 'pointerenter', (event) => {
      if (finePointer.matches && event.pointerType === 'mouse' && !focused && selected !== index) select(index, false);
    });
    listen(item, 'focus', () => {
      if (!focused && selected !== index && item.matches(':focus-visible')) select(index);
    });
    listen(item, 'click', (event) => {
      if (performance.now() < suppressClickUntil) return;
      const alreadySelected = selected === index;
      select(index);
      if (alreadySelected || finePointer.matches || event.detail === 0) setFocused(true, event.detail === 0);
    });
    const front = item.querySelector('.rack-front img');
    listen(front, 'error', () => {
      if (front.dataset.fallback) {
        front.src = front.dataset.fallback;
        delete front.dataset.fallback;
        item.classList.add('rack-image-fallback');
      }
    });
    const back = item.querySelector('.rack-back img');
    listen(back, 'load', () => {
      if (index === selected) flipButton.disabled = false;
    });
    listen(back, 'error', () => {
      back.dataset.failed = 'true';
      if (index === selected) {
        flipButton.disabled = true;
        status.textContent = 'تعذّر تحميل الجهة الخلفية. يمكنك مشاهدة الواجهة أو فتح صفحة المنتج.';
      }
    });
  });
  swatches.forEach((button, index) => listen(button, 'click', () => select(index)));
  listen(openButton, 'click', () => setFocused(true, true));
  listen(returnButton, 'click', () => setFocused(false, true));
  listen(flipButton, 'click', () => {
    reversed = !reversed;
    scene.dataset.reversed = String(reversed);
    flipButton.setAttribute('aria-pressed', String(reversed));
    flipButton.querySelector('span').textContent = reversed ? 'الجهة الأمامية' : 'الجهة الخلفية';
    status.textContent = `${colors[selected].name}، ${reversed ? 'الجهة الخلفية، تصوّر مولّد' : 'الجهة الأمامية'}`;
  });
  listen(rack.querySelector('.rack-previous'), 'click', () => select(selected - 1));
  listen(rack.querySelector('.rack-next'), 'click', () => select(selected + 1));
  listen(rack, 'keydown', (event) => {
    if (event.key === 'Escape' && focused) {
      event.preventDefault();
      setFocused(false, true);
    } else if (event.target.closest('.rack-track') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      select(event.key === 'Home' ? 0 : event.key === 'End' ? colors.length - 1 : selected + (event.key === 'ArrowLeft' ? 1 : -1));
      items[selected].focus({ preventScroll: true });
    }
  });
  // Vertical gestures stay with the page; horizontal gestures browse the rack.
  listen(track, 'pointerdown', (event) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  listen(track, 'pointerup', (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = undefined;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      suppressClickUntil = performance.now() + 500;
      select(selected + (dx > 0 ? 1 : -1));
    }
  });
  listen(track, 'pointercancel', () => { pointerStart = undefined; });
  const resize = new ResizeObserver(position);
  resize.observe(track);
  select(selected, false);
  return () => { events.abort(); resize.disconnect(); };
}
