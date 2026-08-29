const menuButton = document.querySelector('[data-menu-button]');
const menu = document.querySelector('[data-menu]');
const header = document.querySelector('[data-header]');
const menuLinks = menu?.querySelectorAll('a') ?? [];

function closeMenu() {
  if (!menuButton || !menu) return false;
  const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '메뉴 열기');
  menu.classList.remove('is-open');
  document.body.classList.remove('menu-open');
  return wasOpen;
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? '메뉴 열기' : '메뉴 닫기');
  menu?.classList.toggle('is-open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

menuLinks.forEach((link) => link.addEventListener('click', closeMenu));

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && closeMenu()) {
    menuButton?.focus();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 980) closeMenu();
});

function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 8);
}

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = document.querySelectorAll('[data-reveal]');
let revealObserver;

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealItems.forEach((item) => revealObserver.observe(item));
}

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

const productGrids = document.querySelectorAll('[data-products-grid]');
const productCount = document.querySelector('[data-product-count]');
const wonFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

function createProductCard(product, index) {
  const article = document.createElement('article');
  article.className = 'product-card';
  article.setAttribute('data-reveal', '');

  const imageLink = document.createElement('a');
  imageLink.className = 'product-card-image';
  imageLink.href = product.url;
  imageLink.target = '_blank';
  imageLink.rel = 'noopener noreferrer';
  imageLink.setAttribute('aria-label', `${product.name} 구매 페이지 열기`);

  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.name;
  image.width = 720;
  image.height = 720;
  image.loading = index < 4 ? 'eager' : 'lazy';
  image.decoding = 'async';
  imageLink.append(image);

  const content = document.createElement('div');
  content.className = 'product-card-content';

  const label = document.createElement('p');
  label.className = 'product-card-label';
  label.textContent = `SUPPLY ROUTE / ${String(index + 1).padStart(2, '0')}`;

  const title = document.createElement('h3');
  title.textContent = product.name;

  const footer = document.createElement('div');
  footer.className = 'product-card-footer';

  const price = document.createElement('p');
  price.className = 'product-card-price';
  price.textContent = wonFormatter.format(product.price);

  const buyLink = document.createElement('a');
  buyLink.className = 'product-buy-link';
  buyLink.href = product.url;
  buyLink.target = '_blank';
  buyLink.rel = 'noopener noreferrer';
  buyLink.textContent = '구매하기';
  buyLink.setAttribute('aria-label', `${product.name} 구매하기 — 새 탭에서 열림`);

  footer.append(price, buyLink);
  content.append(label, title, footer);
  article.append(imageLink, content);
  return article;
}

function showProductError(grid) {
  grid.replaceChildren();
  const message = document.createElement('p');
  message.className = 'products-error';
  message.textContent = '제품 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.';
  grid.append(message);
}

function addProductStructuredData(products) {
  if (!document.body.classList.contains('products-page')) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '건지울른스와 서플라이루트 제품',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        image: product.image,
        ...(String(product.name).includes('건지울른스')
          ? { brand: { '@type': 'Brand', name: '건지울른스' } }
          : {}),
        offers: {
          '@type': 'Offer',
          url: product.url,
          priceCurrency: 'KRW',
          price: String(product.price),
        },
      },
    })),
  });
  document.head.append(script);
}

async function loadProducts() {
  if (!productGrids.length) return;

  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const products = await response.json();
    if (!Array.isArray(products)) throw new TypeError('Products must be an array');
    addProductStructuredData(products);
    if (productCount) productCount.textContent = String(products.length).padStart(2, '0');

    productGrids.forEach((grid) => {
      const mode = grid.dataset.mode;
      const limit = Number(grid.dataset.limit) || products.length;
      const visibleProducts = mode === 'featured'
        ? products.filter((product) => product.name.includes('건지울른스')).slice(0, limit)
        : products.slice(0, limit);

      const fragment = document.createDocumentFragment();
      visibleProducts.forEach((product, index) => fragment.append(createProductCard(product, index)));
      grid.replaceChildren(fragment);

      if (!prefersReducedMotion && revealObserver) {
        grid.querySelectorAll('[data-reveal]').forEach((item) => revealObserver.observe(item));
      } else {
        grid.querySelectorAll('[data-reveal]').forEach((item) => item.classList.add('is-visible'));
      }
    });
  } catch (error) {
    console.error('Product data could not be loaded:', error);
    productGrids.forEach(showProductError);
  }
}

loadProducts();

const homeStories = document.querySelector('[data-home-stories]');
const formatStoryDate = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
};

function createHomeStory(post) {
  const article = document.createElement('article');
  article.setAttribute('data-reveal', '');

  const meta = document.createElement('p');
  const time = document.createElement('time');
  time.dateTime = post.date || '';
  time.textContent = formatStoryDate(post.date || '');
  meta.append(time);
  if (Array.isArray(post.tags) && post.tags[0]) meta.append(` · ${post.tags[0]}`);

  const title = document.createElement('h3');
  title.textContent = post.title || '(제목 없음)';
  const summary = document.createElement('p');
  summary.className = 'journal-summary';
  summary.textContent = post.summary || '';

  const link = document.createElement('a');
  link.href = post.url ? `story/${post.url}` : `story/post.html?id=${encodeURIComponent(post.id || '')}`;
  link.setAttribute('aria-label', `${post.title || '이야기'} 읽기`);
  link.append('기록 읽기 ');
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  link.append(arrow);

  article.append(meta, title, summary, link);
  return article;
}

async function loadHomeStories() {
  if (!homeStories) return;
  try {
    const response = await fetch('story/posts.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const posts = await response.json();
    const latest = Array.isArray(posts)
      ? posts.filter((post) => !post.draft).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 3)
      : [];
    if (!latest.length) {
      homeStories.innerHTML = '<p class="home-stories-loading">아직 등록된 이야기가 없습니다.</p>';
      return;
    }
    homeStories.replaceChildren(...latest.map(createHomeStory));
    homeStories.querySelectorAll('[data-reveal]').forEach((item) => {
      if (!prefersReducedMotion && revealObserver) revealObserver.observe(item);
      else item.classList.add('is-visible');
    });
  } catch (error) {
    homeStories.innerHTML = '<p class="home-stories-loading">최신 이야기를 불러오지 못했습니다.</p>';
  }
}

loadHomeStories();
