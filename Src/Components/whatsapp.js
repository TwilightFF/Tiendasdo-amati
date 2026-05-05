// ============================================================
// src/components/whatsapp.js
// Sistema de Integración con WhatsApp
//
// Responsabilidades:
//   - Botón flotante de WhatsApp con pulso animado
//   - Tooltip con mensaje de bienvenida
//   - Generación de links profundos con mensajes formateados
//   - Link por producto individual
//   - Link con todo el carrito (pedido completo)
//   - Configuración global del número de WhatsApp
// ============================================================

class WhatsAppComponent {
  /**
   * @param {string} number — Número con código de país. Ej: "50412345678"
   */
  constructor(number = '50412345678') {
    this.number  = number;
    this.floatEl = document.getElementById('wa-float');
    this._setup();
  }

  // ── Configurar el botón flotante ─────────────────────────
  _setup() {
    if (!this.floatEl) return;

    // Actualizar href con el número correcto
    this.floatEl.href = this.buildGeneralLink();
    this.floatEl.setAttribute('target', '_blank');
    this.floatEl.setAttribute('rel', 'noopener noreferrer');

    // Tooltip de bienvenida
    this._addTooltip();

    // Ocultar/mostrar según scroll (aparece después de 200px)
    this._setupScrollVisibility();
  }

  // ── Tooltip sobre el botón flotante ──────────────────────
  _addTooltip() {
    // Crear tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'wa-tooltip';
    tooltip.innerHTML = `
      <strong>¿Necesitas ayuda?</strong><br>
      Escríbenos por WhatsApp
    `;
    tooltip.style.cssText = `
      position:fixed;
      bottom:96px;
      left:28px;
      background:#25D366;
      color:white;
      padding:10px 14px;
      border-radius:10px;
      font-size:.82rem;
      font-family:'DM Sans',sans-serif;
      line-height:1.4;
      box-shadow:0 4px 16px rgba(0,0,0,.2);
      white-space:nowrap;
      z-index:799;
      opacity:0;
      transform:translateY(8px);
      transition:opacity .3s, transform .3s;
      pointer-events:none;
    `;
    // Flecha del tooltip
    tooltip.innerHTML += `
      <div style="
        position:absolute;bottom:-7px;left:16px;
        width:0;height:0;
        border-left:7px solid transparent;
        border-right:7px solid transparent;
        border-top:7px solid #25D366;
      "></div>`;
    document.body.appendChild(tooltip);

    // Mostrar tooltip al hacer hover
    this.floatEl.addEventListener('mouseenter', () => {
      tooltip.style.opacity   = '1';
      tooltip.style.transform = 'translateY(0)';
    });
    this.floatEl.addEventListener('mouseleave', () => {
      tooltip.style.opacity   = '0';
      tooltip.style.transform = 'translateY(8px)';
    });

    // En mobile: mostrar tooltip automáticamente después de 3s
    setTimeout(() => {
      if (window.innerWidth < 768) {
        tooltip.style.opacity   = '1';
        tooltip.style.transform = 'translateY(0)';
        setTimeout(() => {
          tooltip.style.opacity   = '0';
          tooltip.style.transform = 'translateY(8px)';
        }, 4000);
      }
    }, 3000);
  }

  // ── Visibilidad según scroll ─────────────────────────────
  _setupScrollVisibility() {
    // Mostrar el botón solo cuando el usuario haya scrolleado un poco
    const update = () => {
      const visible = window.scrollY > 100;
      this.floatEl.style.opacity   = visible ? '1' : '0';
      this.floatEl.style.transform = visible ? 'scale(1)' : 'scale(0.8)';
      this.floatEl.style.transition = 'opacity .3s, transform .3s';
      this.floatEl.style.pointerEvents = visible ? 'auto' : 'none';
    };
    window.addEventListener('scroll', update, { passive: true });
    update(); // estado inicial
  }

  // ── Generar link general (saludo) ────────────────────────
  buildGeneralLink() {
    const msg = '¡Hola! 👋 Vengo de la tienda Doña Mati y quisiera más información.';
    return `https://wa.me/${this.number}?text=${encodeURIComponent(msg)}`;
  }

  // ── Link para un producto específico ─────────────────────
  buildProductLink(product, quantity = 1) {
    const discount = product.original_price
      ? ` (Antes: L. ${Number(product.original_price).toFixed(2)})` : '';

    const msg = [
      `¡Hola! 👋 Quisiera información sobre este producto de *Tiendas Doña Mati*:`,
      ``,
      `🛍️ *${product.name}*`,
      `💰 Precio: *L. ${Number(product.price).toFixed(2)}*${discount}`,
      `📦 Cantidad deseada: *${quantity}*`,
      product.description ? `📝 ${product.description.slice(0, 80)}...` : '',
      ``,
      `¿Está disponible? ¿Cómo puedo comprarlo?`
    ].filter(Boolean).join('\n');

    const num = product.whatsapp_number || this.number;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  // ── Link con el carrito completo ─────────────────────────
  buildCartLink(cartItems) {
    if (!cartItems.length) return this.buildGeneralLink();

    const lines = cartItems.map(item =>
      `▪ ${item.name} x${item.quantity} — L. ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const msg = [
      `¡Hola! 👋 Quiero hacer el siguiente pedido en *Tiendas Doña Mati*:`,
      ``,
      lines,
      ``,
      `💰 *TOTAL: L. ${total.toFixed(2)}*`,
      ``,
      `¿Cómo procedo con el pago y la entrega?`
    ].join('\n');

    return `https://wa.me/${this.number}?text=${encodeURIComponent(msg)}`;
  }

  // ── Abrir WhatsApp directamente ───────────────────────────
  openForProduct(product, quantity = 1) {
    window.open(this.buildProductLink(product, quantity), '_blank', 'noopener,noreferrer');
  }

  openForCart(cartItems) {
    window.open(this.buildCartLink(cartItems), '_blank', 'noopener,noreferrer');
  }

  openGeneral() {
    window.open(this.buildGeneralLink(), '_blank', 'noopener,noreferrer');
  }
}

window.WhatsAppComponent = WhatsAppComponent;
