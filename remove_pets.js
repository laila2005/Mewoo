const fs = require('fs');
function updateFile(file) {
    let c = fs.readFileSync(file, 'utf8');
    
    // Remove Bird, Rabbit, Other from select
    c = c.replace(/<option value="Bird">Bird<\/option>[\s\S]*?<option value="Other">Other<\/option>/, '');
    
    // Update petBreeds dictionary
    c = c.replace(/Bird: \['Parrot'[\s\S]*?Other: \['Other'\]/, '');
    
    fs.writeFileSync(file, c);
}

updateFile('client/src/pages/profile.html');
updateFile('client/src/pages/manage-pet.html');
