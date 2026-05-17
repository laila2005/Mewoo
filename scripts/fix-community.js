const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../client/src/pages/community.html');
let content = fs.readFileSync(file, 'utf8');

// I know that my previous regex wiped out the <link> and <style> tags between the script and --text-2.
// Let's just find the tailwind.config script and everything up to `--text-2:      #475569;` and replace it.

const brokenPattern = /<script>[\s\S]*?tailwind\.config[\s\S]*?<\/script>[\s\S]*?--text-2:      #475569;/;

const fixedPattern = `<script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: "#005da7",
                        "primary-fixed": "#d4e3ff",
                        "primary-container": "#2976c7",
                        "on-primary": "#ffffff",
                        secondary: "#196a59",
                        "secondary-fixed": "#a6f1db",
                        "secondary-container": "#a3eed8",
                        tertiary: "#7b5508",
                        "tertiary-fixed": "#ffdeae",
                        "surface-container-low": "#f1f4f3",
                        "surface-container-lowest": "#ffffff",
                        "outline-variant": "#c1c7d3",
                        "on-surface-variant": "#414751",
                        "on-surface": "#181c1c",
                    },
                    fontFamily: {
                        "display-lg": ["Plus Jakarta Sans"],
                        "label-bold": ["Plus Jakarta Sans"],
                        "body-base": ["Plus Jakarta Sans"],
                        "headline-md": ["Plus Jakarta Sans"]
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet"/>
    <style>
  /* ─── Design Tokens ─── */
  :root {
    --brand:       #2563EB;
    --brand-light: #EFF6FF;
    --brand-mid:   #BFDBFE;
    --brand-dark:  #1D4ED8;
    --accent:      #F97316;
    --accent-light:#FFF7ED;
    --green:       #10B981;
    --green-light: #D1FAE5;
    --bg:          #F8FAFC;
    --surface:     #FFFFFF;
    --surface-2:   #F1F5F9;
    --border:      #E2E8F0;
    --text-1:      #0F172A;
    --text-2:      #475569;`;

content = content.replace(brokenPattern, fixedPattern);

// There is also an issue with my unified header injecting Material Symbols Outlined over the rounded.
// I need to ensure community.html uses its own header and sidebar, or I should fix the icons.
// The user showed an image where icons are literally text "grid_view Home".
// This happens when the font family "Material Symbols Outlined" is not applied properly, or because the elements have class="ms" which was expecting Material Symbols Rounded.

fs.writeFileSync(file, content);
console.log('Fixed community.html');
