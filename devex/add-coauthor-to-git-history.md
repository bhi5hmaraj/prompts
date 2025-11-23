# Add Co-Author Credits to Git History

A working solution for adding co-author credits to all commits in a Git repository while preserving original commit messages and authorship.

## Problem Statement

When collaborating with AI assistants like Claude, commits are authored by the AI. To get proper credit on your GitHub profile, you need to add yourself as a co-author to all commits.

**Goal**: Add `Co-Authored-By: YourName <your@email.com>` to all commit messages while:
- ✅ Preserving original commit messages
- ✅ Keeping original author (e.g., Claude)
- ✅ Maintaining commit history structure

## Prerequisites

- Git repository with commits you want to add co-author credits to
- A clean working directory (commit or stash changes)
- **IMPORTANT**: Have an uncorrupted branch with original commit messages

## The Working Solution

### Step 1: Identify the Source Branch

If you've already tried other approaches that corrupted your main branch, find a branch with the original uncorrupted commit messages:

```bash
# List all branches
git branch -a

# Check a branch for good commit messages
git log branch-name -3 --pretty=format:"%B"
```

In our case, the `claude/clarify-session-purpose-*` branch had the original messages.

### Step 2: Checkout the Clean Branch

```bash
# Checkout the branch with good commit history
git checkout -b working-branch origin/branch-with-good-history
```

### Step 3: Run git filter-branch with Working Script

Use this `git filter-branch` command with a msg-filter that properly adds co-author:

```bash
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch -f --msg-filter '
cat
if ! grep -q "Co-Authored-By:" /dev/stdin; then
  echo ""
  echo "Co-Authored-By: YourName <your@email.com>"
fi
' -- working-branch
```

**How it works**:
- `cat` outputs the original commit message from stdin
- Checks if `Co-Authored-By:` already exists
- If not, appends a blank line and the co-author credit
- Processes all commits on the specified branch

### Step 4: Verify the Changes

Check that commits have both original message and co-author:

```bash
# Check latest commit
git log working-branch -1 --pretty=format:"%B"

# Verify author is still original
git log working-branch -1 --pretty=format:"Author: %an <%ae>"
```

You should see:
```
Author: Claude <noreply@anthropic.com>

[Original commit message]

Co-Authored-By: YourName <your@email.com>
```

### Step 5: Replace Main Branch

```bash
# Delete old corrupted main
git branch -D main

# Create new main from working branch
git checkout -b main

# Force push to remote
git push origin main --force-with-lease
```

## Complete Example

```bash
#!/bin/bash
# Complete script to add co-author to all commits

# Configuration
COAUTHOR_NAME="Bhishmaraj"
COAUTHOR_EMAIL="matib275@gmail.com"
SOURCE_BRANCH="origin/claude/clarify-session-purpose-016ScLivaenyJRGHs2FvuBLN"

# Clone fresh copy (or cd to existing repo)
cd /tmp
git clone git@github.com:username/repo.git
cd repo

# Checkout source branch with good history
git checkout -b working-branch $SOURCE_BRANCH

# Add co-author to all commits
export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch -f --msg-filter "
cat
if ! grep -q 'Co-Authored-By:' /dev/stdin; then
  echo ''
  echo 'Co-Authored-By: $COAUTHOR_NAME <$COAUTHOR_EMAIL>'
fi
" -- working-branch

# Verify one commit
echo "Verifying latest commit:"
git log working-branch -1 --pretty=format:"%an <%ae>%n%B"

# Replace main branch
git branch -D main
git checkout -b main

# Push to remote
git push origin main --force-with-lease

echo "Done! Check GitHub in 24 hours for updated contribution graph."
```

## What NOT to Do

### ❌ Bad Approach 1: Using echo in msg-filter
```bash
# DON'T DO THIS - loses original messages
git filter-branch --msg-filter '
  echo "$1"
  echo "Co-Authored-By: ..."
'
```

### ❌ Bad Approach 2: File-based without stdin
```bash
# DON'T DO THIS - msg-filter doesn't get filename
git filter-branch --msg-filter '
  cat "$1"  # $1 is not passed
  echo "Co-Authored-By: ..."
'
```

### ❌ Bad Approach 3: Rewriting on corrupted branch
```bash
# DON'T DO THIS - rewrites already corrupted messages
git filter-branch --msg-filter 'cat' -- main  # if main is already corrupted
```

## GitHub Co-Author Recognition

For GitHub to recognize co-authors:

1. **Email must match** your GitHub account email
2. **Format must be exact**: `Co-Authored-By: Name <email@example.com>`
3. **Location matters**: Must be in commit message footer (after blank line)
4. **Updates take time**: GitHub updates contribution graphs within 24 hours

## Troubleshooting

### "Commits still show only Co-Authored-By as message"

You rewrote from an already corrupted branch. Find a branch with original messages:
```bash
git branch -a | grep -v main
git log branch-name -3 --pretty=format:"%s"
```

### "Author changed to me instead of staying as Claude"

The `--msg-filter` only changes messages, not authors. If authors changed, you used `--env-filter` or `--commit-filter` incorrectly.

### "Force push rejected"

Use `--force-with-lease` for safety:
```bash
git push origin main --force-with-lease
```

If still rejected, fetch first:
```bash
git fetch origin
git push origin main --force-with-lease
```

## Alternative: Using Python Script

For more complex scenarios, use Python with git commit-tree:

```python
#!/usr/bin/env python3
import subprocess
import os
import tempfile

def add_coauthor_to_commit(commit_hash, coauthor_line):
    # Get commit info
    msg = subprocess.check_output(['git', 'show', '-s', '--format=%B', commit_hash]).decode()
    tree = subprocess.check_output(['git', 'rev-parse', f'{commit_hash}^{{tree}}']).decode().strip()

    # Add co-author if not present
    if 'Co-Authored-By:' not in msg:
        msg = msg.rstrip() + '\n\n' + coauthor_line

    # Write message to temp file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
        f.write(msg)
        msg_file = f.name

    # Create new commit (simplified - add parent handling)
    result = subprocess.run(
        ['git', 'commit-tree', tree, '-F', msg_file],
        capture_output=True,
        text=True
    )

    os.unlink(msg_file)
    return result.stdout.strip()
```

## References

- [Git filter-branch documentation](https://git-scm.com/docs/git-filter-branch)
- [GitHub co-author documentation](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)
- [Git commit-tree documentation](https://git-scm.com/docs/git-commit-tree)

## Success Criteria

After following this guide:
- ✅ All commits have original messages intact
- ✅ All commits have co-author credits added
- ✅ Original author attribution preserved
- ✅ GitHub shows commits in your contribution graph (within 24h)

## Real-World Example

**Before**:
```
commit 1489a7f
Author: Claude <noreply@anthropic.com>

Week 4: Fix Right-Click Context Menu
- Fix right-click context menu message routing
```

**After**:
```
commit 1489a7f (rewritten hash)
Author: Claude <noreply@anthropic.com>

Week 4: Fix Right-Click Context Menu
- Fix right-click context menu message routing

Co-Authored-By: Bhishmaraj <matib275@gmail.com>
```

Result: Commit shows on both Claude's and Bhishmaraj's GitHub profiles! 🎉
