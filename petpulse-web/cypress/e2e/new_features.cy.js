describe('PetPluse New Features - End to End Test Suite', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Ignore uncaught exceptions from Leaflet or other non-test scripts
    cy.on('uncaught:exception', (err) => {
      console.warn('Caught uncaught exception in test:', err.message);
      return false;
    });
  });

  it('1. Verifies Lost & Found Tab and detailed Lightbox Modal triggers successfully', () => {
    // Visit the community lost-found page
    cy.visit('http://localhost:5173/community?tab=lost-found');
    
    // Check if the lost & found header is visible
    cy.contains('Lost & Found Pets', { timeout: 10000 }).should('be.visible');
    
    // Wait for the grid to load
    cy.get('.grid', { timeout: 10000 }).should('exist');
    
    // Find the first lost pet card (or checking for missing elements) and click it
    cy.contains('I saw this pet').should('exist');
    
    // Click on the image/body of the first report card to trigger lightbox
    cy.get('.grid > div').first().click();
    
    // Verify that the Detailed Lightbox modal / Portal opens
    cy.contains('Last Seen Location').should('be.visible');
    
    // Close the lightbox modal
    cy.get('span.material-symbols-outlined').contains('close').click({ force: true });
    
    // Modal should close and header remain visible
    cy.contains('Lost & Found Pets').should('be.visible');
  });

  it('2. Verifies Adoptions Tab layout and apply process structures', () => {
    // Visit the adoptions tab
    cy.visit('http://localhost:5173/community?tab=adoption');
    
    // Assert the Adoption Center header is rendered
    cy.contains('Adoption Center', { timeout: 10000 }).should('be.visible');
    
    // Check if adoptable cards load
    cy.get('.grid').should('exist');
    cy.contains('Available').should('be.visible');
  });
});
