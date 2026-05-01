# 🚀 Jira Smart Commits Guide (PetPulse Team)

This guide shows you exactly what to type in your terminal to automatically update your Jira tickets when you push code to GitHub.

Instead of manually logging into Jira and dragging your ticket to "Done", you can just copy and paste the commands below!

---

## 💻 Web Team

**Eng. Fatma (Auth + Booking APIs)**
When you finish your Auth + Booking APIs, copy and paste this:
```bash
git commit -m "TP1P-24 #done Finished Auth and Booking APIs. Tested in Postman."
```

**Eng. Laila (Pets + Services Backend)**
When you finish your Pets/Services backend, copy and paste this:
```bash
git commit -m "TP1P-26 #done Finished Pets CRUD and Services integration."
```

**Eng. Sara (Auth + Booking Frontend)**
When you finish your UI screens, copy and paste this:
```bash
git commit -m "TP1P-25 #done Built Login, Register, and Booking UI screens."
```

**Eng. Salma (Navigation + Structure Frontend)**
When you finish the app routing and layout, copy and paste this:
```bash
git commit -m "TP1P-28 #done Completed App structure, routing, and Maps UI."
```

---

## 🔒 Security & IT Team

**Eng. Gaber (Security Lead)**
When you finish your security rules and pentest report, copy and paste this:
```bash
git commit -m "TP1P-29 #done Security rules defined and system reviewed."
```

**Eng. Abdelrahman (Security Engineer)**
When you finish input validation and rate limiting, copy and paste this:
```bash
git commit -m "TP1P-31 #done Applied validation rules and tested for SQLi/XSS."
```

**Eng. Mahmoud (IT - WAF + SSL)**
When you finish setting up the WAF and HTTPS, copy and paste this:
```bash
git commit -m "TP1P-32 #done WAF active and HTTPS working smoothly."
```

---

## 🤖 AI Team

**Eng. Ahmed (AI Automation)**
When you finish your AI urgency and booking logic, copy and paste this:
```bash
git commit -m "TP1P-34 #done AI logic returns urgency and suggestions are stable."
```

**Eng. Essam (Prompt Injection Security)**
When you finish the prompt filters, copy and paste this:
```bash
git commit -m "TP1P-36 #done Built AI prompt filters, attacks successfully blocked."
```

**Eng. Mahmoud (AI Policy + Testing)**
When you finish your AI testing and system support, copy and paste this:
```bash
git commit -m "TP1P-38 #done AI policy verified and full system safely tested."
```

---

## 💡 How it works (The Rules):
1. **`TP1P-XX`** is your unique Jira Issue Key. If your Jira board gives you a slightly different number, just swap it out!
2. **`#done`** is the magic keyword that tells Jira to move the ticket to the Done column.
3. You must run **`git push origin backend`** (or main) after committing for Jira to see it!
