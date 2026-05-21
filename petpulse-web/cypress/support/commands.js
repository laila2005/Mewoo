// Standard UI Login command
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[placeholder="Enter your email"]').type(email);
  cy.get('input[placeholder="Enter your password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Ensure the page redirects and logs in successfully
  cy.url().should('not.include', '/login');
});

// Google Identity Simulation UI Login command
Cypress.Commands.add('googleLogin', (email, firstName, lastName = 'Guest') => {
  cy.visit('/login');
  cy.contains('button', 'Continue with Google').click();
  cy.get('input[placeholder="your.email@gmail.com"]').type(email);
  cy.get('input[placeholder="John"]').type(firstName);
  cy.get('input[placeholder="Doe"]').type(lastName);
  cy.contains('button', 'Sign In').click();
  // Ensure redirects and login succeeds
  cy.url().should('not.include', '/login');
});
