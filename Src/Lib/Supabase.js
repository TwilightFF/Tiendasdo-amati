// ============================================================
// src/lib/supabase.js
// Configuración de Supabase + todas las funciones de BD
// ============================================================

// ⚠️ REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO SUPABASE
const SUPABASE_URL = 'https://gpaqcrqamcxuwukzdthd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VwxpN_l2JBQisvyDGKt8IQ_gvOYAnx0';

// Número de WhatsApp con código de país (Honduras = 504)
const WHATSAPP_NUMBER = '+50492880378';

// ─────────────────────────────────────────────
// Cliente Supabase (usando CDN, sin npm)
// ─────────────────────────────────────────────
let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

// ─────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────

async function getAllProducts(filters = {}) {
  const db = getSupabase();
  let query = db.from('products').select('*').order('created_at', { ascending: false });

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters.isNew) {
    query = query.eq('is_new', true);
  }
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) { console.error('Error fetching products:', error); return []; }
  return data || [];
}

async function getFeaturedProducts() {
  const db = getSupabase();
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(8);
  if (error) { console.error(error); return []; }
  return data || [];
}

async function getNewProducts() {
  const db = getSupabase();
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) { console.error(error); return []; }
  return data || [];
}

async function createProduct(productData) {
  const db = getSupabase();
  const { data, error } = await db
    .from('products')
    .insert([{ ...productData, updated_at: new Date().toISOString() }])
    .select();
  if (error) throw error;
  return data[0];
}

async function updateProduct(id, productData) {
  const db = getSupabase();
  const { data, error } = await db
    .from('products')
    .update({ ...productData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
}

async function deleteProduct(id) {
  const db = getSupabase();
  const { error } = await db.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function getProductStats() {
  const db = getSupabase();
  const { data, error } = await db.from('products').select('id, is_new, category, stock');
  if (error) return { total: 0, newItems: 0, lowStock: 0, categories: 0 };
  const cats = [...new Set(data.map(p => p.category))];
  return {
    total: data.length,
    newItems: data.filter(p => p.is_new).length,
    lowStock: data.filter(p => p.stock <= 5).length,
    categories: cats.length
  };
}

// ─────────────────────────────────────────────
// CATEGORÍAS
// ─────────────────────────────────────────────

async function getCategories() {
  const db = getSupabase();
  const { data, error } = await db.from('categories').select('*').order('name');
  if (error) { console.error(error); return []; }
  return data || [];
}

async function createCategory(name, icon = '📦') {
  const db = getSupabase();
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { data, error } = await db.from('categories').insert([{ name, slug, icon }]).select();
  if (error) throw error;
  return data[0];
}

// ─────────────────────────────────────────────
// NOTICIAS
// ─────────────────────────────────────────────

async function getPublishedNews() {
  const db = getSupabase();
  const { data, error } = await db
    .from('news')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(6);
  if (error) { console.error(error); return []; }
  return data || [];
}

async function getAllNews() {
  const db = getSupabase();
  const { data, error } = await db.from('news').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

async function createNews(newsData) {
  const db = getSupabase();
  const { data, error } = await db.from('news').insert([newsData]).select();
  if (error) throw error;
  return data[0];
}

async function deleteNews(id) {
  const db = getSupabase();
  const { error } = await db.from('news').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// STORAGE (Imágenes)
// ─────────────────────────────────────────────

async function uploadProductImage(file, productId) {
  const db = getSupabase();
  const ext = file.name.split('.').pop();
  const fileName = `${productId}_${Date.now()}.${ext}`;
  const filePath = `products/${fileName}`;

  const { error } = await db.storage
    .from('products')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: urlData } = db.storage.from('products').getPublicUrl(filePath);
  return urlData.publicUrl;
}

async function deleteProductImage(imageUrl) {
  const db = getSupabase();
  // Extraer el path desde la URL pública
  const path = imageUrl.split('/storage/v1/object/public/products/')[1];
  if (!path) return;
  await db.storage.from('products').remove([`products/${path}`]);
}

// ─────────────────────────────────────────────
// WHATSAPP
// ─────────────────────────────────────────────

function buildWhatsAppLink(product, quantity = 1) {
  const number = product.whatsapp_number || WHATSAPP_NUMBER;
  const discount = product.original_price
    ? ` (Antes: L. ${product.original_price.toFixed(2)})`
    : '';
  const message = [
    `¡Hola! 👋 Me interesa este producto de *Tiendas Doña Mati*:`,
    ``,
    `🛍️ *${product.name}*`,
    `💰 Precio: *L. ${product.price.toFixed(2)}*${discount}`,
    `📦 Cantidad: ${quantity}`,
    ``,
    `¿Podría darme más información?`
  ].join('\n');

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function buildCartWhatsAppLink(cartItems) {
  const number = WHATSAPP_NUMBER;
  const itemLines = cartItems.map(item =>
    `▪ ${item.name} x${item.quantity} = L. ${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');
  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const message = [
    `¡Hola! 👋 Quisiera hacer un pedido en *Tiendas Doña Mati*:`,
    ``,
    itemLines,
    ``,
    `💰 *Total: L. ${total.toFixed(2)}*`,
    ``,
    `¿Cómo procedo con el pago y entrega?`
  ].join('\n');

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ─────────────────────────────────────────────
// CART (localStorage)
// ─────────────────────────────────────────────

const CART_KEY = 'dona_mati_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items } }));
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      quantity
    });
  }
  saveCart(cart);
  return cart;
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
  return cart;
}

function updateCartQty(productId, quantity) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) item.quantity = Math.max(1, quantity);
  saveCart(cart);
  return cart;
}

function clearCart() {
  saveCart([]);
}

function getCartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

// Exportar todo al objeto global
window.DB = {
  getAllProducts, getFeaturedProducts, getNewProducts,
  createProduct, updateProduct, deleteProduct, getProductStats,
  getCategories, createCategory,
  getPublishedNews, getAllNews, createNews, deleteNews,
  uploadProductImage, deleteProductImage,
  buildWhatsAppLink, buildCartWhatsAppLink,
  getCart, addToCart, removeFromCart, updateCartQty, clearCart,
  getCartTotal, getCartCount
};
