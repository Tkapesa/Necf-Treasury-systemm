#!/usr/bin/env python3
"""
Test script to verify analytics data structure
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, text
from app.core.config import get_settings
import json

def test_analytics_data():
    """Test the analytics queries directly"""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with Session(engine) as session:
        print("🧪 Testing analytics data queries...")
        
        # Test category breakdown
        category_query = text("""
            SELECT 
                category,
                SUM(extracted_total) as total_amount,
                COUNT(*) as receipt_count
            FROM receipts 
            WHERE extracted_total IS NOT NULL AND category IS NOT NULL
            GROUP BY category 
            ORDER BY total_amount DESC
        """)
        
        results = session.exec(category_query).fetchall()
        print(f"\n📊 Category Breakdown:")
        for row in results:
            print(f"   {row.category}: ${row.total_amount:.2f} ({row.receipt_count} receipts)")
        
        # Test monthly trends
        monthly_query = text("""
            SELECT 
                strftime('%Y-%m', extracted_date) as month,
                SUM(extracted_total) as amount,
                COUNT(*) as receipts
            FROM receipts 
            WHERE extracted_total IS NOT NULL 
                AND extracted_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', extracted_date)
            ORDER BY month
        """)
        
        monthly_results = session.exec(monthly_query).fetchall()
        print(f"\n📈 Monthly Trends:")
        for row in monthly_results:
            print(f"   {row.month}: ${row.amount:.2f} ({row.receipts} receipts)")
        
        print(f"\n✅ Analytics data looks good!")

if __name__ == "__main__":
    test_analytics_data()
