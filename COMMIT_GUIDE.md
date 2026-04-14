# 🧠 Git Commit Guide (COMMIT_GUIDE.md)

A simple, practical guide to writing clean, professional Git commit messages.

---

## 🚀 1. Use Imperative Mood

Write commit messages like commands — not past tense.

✅ Good:

- `Add login button`
- `Fix navbar alignment issue`

❌ Bad:

- `Added login button`
- `Fixing navbar alignment`

**Trick:**  
Your message should complete this sentence:

> "If applied, this commit will ___"

---

## 📏 2. Follow the 50/72 Rule

### Subject Line

- Keep it **≤ 50 characters**
- Absolute max: **72 characters**

### Body (Optional)

- Leave **one blank line** after subject
- Wrap lines at **72 characters**

Example:

```

feat: add Google OAuth login

Users had trouble remembering passwords. This replaces
email/password login with Google authentication.

```

---

## 🧩 3. Make Atomic Commits

Each commit should contain **one logical change only**.

✅ Good:

- `Fix footer typo`
- `Remove unused test files`
- `Add header animation`

❌ Bad:

- One commit doing all of the above

**Why?**

- Easier debugging
- Easier rollback (`git revert`)
- Cleaner history

---

## ⚠️ 4. WIP Commits (Local Only)

Temporary commits are okay **locally**:

```

WIP: working on dashboard layout

```

But:

- ❌ Don’t push WIP to main branch
- ✅ Clean up before merging

---

## 💡 5. Explain "Why", Not "How"

The code shows *what changed*.  
Your message should explain *why it changed*.

❌ Bad:

```

Change margin to 10px and color to red

```

✅ Good:

```

Improve alert visibility with red background

Critical errors were not noticeable enough to users.

```

---

## 🏷️ 6. Use Conventional Commit Prefixes

| Type      | Purpose                         |
|-----------|---------------------------------|
| `feat:`   | New feature                     |
| `fix:`    | Bug fix                         |
| `docs:`   | Documentation changes           |
| `style:`  | Formatting, no code logic       |
| `refactor:` | Code restructuring            |
| `test:`   | Add/update tests                |
| `chore:`  | Maintenance tasks               |

---

## 🔥 Example of a Perfect Commit

```

feat: add password visibility toggle

Improves user experience by allowing users to verify
their password before submission, reducing login errors.

```

---

## 🧘 Final Rule

> **Clear commits = Clear thinking**

Good commit history = Easier collaboration + Debugging + Scaling 🚀