"""Add OCR enhancement fields

Revision ID: 002_ocr_enhancements
Revises: 001_initial_schema
Create Date: 2025-09-09 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_ocr_enhancements'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    """Add OCR enhancement fields to receipts table."""
    # Add new OCR-related columns
    op.add_column('receipts', sa.Column('ocr_confidence', sa.Float(), nullable=True))
    op.add_column('receipts', sa.Column('processing_time', sa.Float(), nullable=True))
    
    # Add constraint for confidence score (0.0 to 1.0)
    op.create_check_constraint(
        'ck_receipts_ocr_confidence_range',
        'receipts',
        'ocr_confidence >= 0.0 AND ocr_confidence <= 1.0'
    )
    
    # Add constraint for processing time (non-negative)
    op.create_check_constraint(
        'ck_receipts_processing_time_positive',
        'receipts',
        'processing_time >= 0.0'
    )


def downgrade():
    """Remove OCR enhancement fields from receipts table."""
    # Drop constraints first
    op.drop_constraint('ck_receipts_processing_time_positive', 'receipts', type_='check')
    op.drop_constraint('ck_receipts_ocr_confidence_range', 'receipts', type_='check')
    
    # Drop columns
    op.drop_column('receipts', 'processing_time')
    op.drop_column('receipts', 'ocr_confidence')
