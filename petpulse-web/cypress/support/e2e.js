// Import custom commands
import './commands';

// Prevent Cypress from failing tests on uncaught application exceptions (e.g. from third-party libraries or asset failures)
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
});
