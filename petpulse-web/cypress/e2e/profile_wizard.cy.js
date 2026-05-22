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
    
    // Wait for either the wizard heading or the profile preview card to render
    cy.contains(/Public Profile Settings Wizard|Edit Profile/).should('be.visible');
    
    // Wait a brief moment for DOM/React state to fully settle and paint
    cy.wait(1500);
    
    // If the profile already exists, click 'Edit Profile' to launch the wizard
    cy.get('body').then(($body) => {
      const editBtn = $body.find('button').filter((i, el) => {
        return el.innerText && el.innerText.includes('Edit Profile');
      });
      if (editBtn.length > 0) {
        cy.wrap(editBtn).first().click({ force: true });
        // Wait for wizard form rendering transition
        cy.wait(1000);
      }
    });
    
    // Ensure we are inside the Setup Wizard editing mode
    cy.get('form').should('exist');
    cy.contains('h2', 'Public Profile Settings Wizard').should('be.visible');

    // --- STEP 1: Credentials ---
    cy.contains('label', 'Professional Title').parent().find('input').clear().type('Chief Veterinary Surgeon');
    cy.contains('label', 'Degrees').parent().find('input').clear().type('D.V.M., Ph.D. in Veterinary Surgery');
    cy.contains('label', 'Years').parent().find('input').clear().type('15'); // 15 years experience
    cy.contains('label', /License|Registration/i).parent().find('input').clear().type('VET-CYP-9988');

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
    cy.contains('label', /Fee|Pricing|Rate/i).parent().find('input').clear().type('350');
    
    // Set clinic location
    cy.contains('label', /Address|Location|Facility/i).parent().find('input').clear().type('Cypress Road, Giza');
    
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
