/**
 * Academy of Heroes character browser.
 */

'use strict';

const CONFIG = Object.freeze({
  manifestUrl: 'database/manifest.json',
  imageTimeoutMs: 20_000,
  searchDelayMs: 150,
  maxSearchResults: 100,
  enableUrlRouting: true
});

const state = {
  manifest: null,
  currentCategory: 0,
  currentSubcategory: 0,
  currentItem: 0,
  imageCache: new Map(),
  imageLoads: new Map(),
  searchQuery: '',
  searchResults: [],
  searchSelectedIndex: -1,
  showSearchDropdown: false,
  favorites: []
};

const elements = {};

function cacheElements() {
  const ids = [
    'category-list', 'subcategories', 'items-grid', 'info-panel',
    'image-panel', 'main-content', 'search-container', 'search-input',
    'search-results', 'toast-container'
  ];

  for (const id of ids) {
    elements[id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = document.getElementById(id);
  }
}

function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.categories)) {
    throw new Error('The database manifest has an invalid structure.');
  }

  for (const category of manifest.categories) {
    if (typeof category.name !== 'string' || !Array.isArray(category.subcategories)) {
      throw new Error('The database manifest contains an invalid category.');
    }

    for (const subcategory of category.subcategories) {
      if (typeof subcategory.name !== 'string' || !Array.isArray(subcategory.items)) {
        throw new Error('The database manifest contains an invalid subcategory.');
      }
    }
  }
}

async function init() {
  cacheElements();
  showLoading();

  try {
    const response = await fetch(CONFIG.manifestUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Database request failed with status ${response.status}.`);

    const manifest = await response.json();
    validateManifest(manifest);
    state.manifest = manifest;
    loadFavorites();

    if (CONFIG.enableUrlRouting) parseUrlHash();
    normalizeSelection();
    setupEventListeners();
    updateUI();
  } catch (error) {
    console.error('Initialization error:', error);
    elements.itemsGrid.replaceChildren();
    showEmptyState(elements.itemsGrid, 'The character database could not be loaded.');
    showToast('Failed to load the database. Please refresh the page.', 'error', 0);
  } finally {
    hideLoading();
  }
}

// ===== FAVORITES =====

function createFavorite(categoryIndex, subcategoryIndex, itemIndex) {
  const category = state.manifest.categories[categoryIndex];
  const subcategory = category?.subcategories?.[subcategoryIndex];
  const item = subcategory?.items?.[itemIndex];
  if (!category || !subcategory || !item) return null;

  return {
    key: JSON.stringify([category.name, subcategory.name, item.name]),
    categoryName: category.name,
    subcategoryName: subcategory.name,
    itemName: item.name,
    categoryIndex,
    subcategoryIndex,
    itemIndex,
    item
  };
}

function resolveFavorite(savedFavorite) {
  if (!savedFavorite || typeof savedFavorite !== 'object') return null;

  const categoryName = savedFavorite.categoryName;
  const subcategoryName = savedFavorite.subcategoryName;
  const itemName = savedFavorite.itemName || savedFavorite.item?.name;

  if (categoryName && subcategoryName && itemName) {
    const categoryIndex = state.manifest.categories.findIndex(category => category.name === categoryName);
    const category = state.manifest.categories[categoryIndex];
    const subcategoryIndex = category?.subcategories?.findIndex(subcategory => subcategory.name === subcategoryName) ?? -1;
    const subcategory = category?.subcategories?.[subcategoryIndex];
    const itemIndex = subcategory?.items?.findIndex(item => item.name === itemName) ?? -1;
    const favorite = createFavorite(categoryIndex, subcategoryIndex, itemIndex);
    if (favorite) return favorite;
  }

  // Migrate favorites saved by older versions, while guarding against reordered data.
  const legacyFavorite = createFavorite(
    Number(savedFavorite.categoryIndex),
    Number(savedFavorite.subcategoryIndex),
    Number(savedFavorite.itemIndex)
  );
  if (legacyFavorite && (!itemName || legacyFavorite.item.name === itemName)) return legacyFavorite;

  const savedAvatar = savedFavorite.item?.avatar;
  const savedImage = savedFavorite.item?.image;
  for (let categoryIndex = 0; categoryIndex < state.manifest.categories.length; categoryIndex += 1) {
    const category = state.manifest.categories[categoryIndex];
    for (let subcategoryIndex = 0; subcategoryIndex < category.subcategories.length; subcategoryIndex += 1) {
      const subcategory = category.subcategories[subcategoryIndex];
      const itemIndex = subcategory.items.findIndex(item =>
        (savedAvatar && item.avatar === savedAvatar) || (savedImage && item.image === savedImage)
      );
      if (itemIndex >= 0) return createFavorite(categoryIndex, subcategoryIndex, itemIndex);
    }
  }

  return null;
}

function loadFavorites() {
  try {
    const storedValue = localStorage.getItem('aoh-favorites');
    const storedFavorites = storedValue ? JSON.parse(storedValue) : [];
    if (!Array.isArray(storedFavorites)) throw new TypeError('Favorites must be an array.');

    const seen = new Set();
    state.favorites = storedFavorites
      .map(resolveFavorite)
      .filter(favorite => favorite && !seen.has(favorite.key) && seen.add(favorite.key));
    saveFavorites();
  } catch (error) {
    console.warn('Failed to load favorites:', error);
    state.favorites = [];
  }
}

function saveFavorites() {
  const serializableFavorites = state.favorites.map(favorite => ({
    categoryName: favorite.categoryName,
    subcategoryName: favorite.subcategoryName,
    itemName: favorite.itemName
  }));

  try {
    localStorage.setItem('aoh-favorites', JSON.stringify(serializableFavorites));
  } catch (error) {
    console.warn('Failed to save favorites:', error);
  }
}

function findFavoriteIndex(categoryIndex, subcategoryIndex, itemIndex) {
  const candidate = createFavorite(categoryIndex, subcategoryIndex, itemIndex);
  if (!candidate) return -1;
  return state.favorites.findIndex(favorite => favorite.key === candidate.key);
}

function togglePinByIndex(itemIndex) {
  if (state.currentCategory === -1) {
    const favorite = state.favorites[itemIndex];
    if (!favorite) return;
    state.favorites.splice(itemIndex, 1);
    state.currentItem = Math.min(itemIndex, state.favorites.length - 1);
    state.currentSubcategory = state.currentItem;
    showToast(`${favorite.item.name} removed from favorites`, 'info', 2500);
  } else {
    const existingIndex = findFavoriteIndex(state.currentCategory, state.currentSubcategory, itemIndex);
    const item = getCurrentItems()[itemIndex];
    if (!item) return;

    if (existingIndex >= 0) {
      state.favorites.splice(existingIndex, 1);
      showToast(`${item.name} removed from favorites`, 'info', 2500);
    } else {
      const favorite = createFavorite(state.currentCategory, state.currentSubcategory, itemIndex);
      if (!favorite) return;
      state.favorites.push(favorite);
      showToast(`${item.name} added to favorites`, 'success', 2500);
    }
  }

  saveFavorites();
  normalizeSelection();
  updateUI();
}

function selectFavorite(favoriteIndex) {
  const favorite = state.favorites[favoriteIndex];
  if (!favorite) return;
  state.currentCategory = favorite.categoryIndex;
  state.currentSubcategory = favorite.subcategoryIndex;
  state.currentItem = favorite.itemIndex;
  updateUI();
}

// ===== IMAGES =====

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (state.imageCache.has(src)) return Promise.resolve(state.imageCache.get(src));
  if (state.imageLoads.has(src)) return state.imageLoads.get(src);

  const imagePromise = new Promise(resolve => {
    const image = new Image();
    let settled = false;

    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      state.imageCache.set(src, result);
      state.imageLoads.delete(src);
      resolve(result);
    };

    const timeoutId = setTimeout(() => finish(null), CONFIG.imageTimeoutMs);
    image.decoding = 'async';
    image.addEventListener('load', () => finish(image), { once: true });
    image.addEventListener('error', () => finish(null), { once: true });
    image.src = src;
  });

  state.imageLoads.set(src, imagePromise);
  return imagePromise;
}

function cloneImage(image, alt, className = '', loading = 'lazy') {
  const clone = image.cloneNode();
  clone.alt = alt;
  clone.decoding = 'async';
  clone.loading = loading;
  if (className) clone.className = className;
  return clone;
}

function appendProgressiveImage(container, src, alt, options = {}) {
  const { className = '', loading = 'lazy', placeholderClass = 'image-placeholder' } = options;
  const cachedImage = state.imageCache.get(src);

  if (cachedImage) {
    container.appendChild(cloneImage(cachedImage, alt, className, loading));
    return;
  }

  const placeholder = document.createElement('span');
  placeholder.className = `${placeholderClass} loading`;
  placeholder.setAttribute('aria-hidden', 'true');
  container.appendChild(placeholder);

  if (state.imageCache.has(src)) {
    placeholder.classList.replace('loading', 'error');
    return;
  }

  loadImage(src).then(image => {
    if (!placeholder.isConnected) return;
    if (!image) {
      placeholder.classList.replace('loading', 'error');
      return;
    }
    container.appendChild(cloneImage(image, alt, className, loading));
    placeholder.remove();
  });
}

// ===== RENDERING =====

function updateUI() {
  renderCategories();
  renderItemsGrid();
  renderInfoPanel();
  renderImagePanel();
  if (CONFIG.enableUrlRouting) updateUrlHash();
  announceSelection();
}

function createNavigationButton(label, className, selected, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-current', selected ? 'page' : 'false');
  if (selected) button.classList.add('selected');
  button.addEventListener('click', onClick);

  const labelElement = document.createElement('span');
  labelElement.textContent = label;
  button.appendChild(labelElement);
  return button;
}

function renderCategories() {
  const fragment = document.createDocumentFragment();
  const favoritesButton = createNavigationButton(
    `Favorites (${state.favorites.length})`, 'category', state.currentCategory === -1, () => selectCategory(-1)
  );
  favoritesButton.classList.add('category-favorites');
  fragment.appendChild(favoritesButton);

  if (state.currentCategory === -1 && state.favorites.length > 0) {
    fragment.appendChild(createSubcategoryTree(
      state.favorites.map(favorite => ({ name: favorite.item.name, thumbnail: favorite.item.avatar })),
      state.currentItem,
      selectFavorite
    ));
  }

  state.manifest.categories.forEach((category, categoryIndex) => {
    fragment.appendChild(createNavigationButton(
      category.name, 'category', categoryIndex === state.currentCategory, () => selectCategory(categoryIndex)
    ));
    if (categoryIndex === state.currentCategory && category.subcategories.length > 0) {
      fragment.appendChild(createSubcategoryTree(category.subcategories, state.currentSubcategory, selectSubcategory));
    }
  });

  elements.categoryList.replaceChildren(fragment);
  renderSubcategories();
}

function createSubcategoryTree(entries, selectedIndex, selectHandler) {
  const tree = document.createElement('div');
  tree.className = 'subcategories-tree show';

  entries.forEach((entry, index) => {
    const button = createNavigationButton(entry.name, 'subcat-item', index === selectedIndex, () => selectHandler(index));
    if (entry.thumbnail) {
      const imageContainer = document.createElement('span');
      imageContainer.className = 'subcat-item-image';
      appendProgressiveImage(imageContainer, entry.thumbnail, '', {
        className: 'subcat-icon', placeholderClass: 'subcat-icon-placeholder'
      });
      button.prepend(imageContainer);
    }
    tree.appendChild(button);
  });
  return tree;
}

function renderSubcategories() {
  const fragment = document.createDocumentFragment();
  const entries = state.currentCategory === -1
    ? state.favorites.map(favorite => ({ name: favorite.item.name, thumbnail: favorite.item.avatar }))
    : state.manifest.categories[state.currentCategory]?.subcategories || [];
  const selectedIndex = state.currentCategory === -1 ? state.currentItem : state.currentSubcategory;
  const selectHandler = state.currentCategory === -1 ? selectFavorite : selectSubcategory;

  entries.forEach((entry, index) => {
    const button = createNavigationButton(entry.name, 'subcat', index === selectedIndex, () => selectHandler(index));
    if (entry.thumbnail) {
      const imageContainer = document.createElement('span');
      imageContainer.className = 'subcat-image';
      appendProgressiveImage(imageContainer, entry.thumbnail, '', {
        className: 'subcat-icon', placeholderClass: 'subcat-icon-placeholder'
      });
      button.prepend(imageContainer);
    }
    fragment.appendChild(button);
  });

  elements.subcategories.replaceChildren(fragment);
  elements.subcategories.hidden = entries.length === 0;
}

function renderItemsGrid() {
  const items = getCurrentItems();
  if (items.length === 0) {
    elements.itemsGrid.replaceChildren();
    showEmptyState(elements.itemsGrid, state.currentCategory === -1
      ? 'No favorite items yet. Pin an item to keep it here.'
      : 'No items are available in this category.');
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, itemIndex) => {
    const card = document.createElement('article');
    card.className = 'item';
    card.setAttribute('role', 'listitem');

    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'item-select';
    selectButton.dataset.index = String(itemIndex);
    selectButton.setAttribute('aria-label', `View ${item.name}`);
    selectButton.setAttribute('aria-current', itemIndex === state.currentItem ? 'true' : 'false');
    if (itemIndex === state.currentItem) card.classList.add('selected');

    const avatarContainer = document.createElement('span');
    avatarContainer.className = 'avatar-container';
    if (item.avatar) {
      appendProgressiveImage(avatarContainer, item.avatar, `${item.name} portrait`, {
        placeholderClass: 'avatar-placeholder'
      });
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'avatar-placeholder error';
      placeholder.setAttribute('aria-hidden', 'true');
      avatarContainer.appendChild(placeholder);
    }

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = item.name;
    selectButton.append(avatarContainer, name);
    selectButton.addEventListener('click', () => selectItem(itemIndex));

    const pinned = state.currentCategory === -1 || findFavoriteIndex(state.currentCategory, state.currentSubcategory, itemIndex) >= 0;
    const pinButton = document.createElement('button');
    pinButton.type = 'button';
    pinButton.className = `pin-icon${pinned ? ' pinned' : ''}`;
    pinButton.dataset.index = String(itemIndex);
    pinButton.setAttribute('aria-label', pinned ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`);
    pinButton.title = pinned ? 'Remove from favorites' : 'Add to favorites';
    pinButton.textContent = '📌';
    pinButton.addEventListener('click', () => togglePinByIndex(itemIndex));

    card.append(selectButton, pinButton);
    fragment.appendChild(card);
  });
  elements.itemsGrid.replaceChildren(fragment);
}

function renderInfoPanel() {
  const item = getCurrentItem();
  if (!item) {
    elements.infoPanel.replaceChildren();
    showEmptyState(elements.infoPanel, 'Select an item to view details.');
    return;
  }

  const heading = document.createElement('h2');
  heading.textContent = item.name;
  if (!item.info) {
    elements.infoPanel.replaceChildren(heading);
    showEmptyState(elements.infoPanel, 'No information is available for this item.');
    return;
  }

  const information = document.createElement('p');
  information.textContent = item.info;
  elements.infoPanel.replaceChildren(heading, information);
}

function renderImagePanel() {
  const item = getCurrentItem();
  elements.imagePanel.replaceChildren();
  if (!item?.image) {
    showEmptyState(elements.imagePanel, 'No image is available.');
    return;
  }

  const requestedSource = item.image;
  const cachedImage = state.imageCache.get(requestedSource);
  if (cachedImage) {
    elements.imagePanel.appendChild(cloneImage(cachedImage, item.name, 'detail-image', 'eager'));
    return;
  }
  if (state.imageCache.has(requestedSource)) {
    showEmptyState(elements.imagePanel, 'The image could not be loaded.');
    return;
  }

  const loading = document.createElement('div');
  loading.className = 'image-loading';
  loading.setAttribute('role', 'status');
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-hidden', 'true');
  const loadingText = document.createElement('span');
  loadingText.textContent = 'Loading image…';
  loading.append(spinner, loadingText);
  elements.imagePanel.appendChild(loading);

  loadImage(requestedSource).then(image => {
    if (getCurrentItem()?.image !== requestedSource) return;
    elements.imagePanel.replaceChildren();
    if (image) elements.imagePanel.appendChild(cloneImage(image, item.name, 'detail-image', 'eager'));
    else showEmptyState(elements.imagePanel, 'The image could not be loaded.');
  });
}

// ===== SELECTION AND ROUTING =====

function selectCategory(categoryIndex) {
  if (categoryIndex === state.currentCategory) return;
  state.currentCategory = categoryIndex;
  if (categoryIndex === -1) {
    state.currentItem = state.favorites.length > 0 ? 0 : -1;
    state.currentSubcategory = state.currentItem;
  } else {
    const category = state.manifest.categories[categoryIndex];
    state.currentSubcategory = category?.subcategories?.length ? 0 : -1;
    state.currentItem = category?.subcategories?.[0]?.items?.length ? 0 : -1;
  }
  updateUI();
}

function selectSubcategory(subcategoryIndex) {
  if (subcategoryIndex === state.currentSubcategory) return;
  const subcategory = state.manifest.categories[state.currentCategory]?.subcategories?.[subcategoryIndex];
  if (!subcategory) return;
  state.currentSubcategory = subcategoryIndex;
  state.currentItem = subcategory.items.length > 0 ? 0 : -1;
  updateUI();
}

function selectItem(itemIndex) {
  const items = getCurrentItems();
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= items.length) return;
  state.currentItem = itemIndex;
  if (state.currentCategory === -1) state.currentSubcategory = itemIndex;
  updateUI();
}

function normalizeSelection() {
  if (state.currentCategory === -1) {
    state.currentItem = state.favorites.length > 0
      ? Math.min(Math.max(state.currentItem, 0), state.favorites.length - 1)
      : -1;
    state.currentSubcategory = state.currentItem;
    return;
  }

  if (!Number.isInteger(state.currentCategory) || state.currentCategory < 0 || state.currentCategory >= state.manifest.categories.length) {
    state.currentCategory = 0;
  }
  const category = state.manifest.categories[state.currentCategory];
  if (!category?.subcategories?.length) {
    state.currentSubcategory = -1;
    state.currentItem = -1;
    return;
  }

  state.currentSubcategory = Math.min(Math.max(state.currentSubcategory, 0), category.subcategories.length - 1);
  const items = category.subcategories[state.currentSubcategory].items;
  state.currentItem = items.length > 0 ? Math.min(Math.max(state.currentItem, 0), items.length - 1) : -1;
}

function getCurrentItems() {
  if (state.currentCategory === -1) return state.favorites.map(favorite => favorite.item);
  return state.manifest.categories[state.currentCategory]?.subcategories?.[state.currentSubcategory]?.items || [];
}

function getCurrentItem() {
  return getCurrentItems()[state.currentItem] || null;
}

function parseUrlHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const segments = hash.split('/');
  if (segments[0] === 'favorites') {
    state.currentCategory = -1;
    state.currentItem = Number.parseInt(segments[1], 10);
    state.currentSubcategory = state.currentItem;
    normalizeSelection();
    return;
  }

  const values = segments.map(segment => Number.parseInt(segment, 10));
  if (values.length === 3 && values.every(Number.isInteger)) {
    [state.currentCategory, state.currentSubcategory, state.currentItem] = values;
    normalizeSelection();
  }
}

function updateUrlHash() {
  const hash = state.currentCategory === -1
    ? `#favorites/${state.currentItem}`
    : `#${state.currentCategory}/${state.currentSubcategory}/${state.currentItem}`;
  if (window.location.hash !== hash) history.replaceState(null, '', hash);
}

// ===== SEARCH =====

function searchAllDatabase(query) {
  const searchTerm = query.trim().toLocaleLowerCase();
  if (!searchTerm) {
    state.searchResults = [];
    state.searchSelectedIndex = -1;
    state.showSearchDropdown = false;
    renderSearchResults();
    return;
  }

  const results = [];
  for (let categoryIndex = 0; categoryIndex < state.manifest.categories.length; categoryIndex += 1) {
    const category = state.manifest.categories[categoryIndex];
    for (let subcategoryIndex = 0; subcategoryIndex < category.subcategories.length; subcategoryIndex += 1) {
      const subcategory = category.subcategories[subcategoryIndex];
      if (subcategory.name.toLocaleLowerCase().includes(searchTerm)) {
        results.push({
          type: 'subcategory', categoryIndex, subcategoryIndex, name: subcategory.name,
          path: category.name, thumbnail: subcategory.thumbnail, itemCount: subcategory.items.length
        });
      }

      subcategory.items.forEach((item, itemIndex) => {
        const searchableText = `${item.name} ${category.name} ${subcategory.name} ${item.info || ''}`.toLocaleLowerCase();
        if (searchableText.includes(searchTerm)) {
          results.push({
            type: 'item', categoryIndex, subcategoryIndex, itemIndex, name: item.name,
            path: `${category.name} › ${subcategory.name}`, thumbnail: item.avatar, item
          });
        }
      });
    }
  }

  state.searchResults = results.slice(0, CONFIG.maxSearchResults);
  state.searchSelectedIndex = state.searchResults.length > 0 ? 0 : -1;
  state.showSearchDropdown = true;
  renderSearchResults();
}

function renderSearchResults() {
  const hasQuery = state.searchQuery.trim().length > 0;
  const showDropdown = state.showSearchDropdown && hasQuery;
  const fragment = document.createDocumentFragment();

  if (showDropdown && state.searchResults.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'search-no-results';
    noResults.textContent = 'No results found';
    fragment.appendChild(noResults);
  } else if (showDropdown) {
    state.searchResults.forEach((result, index) => {
      const option = document.createElement('div');
      option.id = `search-result-${index}`;
      option.className = 'search-result-item';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', index === state.searchSelectedIndex ? 'true' : 'false');
      if (index === state.searchSelectedIndex) option.classList.add('selected');

      const avatar = document.createElement('span');
      avatar.className = 'search-result-avatar';
      const cachedImage = state.imageCache.get(result.thumbnail);
      if (cachedImage) avatar.appendChild(cloneImage(cachedImage, '', '', 'lazy'));

      const information = document.createElement('span');
      information.className = 'search-result-info';
      const name = document.createElement('span');
      name.className = 'search-result-name';
      name.textContent = result.name;
      const path = document.createElement('span');
      path.className = 'search-result-path';
      path.textContent = result.type === 'subcategory' ? `${result.path} (${result.itemCount} items)` : result.path;
      information.append(name, path);
      option.append(avatar, information);
      option.addEventListener('pointerdown', event => event.preventDefault());
      option.addEventListener('click', () => selectSearchResult(index));
      fragment.appendChild(option);
    });
  }

  elements.searchResults.replaceChildren(fragment);
  elements.searchResults.classList.toggle('show', showDropdown);
  elements.searchInput.setAttribute('aria-expanded', String(showDropdown));
  if (showDropdown && state.searchSelectedIndex >= 0) {
    elements.searchInput.setAttribute('aria-activedescendant', `search-result-${state.searchSelectedIndex}`);
  } else {
    elements.searchInput.removeAttribute('aria-activedescendant');
  }
}

function selectSearchResult(index) {
  const result = state.searchResults[index];
  if (!result) return;
  state.currentCategory = result.categoryIndex;
  state.currentSubcategory = result.subcategoryIndex;
  state.currentItem = result.type === 'item'
    ? result.itemIndex
    : (state.manifest.categories[result.categoryIndex].subcategories[result.subcategoryIndex].items.length ? 0 : -1);
  clearSearch();
  updateUI();
  elements.mainContent.scrollIntoView({ block: 'start' });
}

function navigateSearchResults(direction) {
  if (state.searchResults.length === 0) return;
  state.searchSelectedIndex = (state.searchSelectedIndex + direction + state.searchResults.length) % state.searchResults.length;
  renderSearchResults();
  document.getElementById(`search-result-${state.searchSelectedIndex}`)?.scrollIntoView({ block: 'nearest' });
}

function clearSearch() {
  state.searchQuery = '';
  state.searchResults = [];
  state.searchSelectedIndex = -1;
  state.showSearchDropdown = false;
  elements.searchInput.value = '';
  renderSearchResults();
}

// ===== FEEDBACK AND ACCESSIBILITY =====

function showLoading() {
  const loader = document.createElement('div');
  loader.className = 'app-loading';
  loader.setAttribute('role', 'status');
  loader.textContent = 'Loading character database…';
  elements.itemsGrid.replaceChildren(loader);
  document.body.setAttribute('aria-busy', 'true');
}

function hideLoading() {
  document.body.removeAttribute('aria-busy');
  elements.itemsGrid.querySelector('.app-loading')?.remove();
}

function showEmptyState(container, message) {
  const emptyState = document.createElement('p');
  emptyState.className = 'empty-state';
  emptyState.textContent = message;
  container.appendChild(emptyState);
}

function showToast(message, type = 'info', duration = 5000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const messageElement = document.createElement('span');
  messageElement.className = 'toast-message';
  messageElement.textContent = message;
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'toast-close';
  closeButton.setAttribute('aria-label', 'Close notification');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => dismissToast(toast));
  toast.append(messageElement, closeButton);
  elements.toastContainer.appendChild(toast);
  if (duration > 0) setTimeout(() => dismissToast(toast), duration);
  return toast;
}

function dismissToast(toast) {
  if (!toast?.isConnected) return;
  toast.classList.add('hiding');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  setTimeout(() => toast.remove(), 500);
}

function announceSelection() {
  const item = getCurrentItem();
  let liveRegion = document.getElementById('live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'live-region';
    liveRegion.className = 'visually-hidden';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveRegion);
  }

  if (state.currentCategory === -1) {
    liveRegion.textContent = item ? `Selected favorite ${item.name}` : 'Favorites is empty';
    return;
  }
  const category = state.manifest.categories[state.currentCategory];
  const subcategory = category?.subcategories?.[state.currentSubcategory];
  liveRegion.textContent = item
    ? `Selected ${item.name} in ${category.name}, ${subcategory.name}`
    : `Viewing ${category?.name || 'the database'}`;
}

// ===== EVENTS =====

function setupEventListeners() {
  let searchTimer;

  elements.searchInput.addEventListener('input', event => {
    clearTimeout(searchTimer);
    state.searchQuery = event.target.value;
    searchTimer = setTimeout(() => searchAllDatabase(state.searchQuery), CONFIG.searchDelayMs);
  });
  elements.searchInput.addEventListener('focus', () => {
    if (state.searchQuery && state.searchResults.length > 0) {
      state.showSearchDropdown = true;
      renderSearchResults();
    }
  });
  elements.searchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      clearTimeout(searchTimer);
      clearSearch();
      event.currentTarget.blur();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      navigateSearchResults(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      navigateSearchResults(-1);
    } else if (event.key === 'Enter' && state.searchSelectedIndex >= 0) {
      event.preventDefault();
      selectSearchResult(state.searchSelectedIndex);
    }
  });

  elements.itemsGrid.addEventListener('keydown', handleGridKeydown);
  document.addEventListener('click', event => {
    if (!elements.searchContainer.contains(event.target)) {
      state.showSearchDropdown = false;
      renderSearchResults();
    }
  });

  if (CONFIG.enableUrlRouting) {
    window.addEventListener('hashchange', () => {
      parseUrlHash();
      updateUI();
    });
  }
}

function handleGridKeydown(event) {
  const selectButton = event.target.closest('.item-select');
  if (!selectButton) return;
  const currentIndex = Number(selectButton.dataset.index);
  const itemCount = getCurrentItems().length;
  const columnCount = Math.max(1, getComputedStyle(elements.itemsGrid).gridTemplateColumns.split(' ').length);
  let nextIndex = currentIndex;
  if (event.key === 'ArrowLeft') nextIndex -= 1;
  if (event.key === 'ArrowRight') nextIndex += 1;
  if (event.key === 'ArrowUp') nextIndex -= columnCount;
  if (event.key === 'ArrowDown') nextIndex += columnCount;
  if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= itemCount) return;

  event.preventDefault();
  selectItem(nextIndex);
  elements.itemsGrid.querySelector(`.item-select[data-index="${nextIndex}"]`)?.focus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
