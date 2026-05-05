// ============================================================
// src/components/cart.js
// Componente del Carrito de Compras
//
// Responsabilidades:
//   - Abrir/cerrar el drawer lateral del carrito
//   - Renderizar ítems, cantidades y totales
//   - Controles de cantidad (+ / -)
//   - Eliminar ítems individuales
//   - Vaciar carrito completo
//   - Sincronización con localStorage via DB
//   - Botón "Pedir por WhatsApp" con mensaje formateado
//   - Badge en navbar actualizado en tiempo real
// ============================================================

class CartComponent {
  constructor() {
    // Elementos del DOM
    this.overlay    = document.getElementById('cart-overlay');
    this.drawer     = document.getElementById('cart-drawer');
    this.itemsWrap  = document.getElementById('cart-items');
    this.footer     = document.getElementById('cart-footer');
    this.totalEl    = document.getElementById('cart-total');
    this.badgeEl    = document.getElementById('cart-badge');

    this.isOpen = false;

    this._setupTriggers();
    this._setupCheckout();
    this._listenCartEvents();
    this.updateBadge();
  }

  // ── Abrir drawer ─────────────────────────────────────────
  open() {
    this.overlay.classList.add('open');
    this.drawer.classList.add('open');
    document.body.style.overflow = 'hidden'; // evitar scroll del fondo
    this.isOpen = true;
    this.render();
  }

  // ── Cerrar drawer ────────────────────────────────────────
  close() {
    this.overlay.classList.remove('open');
    this.drawer.classList.remove('open');
    document.body.style.overflow = '';
    this.isOpen = false;
  }

  // ── Renderizar lista de ítems ────────────────────────────
  render() {
    const items = DB.getCart();

    if (!items.length) {
      this._renderEmpty();
      if (this.footer) this.footer.style.display = 'none';
      return;
    }

    // Ítems
    this.itemsWrap.innerHTML = items.map(item => this._buildItemHtml(item)).join('');

    // Total
    if (this.footer) this.footer.style.display = 'block';
    if (this.totalEl) this.totalEl.textContent = `L. ${DB.getCartTotal().toFixed(2)}`;

    // Eventos de controles
    this._attachItemEvents();
  }

  // ── Badge del ícono de carrito en la navbar ──────────────
  updateBadge() {
    if (!this.badgeEl) return;
    const count = DB.getCartCount();
    this.badgeEl.textContent = count;
    this.badgeEl.style.display = count > 0 ? 'flex' : 'none';

    // Animación rápida de "bounce" al agregar
    if (count > 0) {
      this.badgeEl.style.transform = 'scale(1.4)';
      setTimeout(() => this.badgeEl.style.transform = 'scale(1)', 200);
    }
  }

  // ── HTML de un ítem ──────────────────────────────────────
  _buildItemHtml(item) {
    const imgHtml = item.image
      ? `<img class="cart-item-img" src="${item.image}" alt="${_esc(item.name)}">`
      : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:var(--primary-lt);">🛍️</div>`;

    return `
    <div class="cart-item" data-id="${item.id}">
      ${imgHtml}
      <div class="cart-item-info">
        <div class="cart-item-name">${_esc(item.name)}</div>
        <div class="cart-item-price">L. ${(item.price * item.quantity).toFixed(2)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn btn-qty-dec" data-id="${item.id}" title="Reducir">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn btn-qty-inc" data-id="${item.id}" title="Aumentar">+</button>
        </div>
      </div>
      <button class="btn-remove-item" data-id="${item.id}" title="Eliminar producto">🗑️</button>
    </div>`;
  }

  // ── Estado vacío ─────────────────────────────────────────
  _renderEmpty() {
    this.itemsWrap.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p><strong>Tu carrito está vacío</strong></p>
        <p style="font-size:.85rem;margin-top:6px;">Agrega productos para comenzar tu pedido</p>
        <button
          onclick="window.cartComponent?.close()"
          style="margin-top:16px;padding:10px 22px;background:var(--accent);color:white;border:none;border-radius:9px;font-weight:700;cursor:pointer;">
          Ver Productos
        </button>
      </div>`;
  }

  // ── Eventos de ítems (qty +/-, eliminar) ─────────────────
  _attachItemEvents() {
    // Aumentar cantidad
    this.itemsWrap.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = DB.getCart().find(i => i.id === btn.dataset.id);
        if (item) DB.updateCartQty(item.id, item.quantity + 1);
        this.render();
      });
    });

    // Reducir cantidad
    this.itemsWrap.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = DB.getCart().find(i => i.id === btn.dataset.id);
        if (!item) return;
        if (item.quantity <= 1) {
          DB.removeFromCart(item.id);
        } else {
          DB.updateCartQty(item.id, item.quantity - 1);
        }
        this.render();
      });
    });

    // Eliminar ítem
    this.itemsWrap.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        DB.removeFromCart(btn.dataset.id);
        this.render();
        // Feedback con animación de la fila
        const row = this.itemsWrap.querySelector(`[data-id="${btn.dataset.id}"]`);
        if (row) row.style.transition = 'opacity .3s';
      });
    });
  }

  // ── Botón "Pedir por WhatsApp" ────────────────────────────
  _setupCheckout() {
    const btn = document.getElementById('btn-checkout-wa');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const items = DB.getCart();
      if (!items.length) return;
      const link = DB.buildCartWhatsAppLink(items);
      window.open(link, '_blank', 'noopener,noreferrer');
    });
  }

  // ── Abrir/cerrar desde botones del DOM ───────────────────
  _setupTriggers() {
    // Botón abrir en navbar
    document.getElementById('btn-open-cart')
      ?.addEventListener('click', () => this.open());

    // Botón cerrar dentro del drawer
    document.getElementById('btn-close-cart')
      ?.addEventListener('click', () => this.close());

    // Click en el overlay oscuro
    this.overlay?.addEventListener('click', () => this.close());

    // Tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  // ── Escuchar evento global cartUpdated ───────────────────
  _listenCartEvents() {
    window.addEventListener('cartUpdated', () => {
      this.updateBadge();
      if (this.isOpen) this.render(); // actualizar si está abierto
    });
  }
}

window.CartComponent = CartComponent;
