# Rules Update Process

**Purpose:** Systematic process for updating Cursor rules when the AI makes mistakes or when requirements change.

**Based on:** Best practice from Cursor features video - "If I see the coding agent mess something up, whether it's local or on a PR, I just tag @cursor on the PR—'Hey, add this to my agents.md or my cursor rule.'"

---

## When to Update Rules

Update rules when:

1. ✅ **AI makes a mistake** - The agent does something wrong repeatedly
2. ✅ **Pattern emerges** - You notice the agent consistently misunderstanding something
3. ✅ **Requirements change** - Business logic or standards evolve
4. ✅ **New best practices** - You learn better ways to do things
5. ✅ **Code review feedback** - PR comments suggest rule updates

**Don't update rules for:**
- ❌ One-off mistakes (unless they're critical)
- ❌ Stylistic preferences (use linters/formatters instead)
- ❌ Temporary workarounds (fix the root cause instead)

---

## Update Process

### Step 1: Identify the Issue

**What happened?**
- Describe what the AI did wrong
- Include context (which command/skill, what it was trying to do)
- Note if it's a recurring pattern

**Example:**
```
Issue: AI keeps using Parallel API for hiring signals instead of TheirStack
Context: Running /offer-launch command with "hiring SDR" signal
Pattern: Happens every time, not just once
```

### Step 2: Find the Right Rule File

**Which rule file should be updated?**

| Rule File | When to Update |
|-----------|---------------|
| `.cursor/rules/project.mdc` | General project context, API routing, workflows |
| `.cursor/rules/offer-management.mdc` | Offer-specific patterns, folder structure |
| Create new rule file | Domain-specific patterns (e.g., `api-patterns.mdc`) |

**Decision tree:**
- Is it about API usage? → `project.mdc` (API Routing section)
- Is it about offer structure? → `offer-management.mdc`
- Is it domain-specific? → Create new rule file with glob pattern

### Step 3: Write the Rule

**Format:**
- Clear, specific instruction
- Include examples (good vs. bad)
- Reference related files/patterns
- Use code blocks for code examples

**Example:**

```markdown
## API Routing for Hiring Signals

**Rule:** When a signal includes "hiring" or job-related keywords, ALWAYS use TheirStack as the primary API, not Parallel.

**Why:** TheirStack specializes in job posting data and provides better signal detection.

**Examples:**

✅ **Correct:**
```typescript
if (signal.includes("hiring")) {
  primaryAPI = "TheirStack"
}
```

❌ **Wrong:**
```typescript
// Don't use Parallel for hiring signals
primaryAPI = "Parallel" // ❌ Wrong!
```

**Reference:** See API routing logic in `scripts/route-apis.ts`
```

### Step 4: Update the Rule File

**Where to add it:**
- Add to relevant section (don't create new sections unless needed)
- Keep related rules together
- Use clear headings

**File structure:**
```markdown
# Project Context

## API Routing Logic
[Your new rule here]

## Other Section
[Existing rules]
```

### Step 5: Test the Update

**Verify it works:**
1. Run the command/skill that was failing
2. Check if AI follows the new rule
3. If it still fails, refine the rule

**Example:**
```bash
# Test the command that was failing
/offer-launch sales-roleplay-trainer hiring-signal-q1

# Check if AI now uses TheirStack correctly
```

### Step 6: Document the Change

**Update this file:**
- Add entry to "Recent Updates" section below
- Include date, issue, and solution

---

## Rule Writing Guidelines

### ✅ DO:

- **Be specific** - "Use TheirStack for hiring signals" not "Use the right API"
- **Include examples** - Show correct vs. incorrect patterns
- **Explain why** - Help AI understand the reasoning
- **Reference files** - Point to implementation details
- **Use code blocks** - For code-related rules
- **Keep it minimal** - Only include what's necessary

### ❌ DON'T:

- **Be vague** - "Do it right" is not helpful
- **Duplicate information** - Reference existing docs instead
- **Include temporary workarounds** - Fix root causes
- **Make rules too long** - Break into multiple focused rules
- **Include implementation details** - Keep rules at the "what" level, not "how"

---

## Rule Review Process

### Weekly Review

**Every week:**
1. Review recent AI mistakes
2. Identify patterns
3. Update rules if needed
4. Remove outdated rules

### Monthly Review

**Every month:**
1. Review all rule files
2. Check for duplicates
3. Consolidate related rules
4. Update examples if code changed

### Quarterly Review

**Every quarter:**
1. Audit rule effectiveness
2. Remove unused rules
3. Reorganize if needed
4. Update this process if needed

---

## Examples

### Example 1: API Routing Fix

**Issue:** AI uses Parallel for hiring signals  
**Rule Added:** "Always use TheirStack for hiring signals"  
**Location:** `.cursor/rules/project.mdc` → API Routing Logic section  
**Result:** ✅ AI now correctly routes to TheirStack

### Example 2: Folder Structure Fix

**Issue:** AI creates files in wrong locations  
**Rule Added:** "Always use offer slug in filenames"  
**Location:** `.cursor/rules/offer-management.mdc` → Folder Structure section  
**Result:** ✅ AI now creates correctly named files

### Example 3: Code Pattern Fix

**Issue:** AI doesn't log tool usage  
**Rule Added:** "Always wrap API calls with withToolLogging"  
**Location:** `.cursor/rules/project.mdc` → API Usage section  
**Result:** ✅ AI now logs all API calls

---

## Recent Updates

### 2025-01-XX: Added Tool Usage Logging Rule

**Issue:** AI wasn't logging API calls to tool_usage table  
**Solution:** Added rule requiring use of `withToolLogging` wrapper  
**Location:** `.cursor/rules/project.mdc` → API Usage section  
**Status:** ✅ Active

---

## Related Files

- **Project Rules:** `.cursor/rules/project.mdc`
- **Offer Management Rules:** `.cursor/rules/offer-management.mdc`
- **Skills:** `.cursor/skills/` (rules apply to skills too)
- **Commands:** `.cursor/commands/` (rules apply to commands too)

---

## Questions?

If unsure about updating a rule:
1. Check if similar rule already exists
2. Ask: "Is this a pattern or one-off?"
3. When in doubt, add it - you can always refine later

**Remember:** Rules are living documents. Update them as you learn.
