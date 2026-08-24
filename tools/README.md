# 🧰 PetPluse Developer Tools

This directory contains utility scripts, CLI tools, and automation helpers designed to streamline the developer experience.

## 🛠️ Included Tools

- **Database Seeders**: Scripts to quickly populate a local or remote PostgreSQL database with mock data.
- **Environment Bootstrappers**: Helpers to sync and validate `.env` configurations across team members.
- **Deployment Scripts**: Custom build pipelines or webhooks for CI/CD integrations.
- **Diagnostic Utilities**: Ad-hoc scripts for checking system health, validating JWTs, or pinging external APIs (like Paymob).

## ⚠️ Usage Notice

These tools are intended for **internal development and administrative use only**. They should not be deployed to production environments or bundled into the client-side React application. Ensure you have the proper environment variables configured before running any scripts that mutate database states.
