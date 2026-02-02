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
  isLoading: false,
  searchQuery: '',
  searchResults: [],
  searchSelectedIndex: -1,
  showSearchDropdown: false,
  favorites: [] // Array of pinned items: [{categoryIndex, subcategoryIndex, itemIndex, item}]
};

// ===== DOM ELEMENT REFERENCES =====
const elements = {
  categoryList: null,
  subcategories: null,
  itemsGrid: null,
  infoPanel: null,
  imagePanel: null,
  mainContent: null,
  searchInput: null,
  searchContainer: null,
  searchResults: null,
  shareButton: null,
  breadcrumb: null
};

// ===== FAVORITES MANAGEMENT =====

/**
 * Load favorites from localStorage
 */
function loadFavorites() {
  try {
    const saved = localStorage.getItem('aoh-favorites');
    if (saved) {
      state.favorites = JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Failed to load favorites:', error);
    state.favorites = [];
  }
}

/**
 * Save favorites to localStorage
 */
function saveFavorites() {
  try {
    localStorage.setItem('aoh-favorites', JSON.stringify(state.favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
  }
}

/**
 * Check if current item is pinned
 * @returns {boolean} True if pinned
 */
function isItemPinned() {
  if (state.currentCategory === -1) return false;
  
  return state.favorites.some(fav => 
    fav.categoryIndex === state.currentCategory &&
    fav.subcategoryIndex === state.currentSubcategory &&
    fav.itemIndex === state.currentItem
  );
}

/**
 * Toggle pin status of current item
 */
function togglePin() {
  if (state.currentCategory === -1) return;
  
  const item = getCurrentItem();
  if (!item) return;
  
  const existingIndex = state.favorites.findIndex(fav =>
    fav.categoryIndex === state.currentCategory &&
    fav.subcategoryIndex === state.currentSubcategory &&
    fav.itemIndex === state.currentItem
  );
  
  if (existingIndex >= 0) {
    // Unpin
    state.favorites.splice(existingIndex, 1);
    showToast(`${item.name} removed from favorites`, 'info', 2000);
  } else {
    // Pin
    state.favorites.push({
      categoryIndex: state.currentCategory,
      subcategoryIndex: state.currentSubcategory,
      itemIndex: state.currentItem,
      item: {
        name: item.name,
        avatar: item.avatar,
        image: item.image,
        info: item.info
      }
    });
    showToast(`${item.name} added to favorites`, 'success', 2000);
  }
  
  saveFavorites();
  updateUI();
}

/**
 * Toggle pin status of item by index (for grid pin buttons)
 * @param {number} itemIndex - Index of the item in current items array
 */
function togglePinByIndex(itemIndex) {
  const items = getCurrentItems();
  const item = items[itemIndex];
  if (!item) return;
  
  // Handle Favorites category differently
  if (state.currentCategory === -1) {
    // In Favorites view, itemIndex corresponds to favorites array index
    if (itemIndex >= 0 && itemIndex < state.favorites.length) {
      const fav = state.favorites[itemIndex];
      state.favorites.splice(itemIndex, 1);
      showToast(`${fav.item.name} removed from favorites`, 'info', 2000);
      saveFavorites();
      renderCategories(); // Update favorites list in sidebar
      renderItemsGrid(); // Re-render grid to update pin button state
    }
    return;
  }
  
  const existingIndex = state.favorites.findIndex(fav =>
    fav.categoryIndex === state.currentCategory &&
    fav.subcategoryIndex === state.currentSubcategory &&
    fav.itemIndex === itemIndex
  );
  
  if (existingIndex >= 0) {
    // Unpin
    state.favorites.splice(existingIndex, 1);
    showToast(`${item.name} removed from favorites`, 'info', 2000);
  } else {
    // Pin
    state.favorites.push({
      categoryIndex: state.currentCategory,
      subcategoryIndex: state.currentSubcategory,
      itemIndex: itemIndex,
      item: {
        name: item.name,
        avatar: item.avatar,
        image: item.image,
        info: item.info
      }
    });
    showToast(`${item.name} added to favorites`, 'success', 2000);
  }
  
  saveFavorites();
  renderCategories(); // Update favorites list in sidebar
  renderItemsGrid(); // Re-render grid to update pin button state
}

/**
 * Select a favorite item (navigate to it)
 * @param {number} favIndex - Index in favorites array
 */
function selectFavorite(favIndex) {
  const fav = state.favorites[favIndex];
  if (!fav) return;
  
  // Navigate to the actual item
  state.currentCategory = fav.categoryIndex;
  state.currentSubcategory = fav.subcategoryIndex;
  state.currentItem = fav.itemIndex;
  
  updateUI();
}

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
    elements.searchInput = document.getElementById('search-input');
    elements.searchContainer = document.getElementById('search-container');
    elements.searchResults = document.getElementById('search-results');
    elements.shareButton = document.getElementById('share-button');
    elements.breadcrumb = document.getElementById('breadcrumb');

    // Show loading state
    showLoading();

    // Load manifest data
    const response = await fetch(CONFIG.manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.statusText}`);
    }
    state.manifest = await response.json();
    
    // Validate manifest
    if (!state.manifest || !state.manifest.categories || !Array.isArray(state.manifest.categories)) {
      throw new Error('Invalid manifest structure');
    }
    
    // Load favorites from localStorage
    loadFavorites();

    // Parse URL hash for initial state (if routing enabled)
    if (CONFIG.enableUrlRouting) {
      parseUrlHash();
    }

    // Render initial UI immediately - images will load progressively
    updateUI();

    // Setup event listeners
    setupEventListeners();

    // Hide loading state - UI is ready
    hideLoading();

    // Start progressive image loading in background (non-blocking)
    if (CONFIG.preloadImages) {
      preloadImagesProgressively().catch(error => {
        console.warn('Progressive image preload encountered errors:', error);
      });
    }

  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to load the database. Please refresh the page.', 'error', 0);
    hideLoading();
  }
}

/**
 * Preload images progressively - loads one at a time without blocking UI
 * Prioritizes currently visible items first
 * @returns {Promise<void>}
 */
async function preloadImagesProgressively() {
  const imagesToLoad = [];
  const priorityImages = [];

  state.manifest.categories.forEach((category, catIndex) => {
    // Skip categories without subcategories
    if (!category.subcategories || !Array.isArray(category.subcategories)) {
      return;
    }
    
    category.subcategories.forEach((subcategory, subIndex) => {
      // Add subcategory thumbnails
      if (subcategory.thumbnail) {
        imagesToLoad.push(subcategory.thumbnail);
      }

      // Skip subcategories without items
      if (!subcategory.items || !Array.isArray(subcategory.items)) {
        return;
      }

      // Add item avatars and images
      subcategory.items.forEach((item, itemIndex) => {
        const images = [];
        if (item.avatar) images.push(item.avatar);
        if (item.image) images.push(item.image);
        
        // Prioritize currently visible category/subcategory
        if (catIndex === state.currentCategory && subIndex === state.currentSubcategory) {
          priorityImages.push(...images);
        } else {
          imagesToLoad.push(...images);
        }
      });
    });
  });

  // Load priority images first (currently visible items)
  for (const src of priorityImages) {
    await loadImage(src);
  }

  // Then load remaining images one by one
  for (const src of imagesToLoad) {
    await loadImage(src);
  }
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
  try {
    renderCategories();
    renderItemsGrid();
    renderInfoPanel();
    renderImagePanel();

    // Update URL hash if routing enabled
    if (CONFIG.enableUrlRouting) {
      updateUrlHash();
    }

    // Update ARIA live region for screen readers
    announceSelection();
  } catch (error) {
    console.error('UI update error:', error);
    // Don't show toast - this is expected with empty categories
  }
}

/**
 * Render category navigation buttons in sidebar with tree structure
 */
function renderCategories() {
  elements.categoryList.innerHTML = '';
  
  // Add Favorites category first
  const favButton = document.createElement('button');
  favButton.className = 'category';
  favButton.innerHTML = '<i class="fas fa-thumbtack"></i> Favorites';
  favButton.setAttribute('role', 'tab');
  favButton.setAttribute('aria-selected', state.currentCategory === -1 ? 'true' : 'false');
  favButton.setAttribute('tabindex', state.currentCategory === -1 ? '0' : '-1');
  favButton.id = 'category-favorites';
  
  if (state.currentCategory === -1) {
    favButton.classList.add('selected');
  }
  
  favButton.addEventListener('click', () => selectCategory(-1));
  elements.categoryList.appendChild(favButton);
  
  // Add favorites tree if selected
  if (state.currentCategory === -1) {
    const tree = document.createElement('div');
    tree.className = 'subcategories-tree show';
    
    state.favorites.forEach((fav, favIndex) => {
      const subItem = document.createElement('div');
      subItem.className = 'subcat-item';
      subItem.setAttribute('role', 'button');
      subItem.setAttribute('tabindex', '0');
      subItem.setAttribute('aria-label', fav.item.name);
      
      if (favIndex === state.currentSubcategory) {
        subItem.classList.add('selected');
      }
      
      // Use avatar instead of thumbnail
      if (fav.item.avatar && state.imageCache.has(fav.item.avatar)) {
        const img = state.imageCache.get(fav.item.avatar).cloneNode();
        img.alt = '';
        subItem.appendChild(img);
      }
      
      // Add item name
      const span = document.createElement('span');
      span.textContent = fav.item.name;
      subItem.appendChild(span);
      
      subItem.addEventListener('click', () => selectFavorite(favIndex));
      subItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectFavorite(favIndex);
        }
      });
      
      tree.appendChild(subItem);
    });
    
    elements.categoryList.appendChild(tree);
  }

  // Render regular categories
  state.manifest.categories.forEach((category, catIndex) => {
    // Create category button
    const button = document.createElement('button');
    button.className = 'category';
    button.textContent = category.name;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', catIndex === state.currentCategory ? 'true' : 'false');
    button.setAttribute('tabindex', catIndex === state.currentCategory ? '0' : '-1');
    button.id = `category-${catIndex}`;

    if (catIndex === state.currentCategory) {
      button.classList.add('selected');
    }

    button.addEventListener('click', () => selectCategory(catIndex));

    elements.categoryList.appendChild(button);

    // For desktop/tablet: Add subcategories tree if this category is selected (tree view)
    // This will be hidden in mobile view
    if (catIndex === state.currentCategory) {
      const tree = document.createElement('div');
      tree.className = 'subcategories-tree show';

      // Only render subcategories if they exist
      if (category.subcategories && Array.isArray(category.subcategories)) {
        category.subcategories.forEach((subcategory, subIndex) => {
          const subItem = document.createElement('div');
          subItem.className = 'subcat-item';
          subItem.setAttribute('role', 'button');
          subItem.setAttribute('tabindex', '0');
          subItem.setAttribute('aria-label', subcategory.name);

          if (subIndex === state.currentSubcategory) {
            subItem.classList.add('selected');
          }

          // Add thumbnail if available
          if (subcategory.thumbnail && state.imageCache.has(subcategory.thumbnail)) {
            const img = state.imageCache.get(subcategory.thumbnail).cloneNode();
            img.alt = '';
            subItem.appendChild(img);
          }

          // Add subcategory name
          const span = document.createElement('span');
          span.textContent = subcategory.name;
          subItem.appendChild(span);

          subItem.addEventListener('click', () => selectSubcategory(subIndex));
          subItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectSubcategory(subIndex);
            }
          });

          tree.appendChild(subItem);
        });
      }

      elements.categoryList.appendChild(tree);
    }
  });
  
  // Render subcategories separately for mobile view
  renderSubcategories();
}

/**
 * Render subcategory navigation bar (for mobile view)
 */
function renderSubcategories() {
  elements.subcategories.innerHTML = '';
  
  // Handle Favorites category
  if (state.currentCategory === -1) {
    state.favorites.forEach((fav, favIndex) => {
      const button = document.createElement('button');
      button.className = 'subcat';
      button.textContent = fav.item.name;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', favIndex === state.currentSubcategory ? 'true' : 'false');
      button.setAttribute('tabindex', '0');
      
      if (favIndex === state.currentSubcategory) {
        button.classList.add('selected');
      }
      
      // Add avatar if available
      if (fav.item.avatar && state.imageCache.has(fav.item.avatar)) {
        const img = state.imageCache.get(fav.item.avatar).cloneNode();
        img.alt = '';
        img.className = 'subcat-icon';
        button.insertBefore(img, button.firstChild);
      }
      
      button.addEventListener('click', () => selectFavorite(favIndex));
      
      elements.subcategories.appendChild(button);
    });
    return;
  }
  
  const category = state.manifest.categories[state.currentCategory];
  if (!category || !category.subcategories || !Array.isArray(category.subcategories)) {
    return;
  }
  
  category.subcategories.forEach((subcategory, subIndex) => {
    const button = document.createElement('button');
    button.className = 'subcat';
    button.textContent = subcategory.name;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', subIndex === state.currentSubcategory ? 'true' : 'false');
    button.setAttribute('tabindex', '0');
    
    if (subIndex === state.currentSubcategory) {
      button.classList.add('selected');
    }
    
    // Add thumbnail if available
    if (subcategory.thumbnail && state.imageCache.has(subcategory.thumbnail)) {
      const img = state.imageCache.get(subcategory.thumbnail).cloneNode();
      img.alt = '';
      img.className = 'subcat-icon';
      button.insertBefore(img, button.firstChild);
    }
    
    button.addEventListener('click', () => selectSubcategory(subIndex));
    
    elements.subcategories.appendChild(button);
  });
}

/**
 * Render items grid
 */
function renderItemsGrid() {
  elements.itemsGrid.innerHTML = '';

  const items = getCurrentItems();

  if (items.length === 0) {
    showEmptyState(elements.itemsGrid, state.currentCategory === -1 ? 'No favorite items yet. Pin items to see them here!' : 'No items found in this category.');
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

    // Add avatar image with progressive loading
    if (item.avatar) {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'avatar-container';
      
      if (state.imageCache.has(item.avatar)) {
        // Image already loaded
        const img = state.imageCache.get(item.avatar).cloneNode();
        img.alt = `${item.name} avatar`;
        imgContainer.appendChild(img);
      } else {
        // Show loading placeholder, load image in background
        const placeholder = document.createElement('div');
        placeholder.className = 'avatar-placeholder loading';
        placeholder.textContent = '⏳';
        placeholder.setAttribute('aria-label', 'Loading...');
        imgContainer.appendChild(placeholder);
        
        // Load image asynchronously
        loadImage(item.avatar).then(loadedImg => {
          if (loadedImg) {
            placeholder.className = 'avatar-placeholder';
            placeholder.textContent = '';
            const img = loadedImg.cloneNode();
            img.alt = `${item.name} avatar`;
            imgContainer.appendChild(img);
            // Fade in effect
            setTimeout(() => {
              if (placeholder.parentNode) {
                placeholder.remove();
              }
            }, 100);
          } else {
            placeholder.className = 'avatar-placeholder error';
            placeholder.textContent = '?';
            placeholder.setAttribute('aria-label', 'Image failed to load');
          }
        });
      }
      element.appendChild(imgContainer);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'avatar-placeholder';
      placeholder.textContent = '?';
      placeholder.setAttribute('aria-label', 'No image available');
      element.appendChild(placeholder);
    }

    // Add pin button (show in all categories including Favorites)
    let isPinned;
    if (state.currentCategory === -1) {
      // In Favorites, all items are pinned by definition
      isPinned = true;
    } else {
      // In other categories, check if item exists in favorites
      isPinned = state.favorites.some(fav =>
        fav.categoryIndex === state.currentCategory &&
        fav.subcategoryIndex === state.currentSubcategory &&
        fav.itemIndex === index
      );
    }
    
    const pinButton = document.createElement('button');
    pinButton.className = isPinned ? 'pin-icon pinned' : 'pin-icon';
    pinButton.setAttribute('aria-label', isPinned ? 'Unpin from favorites' : 'Pin to favorites');
    pinButton.title = isPinned ? 'Remove from favorites' : 'Add to favorites';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-thumbtack';
    pinButton.appendChild(icon);
    
    pinButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent item selection when clicking pin
      togglePinByIndex(index);
    });
    
    element.appendChild(pinButton);

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
    // Show loading state while image loads
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'image-loading';
    loadingDiv.innerHTML = '<div class="spinner">⏳</div><p>Loading image...</p>';
    elements.imagePanel.appendChild(loadingDiv);
    
    // Load image asynchronously
    loadImage(item.image).then(loadedImg => {
      if (loadedImg && getCurrentItem() === item) {
        // Only update if still viewing the same item
        elements.imagePanel.innerHTML = '';
        const img = loadedImg.cloneNode();
        img.alt = `${item.name} full image`;
        elements.imagePanel.appendChild(img);
      } else if (getCurrentItem() === item) {
        elements.imagePanel.innerHTML = '';
        showEmptyState(elements.imagePanel, 'Image failed to load.');
      }
    });
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
  
  // Handle Favorites category
  if (index === -1) {
    state.currentSubcategory = state.favorites.length > 0 ? 0 : -1;
    state.currentItem = state.favorites.length > 0 ? 0 : -1;
    updateUI();
    return;
  }
  
  // Reset subcategory and item - but check if subcategories exist
  const category = state.manifest.categories[index];
  if (category && category.subcategories && category.subcategories.length > 0) {
    state.currentSubcategory = 0;
    state.currentItem = 0;
  } else {
    // No subcategories - reset to -1 to indicate none selected
    state.currentSubcategory = -1;
    state.currentItem = -1;
  }

  updateUI();
}

/**
 * Select a subcategory
 * @param {number} index - Subcategory index
 */
function selectSubcategory(index) {
  if (index === state.currentSubcategory) return;

  state.currentSubcategory = index;
  
  // Check if subcategory has items
  const category = state.manifest.categories[state.currentCategory];
  const subcategory = category?.subcategories?.[index];
  if (subcategory?.items && subcategory.items.length > 0) {
    state.currentItem = 0;
  } else {
    state.currentItem = -1; // No items available
  }

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
  // Handle Favorites category
  if (state.currentCategory === -1) {
    return state.favorites.map(fav => fav.item);
  }
  
  const category = state.manifest.categories[state.currentCategory];
  if (!category || !category.subcategories || !Array.isArray(category.subcategories)) {
    return [];
  }
  
  // Handle case where no subcategory is selected
  if (state.currentSubcategory < 0 || state.currentSubcategory >= category.subcategories.length) {
    return [];
  }
  
  const subcategory = category.subcategories[state.currentSubcategory];
  if (!subcategory || !subcategory.items || !Array.isArray(subcategory.items)) {
    return [];
  }
  
  return subcategory.items;
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
/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast: 'error', 'success', 'warning', 'info'
 * @param {number} duration - Duration in ms (0 = manual close only)
 */
function showToast(message, type = 'info', duration = 5000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  
  // Add icon based on type
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  
  switch(type) {
    case 'error':
      icon.textContent = '✕';
      break;
    case 'success':
      icon.textContent = '✓';
      break;
    case 'warning':
      icon.textContent = '⚠';
      break;
    case 'info':
    default:
      icon.textContent = 'ℹ';
      break;
  }
  
  // Add message
  const messageEl = document.createElement('div');
  messageEl.className = 'toast-message';
  messageEl.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => dismissToast(toast));
  
  toast.appendChild(icon);
  toast.appendChild(messageEl);
  toast.appendChild(closeBtn);
  
  container.appendChild(toast);
  
  // Auto-dismiss after duration (if duration > 0)
  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }
  
  return toast;
}

/**
 * Dismiss a toast notification
 * @param {HTMLElement} toast - Toast element to dismiss
 */
function dismissToast(toast) {
  if (!toast || !toast.parentElement) return;
  
  toast.classList.add('hiding');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300); // Match animation duration
}

/**
 * Show error message (deprecated - use showToast instead)
 * @deprecated Use showToast(message, 'error') instead
 */
function showError(message) {
  showToast(message, 'error', 0); // No auto-dismiss for errors
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
  try {
    const item = getCurrentItem();
    const category = state.manifest.categories[state.currentCategory];
    
    if (!category) return;
    
    const categoryName = category.name;
    let subcategoryName = '';
    
    // Safely get subcategory name
    if (category.subcategories && 
        category.subcategories[state.currentSubcategory]) {
      subcategoryName = category.subcategories[state.currentSubcategory].name;
    }

    const announcement = item
      ? `Selected ${item.name} in ${categoryName}${subcategoryName ? ', ' + subcategoryName : ''}`
      : `Viewing ${categoryName}${subcategoryName ? ', ' + subcategoryName : ''}`;

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
  } catch (error) {
    console.warn('Announce selection failed:', error);
    // Don't propagate error - this is non-critical
  }
}

// ===== SEARCH FUNCTIONALITY =====

/**
 * Search across entire database
 * @param {string} query - Search query
 */
function searchAllDatabase(query) {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    state.searchResults = [];
    state.showSearchDropdown = false;
    renderSearchResults();
    return;
  }
  
  const results = [];
  
  try {
    // Search through all categories and subcategories
    state.manifest.categories.forEach((category, catIndex) => {
      // Skip categories without subcategories
      if (!category.subcategories || !Array.isArray(category.subcategories)) {
        return;
      }
      
      category.subcategories.forEach((subcategory, subIndex) => {
        // Check if subcategory name matches
        const subcatMatches = subcategory.name.toLowerCase().includes(searchTerm);
        
        // Skip subcategories without items
        if (!subcategory.items || !Array.isArray(subcategory.items) || subcategory.items.length === 0) {
          // Still add subcategory to results if it matches search (even if empty)
          if (subcatMatches) {
            results.push({
              type: 'subcategory',
              category: category.name,
              categoryIndex: catIndex,
              subcategory: subcategory.name,
              subcategoryIndex: subIndex,
              thumbnail: subcategory.thumbnail,
              path: `${category.name} › ${subcategory.name}`,
              itemCount: 0
            });
          }
          return;
        }
        
        // Track if we've added this subcategory already
        let subcategoryAdded = false;
        
        // Search through items
        subcategory.items.forEach((item, itemIndex) => {
          const searchableText = [
            item.name,
            subcategory.name,
            category.name,
            item.info || ''
          ].join(' ').toLowerCase();
          
          const itemMatches = searchableText.includes(searchTerm);
          
          if (itemMatches) {
            results.push({
              type: 'item',
              category: category.name,
              categoryIndex: catIndex,
              subcategory: subcategory.name,
              subcategoryIndex: subIndex,
              item: item,
              itemIndex: itemIndex,
              path: `${category.name} › ${subcategory.name}`,
              matchedSubcategory: subcatMatches
            });
            
            // If subcategory matches and we haven't added it yet, add it once
            if (subcatMatches && !subcategoryAdded) {
              results.push({
                type: 'subcategory',
                category: category.name,
                categoryIndex: catIndex,
                subcategory: subcategory.name,
                subcategoryIndex: subIndex,
                thumbnail: subcategory.thumbnail,
                path: `${category.name}`,
                itemCount: subcategory.items.length
              });
              subcategoryAdded = true;
            }
          }
        });
      });
    });
  } catch (error) {
    console.error('Search error:', error);
    showToast('Search failed. Please try again.', 'error', 3000);
    return;
  }
  
  state.searchResults = results;
  state.searchSelectedIndex = results.length > 0 ? 0 : -1;
  state.showSearchDropdown = true;
  
  renderSearchResults();
}

/**
 * Render search results dropdown
 */
function renderSearchResults() {
  if (!elements.searchResults) return;
  
  if (!state.showSearchDropdown || state.searchResults.length === 0) {
    elements.searchResults.classList.remove('show');
    
    if (state.searchQuery && state.searchResults.length === 0) {
      elements.searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
      elements.searchResults.classList.add('show');
    } else {
      elements.searchResults.innerHTML = '';
    }
    return;
  }
  
  elements.searchResults.innerHTML = '';
  
  state.searchResults.forEach((result, index) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('role', 'option');
    item.setAttribute('data-index', index);
    
    if (index === state.searchSelectedIndex) {
      item.classList.add('selected');
      item.setAttribute('aria-selected', 'true');
    } else {
      item.setAttribute('aria-selected', 'false');
    }
    
    // Avatar/thumbnail
    const avatar = document.createElement('img');
    avatar.className = 'search-result-avatar';
    
    if (result.type === 'item' && result.item.avatar && state.imageCache.has(result.item.avatar)) {
      avatar.src = result.item.avatar;
      avatar.alt = '';
    } else if (result.type === 'subcategory' && result.thumbnail && state.imageCache.has(result.thumbnail)) {
      avatar.src = result.thumbnail;
      avatar.alt = '';
    } else {
      avatar.style.background = 'var(--bg-secondary)';
    }
    
    item.appendChild(avatar);
    
    // Info
    const info = document.createElement('div');
    info.className = 'search-result-info';
    
    const name = document.createElement('div');
    name.className = 'search-result-name';
    name.textContent = result.type === 'item' ? result.item.name : result.subcategory;
    
    const path = document.createElement('div');
    path.className = 'search-result-path';
    path.textContent = result.path + (result.type === 'subcategory' ? ` (${result.itemCount} items)` : '');
    
    info.appendChild(name);
    info.appendChild(path);
    item.appendChild(info);
    
    // Click handler
    item.addEventListener('click', () => selectSearchResult(index));
    
    elements.searchResults.appendChild(item);
  });
  
  elements.searchResults.classList.add('show');
}

/**
 * Select a search result
 * @param {number} index - Result index
 */
function selectSearchResult(index) {
  const result = state.searchResults[index];
  
  if (!result) return;
  
  // Navigate to the result
  if (result.type === 'item') {
    state.currentCategory = result.categoryIndex;
    state.currentSubcategory = result.subcategoryIndex;
    state.currentItem = result.itemIndex;
  } else if (result.type === 'subcategory') {
    state.currentCategory = result.categoryIndex;
    state.currentSubcategory = result.subcategoryIndex;
    // Check if subcategory has items
    const category = state.manifest.categories[result.categoryIndex];
    const subcategory = category?.subcategories?.[result.subcategoryIndex];
    if (subcategory?.items && subcategory.items.length > 0) {
      state.currentItem = 0;
    } else {
      state.currentItem = -1; // No items available
    }
  }
  
  // Clear search
  state.searchQuery = '';
  state.searchResults = [];
  state.showSearchDropdown = false;
  elements.searchInput.value = '';
  
  // Update UI
  updateUI();
  renderSearchResults();
  
  // Scroll to top
  if (elements.mainContent) {
    document.getElementById('main').scrollTop = 0;
  }
}

/**
 * Handle search input
 * @param {string} query - Search query
 */
function handleSearch(query) {
  state.searchQuery = query;
  searchAllDatabase(query);
}

/**
 * Navigate search results with keyboard
 * @param {number} direction - -1 for up, 1 for down
 */
function navigateSearchResults(direction) {
  if (state.searchResults.length === 0) return;
  
  state.searchSelectedIndex += direction;
  
  if (state.searchSelectedIndex < 0) {
    state.searchSelectedIndex = state.searchResults.length - 1;
  } else if (state.searchSelectedIndex >= state.searchResults.length) {
    state.searchSelectedIndex = 0;
  }
  
  renderSearchResults();
  
  // Scroll selected item into view
  const selected = elements.searchResults.querySelector('.search-result-item.selected');
  if (selected) {
    selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/**
 * Show search results count (DEPRECATED)
 */
function showSearchResults(found, total) {
  // Search now uses dropdown, this is no longer needed
  return;
}

// ===== BREADCRUMB NAVIGATION (DEPRECATED) =====

/**
 * Render breadcrumb navigation (DEPRECATED - hidden)
 */
function renderBreadcrumb() {
  // Breadcrumbs are hidden for now
  return;
}

// ===== SHARE FUNCTIONALITY =====

/**
 * Share current character
 */
function shareCharacter() {
  const item = getCurrentItem();
  if (!item) return;
  
  const category = state.manifest.categories[state.currentCategory].name;
  const subcategory = state.manifest.categories[state.currentCategory]
    .subcategories[state.currentSubcategory].name;
  
  const url = window.location.href;
  const title = `${item.name} - ${category}`;
  const text = `Check out ${item.name} from ${subcategory} in the Academy of Heroes database!`;
  
  // Try native share API first (mobile)
  if (navigator.share) {
    navigator.share({
      title: title,
      text: text,
      url: url
    }).catch(err => console.log('Share cancelled', err));
  } else {
    // Fallback: copy to clipboard
    copyToClipboard(url);
    showShareTooltip('Link copied to clipboard!');
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Show share tooltip (deprecated - use showToast instead)
 * @deprecated Use showToast(message, 'success') instead
 * @param {string} message - Message to display
 */
function showShareTooltip(message) {
  showToast(message, 'success', 2000);
}

// ===== URL ROUTING (HASH-BASED) =====

/**
 * Parse URL hash and update state
 */
function parseUrlHash() {
  const hash = window.location.hash.slice(1); // Remove '#'
  if (!hash) return;

  const [cat, subcat, item] = hash.split('/').map(Number);

  try {
    if (!isNaN(cat) && cat >= 0 && cat < state.manifest.categories.length) {
      state.currentCategory = cat;

      const category = state.manifest.categories[cat];
      const subcategories = category.subcategories;
      
      if (subcategories && Array.isArray(subcategories) &&
          !isNaN(subcat) && subcat >= 0 && subcat < subcategories.length) {
        state.currentSubcategory = subcat;

        const items = subcategories[subcat].items;
        if (items && Array.isArray(items) &&
            !isNaN(item) && item >= 0 && item < items.length) {
          state.currentItem = item;
        } else {
          // No items or invalid item index
          state.currentItem = -1;
        }
      } else {
        // No subcategories or invalid subcategory index
        state.currentSubcategory = -1;
        state.currentItem = -1;
      }
    }
  } catch (error) {
    console.warn('Failed to parse URL hash:', error);
    // Reset to defaults
    state.currentCategory = 0;
    state.currentSubcategory = 0;
    state.currentItem = 0;
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
  
  // Search input
  if (elements.searchInput) {
    let searchTimeout;
    
    elements.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        handleSearch(e.target.value);
      }, 300); // Debounce 300ms
    });
    
    // Keyboard navigation in search
    elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.target.value = '';
        state.searchQuery = '';
        state.searchResults = [];
        state.showSearchDropdown = false;
        renderSearchResults();
        e.target.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (state.showSearchDropdown) {
          navigateSearchResults(1);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state.showSearchDropdown) {
          navigateSearchResults(-1);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.showSearchDropdown && state.searchSelectedIndex >= 0) {
          selectSearchResult(state.searchSelectedIndex);
        }
      }
    });
  }
  
  // Hash change for URL routing
  if (CONFIG.enableUrlRouting) {
    window.addEventListener('hashchange', parseUrlHash);
  }
  
  // Click outside to close search dropdown
  document.addEventListener('click', (e) => {
    if (elements.searchResults && 
        !elements.searchContainer.contains(e.target) && 
        !elements.searchResults.contains(e.target)) {
      state.showSearchDropdown = false;
      renderSearchResults();
    }
  });
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
