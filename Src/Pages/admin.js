// ============================================================
// src/pages/admin.js — Lógica completa del Dashboard Admin
// ============================================================

// ⚠️ CAMBIAR ESTA CONTRASEÑA antes de subir a producción
const ADMIN_PASSWORD = 'donamati2025';

document.addEventListener('DOMContentLoaded', () => {

  // ─── Login ───────────────────────────────────────────────
  const loginScreen = document.getElementById('login-screen');
  const adminApp    = document.getElementById('admin-app');

  // Check session
  if (sessionStorage.getItem('admin_auth') === 'true') {
    showApp();
  }

  document.getElementById('btn-login').addEventListener('click', handleLogin);
  document.getElementById('login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  function handleLogin() {
    const pass = document.getElementById('login-pass').value;
    const err  = document.getElementById('login-error');
    if (pass === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      err.style.display = 'none';
      showApp();
    } else {
      err.style.display = 'block';
      document.getElementById('login-pass').value = '';
      document.getElementById('login-pass').focus();
    }
  }

  function showApp() {
    loginScreen.style.display = 'none';
    adminApp.classList.add('visible');
    initAdmin();
  }

  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('admin_auth');
    location.reload();
  });

  // ─── Navigation ──────────────────────────────────────────
  let currentPage = 'dashboard';
  const pageLoaders = {
    dashboard:   loadDashboard,
    products:    loadProducts,
    'new-product': () => setupProductForm(),
    news:        loadNews,
    categories:  loadCategories,
  };

  function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
    // Show target
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');
    // Update sidebar
    document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
    // Update topbar title
    const titles = { dashboard:'Dashboard', products:'Productos', 'new-product':'Nuevo Producto', news:'Noticias', categories:'Categorías' };
    document.getElementById('topbar-title').textContent = titles[page] || page;
    currentPage = page;
    // Load page data
    pageLoaders[page]?.();
  }

  // Sidebar navigation
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // ─── Init ────────────────────────────────────────────────
  async function initAdmin() {
    await loadCategoryOptions(); // pre-load categories for select
    navigateTo('dashboard');
  }

  // ─── DASHBOARD ───────────────────────────────────────────
  async function loadDashboard() {
    const stats = await DB.getProductStats();
    document.getElementById('d-total').textContent = stats.total;
    document.getElementById('d-new').textContent   = stats.newItems;
    document.getElementById('d-cats').textContent  = stats.categories;
    document.getElementById('d-low').textContent   = stats.lowStock;
  }

  // ─── PRODUCTS LIST ───────────────────────────────────────
  let allAdminProducts = [];

  async function loadProducts() {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">Cargando...</td></tr>';
    allAdminProducts = await DB.getAllProducts();
    renderProductsTable(allAdminProducts);

    // Search
    const searchInput = document.getElementById('products-search');
    searchInput.oninput = () => {
      const q = searchInput.value.toLowerCase();
      const filtered = allAdminProducts.filter(p => p.name.toLowerCase().includes(q));
      renderProductsTable(filtered);
    };
  }

  function renderProductsTable(products) {
    const tbody = document.getElementById('products-tbody');
    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">Sin productos</td></tr>';
      return;
    }
    tbody.innerHTML = products.map(p => {
      const stockClass = p.stock === 0 ? 'stock-out' : p.stock <= 5 ? 'stock-low' : 'stock-ok';
      const stockLabel = p.stock === 0 ? 'Sin stock' : p.stock <= 5 ? `⚠️ ${p.stock}` : `✅ ${p.stock}`;
      return `
      <tr>
        <td>
          ${p.images?.[0]
            ? `<img class="td-img" src="${p.images[0]}" alt="${escHtml(p.name)}">`
            : `<div class="td-img" style="display:flex;align-items:center;justify-content:center;background:var(--primary-lt);font-size:1.3rem;">🛍️</div>`}
        </td>
        <td><div class="td-name">${escHtml(p.name)}</div></td>
        <td><span style="font-size:.85rem;">${escHtml(p.category || '—')}</span></td>
        <td class="td-price">L. ${Number(p.price).toFixed(2)}</td>
        <td><span class="td-badge ${stockClass}">${stockLabel}</span></td>
        <td>
          ${p.is_new ? '<span class="td-badge new">✨ Nuevo</span>' : '<span style="color:var(--text-muted);font-size:.85rem;">—</span>'}
        </td>
        <td>
          <div class="td-actions">
            <button class="btn-tbl btn-tbl-edit" data-edit="${p.id}">✏️ Editar</button>
            <button class="btn-tbl btn-tbl-del" data-del="${p.id}">🗑️ Eliminar</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Edit
    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = allAdminProducts.find(x => x.id === btn.dataset.edit);
        if (p) openEditProduct(p);
      });
    });
    // Delete
    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
        try {
          await DB.deleteProduct(btn.dataset.del);
          showAdminToast('✅ Producto eliminado', 'success');
          loadProducts();
        } catch (e) { showAdminToast('❌ Error al eliminar', 'error'); }
      });
    });
  }

  // ─── PRODUCT FORM ─────────────────────────────────────────
  let pendingImages = [];   // { file, url } nuevas a subir
  let existingImages = [];  // URLs ya guardadas en Supabase
  let editingProductId = null;

  async function loadCategoryOptions() {
    const cats = await DB.getCategories();
    const select = document.getElementById('pf-category');
    select.innerHTML = '<option value="">-- Seleccionar categoría --</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.slug;
      opt.textContent = `${c.icon || '📦'} ${c.name}`;
      select.appendChild(opt);
    });
  }

  function setupProductForm(product = null) {
    editingProductId = product?.id || null;
    pendingImages = [];
    existingImages = product?.images || [];

    document.getElementById('product-form-title').textContent = product ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('btn-save-text').textContent = product ? '💾 Guardar Cambios' : '💾 Guardar Producto';

    // Fill fields
    const get = id => document.getElementById(id);
    get('pf-id').value           = product?.id || '';
    get('pf-name').value         = product?.name || '';
    get('pf-description').value  = product?.description || '';
    get('pf-price').value        = product?.price || '';
    get('pf-original-price').value = product?.original_price || '';
    get('pf-category').value     = product?.category || '';
    get('pf-stock').value        = product?.stock || 0;
    get('pf-whatsapp').value     = product?.whatsapp_number || '';
    get('pf-is-new').checked     = product?.is_new || false;
    get('pf-is-featured').checked= product?.is_featured || false;

    renderImagePreviews();
    loadCategoryOptions();
  }

  function openEditProduct(product) {
    setupProductForm(product);
    navigateTo('new-product');
  }

  // Image upload area
  const dropArea = document.getElementById('img-drop-area');
  const fileInput = document.getElementById('pf-images');

  dropArea.addEventListener('click', () => fileInput.click());
  dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
  dropArea.addEventListener('drop', e => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    handleImageFiles(Array.from(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', () => handleImageFiles(Array.from(fileInput.files)));

  function handleImageFiles(files) {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
    files.forEach(file => {
      if (!allowed.includes(file.type)) { showAdminToast('Solo imágenes PNG, JPG, WebP', 'error'); return; }
      if (file.size > 5 * 1024 * 1024) { showAdminToast('Imagen muy grande (máx 5MB)', 'error'); return; }
      if (pendingImages.length + existingImages.length >= 6) { showAdminToast('Máximo 6 imágenes', 'error'); return; }
      const url = URL.createObjectURL(file);
      pendingImages.push({ file, url });
    });
    renderImagePreviews();
    fileInput.value = '';
  }

  function renderImagePreviews() {
    const container = document.getElementById('img-previews');
    const all = [
      ...existingImages.map(url => ({ url, isExisting: true })),
      ...pendingImages.map(({ url }) => ({ url, isExisting: false }))
    ];
    container.innerHTML = all.map((item, i) => `
      <div class="img-preview-item">
        <img src="${item.url}" alt="Preview ${i+1}" />
        <button class="img-preview-remove" data-index="${i}" data-existing="${item.isExisting}">✕</button>
      </div>`).join('');

    container.querySelectorAll('.img-preview-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const isExisting = btn.dataset.existing === 'true';
        if (isExisting) {
          existingImages.splice(idx, 1);
        } else {
          const pendingIdx = idx - existingImages.length;
          pendingImages.splice(pendingIdx, 1);
        }
        renderImagePreviews();
      });
    });
  }

  // Form submit
  document.getElementById('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    const saveBtn  = document.getElementById('btn-save-product');
    const saveText = document.getElementById('btn-save-text');

    // Validate
    const name  = document.getElementById('pf-name').value.trim();
    const price = parseFloat(document.getElementById('pf-price').value);
    const cat   = document.getElementById('pf-category').value;
    const stock = parseInt(document.getElementById('pf-stock').value);

    if (!name)       { showAdminToast('❌ El nombre es obligatorio', 'error'); return; }
    if (isNaN(price) || price < 0) { showAdminToast('❌ Precio inválido', 'error'); return; }
    if (!cat)        { showAdminToast('❌ Selecciona una categoría', 'error'); return; }

    saveBtn.disabled = true;
    saveText.textContent = '⏳ Guardando...';

    try {
      // Upload new images
      let uploadedUrls = [...existingImages];
      const tempId = editingProductId || crypto.randomUUID();

      for (const { file } of pendingImages) {
        showAdminToast('📸 Subiendo imagen...', 'info');
        const url = await DB.uploadProductImage(file, tempId);
        uploadedUrls.push(url);
      }

      const data = {
        name,
        description: document.getElementById('pf-description').value.trim(),
        price,
        original_price: parseFloat(document.getElementById('pf-original-price').value) || null,
        category: cat,
        stock,
        whatsapp_number: document.getElementById('pf-whatsapp').value.trim() || null,
        is_new:      document.getElementById('pf-is-new').checked,
        is_featured: document.getElementById('pf-is-featured').checked,
        images:      uploadedUrls,
      };

      if (editingProductId) {
        await DB.updateProduct(editingProductId, data);
        showAdminToast('✅ Producto actualizado correctamente', 'success');
      } else {
        await DB.createProduct(data);
        showAdminToast('✅ Producto creado correctamente', 'success');
      }

      // Reset form and go to list
      editingProductId = null;
      pendingImages = [];
      existingImages = [];
      document.getElementById('product-form').reset();
      document.getElementById('img-previews').innerHTML = '';
      navigateTo('products');

    } catch (err) {
      console.error(err);
      showAdminToast('❌ Error al guardar: ' + (err.message || 'desconocido'), 'error');
    } finally {
      saveBtn.disabled = false;
      saveText.textContent = editingProductId ? '💾 Guardar Cambios' : '💾 Guardar Producto';
    }
  });

  document.getElementById('btn-cancel-product').addEventListener('click', () => {
    navigateTo('products');
  });

  // ─── NEWS ─────────────────────────────────────────────────
  async function loadNews() {
    const tbody = document.getElementById('news-tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;">Cargando...</td></tr>';
    const news = await DB.getAllNews();
    if (!news.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);">Sin noticias</td></tr>';
      return;
    }
    tbody.innerHTML = news.map(n => {
      const date = new Date(n.created_at).toLocaleDateString('es-HN');
      return `
      <tr>
        <td><strong>${escHtml(n.title)}</strong></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(n.content || '—')}</td>
        <td><span class="td-badge ${n.published ? 'pub' : ''}">${n.published ? '✅ Publicado' : '📝 Borrador'}</span></td>
        <td style="font-size:.85rem;color:var(--text-muted);">${date}</td>
        <td>
          <button class="btn-tbl btn-tbl-del" data-del="${n.id}">🗑️ Eliminar</button>
        </td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta noticia?')) return;
        await DB.deleteNews(btn.dataset.del);
        showAdminToast('✅ Noticia eliminada', 'success');
        loadNews();
      });
    });
  }

  // News modal
  const modalOverlay = document.getElementById('modal-overlay');
  document.getElementById('btn-new-news').addEventListener('click', () => {
    modalOverlay.classList.add('open');
  });
  document.getElementById('btn-close-modal').addEventListener('click', () => modalOverlay.classList.remove('open'));
  document.getElementById('btn-cancel-news').addEventListener('click', () => modalOverlay.classList.remove('open'));
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });

  document.getElementById('btn-save-news').addEventListener('click', async () => {
    const title   = document.getElementById('nf-title').value.trim();
    const content = document.getElementById('nf-content').value.trim();
    const image   = document.getElementById('nf-image').value.trim();
    const pub     = document.getElementById('nf-published').checked;
    if (!title) { showAdminToast('❌ El título es obligatorio', 'error'); return; }
    try {
      await DB.createNews({ title, content, image_url: image || null, published: pub });
      showAdminToast('✅ Noticia publicada', 'success');
      modalOverlay.classList.remove('open');
      document.getElementById('nf-title').value = '';
      document.getElementById('nf-content').value = '';
      document.getElementById('nf-image').value = '';
      loadNews();
    } catch(e) { showAdminToast('❌ Error al guardar noticia', 'error'); }
  });

  // ─── CATEGORIES ───────────────────────────────────────────
  async function loadCategories() {
    const tbody = document.getElementById('cats-tbody');
    const cats  = await DB.getCategories();
    if (!cats.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted);">Sin categorías</td></tr>';
      return;
    }
    tbody.innerHTML = cats.map(c => `
      <tr>
        <td style="font-size:1.5rem;">${c.icon || '📦'}</td>
        <td><strong>${escHtml(c.name)}</strong></td>
        <td style="font-size:.85rem;color:var(--text-muted);">${escHtml(c.slug)}</td>
        <td>—</td>
      </tr>`).join('');
  }

  document.getElementById('btn-add-cat').addEventListener('click', async () => {
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon').value.trim() || '📦';
    if (!name) { showAdminToast('❌ El nombre es obligatorio', 'error'); return; }
    try {
      await DB.createCategory(name, icon);
      document.getElementById('cat-name').value = '';
      document.getElementById('cat-icon').value = '';
      showAdminToast('✅ Categoría creada', 'success');
      loadCategories();
      loadCategoryOptions();
    } catch(e) {
      showAdminToast('❌ Error: ' + (e.message || 'ya existe?'), 'error');
    }
  });

  // ─── Utilities ────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function showAdminToast(msg, type = 'info') {
    const container = document.getElementById('admin-toast');
    const t = document.createElement('div');
    t.className = `a-toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translateX(120%)';
      t.style.transition = '.3s';
      setTimeout(() => t.remove(), 320);
    }, 3500);
  }
});
