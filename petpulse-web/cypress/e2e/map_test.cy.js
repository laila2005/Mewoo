describe('Production Map page testing', () => {
    it('Visits the live production page and prints all console errors', () => {
        const errors = [];
        cy.on('uncaught:exception', (err, runnable) => {
            errors.push(err.message + '\n' + err.stack);
            console.error('Captured live production error:', err.message, err.stack);
            return false;
        });

        cy.visit('https://petpulse-showcase.vercel.app/pet-shops', {
            failOnStatusCode: false
        });
        
        cy.wait(4000);
        
        cy.then(() => {
            if (errors.length > 0) {
                cy.log('Runtime Errors found:\n' + errors.join('\n\n'));
                throw new Error('Production page crashed with: ' + errors[0]);
            }
        });
        cy.screenshot('production_map_page_error');
    });
});
