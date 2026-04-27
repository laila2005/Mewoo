# 🚀 Mewoo Team - GitHub Workflow & Structure Guide

Welcome to the Mewoo project! Since we are a team of 9 and some of us are new to GitHub, this guide is designed to be **as simple and easy to follow as possible**. 

By following these simple steps, we will all be able to work on the exact same project simultaneously without accidentally deleting or overwriting each other's code!

---

## 📁 1. Understanding Our Repository Structure

When you open the Mewoo repository folder on your computer, you will see a few different folders. Here is exactly what each one is for:

* **`client/`**: This is for the **Frontend Team**. All the User Interface (UI), HTML, CSS, and Vanilla JavaScript for the Web & Mobile App goes here.
* **`backend/`**: This is for the **Backend Team**. The main API, the server logic, and the database connection code go here.
* **`ai-services/`**: This is for the **AI Team**. The Python scripts, LangChain agents, and the Vet Triage AI logic live in this folder.
* **`admin/`**: The separate frontend dashboard exclusively for our platform moderators.
* **`docs/`**: Where we keep all our project plans, API documentation, and architecture diagrams.

> **💡 Golden Rule:** Only edit files inside the folder assigned to your team! For example, if you are on the Frontend team, you should only be changing files inside the `client/` folder.

---

## 🌿 2. Our Branching Strategy (Kept Simple)

To make sure nobody breaks the main working code, we do not push code directly to the main branch. Instead, we have created **5 simple branches**:

1. `frontend`
2. `backend`
3. `ai`
4. `database`
5. `security`

You will only ever work inside the branch that matches your role. 

---

## 🛠️ 3. Step-by-Step: How to Work and Save Your Code

Every time you sit down to work on Mewoo, open your Terminal (or Command Prompt) inside the `Mewoo` folder and follow this exact sequence:

### **Step 1: Get the Latest Code**
Before you start typing any new code, make sure you have the absolute latest updates from your teammates.
```bash
git checkout main
git pull origin main
```

### **Step 2: Go to Your Assigned Branch**
Switch over to the branch for your specific team (e.g., frontend).
```bash
git checkout frontend 
or use 
git switch frontend 
```
*(Replace `frontend` with `backend`, `ai`, `database`, or `security` depending on your role).*

### **Step 3: Update Your Branch**
Bring any new updates from the main code into your branch.
```bash
git merge main
```

### **Step 4: Do Your Work! 💻**
Now you can write your code, edit your files, and save them in your code editor (like VS Code).

### **Step 5: Save (Commit) Your Work**
When you are done working for the day and want to save your progress to GitHub:

First, tell Git to track all the files you changed:
```bash
git add .
```

Second, write a short message explaining what you did:
```bash
git commit -m "Added the login button on the homepage"
```

### **Step 6: Push Your Code to GitHub**
Send your saved code up to the cloud so everyone else can see it.
```bash
git push origin frontend
```
*(Again, replace `frontend` with your actual branch name).*

---

### 🎉 That's it! 
If you stick to these 6 steps every time you work, you will never have a Git conflict, and the Mewoo project will run perfectly!
