describe('PetPluse New Features - Rigorous E2E Test Suite', () => {
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
    
    // Verify there is a lost pet card and click it to open detailed lightbox
    cy.get('.grid > div').first().click();
    
    // Verify that the Detailed Lightbox modal / Portal opens
    cy.contains('Last Seen Location').should('be.visible');
    cy.contains('Report Details').should('be.visible');
    
    // Close the lightbox modal
    cy.get('span.material-symbols-outlined').contains('close').click({ force: true });
    
    // Modal should close and header remain visible
    cy.contains('Lost & Found Pets').should('be.visible');
  });

  it('2. Verifies Adoption Applications Details Modal redirects and operates correctly', () => {
    // Log in as standard user (ahmed) who has an application seeded
    cy.login('ahmed.hassan@gmail.com', 'admin');
    
    // Visit the adoption tab
    cy.visit('http://localhost:5173/community?tab=adoption');
    
    // Assert the Adoption Center header is rendered
    cy.contains('Adoption Center', { timeout: 10000 }).should('be.visible');
    
    // The "My Applications" stats badge should be visible because of the seeded application
    cy.contains('My Applications', { timeout: 10000 }).should('be.visible').click();
    
    // Assert the applications list modal opens
    cy.contains('h3', 'My Applications').should('be.visible');
    
    // Click on the seeded application item in the list
    cy.contains('Simba').should('be.visible').click();
    
    // The detailed application preview modal should now render
    cy.contains('h3', 'Simba').should('be.visible');
    cy.contains('Application Details').should('be.visible');
    cy.contains('Applicant Profile').should('be.visible');
    
    // Close the preview modal
    cy.get('button').find('span.material-symbols-outlined').contains('close').first().click({ force: true });
    
    // Modal should close and "Adoption Center" remain visible
    cy.contains('Adoption Center').should('be.visible');
  });

  it('3. Verifies Admin Dashboard System Diagnostics & Database Maintenance Command Center', () => {
    // Log in as admin user
    cy.login('admin@petpluse.com', 'admin');
    
    // Navigate to admin dashboard
    cy.visit('http://localhost:5173/admin');
    
    // Assert admin dashboard loads
    cy.contains('System Management Cockpit', { timeout: 10000 }).should('be.visible');
    
    // Click on "Database Health" tab button on sidebar
    cy.contains('button', 'Database Health').should('be.visible').click();
    
    // Assert database health panel is active
    cy.contains('Database Diagnostics & System Telemetry').should('be.visible');
    
    // Verify telemetry grid / DB metrics show up (e.g. database size and tables details)
    cy.contains('Database Size', { timeout: 10000 }).should('be.visible');
    cy.contains('Total Rows').should('be.visible');
    cy.contains('Active Connections').should('be.visible');
    
    // Verify telemetry table rows exist
    cy.get('table').should('exist');
    cy.contains('td', 'users').should('be.visible');
    cy.contains('td', 'pets').should('be.visible');
    
    // Verify DB maintenance options exist and are clickable
    cy.contains('button', 'Trigger DB Backup').should('be.visible').click();
    
    // Verify overlay / loading indicator or success toast appears
    cy.contains('Processing Maintenance Action...').should('be.visible');
    cy.contains('Backup completed successfully', { timeout: 15000 }).should('be.visible');
  });

  it('4. Verifies WebSocket Chat message moderation and auto-ban guideline checks', () => {
    // Log in as standard user (sara)
    cy.login('sara.mostafa@gmail.com', 'admin');
    
    // Navigate to messages page
    cy.visit('http://localhost:5173/messages');
    
    // Assert messages page loads
    cy.contains('Messages', { timeout: 10000 }).should('be.visible');
    
    // Wait for the conversation list to paint
    cy.get('.flex-1.overflow-y-auto', { timeout: 10000 }).should('exist');
    
    // Select first active chat conversation (e.g. with Ahmed Hassan)
    cy.contains('Ahmed Hassan').should('be.visible').click();
    
    // Type and send a normal chat message (should succeed)
    cy.get('input[placeholder="Type a message..."]').type('Hello Ahmed! Hope Max is doing well.');
    cy.get('button').find('span.material-symbols-outlined').contains('send').click();
    cy.contains('Hello Ahmed! Hope Max is doing well.').should('be.visible');
    
    // Type and send an inappropriate message with a forbidden word
    cy.get('input[placeholder="Type a message..."]').type('This puppy is absolute shit and I hate it.');
    cy.get('button').find('span.material-symbols-outlined').contains('send').click();
    
    // Auto-moderator guidelines violation overlay or banned toast should show
    cy.contains('violated our community safety guidelines', { timeout: 10000 }).should('be.visible');
    cy.contains('permanently banned').should('be.visible');
    
    // Assert user is disconnected / logged out and redirected to login page
    cy.url({ timeout: 10000 }).should('include', '/login');
  });
});
