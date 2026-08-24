describe('Debug Login Page', () => {
  it('visits the production login page and asserts that Welcome Back is visible', () => {
    cy.clearLocalStorage();
    cy.clearCookies();
    
    cy.on('uncaught:exception', (err, runnable) => {
      console.error('UNCAUGHT EXCEPTION IN TEST:', err);
      throw err;
    });

    cy.visit('https://petpluse-showcase.vercel.app/login');
    cy.contains('Welcome Back', { timeout: 10000 }).should('be.visible');
  });
});
