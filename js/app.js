/**
 * Academy of Heroes - Main Application
 * Manages character database navigation and display
 */

'use strict';

// ===== CONFIGURATION =====
const CONFIG = {
  manifestUrl: 'database/manifest.json',
  preloadImages: true,
  enableKeyboardNav: true,
  enableUrlRouting: true
};

// ===== STATE MANAGEMENT =====
const state = {
  manifest: null,
  currentCategory: 0,
  currentSubcategory: 0,
  currentItem: 0,
  imageCache: new Map(),
  isLoading: false
};

// ===== DOM ELEMENT REFERENCES =====
const elements = {
  categoryList: null,
  subcategories: null,
  itemsGrid: null,
  infoPanel: null,
  imagePanel: null,
  mainContent: null
};

// ===== INITIALIZATION =====

/**
 * Initialize the application when DOM is ready
 */
async function init() {
  try {
    // Cache DOM elements
    elements.categoryList = document.getElementById('category-list');
    elements.subcategories = document.getElementById('subcategories');
    elements.itemsGrid = document.getElementById('items-grid');
    elements.infoPanel = document.getElementById('info-panel');
    elements.imagePanel = document.getElementById('image-panel');
    elements.mainContent = document.getElementById('main-content');

    // Show loading state
    showLoading();

    // Load manifest data
    const response = await fetch(CONFIG.manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.statusText}`);
    }
    state.manifest = await response.json();

    // Preload images for better UX
    if (CONFIG.preloadImages) {
      await preloadImages();
    }

    // Parse URL hash for initial state (if routing enabled)
    if (CONFIG.enableUrlRouting) {
      parseUrlHash();
    }

    // Render initial UI
    updateUI();

    // Setup event listeners
    setupEventListeners();

    // Hide loading state
    hideLoading();

  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to load the database. Please refresh the page.');
  }
}

/**
 * Preload all images from the manifest for smooth navigation
 * @returns {Promise<void>}
 */
async function preloadImages() {
  const imagesToLoad = [];

  state.manifest.categories.forEach(category => {
    category.subcategories.forEach(subcategory => {
      // Add subcategory thumbnails
      if (subcategory.thumbnail) {
        imagesToLoad.push(subcategory.thumbnail);
      }

      // Add item avatars and images
      subcategory.items.forEach(item => {
        if (item.avatar) imagesToLoad.push(item.avatar);
        if (item.image) imagesToLoad.push(item.image);
      });
    });
  });

  // Load images in parallel
  await Promise.all(
    imagesToLoad.map(src => loadImage(src))
  );
}

/**
 * Load a single image and cache it
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve) => {
    if (state.imageCache.has(src)) {
      resolve(state.imageCache.get(src));
      return;
    }

    const img = new Image();
    img.src = src;

    img.onload = () => {
      state.imageCache.set(src, img);
      resolve(img);
    };

    img.onerror = () => {
      console.warn(`Failed to load image: ${src}`);
      resolve(null);
    };
  });
}

// ===== RENDERING FUNCTIONS =====

/**
 * Update all UI components
 */
function updateUI() {
  renderCategories();
  renderSubcategories();
  renderItemsGrid();
  renderInfoPanel();
  renderImagePanel();

  // Update URL hash if routing enabled
  if (CONFIG.enableUrlRouting) {
    updateUrlHash();
  }

  // Update ARIA live region for screen readers
  announceSelection();
}

/**
 * Render category navigation buttons in sidebar
 */
function renderCategories() {
  elements.categoryList.innerHTML = '';

  state.manifest.categories.forEach((category, index) => {
    const button = document.createElement('button');
    button.textContent = category.name;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', index === state.currentCategory ? 'true' : 'false');
    button.setAttribute('tabindex', index === state.currentCategory ? '0' : '-1');
    button.id = `category-${index}`;

    if (index === state.currentCategory) {
      button.classList.add('selected');
    }

    button.addEventListener('click', () => selectCategory(index));

    elements.categoryList.appendChild(button);
  });
}

/**
 * Render subcategory navigation bar
 */
function renderSubcategories() {
  elements.subcategories.innerHTML = '';

  const subcategories = state.manifest.categories[state.currentCategory].subcategories;

  subcategories.forEach((subcategory, index) => {
    const element = document.createElement('div');
    element.className = 'subcat';
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', subcategory.name);

    if (index === state.currentSubcategory) {
      element.classList.add('selected');
      element.setAttribute('aria-pressed', 'true');
    } else {
      element.setAttribute('aria-pressed', 'false');
    }

    // Add thumbnail if available
    if (subcategory.thumbnail && state.imageCache.has(subcategory.thumbnail)) {
      const img = state.imageCache.get(subcategory.thumbnail).cloneNode();
      img.alt = `${subcategory.name} thumbnail`;
      element.appendChild(img);
    }

    // Add subcategory name
    const span = document.createElement('span');
    span.textContent = subcategory.name;
    element.appendChild(span);

    element.addEventListener('click', () => selectSubcategory(index));
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectSubcategory(index);
      }
    });

    elements.subcategories.appendChild(element);
  });
}

/**
 * Render items grid
 */
function renderItemsGrid() {
  elements.itemsGrid.innerHTML = '';

  const items = getCurrentItems();

  if (items.length === 0) {
    showEmptyState(elements.itemsGrid, 'No items found in this category.');
    return;
  }

  items.forEach((item, index) => {
    const element = document.createElement('div');
    element.className = 'item';
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', `View ${item.name}`);

    if (index === state.currentItem) {
      element.classList.add('selected');
      element.setAttribute('aria-pressed', 'true');
    } else {
      element.setAttribute('aria-pressed', 'false');
    }

    // Add avatar image or placeholder
    if (item.avatar && state.imageCache.has(item.avatar)) {
      const img = state.imageCache.get(item.avatar).cloneNode();
      img.alt = `${item.name} avatar`;
      element.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        width: var(--item-size);
        height: var(--item-size);
        background: var(--bg-secondary);
        border-radius: var(--border-radius);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        font-size: 0.75rem;
      `;
      placeholder.textContent = '?';
      placeholder.setAttribute('aria-label', 'No image available');
      element.appendChild(placeholder);
    }

    // Add item name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'name';
    nameDiv.textContent = item.name;
    element.appendChild(nameDiv);

    element.addEventListener('click', () => selectItem(index));
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectItem(index);
      }
    });

    elements.itemsGrid.appendChild(element);
  });
}

/**
 * Render info panel with character information
 */
function renderInfoPanel() {
  elements.infoPanel.innerHTML = '';

  const item = getCurrentItem();

  if (!item) {
    showEmptyState(elements.infoPanel, 'Select an item to view details.');
    return;
  }

  // Add character name as heading
  const heading = document.createElement('h2');
  heading.textContent = item.name;
  elements.infoPanel.appendChild(heading);

  // Add character info
  if (item.info) {
    const paragraph = document.createElement('p');
    paragraph.textContent = item.info;
    elements.infoPanel.appendChild(paragraph);
  } else {
    showEmptyState(elements.infoPanel, 'No information available for this character.');
  }
}

/**
 * Render image panel with character image
 */
function renderImagePanel() {
  elements.imagePanel.innerHTML = '';

  const item = getCurrentItem();

  if (!item || !item.image) {
    showEmptyState(elements.imagePanel, 'No image available.');
    return;
  }

  if (state.imageCache.has(item.image)) {
    const img = state.imageCache.get(item.image).cloneNode();
    img.alt = `${item.name} full image`;
    elements.imagePanel.appendChild(img);
  } else {
    showEmptyState(elements.imagePanel, 'Image failed to load.');
  }
}

// ===== SELECTION HANDLERS =====

/**
 * Select a category
 * @param {number} index - Category index
 */
function selectCategory(index) {
  if (index === state.currentCategory) return;

  state.currentCategory = index;
  state.currentSubcategory = 0;
  state.currentItem = 0;

  updateUI();
}

/**
 * Select a subcategory
 * @param {number} index - Subcategory index
 */
function selectSubcategory(index) {
  if (index === state.currentSubcategory) return;

  state.currentSubcategory = index;
  state.currentItem = 0;

  updateUI();
}

/**
 * Select an item
 * @param {number} index - Item index
 */
function selectItem(index) {
  if (index === state.currentItem) return;

  state.currentItem = index;

  updateUI();
}

// ===== HELPER FUNCTIONS =====

/**
 * Get current subcategory items
 * @returns {Array} Current items array
 */
function getCurrentItems() {
  return state.manifest.categories[state.currentCategory]
    .subcategories[state.currentSubcategory].items;
}

/**
 * Get current item
 * @returns {Object|null} Current item object
 */
function getCurrentItem() {
  const items = getCurrentItems();
  return items[state.currentItem] || null;
}

/**
 * Show loading state
 */
function showLoading() {
  state.isLoading = true;
  document.body.classList.add('loading');
  
  // Could add a loading spinner to main content
  if (elements.mainContent) {
    const loader = document.createElement('div');
    loader.className = 'loading';
    loader.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';
    elements.mainContent.appendChild(loader);
  }
}

/**
 * Hide loading state
 */
function hideLoading() {
  state.isLoading = false;
  document.body.classList.remove('loading');
  
  const loader = document.querySelector('.loading');
  if (loader) {
    loader.remove();
  }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    background: #f8d7da;
    color: #721c24;
    padding: 1rem;
    margin: 1rem;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    text-align: center;
  `;
  errorDiv.textContent = message;
  errorDiv.setAttribute('role', 'alert');
  
  document.body.insertBefore(errorDiv, document.body.firstChild);
}

/**
 * Show empty state in a container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Message to display
 */
function showEmptyState(container, message) {
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'empty-state';
  emptyDiv.textContent = message;
  container.appendChild(emptyDiv);
}

/**
 * Announce selection to screen readers
 */
function announceSelection() {
  const item = getCurrentItem();
  const category = state.manifest.categories[state.currentCategory].name;
  const subcategory = state.manifest.categories[state.currentCategory]
    .subcategories[state.currentSubcategory].name;

  const announcement = item
    ? `Selected ${item.name} in ${category}, ${subcategory}`
    : `Viewing ${category}, ${subcategory}`;

  // Update or create live region
  let liveRegion = document.getElementById('live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
    document.body.appendChild(liveRegion);
  }

  liveRegion.textContent = announcement;
}

// ===== URL ROUTING (HASH-BASED) =====

/**
 * Parse URL hash and update state
 */
function parseUrlHash() {
  const hash = window.location.hash.slice(1); // Remove '#'
  if (!hash) return;

  const [cat, subcat, item] = hash.split('/').map(Number);

  if (!isNaN(cat) && cat >= 0 && cat < state.manifest.categories.length) {
    state.currentCategory = cat;

    const subcategories = state.manifest.categories[cat].subcategories;
    if (!isNaN(subcat) && subcat >= 0 && subcat < subcategories.length) {
      state.currentSubcategory = subcat;

      const items = subcategories[subcat].items;
      if (!isNaN(item) && item >= 0 && item < items.length) {
        state.currentItem = item;
      }
    }
  }
}

/**
 * Update URL hash based on current state
 */
function updateUrlHash() {
  const hash = `#${state.currentCategory}/${state.currentSubcategory}/${state.currentItem}`;
  if (window.location.hash !== hash) {
    history.replaceState(null, '', hash);
  }
}

// ===== EVENT LISTENERS =====

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // Keyboard navigation
  if (CONFIG.enableKeyboardNav) {
    document.addEventListener('keydown', handleKeyboardNavigation);
  }

  // URL hash changes
  if (CONFIG.enableUrlRouting) {
    window.addEventListener('hashchange', () => {
      parseUrlHash();
      updateUI();
    });
  }
}

/**
 * Handle keyboard navigation
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardNavigation(event) {
  // Don't interfere with form inputs
  if (event.target.matches('input, textarea, select')) {
    return;
  }

  const items = getCurrentItems();

  switch (event.key) {
    case 'ArrowLeft':
      if (state.currentItem > 0) {
        event.preventDefault();
        selectItem(state.currentItem - 1);
        focusItem(state.currentItem);
      }
      break;

    case 'ArrowRight':
      if (state.currentItem < items.length - 1) {
        event.preventDefault();
        selectItem(state.currentItem + 1);
        focusItem(state.currentItem);
      }
      break;

    case 'ArrowUp':
      if (state.currentItem >= 5) {
        event.preventDefault();
        selectItem(state.currentItem - 5);
        focusItem(state.currentItem);
      }
      break;

    case 'ArrowDown':
      if (state.currentItem + 5 < items.length) {
        event.preventDefault();
        selectItem(state.currentItem + 5);
        focusItem(state.currentItem);
      }
      break;
  }
}

/**
 * Focus an item in the grid
 * @param {number} index - Item index to focus
 */
function focusItem(index) {
  const items = elements.itemsGrid.querySelectorAll('.item');
  if (items[index]) {
    items[index].focus();
  }
}

// ===== START APPLICATION =====

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
