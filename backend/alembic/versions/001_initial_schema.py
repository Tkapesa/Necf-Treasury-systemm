"""
Initial database schema for Church Treasury Management System.

Creates tables for users, receipts, and transactions with proper
foreign key relationships and indexes for performance.

Revision ID: 001_initial_schema
Revises: 
Create Date: 2025-09-01 10:00:00.000000

TODO: Add additional indexes for query performance after MVP
TODO: Add full-text search indexes for receipt descriptions
TODO: Add audit trail tables for change tracking
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# Revision identifiers
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial database schema."""
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(), primary_key=True, default=lambda: str(uuid.uuid4())),
        sa.Column('username', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('treasurer', 'admin', 'pastor', 'auditor', name='userrole'), 
                 nullable=False, default='pastor', index=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, index=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        
        # TODO: Add for multi-tenancy
        # sa.Column('church_id', sa.String(), sa.ForeignKey('churches.id'), nullable=True),
        
        # TODO: Add for SSO integration
        # sa.Column('oauth_provider', sa.String(50), nullable=True),
        # sa.Column('external_id', sa.String(255), nullable=True),
    )
    
    # Create receipts table
    op.create_table(
        'receipts',
        sa.Column('id', sa.String(), primary_key=True, default=lambda: str(uuid.uuid4())),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', 'reviewed', 
                                   name='receiptstatus'), nullable=False, default='pending'),
        sa.Column('ocr_data', postgresql.JSON(), nullable=True),
        sa.Column('vendor_name', sa.String(255), nullable=True),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('transaction_date', sa.DateTime(), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('uploaded_by_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('transaction_id', sa.String(), sa.ForeignKey('transactions.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    
    # Create transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.String(), primary_key=True, default=lambda: str(uuid.uuid4())),
        sa.Column('type', sa.Enum('income', 'expense', 'transfer', name='transactiontype'), 
                 nullable=False, index=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('category', sa.String(100), nullable=False, index=True),
        sa.Column('transaction_date', sa.DateTime(), nullable=False, index=True),
        sa.Column('account_from', sa.String(100), nullable=True),
        sa.Column('account_to', sa.String(100), nullable=True),
        sa.Column('reference_number', sa.String(100), nullable=True, unique=True),
        sa.Column('notes', sa.String(1000), nullable=True),
        sa.Column('is_approved', sa.Boolean(), nullable=False, default=False),
        sa.Column('approved_by_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    
    # Create indexes for better query performance
    op.create_index('idx_users_username_email', 'users', ['username', 'email'])
    op.create_index('idx_receipts_status_date', 'receipts', ['status', 'created_at'])
    op.create_index('idx_transactions_type_date', 'transactions', ['type', 'transaction_date'])
    op.create_index('idx_transactions_category_amount', 'transactions', ['category', 'amount'])
    
    # TODO: Add composite indexes for common query patterns after MVP:
    # op.create_index('idx_transactions_user_date', 'transactions', ['created_by_id', 'transaction_date'])
    # op.create_index('idx_receipts_user_status', 'receipts', ['uploaded_by_id', 'status'])


def downgrade() -> None:
    """Drop all tables and indexes."""
    
    # Drop indexes
    op.drop_index('idx_transactions_category_amount', table_name='transactions')
    op.drop_index('idx_transactions_type_date', table_name='transactions')
    op.drop_index('idx_receipts_status_date', table_name='receipts')
    op.drop_index('idx_users_username_email', table_name='users')
    
    # Drop tables (in reverse order due to foreign keys)
    op.drop_table('transactions')
    op.drop_table('receipts') 
    op.drop_table('users')
    
    # Drop custom enum types
    sa.Enum(name='userrole').drop(op.get_bind())
    sa.Enum(name='receiptstatus').drop(op.get_bind())
    sa.Enum(name='transactiontype').drop(op.get_bind())


# Migration instructions:
#
# 1. Initialize Alembic (if not already done):
#    cd backend
#    alembic init alembic
#
# 2. Update alembic.ini to point to your database:
#    sqlalchemy.url = postgresql://user:password@localhost:5432/church_treasury
#
# 3. Update alembic/env.py to import your models:
#    from app.models import *
#    target_metadata = SQLModel.metadata
#
# 4. Generate this migration:
#    alembic revision --autogenerate -m "Initial schema"
#
# 5. Run the migration:
#    alembic upgrade head
#
# 6. To rollback:
#    alembic downgrade base
#
# 7. To see migration history:
#    alembic history --verbose
#
# 8. To see current version:
#    alembic current
#
# Note: This is a template migration. Alembic auto-generate will create
# the actual migration files based on your SQLModel definitions.
