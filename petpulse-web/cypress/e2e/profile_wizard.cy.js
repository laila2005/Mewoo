describe('Professional Onboarding Setup Wizard & Preview Card', () => {
  beforeEach(() => {
    // Clear localStorage to prevent state leak
    cy.clearLocalStorage();
    
    // Perform Google login simulation as a professional vet user
    cy.googleLogin('cypress.vet@petpulse.com', 'Cypress', 'Veterinarian');
    
    // Ensure we are redirected to the professional dashboard
    cy.url().should('include', '/pro-dashboard');
  });

  it('successfully navigates, completes the 3-step wizard with auto-specialties, and displays the Profile Preview card', () => {
    // Navigate to the Public Profile Builder tab
    cy.contains('button', 'Public Profile Builder').click();
    
    // Ensure we are inside the Setup Wizard editing mode
    cy.get('form').should('exist');
    cy.contains('h2', 'Public Profile Settings Wizard').should('be.visible');

    // --- STEP 1: Credentials ---
    cy.get('input[placeholder*="e.g. Doctor of Veterinary Medicine"]').clear().type('Chief Veterinary Surgeon');
    cy.get('input[placeholder="e.g. B.V.Sc, Cairo University"]').clear().type('D.V.M., Ph.D. in Veterinary Surgery');
    cy.get('input[type="number"]').first().clear().type('15'); // 15 years experience
    cy.get('input[placeholder="e.g. LIC-123456789"]').clear().type('VET-CYP-9988');

    // Go to Step 2
    cy.contains('button', 'Next Step').click();

    // --- STEP 2: Biography & Skills ---
    cy.get('textarea').clear().type('I am a highly dedicated veterinary surgeon with over 15 years of experience in advanced orthopedic procedures.');
    
    // Type in the specialties input but do NOT click 'Add' or hit 'Enter'
    cy.get('#specialty-input').type('Cardiovascular Diagnostics');
    
    // Click 'Next Step' - this should trigger our auto-addition helper!
    cy.contains('button', 'Next Step').click({ force: true });

    // --- STEP 3: Rates & Availability ---
    // Set consultation fee directly (there is no custom stepper button)
    cy.get('input[type="number"]').clear().type('350');
    
    // Set clinic location
    cy.get('input[placeholder="e.g. New Cairo Clinic Center"]').clear().type('Cypress Road, Giza');
    
    // Toggle Friday availability (buttons are used instead of checkboxes)
    cy.contains('button', 'Friday').click();

    // Submit form!
    cy.contains('button', 'Save Public Credentials').click();

    // --- POST-SAVE VERIFICATION ---
    // Should stay on profile tab but switch out of wizard edit mode
    cy.get('form').should('not.exist');
    
    // Premium Profile Preview Card should now be visible!
    cy.contains('Dr. Cypress Veterinarian').should('be.visible');
    cy.contains('Chief Veterinary Surgeon').should('be.visible');
    cy.contains('D.V.M., Ph.D. in Veterinary Surgery').should('be.visible');
    cy.contains('p', 'I am a highly dedicated veterinary surgeon').should('be.visible');
    
    // Check that 'Cardiovascular Diagnostics' specialty tag was automatically added and is displayed on the card!
    cy.contains('span', 'Cardiovascular Diagnostics').should('be.visible');
  });
});
