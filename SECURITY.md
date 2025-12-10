# Security Guidelines for OpenWork

## 🚨 CRITICAL: Exposed Secrets Found

During a security audit, multiple API keys and private keys were found exposed in `.env` files within the repository.

### Files with Exposed Secrets:
- `.env` (root directory)
- `backend/.env`

### Types of Exposed Credentials:
1. **Pinata API Key** (JWT token)
2. **Wallet Private Keys** (3 wallets: PRIVATE_KEY, WALL2_KEY, WALL3_KEY)
3. **Alchemy RPC API Keys**
4. **OpenAI API Key**
5. **Gemini API Key**
6. **Admin Credentials** (backend)
7. **JWT Secret** (backend)

## ✅ Immediate Actions Required

### 1. Rotate ALL Exposed Credentials

**DO THIS IMMEDIATELY:**

- [ ] **Pinata API**: Log into Pinata and revoke/regenerate your API key
- [ ] **Wallet Private Keys**: 
  - Create 3 new wallet addresses
  - Transfer all funds from the compromised wallets to new ones
  - Never use the old private keys again
- [ ] **Alchemy API Keys**: Log into Alchemy dashboard and regenerate API keys
- [ ] **OpenAI API Key**: Revoke at https://platform.openai.com/api-keys and create new
- [ ] **Gemini API Key**: Revoke in Gemini AI Studio and create new
- [ ] **Backend Admin Password**: Change to a strong, unique password
- [ ] **JWT Secret**: Generate a new secure random string (use a password generator)

### 2. Update Your Local .env Files

After rotating credentials, update your local `.env` files with the new values. **NEVER commit these files.**

### 3. Clean Git History (IMPORTANT)

The `.env` files are currently NOT tracked by git and are properly ignored. However, if they were ever committed to git history in the past, you need to remove them:

```bash
# Check if .env files exist in git history
git log --all --full-history -- .env backend/.env

# If they appear in history, use git-filter-repo to remove them
# First, install git-filter-repo (if not already installed)
brew install git-filter-repo  # macOS
# or
pip install git-filter-repo

# Remove .env files from entire git history
git filter-repo --path .env --invert-paths --force
git filter-repo --path backend/.env --invert-paths --force

# Force push to remote (WARNING: This rewrites history)
git push origin --force --all
git push origin --force --tags
```

**⚠️ Warning:** Force pushing rewrites git history. Coordinate with your team before doing this.

### 4. Verify .gitignore

The `.gitignore` file correctly includes `.env` files. Verify this remains in place:

```bash
# Should show .env in the output
cat .gitignore | grep "^\.env"
```

## 📋 Best Practices Going Forward

### Environment Variables Management

1. **Never commit `.env` files** - They are in `.gitignore` for a reason
2. **Use `.env.example` files** - These show the required variables without exposing real values
3. **Document all required environment variables** in `.env.example` files
4. **Use strong, unique secrets** - Generate random strings for JWT secrets, API keys, etc.

### Secret Storage

**For Development:**
- Keep secrets in local `.env` files (never committed)
- Use different credentials for development vs production

**For Production:**
- Use environment variables in hosting platforms (Vercel, Netlify, etc.)
- Consider using secret management services (AWS Secrets Manager, HashiCorp Vault, etc.)
- Rotate credentials regularly

### Code Review Checklist

Before committing code, always verify:
- [ ] No hardcoded API keys or secrets in source code
- [ ] No `.env` files being committed
- [ ] `.env.example` files are up-to-date but contain no real secrets
- [ ] `import.meta.env.VITE_*` is used for accessing environment variables (frontend)
- [ ] `process.env.*` is used for accessing environment variables (backend)

### Git Pre-commit Hook (Optional)

Consider adding a pre-commit hook to prevent committing secrets:

```bash
# .git/hooks/pre-commit
#!/bin/sh
if git diff --cached --name-only | grep -E "\.env$|\.env\.local$"; then
    echo "Error: Attempting to commit .env file!"
    exit 1
fi
```

## 🔒 Environment Variables Reference

### Frontend (.env)
All frontend environment variables must be prefixed with `VITE_` to be accessible in the application.

See `.env.example` for the complete list.

### Backend (backend/.env)
Backend environment variables don't require a prefix.

See `backend/.env.example` for the complete list.

## 📞 Security Incident Response

If you discover exposed credentials:

1. **Rotate credentials immediately**
2. **Check access logs** for unauthorized access
3. **Review recent transactions** on wallet addresses
4. **Notify team members** if working in a team
5. **Update this document** with lessons learned

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [Git Filter Repo Documentation](https://github.com/newren/git-filter-repo)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)

---

**Last Updated:** December 2024  
**Status:** ⚠️ Action Required - Credentials need rotation
