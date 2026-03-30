// OptimizedImage.js - Reusable image component for ImageKit optimization
// HOTLINKING PROTECTION GUIDANCE:
// To restrict ImageKit images to only your domain:
// 1. Go to ImageKit dashboard > Settings > Security
// 2. Enable "Restrict image access" or "Origin restrictions"
// 3. Add your domain(s): https://yourdomain.com, https://www.yourdomain.com
// 4. For Vercel preview deployments, add https://*.vercel-preview.app or specific URLs
// This prevents hotlinking and reduces bandwidth usage from external sources.
class OptimizedImage {
  constructor(options) {
    this.src = options.src;
    this.alt = options.alt || '';
    this.width = options.width || 400;
    this.height = options.height || 'auto';
    this.className = options.className || '';
    this.lazy = options.lazy !== false; // default true
    this.fallbackSrc = options.fallbackSrc || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBuZXZlciBsb2FkZWQ8L3RleHQ+PC9zdmc+';
  }

  // Generate ImageKit URL with transformations
  generateUrl(baseUrl, width, quality = 70, format = 'auto') {
    const transform = `tr=w-${width},q-${quality},f-${format}`;
    return `${baseUrl}?${transform}`;
  }

  // Generate srcset for responsive images
  generateSrcset(baseUrl) {
    const sizes = [200, 400, 800];
    return sizes.map(size => `${this.generateUrl(baseUrl, size)} ${size}w`).join(', ');
  }

  // Generate sizes attribute (assuming card layout)
  generateSizes() {
    // For gallery cards, typically max-w-xs (320px) on mobile, larger on desktop
    return '(max-width: 768px) 320px, 400px';
  }

  // Create the img element
  createElement() {
    const img = document.createElement('img');
    img.src = this.generateUrl(this.src, this.width);
    img.alt = this.alt;
    img.className = this.className;
    img.loading = this.lazy ? 'lazy' : 'eager';
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
    return `<img src="${src}" alt="${this.alt}" class="${this.className}" loading="${this.lazy ? 'lazy' : 'eager'}" srcset="${srcset}" sizes="${sizes}" onerror="this.src='${this.fallbackSrc}'"${this.height !== 'auto' ? ` height="${this.height}"` : ''}>`;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptimizedImage;
}