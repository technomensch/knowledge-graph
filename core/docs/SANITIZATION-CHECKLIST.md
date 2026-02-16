# Sanitization Checklist

**Privacy & Security Before Sharing Your Knowledge Graph Publicly**

---

## ⚠️ CRITICAL: Review Before Publishing

Your knowledge graph likely contains sensitive information from your real project. Before sharing publicly (GitHub, blog posts, documentation sites), **you must sanitize**.

**This checklist helps you identify and remove:**
- Personal information
- Authentication credentials
- Internal infrastructure details
- Company/customer-specific data
- Proprietary information

---

## Quick Scan

Run automated scans first to catch obvious issues:

```bash
# Scan for common patterns
grep -r "api[_-]key\|API[_-]KEY" docs/
grep -r "password\|passwd\|pwd" docs/
grep -r "secret\|token" docs/
grep -r "@.*\.com" docs/  # Email addresses
grep -r "/Users/\|/home/\|C:\\\\" docs/  # Absolute paths
```

**Found matches?** Review each and decide: keep, generalize, or remove.

---

## Category 1: Personal Information

### Email Addresses

**❌ Remove:**
```markdown
Contact: user@example.com
```

**✅ Generalize:**
```markdown
Contact: user@example.com
```

### Names (People)

**❌ Remove:**
```markdown
**Authors:** John Doe, Jane Smith
```

**✅ Generalize:**
```markdown
**Authors:** Development Team
# Or use roles:
**Authors:** Backend Engineer, DevOps Lead
```

### Phone Numbers, Addresses

**❌ Remove all:**
```markdown
Office: +1 (555) 123-4567
Location: 123 Main St, Anytown, CA
```

**✅ Generalize (if context needed):**
```markdown
Office: (contact via company directory)
Location: On-site datacenter
```

### Scan Commands

```bash
# Find emails
grep -rE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" docs/

# Find phone numbers
grep -rE "\b[0-9]{3}[-.]?[0-9]{3}[-.]?[0-9]{4}\b" docs/

# Find SSN patterns
grep -rE "\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b" docs/
```

---

## Category 2: Authentication & Credentials

### API Keys

**❌ Remove:**
```markdown
API_KEY=[SECRET_KEY]
ANTHROPIC_API_KEY=[API_KEY]
```

**✅ Generalize:**
```markdown
API_KEY=your_api_key_here
ANTHROPIC_API_KEY=<your-key>
```

### Passwords

**❌ Remove:**
```markdown
DB_PASSWORD=MyS3cur3P@ssw0rd!
```

**✅ Generalize:**
```markdown
DB_PASSWORD=your_secure_password
```

### Bearer Tokens

**❌ Remove:**
```markdown
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**✅ Generalize:**
```markdown
Authorization: Bearer <token>
```

### SSH Keys, Private Keys

**❌ Remove all:**
```markdown
-----BEGIN RSA PRIVATE KEY-----
[PRIVATE_KEY_CONTENT]
-----END RSA PRIVATE KEY-----
```

**✅ Reference only:**
```markdown
# Use your SSH private key
ssh -i ~/.ssh/id_rsa user@server
```

### AWS Keys

**❌ Remove:**
```markdown
AWS_ACCESS_KEY_ID=[AWS_KEY_ID]
AWS_SECRET_ACCESS_KEY=[AWS_SECRET_KEY]
```

**✅ Environment variables:**
```markdown
export AWS_ACCESS_KEY_ID=<your-key-id>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>
```

### Scan Commands

```bash
# Find API keys
grep -rE "(api[_-]?key|apikey)[[:space:]]*[:=][[:space:]]*['\"]?[a-zA-Z0-9_-]{20,}" docs/

# Find passwords in code
grep -rE "(password|passwd|pwd)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{3,}['\"]" docs/

# Find Bearer tokens
grep -r "Bearer[[:space:]]" docs/

# Find AWS keys
grep -r "AKIA[0-9A-Z]{16}" docs/

# Find private keys
grep -r "BEGIN.*PRIVATE KEY" docs/
```

---

## Category 3: Infrastructure & Networking

### Internal IP Addresses

**❌ Remove:**
```markdown
Database server: 192.0.2.23
Internal API: 192.0.2.100
```

**✅ Generalize:**
```markdown
Database server: <internal-ip>
Internal API: 192.0.2.1  # RFC 5737 documentation IP
```

### Internal URLs/Domains

**❌ Remove:**
```markdown
https://internal.example.com/api
https://staging.example.com
http://localhost:3000/admin
```

**✅ Generalize:**
```markdown
https://internal.example.com/api
https://staging.example.com
http://localhost:3000/admin  # OK - localhost is generic
```

### Database Connection Strings

**❌ Remove:**
```markdown
postgres://admin:password@db.example.com:5432/production
mongodb://user:password@192.0.2.10:27017/app_db
```

**✅ Generalize:**
```markdown
postgres://username:password@localhost:5432/database_name
mongodb://user:password@db-host:27017/database
```

### Server Hostnames

**❌ Remove:**
```markdown
web-prod-01.example.internal
api-server-us-east-1a.aws.example.com
```

**✅ Generalize:**
```markdown
web-server-01
api-server-primary
```

### Scan Commands

```bash
# Find private IPs
grep -rE "\b(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)[0-9]{1,3}\.[0-9]{1,3}\b" docs/

# Find internal URLs
grep -rE "https?://(localhost|127\.0\.0\.1|internal\.|staging\.|dev\.)" docs/

# Find database URLs
grep -rE "(postgres|mysql|mongodb)://[a-zA-Z0-9:@.-]+/" docs/
```

---

## Category 4: Company & Project Specific

### Company Names

**❌ Remove:**
```markdown
This solution was implemented at Acme Corp.
Client: MegaCorp Industries
```

**✅ Generalize:**
```markdown
This solution was implemented at <company>.
Client: Example Corporation
```

### Customer Names

**❌ Remove:**
```markdown
Deployed for BigClient Inc.
Customer XYZ requested this feature
```

**✅ Generalize:**
```markdown
Deployed for customer
Client requested this feature
```

### Project Code Names

**❌ Remove:**
```markdown
Project Falcon internal tracking: FLCN-1234
```

**✅ Generalize:**
```markdown
Internal tracking: PROJ-1234
```

### Product Names (if proprietary)

**❌ Potentially remove:**
```markdown
Our proprietary RevenueMaximizer platform
```

**✅ Generalize:**
```markdown
The revenue optimization platform
```

**Note:** Use judgment - if product is public, name is OK.

### Scan Commands

```bash
# Find your company name (customize)
grep -ri "acme corp\|megacorp\|bigclient" docs/

# Find project codes (customize pattern)
grep -rE "PROJ-[0-9]{4,}" docs/
```

---

## Category 5: Version Numbers & Project Metadata

### Version References

**❌ Remove:**
```markdown
Implemented in v1.x.y
Released as part of v9.x series
Deprecated in v1.2.x
Feature added in v2.1.0
```

**✅ Generalize:**
```markdown
Implemented in version X.Y.Z
Released as part of major version X
Deprecated in earlier versions
Feature added in version 2.1
```

### Why Remove Version Numbers?

Version numbers can reveal:
- Implementation timeline (v1.x.y suggests many prior versions)
- Project maturity level
- Internal versioning scheme
- Correlation with other public references

**Exceptions:**
- Generic examples: "Version 1.0.0" (obvious placeholder)
- External dependencies: "Requires Node.js v18+" (not your project)
- Standard formats: "Follows semver (MAJOR.MINOR.PATCH)" (educational)

### Common Patterns to Review

**Branch names with versions:**
```markdown
❌ feature/new-api
✅ feature/new-api
```

**Changelog references:**
```markdown
❌ See CHANGELOG v1.x series for details
✅ See CHANGELOG for details
```

**Documentation headers:**
```markdown
❌ ## v1.0.0 Implementation Plan
✅ ## Implementation Plan (Current Release)
```

**File paths with versions:**
```markdown
❌ docs/plans/v9.5.0-phase-1.md
✅ docs/plans/phase-1.md
# Or keep version if it's essential metadata:
✅ docs/plans/v9.5.0-phase-1.md (but add to .gitignore or sanitize before publish)
```

### Scan Commands

```bash
# Find version references
grep -rE "\bv[0-9]+(\.[0-9]+)?(\.[0-9]+)?(\.[xX])?\b" docs/

# Find semantic version patterns
grep -rE "\bv?[0-9]+\.[0-9]+\.[0-9]+\b" docs/
```

---

## Category 6: File Paths

### Absolute Paths

**❌ Remove:**
```markdown
/Users/john/Documents/my-project/config.json
/home/jane/projects/app/src/
C:\Users\Developer\project\
```

**✅ Relative paths:**
```markdown
./config.json
./src/
./project/
```

### Home Directory References

**❌ Remove:**
```markdown
Copy config to /Users/john/.config/app/
```

**✅ Generalize:**
```markdown
Copy config to ~/.config/app/
# Or
Copy config to $HOME/.config/app/
# Or (Windows)
Copy config to %USERPROFILE%\.config\app\
```

### Scan Commands

```bash
# Find absolute paths
grep -rE "/Users/[^/]+/|/home/[^/]+/|C:\\\\Users\\\\" docs/
```

---

## Category 7: Metrics & Performance Data

### Business Metrics (Potentially Sensitive)

**❌ May reveal too much:**
```markdown
Revenue increased 43% ($2.3M → $3.3M)
Customer churn rate: 8.5%
```

**✅ Generalize percentages:**
```markdown
Revenue increased 43%
Customer churn reduced from X% to Y%
```

**Rule:** Percentages usually OK, absolute numbers may reveal business scale.

### Performance Numbers (Usually OK)

**✅ Generally safe:**
```markdown
Response time: 5s → 300ms
Memory usage: 4GB → 280MB
```

**Exception:** If numbers reveal infrastructure scale (e.g., "10,000 servers"), consider generalizing.

---

## Category 8: Code & Configuration

### Hardcoded Secrets in Code

**❌ Remove:**
```javascript
const API_KEY = 'sk_live_abc123'
const password = 'MyPassword123'
```

**✅ Environment variables:**
```javascript
const API_KEY = process.env.API_KEY
const password = process.env.DB_PASSWORD
```

### Configuration Files

Review files like:
- `.env` files → Never commit (should be `.gitignore`d anyway)
- `config.json` → Sanitize values
- `secrets.yml` → Remove or use placeholders

**Example:**

```yaml
# Before (sensitive)
database:
  host: db.internal.company.com
  user: admin_prod
  password: S3cur3P@ss!

# After (sanitized)
database:
  host: localhost  # Or: db.example.com
  user: database_user
  password: your_secure_password
```

---

## Sanitization Strategy

### 1. Generalize vs. Remove

**Generalize** when context is valuable:
```markdown
# Context valuable
Email: user@example.com
Company: Example Corp
```

**Remove** when not needed:
```markdown
# Not needed, remove entirely
~~Employee ID: 12345~~
~~SSN: 123-45-6789~~
```

### 2. Use Standard Placeholders

- **Domains:** `example.com`, `example.org`
- **IPs:** `192.0.2.1` (RFC 5737), `203.0.113.0/24`
- **Emails:** `user@example.com`
- **Names:** `John Doe`, `Jane Smith` (obviously generic)
- **Companies:** `Acme Corp`, `Example Industries`

### 3. Document What You Sanitized

Add note to README:

```markdown
## Privacy Note

This knowledge graph has been sanitized for public sharing:
- Company names generalized
- Internal IPs replaced with RFC 5737 addresses
- Customer names removed
- Absolute file paths converted to relative

The patterns and lessons remain intact and reusable.
```

---

## Pre-Commit Hook

Automate detection before committing:

```bash
# Install pre-commit hook
cp core/examples-hooks/pre-commit-sanitization.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Customize patterns in hook
vim .git/hooks/pre-commit
```

Hook will scan staged files and:
- **Block commit** if sensitive patterns detected (mode: block)
- **Warn** but allow commit (mode: warn)

See `core/examples-hooks/pre-commit-sanitization.sh` for full implementation.

---

## Sanitization Checklist (Before Publishing)

Use this checklist before making repository public:

**Personal Information:**
- [ ] Emails replaced with example.com
- [ ] Real names replaced with roles or generic names
- [ ] No phone numbers or addresses

**Authentication:**
- [ ] No API keys
- [ ] No passwords or secrets
- [ ] No private keys
- [ ] No AWS/cloud credentials

**Infrastructure:**
- [ ] Internal IPs replaced with RFC 5737 addresses
- [ ] Internal URLs generalized
- [ ] Database URLs sanitized
- [ ] Server hostnames generalized

**Company/Project:**
- [ ] Company names generalized (if sensitive)
- [ ] Customer names removed
- [ ] Project codes sanitized (if proprietary)

**File Paths:**
- [ ] Absolute paths converted to relative
- [ ] User-specific paths use ~/ or $HOME

**Code:**
- [ ] No hardcoded secrets in examples
- [ ] Configuration files use placeholders

**Final Steps:**
- [ ] Run automated scan (grep commands above)
- [ ] Pre-commit hook installed and tested
- [ ] Added privacy note to README
- [ ] Reviewed with teammate (if applicable)

---

## After Sanitization

### Document Process

```markdown
# In PROJECT-SANITIZATION.md

## Sanitization Log

**Date:** 2024-10-15
**Scope:** Full knowledge graph (docs/)

### Changes Made:
- Replaced 15 instances of company name
- Generalized 8 internal IPs
- Removed 3 API keys from examples
- Converted 42 absolute paths to relative

### Verification:
- [x] Automated scans passed
- [x] Manual review complete
- [x] Pre-commit hook installed
```

### Test Sanitization

```bash
# Clone to new directory (fresh eyes)
git clone /path/to/sanitized/repo /tmp/test-sanitized
cd /tmp/test-sanitized

# Search for your company name
grep -ri "YourCompany" .

# Should return: No matches
```

---

## Related

- **Pre-Commit Hook:** [../examples-hooks/pre-commit-sanitization.sh](../examples-hooks/pre-commit-sanitization.sh)
- **Examples:** Study sanitized examples in [../examples/](../examples/)
- **Privacy Note:** Always include in README before sharing
