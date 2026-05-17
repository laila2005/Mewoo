const fs = require('fs');
let c = fs.readFileSync('client/src/pages/profile.html', 'utf8');

const regex = /\/\/ Update Activity Stats[\s\S]*?if \(tipsSharedStat\) {[\s\S]*?tipsSharedStat\.textContent = user\.posts_count \|\| 0;[\s\S]*?}/;

const replacement = `// Update Activity Stats
                const days = Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) || 1;
                const postsCount = user.posts_count || 0;
                const petsCount = user.pets_count || 0;
                
                const daysActiveStat = document.getElementById('daysActiveStat');
                if (daysActiveStat) daysActiveStat.textContent = days;
                const tipsSharedStat = document.getElementById('tipsSharedStat');
                if (tipsSharedStat) tipsSharedStat.textContent = postsCount;

                // Gamification Logic
                const totalScore = (days * 1) + (postsCount * 5) + (petsCount * 20);
                
                const tiers = [
                    { name: 'Pet Novice', min: 0, max: 50 },
                    { name: 'Dedicated Owner', min: 51, max: 150 },
                    { name: 'Super Parent', min: 151, max: 300 },
                    { name: 'Pet Guru', min: 301, max: Infinity }
                ];
                
                let currentTierIndex = 0;
                for (let i = 0; i < tiers.length; i++) {
                    if (totalScore >= tiers[i].min && totalScore <= tiers[i].max) {
                        currentTierIndex = i;
                        break;
                    }
                }
                
                const nextGoalText = document.getElementById('nextGoalText');
                const goalPercentage = document.getElementById('goalPercentage');
                const goalProgressBar = document.getElementById('goalProgressBar');
                
                if (currentTierIndex < tiers.length - 1) {
                    const currentTier = tiers[currentTierIndex];
                    const nextTier = tiers[currentTierIndex + 1];
                    const pointsNeeded = nextTier.min - currentTier.min;
                    const pointsEarned = totalScore - currentTier.min;
                    let percentage = Math.floor((pointsEarned / pointsNeeded) * 100);
                    if (percentage > 100) percentage = 100;
                    if (percentage < 0) percentage = 0;
                    
                    if (nextGoalText) nextGoalText.textContent = \`Next Goal: \${nextTier.name}\`;
                    if (goalPercentage) goalPercentage.textContent = \`\${percentage}%\`;
                    if (goalProgressBar) {
                        setTimeout(() => {
                            goalProgressBar.style.width = \`\${percentage}%\`;
                        }, 500); // Wait for page load
                    }
                } else {
                    if (nextGoalText) nextGoalText.textContent = \`Max Goal Achieved: Pet Guru!\`;
                    if (goalPercentage) goalPercentage.textContent = \`100%\`;
                    if (goalProgressBar) {
                        setTimeout(() => {
                            goalProgressBar.style.width = \`100%\`;
                        }, 500);
                    }
                }`;

c = c.replace(regex, replacement);
fs.writeFileSync('client/src/pages/profile.html', c);
