"""
Analytics endpoints for financial charts and live data visualization
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, text
from decimal import Decimal

from ..core.database import get_session
from ..models import Receipt, User
from ..core.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/charts")
async def get_chart_data(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get aggregated data for financial charts and visualizations
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Category spending breakdown
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
        category_results = session.exec(category_query).fetchall()
        
        total_spending = sum(float(row.total_amount) for row in category_results if row.total_amount)
        
        # Define colors for categories
        colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', 
                 '#10B981', '#34D399', '#6EE7B7', '#F59E0B', '#FBBF24', 
                 '#EF4444', '#F87171', '#06B6D4', '#67E8F9']
        
        category_spending = []
        for i, row in enumerate(category_results):
            if row.total_amount and row.total_amount > 0:
                percentage = (float(row.total_amount) / total_spending) * 100 if total_spending > 0 else 0
                category_spending.append({
                    "category": row.category or "Other",
                    "amount": float(row.total_amount),
                    "percentage": round(percentage, 1),
                    "count": row.receipt_count,
                    "color": colors[i % len(colors)]
                })
        
        # Monthly spending trends (last 12 months)
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
        
        monthly_trends = []
        for row in monthly_results:
            if row.amount:
                # Convert month format to readable format
                try:
                    month_date = datetime.strptime(row.month, '%Y-%m')
                    month_name = month_date.strftime('%b %Y')
                    monthly_trends.append({
                        "month": month_name,
                        "amount": float(row.amount),
                        "budget": 8000,  # Mock budget for demo
                        "receipts": row.receipts
                    })
                except:
                    continue
        
        # Budget comparison data
        budget_data = []
        for item in category_spending[:8]:  # Top 8 categories
            category = item["category"]
            actual = item["amount"]
            # Mock budget amounts for demonstration
            budget_amounts = {
                "Utilities": 1500, "Events": 2000, "Technology": 1800,
                "Ministry": 1200, "Office Supplies": 800, "Food & Catering": 1500,
                "Transportation": 600, "Maintenance": 1000
            }
            budget = budget_amounts.get(category, 1000)
            variance = actual - budget
            percent_used = (actual / budget) * 100 if budget > 0 else 0
            
            budget_data.append({
                "category": category,
                "budget": budget,
                "actual": actual,
                "variance": variance,
                "percentUsed": min(100, percent_used)
            })
        
        # Summary statistics
        total_query = text("""
            SELECT 
                COUNT(*) as total_receipts,
                SUM(extracted_total) as total_amount,
                AVG(extracted_total) as avg_amount
            FROM receipts 
            WHERE extracted_total IS NOT NULL
        """)
        total_result = session.exec(total_query).fetchone()
        
        month_query = text("""
            SELECT 
                COUNT(*) as month_receipts,
                SUM(extracted_total) as month_amount
            FROM receipts 
            WHERE extracted_total IS NOT NULL 
                AND strftime('%Y-%m', extracted_date) = strftime('%Y-%m', 'now')
        """)
        month_result = session.exec(month_query).fetchone()
        
        total_budget = 12000  # Mock total budget
        budget_used_percent = (total_spending / total_budget) if total_budget > 0 else 0
        
        return {
            "categorySpending": category_spending,
            "monthlyTrends": monthly_trends,
            "budgetComparison": budget_data,
            "totalStats": {
                "totalSpent": total_spending,
                "totalReceipts": total_result.total_receipts if total_result else 0,
                "averageAmount": float(total_result.avg_amount) if total_result and total_result.avg_amount else 0,
                "monthlyBudget": total_budget,
                "budgetUsed": budget_used_percent,
                "monthReceipts": month_result.month_receipts if month_result else 0,
                "monthAmount": float(month_result.month_amount) if month_result and month_result.month_amount else 0
            }
        }
        
    except Exception as e:
        print(f"Error in get_chart_data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch chart data: {str(e)}")

@router.get("/summary")
async def get_financial_summary(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get financial summary statistics
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Total statistics
        total_query = text("""
            SELECT 
                COUNT(*) as total_receipts,
                SUM(extracted_total) as total_amount,
                AVG(extracted_total) as avg_amount
            FROM receipts 
            WHERE extracted_total IS NOT NULL
        """)
        total_result = session.exec(total_query).fetchone()
        
        # This month statistics
        month_query = text("""
            SELECT 
                COUNT(*) as month_receipts,
                SUM(extracted_total) as month_amount
            FROM receipts 
            WHERE extracted_total IS NOT NULL 
                AND strftime('%Y-%m', extracted_date) = strftime('%Y-%m', 'now')
        """)
        month_result = session.exec(month_query).fetchone()
        
        # This week statistics
        week_query = text("""
            SELECT 
                COUNT(*) as week_receipts,
                SUM(amount) as week_amount
            FROM receipts 
            WHERE amount IS NOT NULL 
                AND date >= date('now', '-7 days')
        """)
        week_result = session.exec(week_query).fetchone()
        
        return {
            "totalReceipts": total_result.total_receipts if total_result else 0,
            "totalAmount": float(total_result.total_amount) if total_result and total_result.total_amount else 0,
            "averageAmount": float(total_result.avg_amount) if total_result and total_result.avg_amount else 0,
            "monthReceipts": month_result.month_receipts if month_result else 0,
            "monthAmount": float(month_result.month_amount) if month_result and month_result.month_amount else 0,
            "weekReceipts": week_result.week_receipts if week_result else 0,
            "weekAmount": float(week_result.week_amount) if week_result and week_result.week_amount else 0
        }
        
    except Exception as e:
        print(f"Error in get_financial_summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch financial summary")
