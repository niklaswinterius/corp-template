#!/usr/bin/env node

import { sanitizeLayouts } from './layout-sanitizer.mjs';

// Run sanitization if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
    sanitizeLayouts().catch(console.error);
}