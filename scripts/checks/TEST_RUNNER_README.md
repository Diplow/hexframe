# TypeScript Checker Tests - How to Run

## 🚀 **Primary Test Runner** (Recommended)

```bash
cd scripts/checks
python3 run-tests.py
```

This is the **main way** to test all TypeScript checkers. It:
- ✅ Tests all 4 checkers (parser, architecture, deadcode, ruleof6)
- ✅ Uses the actual checker APIs correctly
- ✅ Provides clear, explicit output
- ✅ Handles import issues automatically
- ✅ Runs comprehensive scenarios
- ✅ Completes in seconds

**Sample Output:**
```
🧪 TypeScript Checker Test Suite
==================================================
🔍 Testing Shared Parser...
    ✅ Parser: 4 imports, 2 exports, 1 functions
🔍 Testing Architecture Checker...
    ✅ Architecture: 0 errors, 0 warnings
🔍 Testing Dead Code Checker...
    ✅ Dead code: 0 issues found
🔍 Testing Rule of 6 Checker...
    ✅ Rule of 6: 0 violations
🔍 Testing Complex Scenarios...
    ✅ Complex patterns: 0 imports, 5 exports, 3 functions

✅ All tests passed!
```

## 📋 **Alternative Test Options**

### Basic Validation
```bash
python3 test_simple.py
```
- Quick smoke test of all checkers
- Good for CI/CD pipelines
- Minimal dependencies

### Comprehensive Demo
```bash
python3 final_test_demo.py
```
- Shows the full test infrastructure built
- Demonstrates bug detection capabilities
- Educational/documentation purposes

### Individual Checker Testing
```bash
# Test specific checker only
cd ruleof6 && python3 tests/test_typescript_parsing.py  # Original tests
```

## 🎯 **Recommended Workflow**

1. **Daily Development**: `python3 run-tests.py`
2. **CI/CD Integration**: `python3 test_simple.py`
3. **New Feature Testing**: Add tests to comprehensive suite, then run `python3 run-tests.py`
4. **Bug Investigation**: Use `python3 final_test_demo.py` to see detailed analysis

## 📁 **Test Infrastructure Overview**

While we built extensive test infrastructure in `tests/`, the practical workflow is:

**For Regular Use:**
- `run-tests.py` - Primary test runner ⭐
- `test_simple.py` - Quick validation

**For Development:**
- `tests/` directory - Comprehensive test suite (80+ tests)
- `final_test_demo.py` - Full capability demonstration

**The extensive test infrastructure** (pytest integration, fixtures, etc.) **is available** for:
- Adding new comprehensive tests
- Regression testing specific bugs
- Future TypeScript port validation
- Detailed edge case coverage

But for **day-to-day use**, `python3 run-tests.py` is all you need! 🎯

## 🐛 **Known Issues Detected**

The test suite successfully detects:
1. **Template literal parsing bug** - Regex parser finds imports in template strings
2. **Complex import edge cases** - Multi-line imports with comments
3. **Real-world pattern validation** - Ensures checkers work on actual Hexframe code

These are documented and will be automatically fixed when/if migrating to TypeScript AST parsing.

---

**Bottom Line**: Use `python3 run-tests.py` for all your testing needs! 🚀