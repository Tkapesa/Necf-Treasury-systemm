#!/usr/bin/env python3
"""
Test script for enhanced OCR functionality with Turkish language support.

This script demonstrates the OCR processing capabilities for Turkish receipts
and shows how the system extracts vendor information, amounts, dates, and
individual line items from receipt images.
"""

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.ocr import process_receipt_ocr, ReceiptParser


async def test_turkish_receipt():
    """Test OCR processing on a Turkish receipt."""
    print("🇹🇷 Testing Turkish Receipt OCR Processing")
    print("=" * 50)
    
    # Simulate a Turkish receipt file
    mock_file_path = "uploads/test_turkish_receipt.jpg"
    
    # Process OCR
    result = await process_receipt_ocr(mock_file_path)
    
    print("📄 Raw OCR Text:")
    print("-" * 30)
    print(result.raw_text)
    print()
    
    print("🔍 Extracted Data:")
    print("-" * 30)
    print(f"Vendor: {result.vendor}")
    print(f"Amount: ${result.amount:.2f}" if result.amount else "Amount: Not found")
    print(f"Date: {result.date}")
    print(f"Category: {result.category}")
    print(f"Confidence: {result.confidence:.2%}")
    print(f"Processing Time: {result.processing_time:.2f}s")
    print()
    
    if result.items:
        print("📋 Individual Items:")
        print("-" * 30)
        for i, item in enumerate(result.items, 1):
            print(f"{i:2d}. {item['name']} - {item['quantity']}x ${item['price']:.2f} = ${item['total']:.2f}")
        print()
    
    return result


async def test_english_receipt():
    """Test OCR processing on an English receipt."""
    print("🇺🇸 Testing English Receipt OCR Processing")
    print("=" * 50)
    
    # Simulate an English receipt file
    mock_file_path = "uploads/test_office_supplies.jpg"
    
    # Process OCR
    result = await process_receipt_ocr(mock_file_path)
    
    print("📄 Raw OCR Text:")
    print("-" * 30)
    print(result.raw_text)
    print()
    
    print("🔍 Extracted Data:")
    print("-" * 30)
    print(f"Vendor: {result.vendor}")
    print(f"Amount: ${result.amount:.2f}" if result.amount else "Amount: Not found")
    print(f"Date: {result.date}")
    print(f"Category: {result.category}")
    print(f"Confidence: {result.confidence:.2%}")
    print(f"Processing Time: {result.processing_time:.2f}s")
    print()
    
    if result.items:
        print("📋 Individual Items:")
        print("-" * 30)
        for i, item in enumerate(result.items, 1):
            print(f"{i:2d}. {item['name']} - {item['quantity']}x ${item['price']:.2f} = ${item['total']:.2f}")
        print()
    
    return result


async def test_parser_features():
    """Test individual parser features with various input formats."""
    print("🧪 Testing Parser Features")
    print("=" * 50)
    
    parser = ReceiptParser()
    
    # Test Turkish amount extraction
    turkish_text = """
    TOPLAM: 118,89 TL
    KDV: 18,14 TL
    ARA TOPLAM: 100,75 TL
    """
    
    amount = parser.extract_amount(turkish_text)
    print(f"Turkish amount extraction: {amount}")
    
    # Test Turkish date extraction
    date_text = """
    TARİH: 05.09.2025
    SAAT: 14:30
    """
    
    date = parser.extract_date(date_text)
    print(f"Turkish date extraction: {date}")
    
    # Test item extraction
    items_text = """
    2 ADET Ekmek                 8,50 TL
    1 ADET Süt (1L)             12,90 TL
    3 ADET Yoğurt               15,75 TL
    """
    
    items = parser.extract_items(items_text)
    print(f"Extracted {len(items)} items:")
    for item in items:
        print(f"  - {item}")


async def main():
    """Run all OCR tests."""
    print("🚀 Enhanced OCR System Test Suite")
    print("=" * 60)
    print()
    
    # Test Turkish receipt
    await test_turkish_receipt()
    print("\n" + "=" * 60 + "\n")
    
    # Test English receipt
    await test_english_receipt()
    print("\n" + "=" * 60 + "\n")
    
    # Test parser features
    await test_parser_features()
    print("\n" + "=" * 60)
    
    print("✅ All tests completed!")
    print()
    print("💡 Key Features Demonstrated:")
    print("   • Turkish language support for OCR")
    print("   • Enhanced amount extraction (TL, $, €)")
    print("   • Date extraction in multiple formats")
    print("   • Individual line item parsing")
    print("   • Confidence scoring")
    print("   • Processing time tracking")
    print("   • Category detection based on content")


if __name__ == "__main__":
    asyncio.run(main())
