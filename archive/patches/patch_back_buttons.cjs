const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchRegex, replacementString) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(searchRegex, replacementString);
    fs.writeFileSync(filePath, content, 'utf8');
}

const baseDir = 'g:/Mewoo/petpulse-web/src';

// 1. BookingDetails.jsx
replaceInFile(
    path.join(baseDir, 'pages', 'BookingDetails.jsx'),
    /<BackButton className="mb-6" \/>/g,
    '<BackButton className="mb-6" to="/appointments" />'
);

// 2. Checkout.jsx
replaceInFile(
    path.join(baseDir, 'pages', 'Checkout.jsx'),
    /<BackButton className="mb-6" \/>/g,
    '<BackButton className="mb-6" to="/marketplace" />'
);

// 3. EditProfile.jsx
replaceInFile(
    path.join(baseDir, 'pages', 'EditProfile.jsx'),
    /<BackButton className="mb-3" \/>/g,
    '<BackButton className="mb-3" to="/profile" />'
);
replaceInFile(
    path.join(baseDir, 'pages', 'EditProfile.jsx'),
    /onClick=\{\(\) => navigate\(-1\)\}/g,
    "onClick={() => navigate('/profile')}"
);

// 4. OwnerProfile.jsx
replaceInFile(
    path.join(baseDir, 'pages', 'OwnerProfile.jsx'),
    /<BackButton className="mb-8" \/>/g,
    '<BackButton className="mb-8" to="/community" />'
);
replaceInFile(
    path.join(baseDir, 'pages', 'OwnerProfile.jsx'),
    /onClick=\{\(\) => navigate\(-1\)\}/g,
    "onClick={() => navigate('/community')}"
);

// 5. PetProfile.jsx
replaceInFile(
    path.join(baseDir, 'pages', 'PetProfile.jsx'),
    /<BackButton className="mb-8" \/>/g,
    '<BackButton className="mb-8" to="/community" />'
);
replaceInFile(
    path.join(baseDir, 'pages', 'PetProfile.jsx'),
    /onClick=\{\(\) => navigate\(-1\)\}/g,
    "onClick={() => navigate('/community')}"
);

// 6. TrainerDetails.jsx
replaceInFile(
    path.join(baseDir, 'pages', 'TrainerDetails.jsx'),
    /<BackButton className="mb-6" \/>/g,
    '<BackButton className="mb-6" to="/trainers" />'
);

// 7. Settings.jsx
replaceInFile(
    path.join(baseDir, 'pages', 'Settings.jsx'),
    /onClick=\{\(\) => navigate\(-1\)\}/g,
    "onClick={() => navigate('/profile')}"
);

// 8. Community.jsx
replaceInFile(
    path.join(baseDir, 'pages', 'Community.jsx'),
    /onClick=\{\(\) => navigate\(-1\)\}/g,
    "onClick={() => navigate('/')}"
);

// 9. RestrictedAccessInline.jsx
replaceInFile(
    path.join(baseDir, 'components', 'common', 'RestrictedAccessInline.jsx'),
    /onClick=\{\(\) => navigate\(-1\)\}/g,
    "onClick={() => navigate('/')}"
);

console.log('All back buttons patched successfully!');
