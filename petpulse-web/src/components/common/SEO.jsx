import { useEffect } from 'react';

const SEO = ({ title, description, keywords, image, type = 'website', schema, canonicalUrl }) => {
  useEffect(() => {
    // 1. Update Title
    const baseTitle = "PetPluse";
    const fullTitle = title ? `${title} | ${baseTitle}` : `${baseTitle} - Egypt's Premier Pet Care & Community Marketplace`;
    document.title = fullTitle;

    // Helper to update meta tag content or create it if not present
    const updateMetaTag = (selector, nameAttr, valAttr, content) => {
      if (content === undefined || content === null) return;
      let element = document.querySelector(selector);
      if (element) {
        element.setAttribute('content', content);
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute(nameAttr, valAttr);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    // Resolve absolute URLs for assets to ensure crawlers accept them
    const origin = window.location.origin;
    const resolvedImage = image 
      ? (image.startsWith('http') ? image : `${origin}${image}`)
      : `${origin}/assets/images/og-image.jpg`;
    const resolvedCanonical = canonicalUrl || `${origin}${window.location.pathname}`;

    // 2. Update Standard Meta Tags
    updateMetaTag("meta[name='title']", 'name', 'title', fullTitle);
    
    if (description) {
      updateMetaTag("meta[name='description']", 'name', 'description', description);
    }
    
    if (keywords) {
      updateMetaTag("meta[name='keywords']", 'name', 'keywords', keywords);
    }

    // 3. Update Open Graph Meta Tags
    updateMetaTag("meta[property='og:title']", 'property', 'og:title', fullTitle);
    if (description) {
      updateMetaTag("meta[property='og:description']", 'property', 'og:description', description);
    }
    updateMetaTag("meta[property='og:image']", 'property', 'og:image', resolvedImage);
    updateMetaTag("meta[property='og:url']", 'property', 'og:url', resolvedCanonical);
    updateMetaTag("meta[property='og:type']", 'property', 'og:type', type);
    updateMetaTag("meta[property='og:site_name']", 'property', 'og:site_name', 'PetPluse');

    // 4. Update Twitter Meta Tags
    updateMetaTag("meta[property='twitter:card']", 'property', 'twitter:card', 'summary_large_image');
    updateMetaTag("meta[property='twitter:title']", 'property', 'twitter:title', fullTitle);
    if (description) {
      updateMetaTag("meta[property='twitter:description']", 'property', 'twitter:description', description);
    }
    updateMetaTag("meta[property='twitter:image']", 'property', 'twitter:image', resolvedImage);
    updateMetaTag("meta[property='twitter:url']", 'property', 'twitter:url', resolvedCanonical);

    // 5. Update Canonical Link
    let canonical = document.querySelector("link[rel='canonical']");
    if (canonical) {
      canonical.setAttribute('href', resolvedCanonical);
    } else {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', resolvedCanonical);
      document.head.appendChild(canonical);
    }

    // 6. Update JSON-LD Schema Markup
    // Remove existing dynamic schemas to prevent duplicate injections on route changes
    const oldSchemas = document.querySelectorAll("script[data-schema='petpluse']");
    oldSchemas.forEach(el => el.remove());

    if (schema) {
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-schema', 'petpluse');
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }, [title, description, keywords, image, type, schema, canonicalUrl]);

  return null;
};

export default SEO;
