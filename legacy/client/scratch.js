const fs = require('fs'); 
let content = fs.readFileSync('g:/Mewoo/client/src/pages/community.html', 'utf8'); 

// Replace profile image
const imgRegex = /<img src="\$\{c\.profile_pic_url \|\| communityGenerateAvatar\(c\.first_name, c\.last_name\)\}" style="width:\$\{level > 0 \? '28px' : '36px'\}; height:\$\{level > 0 \? '28px' : '36px'\}; border-radius:50%; object-fit:cover; flex-shrink:0; border:1px solid #e2e8f0;"\/>/g;
const imgRepl = '<a href="owner-profile.html?id=${c.user_id}" style="flex-shrink:0;" class="hover:opacity-80 transition-opacity"><img src="${c.profile_pic_url || communityGenerateAvatar(c.first_name, c.last_name)}" style="width:${level > 0 ? \\\'28px\\\' : \\\'36px\\\'}; height:${level > 0 ? \\\'28px\\\' : \\\'36px\\\'}; border-radius:50%; object-fit:cover; display:block; border:1px solid #e2e8f0;"/></a>';
content = content.replace(imgRegex, imgRepl);

// Replace name
const nameRegex = /<span style="font-size:\.85rem; font-weight:700; color:#1e293b;">\$\{c\.first_name\} \$\{c\.last_name\}<\/span>/g;
const nameRepl = '<a href="owner-profile.html?id=${c.user_id}" style="font-size:.85rem; font-weight:700; color:#1e293b;" class="hover:underline">${c.first_name} ${c.last_name}</a>';
content = content.replace(nameRegex, nameRepl);

fs.writeFileSync('g:/Mewoo/client/src/pages/community.html', content);
