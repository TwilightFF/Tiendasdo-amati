// ============================================================
// src/components/navbar.js
// Componente de Barra de Navegación
//
// Responsabilidades:
//   - Menú desktop y mobile (hamburger)
//   - Resaltado de sección activa al hacer scroll
//   - Botón de búsqueda (abre search overlay)
//   - Botón del carrito con badge de cantidad
//   - Scroll suave a secciones al hacer click
// ============================================================

class Navbar {
  constructor() {
    this.navMenu    = document.getElementById('nav-menu');
    this.navMobile  = document.getElementById('nav-mobile');
    this.hamburger  = document.getElementById('nav-hamburger');
    this.cartBadge  = document.getElementById('cart-badge');
    this.btnCart    = document.getElementById('btn-open-cart');
    this.btnSearch  = document.getElementById('btn-open-search');

    // Secciones a observar para el highlight del nav
    this.sections = ['inicio', 'nueva-mercaderia', 'catalogo', 'noticias', 'contacto'];

    this.init();
  }

  init() {
    this._setupMobileMenu();
    this._setupSmoothScroll();
    this._setupScrollSpy();
    this._setupCartBadgeListener();
  }

  // ── Mobile hamburger toggle ──────────────────────────────
  _setupMobileMenu() {
    if (!this.hamburger) return;
    this.hamburger.addEventListener('click', () => {
      this.navMobile.classList.toggle('open');
      // Cambiar ícono hamburger ↔ X
      this.hamburger.textContent = this.navMobile.classList.contains('open') ? '✕' : '☰';
    });

    // Cerrar al hacer click fuera del menú
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#navbar')) {
        this.navMobile.classList.remove('open');
        this.hamburger.textContent = '☰';
      }
    });
  }

  // ── Scroll suave al hacer click en links del nav ─────────
  _setupSmoothScroll() {
    const allLinks = document.querySelectorAll('a[href^="#"], .nav-mobile a[href^="#"]');
    allLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href').slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          // Offset por la navbar sticky (70px)
          const offset = 70;
          const top = targetEl.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
          // Cerrar menú mobile
          this.navMobile.classList.remove('open');
          this.hamburger.textContent = '☰';
        }
      });
    });
  }

  // ── Scroll Spy: resaltar link activo según sección visible ─
  _setupScrollSpy() {
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(a => {
              a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
            });
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px', // activa cuando el 30% superior está visible
        threshold: 0,
      }
    );

    this.sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  // ── Badge del carrito (reacciona al evento cartUpdated) ──
  _setupCartBadgeListener() {
    this._updateBadge();
    window.addEventListener('cartUpdated', () => this._updateBadge());
  }

  _updateBadge() {
    if (!this.cartBadge || typeof DB === 'undefined') return;
    const count = DB.getCartCount();
    this.cartBadge.textContent = count;
    this.cartBadge.style.display = count > 0 ? 'flex' : 'none';
  }

  // ── API pública: abrir/cerrar menú desde código externo ──
  closeMenu() {
    this.navMobile.classList.remove('open');
    this.hamburger.textContent = '☰';
  }
}

// Auto-instanciar cuando el DOM esté listo
window.NavbarComponent = Navbar;
