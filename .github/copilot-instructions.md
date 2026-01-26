---
description: 'Best practices for HTML website development including semantic markup, accessibility, performance, and modern web standards'
applyTo: '**/*.html, **/*.css, **/*.js'
---

# Web Development Best Practices

Guidelines for building high-quality, accessible, and performant HTML websites following modern web standards.

## General Instructions

- Write semantic HTML5 markup
- Ensure accessibility compliance (WCAG 2.1 Level AA minimum)
- Optimize for performance and fast page load times
- Support responsive design for all screen sizes
- Use progressive enhancement principles
- Validate HTML and CSS using W3C validators
- Test across multiple browsers and devices

## HTML Best Practices

### Semantic Markup

- Use appropriate HTML5 semantic elements
- Structure content logically with headings (h1-h6)
- Use landmarks: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- Prefer semantic elements over generic `<div>` and `<span>` when appropriate

```html
<!-- Good Example -->
<article class="blog-post">
  <header>
    <h1>Article Title</h1>
    <time datetime="2026-01-26">January 26, 2026</time>
  </header>
  <section>
    <p>Article content goes here...</p>
  </section>
  <footer>
    <p>Author: John Doe</p>
  </footer>
</article>

<!-- Bad Example -->
<div class="blog-post">
  <div class="header">
    <div class="title">Article Title</div>
    <div class="date">January 26, 2026</div>
  </div>
  <div class="content">
    <div>Article content goes here...</div>
  </div>
</div>
```

### Document Structure

- Include proper DOCTYPE: `<!DOCTYPE html>`
- Set language attribute: `<html lang="en">`
- Include complete `<head>` section with meta tags
- Use one `<main>` element per page
- Maintain logical heading hierarchy (don't skip levels)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Page description for SEO">
  <title>Page Title - Site Name</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <nav><!-- Navigation --></nav>
  </header>
  <main>
    <!-- Primary content -->
  </main>
  <footer>
    <!-- Footer content -->
  </footer>
</body>
</html>
```

### Forms and Input

- Always use `<label>` elements with form inputs
- Associate labels with inputs using `for` attribute or wrapping
- Include proper `type` attributes for inputs
- Use `required`, `pattern`, and other validation attributes
- Provide clear error messages and validation feedback
- Group related form elements with `<fieldset>` and `<legend>`

```html
<!-- Good Example -->
<form action="/submit" method="post">
  <fieldset>
    <legend>Contact Information</legend>
    
    <label for="name">Full Name *</label>
    <input type="text" id="name" name="name" required>
    
    <label for="email">Email Address *</label>
    <input type="email" id="email" name="email" required>
    
    <label for="phone">Phone Number</label>
    <input type="tel" id="phone" name="phone" pattern="[0-9]{10}">
  </fieldset>
  
  <button type="submit">Submit</button>
</form>

<!-- Bad Example -->
<form>
  Name: <input type="text" name="name"><br>
  Email: <input name="email"><br>
  <input type="submit">
</form>
```

## CSS Best Practices

### Organization and Structure

- Use external stylesheets instead of inline styles
- Organize CSS logically (reset, layout, components, utilities)
- Use CSS custom properties (variables) for consistent theming
- Follow a naming convention (BEM, SMACSS, or similar)
- Keep specificity low to avoid cascade issues

```css
/* Good Example - Using CSS Variables */
:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --spacing-unit: 8px;
  --font-family-base: 'Segoe UI', Arial, sans-serif;
}

.button {
  background-color: var(--color-primary);
  padding: calc(var(--spacing-unit) * 2);
  font-family: var(--font-family-base);
}

/* Bad Example - Magic Numbers and Inline Values */
.button {
  background-color: #007bff;
  padding: 16px;
  font-family: Arial;
}
```

### Responsive Design

- Use mobile-first approach with min-width media queries
- Implement fluid layouts with flexbox or grid
- Use relative units (rem, em, %, vw, vh) over fixed pixels
- Test breakpoints at common device sizes
- Avoid horizontal scrolling

```css
/* Good Example - Mobile First */
.container {
  padding: 1rem;
  max-width: 100%;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* Grid Layout */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
```

### Performance

- Minimize CSS file size
- Avoid expensive selectors (universal, deep nesting)
- Use shorthand properties where appropriate
- Reduce redundancy and unused CSS
- Load critical CSS inline for above-the-fold content

## HTML CSS Style Color Guide

Follow these guidelines when updating or creating HTML/CSS styles for browser rendering. Color names
represent the full spectrum of their respective hue ranges (e.g., "blue" includes navy, sky blue, etc.).

### Color Definitions

- **Hot Colors**: Oranges, reds, and yellows
- **Cool Colors**: Blues, greens, and purples
- **Neutral Colors**: Grays and grayscale variations
- **Binary Colors**: Black and white
- **60-30-10 Rule**
  - **Primary Color**: Use 60% of the time (*cool or light color*)
  - **Secondary Color**: Use 30% of the time (*cool or light color*)
  - **Accent**: Use 10% of the time (*complementary hot color*)

### Color Usage Guidelines

Balance the colors used by applying the **60-30-10 rule** to graphic design elements like backgrounds,
buttons, cards, etc...

#### Background Colors

**Never Use:**

- Purple or magenta
- Red, orange, or yellow
- Pink
- Any hot color

**Recommended:**

- White or off-white
- Light cool colors (e.g., light blues, light greens)
- Subtle neutral tones
- Light gradients with minimal color shift

#### Text Colors

**Never Use:**

- Yellow (poor contrast and readability)
- Pink
- Pure white or light text on light backgrounds
- Pure black or dark text on dark backgrounds

**Recommended:**

- Dark neutral colors (e.g., #1f2328, #24292f)
- Near-black variations (#000000 to #333333)
  - Ensure background is a light color
- Dark grays (#4d4d4d, #6c757d)
- High-contrast combinations for accessibility
- Near-white variations (#ffffff to #f0f2f3)
  - Ensure background is a dark color

#### Colors to Avoid

Unless explicitly required by design specifications or user request, avoid:

- Bright purples and magentas
- Bright pinks and neon colors
- Highly saturated hot colors
- Colors with low contrast ratios (fails WCAG accessibility standards)

#### Colors to Use Sparingly

**Hot Colors** (red, orange, yellow):

- Reserve for critical alerts, warnings, or error messages
- Use only when conveying urgency or importance
- Limit to small accent areas rather than large sections
- Consider alternatives like icons or bold text before using hot colors

### Gradients

Apply gradients with subtle color transitions to maintain professional aesthetics.

#### Best Practices

- Keep color shifts minimal (e.g., #E6F2FF to #F5F7FA)
- Use gradients within the same color family
- Avoid combining hot and cool colors in a single gradient
- Prefer linear gradients over radial for backgrounds

#### Appropriate Use Cases

- Background containers and sections
- Button hover states and interactive elements
- Drop shadows and depth effects
- Header and navigation bars
- Card components and panels

### Additional Resources

- [Color Tool](https://civicactions.github.io/uswds-color-tool/)
- [Government or Professional Color Standards](https://designsystem.digital.gov/design-tokens/color/overview/)
- [UI Color Palette Best Practices](https://www.interaction-design.org/literature/article/ui-color-palette)
- [Color Combination Resource](https://www.figma.com/resource-library/color-combinations/)

## JavaScript Best Practices

### Code Quality

- Use strict mode: `'use strict';`
- Declare variables with `const` by default, `let` when reassignment needed
- Avoid `var` for variable declarations
- Use meaningful, descriptive variable names
- Keep functions small and focused on single responsibility
- Handle errors gracefully with try-catch

```javascript
// Good Example
'use strict';

const API_ENDPOINT = 'https://api.example.com';

async function fetchUserData(userId) {
  try {
    const response = await fetch(`${API_ENDPOINT}/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
}

// Bad Example
var endpoint = 'https://api.example.com';

function getData(id) {
  var r = fetch(endpoint + '/users/' + id);
  return r.json();
}
```

### DOM Manipulation

- Cache DOM queries in variables
- Use event delegation for dynamic content
- Minimize reflows and repaints
- Use `querySelector` and `querySelectorAll` for selection
- Add/remove classes instead of manipulating styles directly

```javascript
// Good Example
const button = document.querySelector('.submit-button');
const form = document.querySelector('#contact-form');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  button.classList.add('loading');
  
  // Handle form submission
  submitForm().then(() => {
    button.classList.remove('loading');
  });
});

// Bad Example
document.onclick = function(e) {
  if (e.target.className == 'submit-button') {
    document.getElementById('contact-form').style.opacity = '0.5';
    // Handle submission
  }
};
```

### Performance

- Load scripts with `defer` or `async` attributes
- Place `<script>` tags before closing `</body>` tag
- Debounce or throttle expensive operations
- Minimize global variables
- Use modern ES6+ features where supported

```html
<!-- Good Example -->
<body>
  <!-- Content -->
  
  <script src="app.js" defer></script>
</body>

<!-- Bad Example -->
<head>
  <script src="app.js"></script>
</head>
```

## Accessibility (a11y)

### Core Principles

- Provide text alternatives for images using `alt` attributes
- Ensure keyboard navigation works for all interactive elements
- Maintain sufficient color contrast (4.5:1 for normal text)
- Use ARIA attributes when semantic HTML is insufficient
- Support screen readers with descriptive labels
- Never remove focus outlines without providing alternatives

```html
<!-- Good Example -->
<button aria-label="Close dialog" class="close-button">
  <svg aria-hidden="true" focusable="false">
    <use xlink:href="#icon-close"></use>
  </svg>
</button>

<img src="product.jpg" alt="Blue running shoes with white laces">

<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<!-- Bad Example -->
<div onclick="closeDialog()">X</div>
<img src="product.jpg">
<div class="nav">
  <a href="/">Home</a>
  <a href="/about">About</a>
</div>
```

### Focus Management

- Ensure visible focus indicators
- Manage focus for modals and dynamic content
- Use `tabindex="0"` for custom interactive elements
- Use `tabindex="-1"` to programmatically focus non-interactive elements
- Never use positive tabindex values

## Performance Optimization

### Asset Optimization

- Compress and optimize images (WebP, AVIF formats)
- Use responsive images with `srcset` and `sizes`
- Lazy load images below the fold
- Minify CSS and JavaScript files
- Enable gzip/brotli compression
- Use browser caching headers

```html
<!-- Good Example - Responsive Images -->
<img 
  srcset="image-320w.jpg 320w,
          image-640w.jpg 640w,
          image-1280w.jpg 1280w"
  sizes="(max-width: 640px) 100vw,
         (max-width: 1280px) 50vw,
         33vw"
  src="image-640w.jpg"
  alt="Descriptive text"
  loading="lazy"
  width="640"
  height="480">
```

### Loading Strategy

- Prioritize above-the-fold content
- Defer non-critical resources
- Preload critical assets
- Use resource hints (preconnect, dns-prefetch)
- Implement code splitting for large JavaScript applications

```html
<head>
  <!-- Preconnect to external domains -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://analytics.example.com">
  
  <!-- Preload critical resources -->
  <link rel="preload" href="critical.css" as="style">
  <link rel="preload" href="hero-image.jpg" as="image">
</head>
```

## SEO Best Practices

- Use descriptive, unique `<title>` tags (50-60 characters)
- Include meta descriptions (150-160 characters)
- Use heading hierarchy properly (h1 for main title)
- Create descriptive URLs with hyphens
- Implement Open Graph and Twitter Card meta tags
- Add structured data using JSON-LD
- Create XML sitemap
- Use canonical URLs to prevent duplicate content

```html
<head>
  <title>Product Name - Category | Site Name</title>
  <meta name="description" content="Concise description of the page content that appears in search results.">
  
  <!-- Open Graph -->
  <meta property="og:title" content="Product Name">
  <meta property="og:description" content="Product description">
  <meta property="og:image" content="https://example.com/image.jpg">
  <meta property="og:url" content="https://example.com/product">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://example.com/product">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Product Name",
    "description": "Product description"
  }
  </script>
</head>
```

## Security Best Practices

- Validate and sanitize all user input
- Use HTTPS for all pages
- Implement Content Security Policy (CSP)
- Avoid inline JavaScript and CSS
- Use HTTP security headers
- Protect against XSS attacks
- Never trust client-side validation alone

```html
<!-- Good Example - CSP Header -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' https://trusted-cdn.com; style-src 'self' 'unsafe-inline';">
```

## Code Standards

### Naming Conventions

- Use lowercase with hyphens for CSS classes: `main-nav`, `hero-section`
- Use camelCase for JavaScript variables and functions: `userName`, `fetchData()`
- Use PascalCase for JavaScript classes: `UserProfile`
- Use UPPER_SNAKE_CASE for constants: `MAX_WIDTH`, `API_KEY`
- Use descriptive file names: `contact-form.html`, `navigation.css`

### File Organization

```
project/
├── index.html
├── about.html
├── css/
│   ├── reset.css
│   ├── main.css
│   └── components/
│       ├── header.css
│       └── footer.css
├── js/
│   ├── app.js
│   └── utils/
│       └── helpers.js
├── images/
│   └── optimized/
└── assets/
    ├── fonts/
    └── icons/
```

### Comments and Documentation

- Comment complex logic and non-obvious code
- Use JSDoc comments for JavaScript functions
- Document browser-specific hacks or workarounds
- Keep comments up to date with code changes
- Remove commented-out code before committing

```javascript
/**
 * Fetches user data from the API
 * @param {string} userId - The unique user identifier
 * @returns {Promise<Object>} User data object
 * @throws {Error} If the API request fails
 */
async function fetchUserData(userId) {
  // Implementation
}
```

## Testing and Validation

### Validation Tools

- Validate HTML: <https://validator.w3.org/>
- Validate CSS: <https://jigsaw.w3.org/css-validator/>
- Test accessibility: Lighthouse, axe DevTools
- Test performance: Google PageSpeed Insights, WebPageTest
- Check responsive design: Browser DevTools device mode

### Browser Testing

- Test on Chrome, Firefox, Safari, Edge
- Test on mobile devices (iOS Safari, Chrome Mobile)
- Verify graceful degradation for older browsers
- Use feature detection instead of browser detection
- Test with JavaScript disabled when possible

## Common Patterns

### Loading States

```html
<button class="submit-btn" data-state="idle">
  <span class="btn-text">Submit</span>
  <span class="btn-loader" aria-hidden="true"></span>
</button>
```

```css
.submit-btn[data-state="loading"] .btn-text {
  display: none;
}

.submit-btn[data-state="loading"] .btn-loader {
  display: inline-block;
}
```

### Skip Links for Accessibility

```html
<a href="#main-content" class="skip-link">Skip to main content</a>

<nav><!-- Navigation --></nav>

<main id="main-content">
  <!-- Content -->
</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}
```

### Progressive Enhancement

```html
<!-- Fallback for non-JS users -->
<noscript>
  <p class="warning">This site works best with JavaScript enabled.</p>
</noscript>

<!-- Basic functionality works without JS, enhanced with JS -->
<form action="/search" method="get" id="search-form">
  <input type="search" name="q" required>
  <button type="submit">Search</button>
</form>

<script>
  // Enhance with client-side search
  document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Client-side search logic
  });
</script>
```

## Validation Commands

- HTML validation: Use W3C Validator or `html-validator-cli`
- CSS validation: Use W3C CSS Validator or `stylelint`
- JavaScript linting: `eslint` or `jshint`
- Accessibility: `pa11y` or Lighthouse CLI
- Performance: Lighthouse CLI

## Additional Resources

- <a href="https://developer.mozilla.org/en-US/">MDN Web Docs</a>
- <a href="https://www.w3.org/WAI/WCAG21/quickref/">WCAG Quick Reference</a>
- <a href="https://web.dev/">web.dev by Google</a>
- <a href="https://html5boilerplate.com/">HTML5 Boilerplate</a>
