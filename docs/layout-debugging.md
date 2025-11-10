# Layout Validation and Debugging Guide

## Overview

This documentation covers the layout validation and debugging tools implemented for the CORP-Template project. These tools help ensure that slide layouts meet the required specifications and maintain consistency across the template.

## Tools and Utilities

### 1. Debug Logger
Located in `tools/utils/debug-logger.mjs`
- Provides consistent logging across all template processing steps
- Enables detailed debugging information when needed
- Usage: `const logger = createLogger('module-name');`

### 2. Layout Classifier
Located in `tools/utils/layout-classifier.mjs`
- Categorizes layouts based on their content and structure
- Determines appropriate size requirements for elements
- Supports various layout types: title-only, content, comparison, etc.

### 3. Layout Validator
Located in `tools/diagnose/validate-template.mjs`
- Performs comprehensive layout validation
- Checks element sizes, overlaps, and footer placement
- Generates detailed validation reports

### 4. Layout Sanitizer
Located in `tools/sanitize/layout-sanitizer.mjs`
- Automatically adjusts layout elements to meet requirements
- Preserves aspect ratios when resizing
- Creates backups before modifications

## Usage

### Running Validation
```bash
# Basic validation
npm run validate:template

# Validation with debug output
npm run validate:debug
```

### Sanitizing Layouts
```bash
# Basic sanitization
npm run sanitize:layouts

# Sanitization with debug output
npm run sanitize:debug
```

## Validation Rules

1. **Minimum Area Requirements**
   - Title Only: 5% of canvas area
   - Content: 18% of canvas area
   - Comparison: 15% of canvas area
   - Pictures: 5% of canvas area

2. **Footer Placement**
   - Must be within 20px of canvas bottom
   - Must not overlap with content

3. **Element Overlap**
   - Body elements must not overlap
   - Picture elements allowed 5% overlap

## Troubleshooting

Common issues and solutions:

1. **Undersized Elements**
   - Check layout classification is correct
   - Verify element type identification
   - Use sanitizer to automatically adjust

2. **Layout Classification**
   - Review element type assignments
   - Check title element presence
   - Verify body count calculation

3. **Footer Issues**
   - Confirm footer margin settings
   - Check footer element identification

## Contributing

When adding new features:

1. Add appropriate logging
2. Update validation rules if needed
3. Document changes in this guide
4. Run validation suite before committing