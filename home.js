// ============================================================
// src/pages/home.js — Lógica completa de la tienda pública
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ─── State ──────────────────────────────────────────────
  let allProducts = [];
  let filteredProducts = [];
  let currentCategory = 'all';
  let searchDebounceTimer = null;

  // ─── Init ────────────────────────────────────────────────
  async function init() {
    setupNavbar();
    setupSearch();
    setupCart();
    await Promise.all([
      loadStats(),
      loadNewProducts(),
      loadCategories(),
      loadAllProducts(),
      loadNews()
    ]);
  }

  // ─── Navbar ──────────────────────────────────────────────
  function setupNavbar() {
    // Mobile hamburger
    const ham = document.getElementById('nav-hamburger');
    const mob = document.getElementById('nav-mobile');
    ham.addEventListener('click', () => mob.classList.toggle('open'));

    // Smooth scroll + active link
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href').slice(1);
        const el = document.getElementById(id);
        if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); mob.classList.remove('open'); }
      });
    });

    // Highlight active section on scroll
    const sections = ['inicio', 'nueva-mercaderia', 'catalogo', 'noticias', 'contacto'];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
          const link = document.querySelector(`.nav-menu a[href="#${entry.target.id}"]`);
          if (link) link.classList.add('active');
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
  }

  // ─── Stats ───────────────────────────────────────────────
  async function loadStats() {
    const stats = await DB.getProductStats();
    animateNumber('stat-total', stats.total);
    animateNumber('stat-new', stats.newItems);
    animateNumber('stat-cats', stats.categories);
  }

  function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.ceil(target / 30);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current + '+';
      if (current >= target) clearInterval(timer);
    }, 40);
  }

  // ─── New Products ────────────────────────────────────────
  async function loadNewProducts() {
    const products = await DB.getNewProducts();
    const grid = document.getElementById('new-products-grid');
    if (!products.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px;">Pronto tendremos nuevos productos 🛍️</p>';
      return;
    }
    grid.innerHTML = products.map(p => buildProductCard(p)).join('');
    attachProductEvents(grid);
  }

  // ─── Categories ──────────────────────────────────────────
  async function loadCategories() {
    const cats = await DB.getCategories();
    const filter = document.getElementById('category-filter');
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.cat = cat.slug;
      btn.textContent = `${cat.icon || '📦'} ${cat.name}`;
      filter.appendChild(btn);
    });

    filter.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.cat;
      filterAndRenderProducts();
    });
  }

  // ─── All Products ────────────────────────────────────────
  async function loadAllProducts() {
    allProducts = await DB.getAllProducts();
    filteredProducts = [...allProducts];
    renderCatalog(filteredProducts);
  }

  function filterAndRenderProducts() {
    const searchVal = document.getElementById('search-input')?.value?.toLowerCase() || '';
    filteredProducts = allProducts.filter(p => {
      const matchCat  = currentCategory === 'all' || p.category === currentCategory;
      const matchSearch = !searchVal || p.name.toLowerCase().includes(searchVal);
      return matchCat && matchSearch;
    });
    renderCatalog(filteredProducts);
  }

  function renderCatalog(products) {
    const grid  = document.getElementById('catalog-grid');
    const empty = document.getElementById('catalog-empty');
    if (!products.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = products.map(p => buildProductCard(p)).join('');
    attachProductEvents(grid);
  }

  // ─── Product Card builder ────────────────────────────────
  function buildProductCard(product) {
    const imgSrc = product.images?.[0] || '';
    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" alt="${escapeHtml(product.name)}" loading="lazy" />`
      : `<div class="product-img-placeholder">🛍️</div>`;

    const badges = [];
    if (product.is_new) badges.push(`<span class="badge badge-new">✨ Nuevo</span>`);
    if (product.is_featured) badges.push(`<span class="badge badge-featured">⭐ Destacado</span>`);

    const discount = product.original_price && product.original_price > product.price
      ? Math.round((1 - product.price / product.original_price) * 100) : 0;

    const priceHtml = `
      <div class="product-prices">
        <span class="product-price">L. ${Number(product.price).toFixed(2)}</span>
        ${product.original_price ? `<span class="product-original">L. ${Number(product.original_price).toFixed(2)}</span>` : ''}
        ${discount > 0 ? `<span class="product-discount">-${discount}%</span>` : ''}
      </div>`;

    const stockBadge = product.stock === 0
      ? `<span style="font-size:.72rem;color:var(--danger);font-weight:700;">Sin stock</span>`
      : product.stock <= 5
        ? `<span style="font-size:.72rem;color:var(--warning);font-weight:700;">Pocas unidades</span>`
        : '';

    return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-img-wrap">
        ${imgHtml}
        ${badges.join('')}
        <button class="product-wishlist" data-id="${product.id}" title="Favorito">🤍</button>
      </div>
      <div class="product-body">
        <div class="product-category">${escapeHtml(product.category || '')}</div>
        <div class="product-name">${escapeHtml(product.name)}</div>
        ${priceHtml}
        ${stockBadge}
      </div>
      <div class="product-footer">
        <button class="btn-add-cart ${product.stock === 0 ? 'disabled' : ''}"
          data-id="${product.id}"
          ${product.stock === 0 ? 'disabled title="Sin stock"' : ''}>
          ${product.stock === 0 ? 'Sin stock' : '🛒 Agregar'}
        </button>
        <a href="${DB.buildWhatsAppLink(product)}" target="_blank" class="btn-whatsapp" title="Preguntar por WhatsApp">
          💬
        </a>
      </div>
    </div>`;
  }

  function attachProductEvents(container) {
    container.querySelectorAll('.btn-add-cart:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const product = allProducts.find(p => p.id === id)
          || (window._newProducts || []).find(p => p.id === id);
        if (!product) return;
        DB.addToCart(product);
        showToast('✅ Producto agregado al carrito', 'success');
        updateCartUI();
        btn.textContent = '✓ Agregado';
        btn.style.background = '#2D7A4F';
        setTimeout(() => {
          btn.textContent = '🛒 Agregar';
          btn.style.background = '';
        }, 1500);
      });
    });
  }

  // ─── Search ──────────────────────────────────────────────
  function setupSearch() {
    const overlay = document.getElementById('search-overlay');
    const input   = document.getElementById('search-input');
    const results = document.getElementById('search-results');

    document.getElementById('btn-open-search').addEventListener('click', () => {
      overlay.classList.add('open');
      setTimeout(() => input.focus(), 100);
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') overlay.classList.remove('open');
    });

    input.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        const q = input.value.trim().toLowerCase();
        if (!q) { results.innerHTML = ''; return; }
        const matches = allProducts.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6);
        if (!matches.length) {
          results.innerHTML = '<p style="color:var(--text-muted);padding:12px;font-size:.9rem;">Sin resultados</p>';
          return;
        }
        results.innerHTML = matches.map(p => `
          <div class="search-result-item" data-id="${p.id}">
            ${p.images?.[0]
              ? `<img class="search-result-img" src="${p.images[0]}" alt="${escapeHtml(p.name)}">`
              : `<div class="search-result-img" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;">🛍️</div>`}
            <div>
              <div class="search-result-name">${escapeHtml(p.name)}</div>
              <div class="search-result-price">L. ${Number(p.price).toFixed(2)}</div>
            </div>
          </div>`).join('');

        results.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => {
            const p = allProducts.find(x => x.id === item.dataset.id);
            if (p) { DB.addToCart(p); showToast('✅ Producto agregado', 'success'); updateCartUI(); }
            overlay.classList.remove('open');
            input.value = '';
          });
        });
      }, 280);
    });
  }

  // ─── Cart ────────────────────────────────────────────────
  function setupCart() {
    const overlay = document.getElementById('cart-overlay');
    const drawer  = document.getElementById('cart-drawer');

    document.getElementById('btn-open-cart').addEventListener('click', () => {
      overlay.classList.add('open'); drawer.classList.add('open');
      renderCartItems();
    });
    document.getElementById('btn-close-cart').addEventListener('click', closeCart);
    overlay.addEventListener('click', closeCart);

    document.getElementById('btn-checkout-wa').addEventListener('click', () => {
      const items = DB.getCart();
      if (!items.length) return;
      const link = DB.buildCartWhatsAppLink(items);
      window.open(link, '_blank');
    });

    window.addEventListener('cartUpdated', updateCartUI);
    updateCartUI();
  }

  function closeCart() {
    document.getElementById('cart-overlay').classList.remove('open');
    document.getElementById('cart-drawer').classList.remove('open');
  }

  function updateCartUI() {
    const count = DB.getCartCount();
    const badge = document.getElementById('cart-badge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function renderCartItems() {
    const items  = DB.getCart();
    const container = document.getElementById('cart-items');
    const footer = document.getElementById('cart-footer');

    if (!items.length) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🛒</div>
          <p><strong>Tu carrito está vacío</strong></p>
          <p style="font-size:.85rem;">Agrega productos para comenzar</p>
        </div>`;
      footer.style.display = 'none';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        ${item.image
          ? `<img class="cart-item-img" src="${item.image}" alt="${escapeHtml(item.name)}">`
          : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🛍️</div>`}
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-price">L. ${(item.price * item.quantity).toFixed(2)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="btn-remove-item" data-id="${item.id}" title="Eliminar">🗑️</button>
      </div>`).join('');

    // Qty controls
    container.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = DB.getCart().find(i => i.id === id);
        if (!item) return;
        const newQty = btn.dataset.action === 'inc' ? item.quantity + 1 : item.quantity - 1;
        if (newQty < 1) DB.removeFromCart(id); else DB.updateCartQty(id, newQty);
        renderCartItems();
        updateCartUI();
      });
    });
    container.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        DB.removeFromCart(btn.dataset.id);
        renderCartItems(); updateCartUI();
      });
    });

    footer.style.display = 'block';
    document.getElementById('cart-total').textContent = `L. ${DB.getCartTotal().toFixed(2)}`;
  }

  // ─── News ────────────────────────────────────────────────
  async function loadNews() {
    const newsList = await DB.getPublishedNews();
    const grid  = document.getElementById('news-grid');
    const empty = document.getElementById('news-empty');

    if (!newsList.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    grid.innerHTML = newsList.map(n => {
      const date = new Date(n.created_at).toLocaleDateString('es-HN', { year:'numeric', month:'long', day:'numeric' });
      return `
      <div class="news-card">
        <div class="news-img">
          ${n.image_url ? `<img src="${n.image_url}" alt="${escapeHtml(n.title)}" loading="lazy">` : '📢'}
        </div>
        <div class="news-body">
          <div class="news-date">📅 ${date}</div>
          <div class="news-title">${escapeHtml(n.title)}</div>
          <div class="news-excerpt">${escapeHtml(n.content || '')}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ─── Utilities ───────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.remove(), 300); }, 3000);
  }

  // ─── Start ───────────────────────────────────────────────
  init();
});
