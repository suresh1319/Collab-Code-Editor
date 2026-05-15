# Contributing to CollabCE

Thank you for your interest in CollabCE! Every contribution — code, docs, tests, bug reports — matters enormously. We are thrilled to have you as part of our open-source community, especially during GSSoC!

---

## Code of Conduct

CollabCE follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/). Be kind and constructive.

---

## Project Philosophy

1. **Developer experience above all.** If the code editor feels awkward, it's a bug.
2. **Real-time reliability.** Collaboration must be seamless and conflict-free.
3. **Simple setup.** Anyone should be able to clone and run the project locally within minutes.
4. **Accessible and responsive.** The editor should be usable across different environments and devices.

---

## Development Setup

### Prerequisites

| Tool    | Min Version | Install                            |
| ------- | ----------- | ---------------------------------- |
| Node.js | 18.x        | [nodejs.org](https://nodejs.org)   |
| npm     | 9.x         | Comes with Node.js                 |
| Git     | 2.x         | [git-scm.com](https://git-scm.com) |

### Bootstrap

```bash
# Clone your fork (replace YOUR_USERNAME)
git clone https://github.com/YOUR_USERNAME/Collab-Code-Editor.git
cd Collab-Code-Editor

# Add upstream remote
git remote add upstream https://github.com/suresh1319/Collab-Code-Editor.git

# Install dependencies
npm install

# Start both frontend and backend concurrently
npm run dev
```

- Frontend runs on `http://localhost:3000`
- Backend (Socket.IO + Yjs WebSocket) runs on `http://localhost:3001`

---

## Contribution Workflow

### 1. Find or Create an Issue

- Browse [`good-first-issue`](https://github.com/suresh1319/Collab-Code-Editor/issues?q=label%3Agood-first-issue) or [`help-wanted`](https://github.com/suresh1319/Collab-Code-Editor/issues?q=label%3Ahelp-wanted).
- For features, open an Issue/Discussion before writing code.
- Comment "I'll work on this" or ask to be assigned to claim an issue.

### 2. Branch Naming

```bash
git checkout -b feat/react-hooks         # new feature
git checkout -b fix/issue-42-db-crash    # bug fix
git checkout -b docs/sync-api-reference  # documentation
git checkout -b chore/update-deps        # maintenance
```

### 3. Commit Convention (Conventional Commits)

```
<type>(<scope>): <short description>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`  
Scopes: `ui`, `editor`, `socket`, `yjs`, `backend`, `core`

```bash
git commit -m "feat(editor): add language autodetection"
git commit -m "fix(socket): resolve room connection issue"
```

---

## Coding Guidelines

### JavaScript / React
- Write clean and functional React components.
- Use hooks appropriately.
- Avoid using `any` type practices if writing JSDoc.
- Clean up any `console.log` statements used for debugging before creating a Pull Request.

### Backend (Node.js/Express/Socket.io)
- Ensure all socket events are properly handled and memory leaks are avoided.
- Validate all incoming data.

---

## Issue Labels

| Label              | Meaning                                          |
| ------------------ | ------------------------------------------------ |
| `gssoc`            | GirlScript Summer of Code task                   |
| `good-first-issue` | Welcoming to newcomers — scoped and well-defined |
| `help-wanted`      | Maintainers need community bandwidth             |
| `bug`              | Confirmed bug with reproduction steps            |
| `enhancement`      | New feature or improvement                       |
| `docs`             | Documentation only                               |

---

## Pull Request Checklist

- [ ] `npm run dev` starts successfully with your changes
- [ ] Code is properly formatted
- [ ] There are no console errors or warnings in the browser
- [ ] PR description explains **what**, **why**, and **how**
- [ ] If applicable, screenshots or a video are included to demonstrate UI changes

---

## Getting Help

| Where                                                                     | When                          |
| ------------------------------------------------------------------------- | ----------------------------- |
| [GitHub Issues](https://github.com/suresh1319/Collab-Code-Editor/issues)  | Bug reports, feature requests |

---

_Every line you write, every bug you fix, every doc you improve — it matters._
