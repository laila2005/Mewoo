describe('Dynamic Client Booking & Checkout Flow', () => {
  beforeEach(() => {
    // Clear localStorage to prevent state leak
    cy.clearLocalStorage();
    
    // Perform Google login simulation as a standard pet owner user
    cy.googleLogin('cypress.owner@petpulse.com', 'Cypress', 'Owner');
    
    // Ensure we are logged in and on the homepage
    cy.url().should('not.include', '/login');
  });

  it('navigates to trainers list, selects a trainer, verifies dynamic fee, bookings, and checkouts successfully', () => {
    // Navigate to find a trainer page
    cy.visit('/trainers');
    
    // Verify list loads successfully
    cy.contains('h1', 'Find the Best Trainers Near You').should('be.visible');
    
    // Select the first trainer and navigate to their details page
    cy.get('a').contains('Profile').first().click();

    // Verify trainer details page load
    cy.url().should('include', '/trainer-details');
    cy.contains('h2', 'Reviews & Recommendations').should('be.visible');

    // Retrieve the displayed session price text (e.g. 'EGP 350' or 'EGP 450')
    cy.get('.text-lg.font-extrabold.text-blue-600').then(($el) => {
      const priceText = $el.text().trim();
      expect(priceText).to.match(/EGP \d+/);
      
      // Select date (e.g. May 30, 2026)
      cy.get('input[type="date"]').type('2026-05-30');
      
      // Select the first available time slot (09:00 AM)
      cy.get('.grid-cols-2 > div').first().click();

      // Click Confirm Booking
      cy.contains('button', 'Confirm Booking').click();
      // Ensure we are navigated to the checkout page
      cy.url().should('include', '/checkout');
      cy.contains('h1', 'Checkout').should('be.visible');

      // Verify that the booking price displayed matches the dynamic fee retrieved
      const digits = priceText.replace('EGP', '').trim();
      cy.contains('div', 'Total').within(() => {
        cy.get('span').last().should('contain', digits);
      });
    });
  });
});
