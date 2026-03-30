// OptimizedImage.js - Reusable image component for ImageKit optimization
// HOTLINKING PROTECTION GUIDANCE (CRITICAL FOR BANDWIDTH CONTROL):
// ImageKit hotlink protection is ESSENTIAL to prevent bandwidth abuse and reduce costs.
// Without it, anyone can embed your images elsewhere, consuming your CDN quota.
//
// SETUP STEPS:
// 1. Go to ImageKit Dashboard > Settings > Security
// 2. Enable "Restrict image access" (or "Origin restrictions" in newer versions)
// 3. Add allowed domains:
//    - Production: https://yourdomain.com, https://www.yourdomain.com
//    - Vercel: https://*.vercel.app (for production), https://*.vercel-preview.app (for previews)
//    - Local dev: http://localhost:3000 (if needed)
// 4. Test by trying to access image URLs directly from an unauthorized domain
// 5. Monitor bandwidth usage in ImageKit dashboard - it should drop significantly
//
// WHY THIS MATTERS:
// - Prevents external sites from hotlinking your images
// - Blocks scrapers and bots from consuming bandwidth
// - Reduces ImageKit costs by limiting access to your domain only
// - Improves performance by reducing unauthorized requests

class OptimizedImage {
  static urlCache = new Map(); // Memoization cache for generated URLs

  constructor(options) {
    this.src = options.src;
    this.alt = options.alt || '';
    this.variant = options.variant || 'preview'; // thumbnail, card, preview, full
    this.width = options.width || this.getWidthFromVariant(this.variant);
    this.height = options.height || 'auto';
    this.className = options.className || '';
    this.priority = options.priority || false; // above-the-fold images
    this.lazy = options.lazy !== false && !this.priority; // eager if priority
    this.fallbackSrc = options.fallbackSrc || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBuZXZlciBsb2FkZWQ8L3RleHQ+PC9zdmc+';
    this.debug = options.debug || false;
  }

  getWidthFromVariant(variant) {
    const variants = {
      thumbnail: 200,
      card: 300,
      preview: 400,
      full: 800
    };
    return variants[variant] || 400;
  }

  // Generate ImageKit URL with transformations (memoized)
  generateUrl(baseUrl, width, quality = 70, format = 'auto') {
    const cacheKey = `${baseUrl}-${width}-${quality}-${format}`;
    if (OptimizedImage.urlCache.has(cacheKey)) {
      return OptimizedImage.urlCache.get(cacheKey);
    }
    const transform = `tr=w-${width},q-${quality},f-${format}`;
    const url = `${baseUrl}?${transform}`;
    OptimizedImage.urlCache.set(cacheKey, url);
    if (this.debug) console.log(`Generated URL: ${url}`);
    return url;
  }

  // Generate srcset for responsive images (optimized for bandwidth)
  generateSrcset(baseUrl) {
    const sizes = [200, 400, 600]; // Removed 800 to reduce bandwidth unless full variant
    const maxSize = this.variant === 'full' ? 800 : Math.min(600, this.width * 2);
    const filteredSizes = sizes.filter(size => size <= maxSize);
    const srcset = filteredSizes.map(size => `${this.generateUrl(baseUrl, size)} ${size}w`).join(', ');
    if (this.debug) console.log(`Generated srcset: ${srcset}`);
    return srcset;
  }

  // Generate sizes attribute based on variant
  generateSizes() {
    const sizeMaps = {
      thumbnail: '(max-width: 640px) 200px, 200px',
      card: '(max-width: 768px) 300px, 300px',
      preview: '(max-width: 768px) 400px, 400px',
      full: '(max-width: 768px) 100vw, 800px'
    };
    return sizeMaps[this.variant] || sizeMaps.preview;
  }

  // Create the img element
  createElement() {
    const img = document.createElement('img');
    img.src = this.generateUrl(this.src, this.width);
    img.alt = this.alt;
    img.className = this.className;
    img.loading = this.priority ? 'eager' : (this.lazy ? 'lazy' : 'eager');
    img.srcset = this.generateSrcset(this.src);
    img.sizes = this.generateSizes();
    if (this.height !== 'auto') img.height = this.height;
    img.onerror = () => {
      img.src = this.fallbackSrc;
    };
    return img;
  }

  // Return HTML string
  toHTML() {
    const srcset = this.generateSrcset(this.src);
    const sizes = this.generateSizes();
    const src = this.generateUrl(this.src, this.width);
    const loading = this.priority ? 'eager' : (this.lazy ? 'lazy' : 'eager');
    return `<img src="${src}" alt="${this.alt}" class="${this.className}" loading="${loading}" srcset="${srcset}" sizes="${sizes}" onerror="this.src='${this.fallbackSrc}'"${this.height !== 'auto' ? ` height="${this.height}"` : ''}>`;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptimizedImage;
}