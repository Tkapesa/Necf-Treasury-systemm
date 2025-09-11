# Admin Dashboard Testing Guide

This document describes how to set up and run tests for the admin dashboard components.

## Test Setup Requirements

To run the unit tests, you'll need to install additional testing dependencies:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest @types/jest
```

## Test Files Location

Place test files in: `src/components/__tests__/`

The test files are structured to verify:
- Component rendering
- User interactions
- Keyboard navigation
- Accessibility compliance
- Error handling
- Loading states

## Running Tests

After installing dependencies:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Configuration

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/src/setupTests.ts"],
    "moduleNameMapping": {
      "\\.(css|less|scss)$": "identity-obj-proxy"
    }
  }
}
```

## Test Features Covered

### Table Component
- Rendering with data
- Loading and empty states
- Sorting functionality
- Pagination controls
- Keyboard navigation
- Row click handlers
- Accessibility attributes

### Filter Bar Component
- Filter type rendering
- Search functionality
- Date range selection
- Clear filters
- Active filter display

### Receipt Image Modal
- Image loading states
- Keyboard shortcuts
- Navigation between receipts
- Download functionality
- Zoom controls

### Admin Dashboard
- Statistics display
- API integration
- Error handling
- Export functionality

## Accessibility Testing

Tests include verification of:
- ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Color contrast
- Semantic HTML structure

## Performance Testing

Consider adding tests for:
- Component render times
- Memory usage
- Large dataset handling
- API response caching

## End-to-End Testing

For complete user flow testing, consider:
- Playwright or Cypress integration
- Authentication flow testing
- Data export workflows
- Image upload and viewing
- Multi-user scenarios

This testing framework ensures the admin dashboard maintains quality and accessibility standards in production.
