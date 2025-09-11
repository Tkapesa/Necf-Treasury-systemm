#!/usr/bin/env python3
"""
Test script to verify email validation functionality
"""

import re

def validate_email(email: str) -> bool:
    """Validate email format using regex."""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None

# Test cases
test_emails = [
    ("john@example.com", True),
    ("user.name@domain.co.uk", True),
    ("test+tag@gmail.com", True),
    ("invalid-email", False),
    ("@domain.com", False),
    ("user@", False),
    ("user@domain", False),
    ("", False),
    ("user name@domain.com", False),
    ("user@domain.c", False)  # domain extension too short
]

print("Email Validation Test Results:")
print("=" * 50)

all_passed = True
for email, expected in test_emails:
    result = validate_email(email)
    status = "✅ PASS" if result == expected else "❌ FAIL"
    print(f"{status} | {email:<25} | Expected: {expected}, Got: {result}")
    if result != expected:
        all_passed = False

print("=" * 50)
print(f"Overall Result: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
