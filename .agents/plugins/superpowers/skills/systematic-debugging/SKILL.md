---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Overview

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**
   - Trace through component boundaries
   - Log data entering and exiting each layer

5. **Trace Data Flow**
   - Where does the bad value originate?
   - What called this with the bad value?
   - Fix at the source, not at the symptom

### Phase 2: Pattern Analysis

1. **Find Working Examples**
   - Locate similar working code in same codebase
2. **Compare Against References**
   - Understand the pattern fully before applying
3. **Identify Differences**
   - What's different between working and broken?

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis**: State clearly what you think the root cause is.
2. **Test Minimally**: Make the smallest possible change to test the hypothesis.
3. **Verify Before Continuing**: Did it work?

### Phase 4: Implementation

1. **Create Failing Test Case** using TDD.
2. **Implement Single Fix** addressing the root cause.
3. **Verify Fix**: Ensure no other tests broken.
4. **If 3+ Fixes Failed**: STOP and question the architecture.

## Red Flags - STOP and Follow Process

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"

**ALL of these mean: STOP. Return to Phase 1.**
