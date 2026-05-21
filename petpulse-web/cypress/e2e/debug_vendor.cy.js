describe('Debug Vendor Dashboard', () => {
  it('navigates to vendor dashboard and checks for errors', () => {
    cy.clearLocalStorage();
    
    // Override the global uncaught:exception handler to fail the test and show the stack trace
    cy.on('uncaught:exception', (err) => {
      throw err;
    });

    cy.googleLogin('kali@gmail.com', 'kali', 'kali');
    cy.visit('/vendor-dashboard');
    cy.wait(3000); // Wait for the page to load
    cy.contains('Business Analytics').should('be.visible');
  });
});

