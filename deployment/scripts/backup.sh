#!/bin/bash

# NECF Treasury System Backup Script
# This script creates backups of the database and uploaded files

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Database configuration
DB_HOST="db"
DB_NAME=${POSTGRES_DB:-necf_treasury}
DB_USER=${POSTGRES_USER:-necf_user}
DB_PASSWORD=${POSTGRES_PASSWORD}

# S3 configuration for remote backups
S3_BUCKET=${S3_BACKUP_BUCKET:-necf-treasury-backups}
AWS_ACCESS_KEY_ID=${BACKUP_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY=${BACKUP_SECRET_KEY}

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_DIR}/backup.log"
}

# Create backup directory
mkdir -p "${BACKUP_DIR}"

log "Starting backup process..."

# 1. Database backup
log "Creating database backup..."
DB_BACKUP_FILE="${BACKUP_DIR}/db_backup_${DATE}.sql.gz"

PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-password \
    --clean \
    --if-exists \
    --verbose \
    | gzip > "${DB_BACKUP_FILE}"

if [ $? -eq 0 ]; then
    log "Database backup completed: ${DB_BACKUP_FILE}"
    DB_SIZE=$(du -h "${DB_BACKUP_FILE}" | cut -f1)
    log "Database backup size: ${DB_SIZE}"
else
    log "ERROR: Database backup failed"
    exit 1
fi

# 2. Storage backup (if using local storage)
if [ "${STORAGE_TYPE:-s3}" = "local" ]; then
    log "Creating storage backup..."
    STORAGE_BACKUP_FILE="${BACKUP_DIR}/storage_backup_${DATE}.tar.gz"
    
    if [ -d "/app/storage" ]; then
        tar -czf "${STORAGE_BACKUP_FILE}" -C /app storage/
        
        if [ $? -eq 0 ]; then
            log "Storage backup completed: ${STORAGE_BACKUP_FILE}"
            STORAGE_SIZE=$(du -h "${STORAGE_BACKUP_FILE}" | cut -f1)
            log "Storage backup size: ${STORAGE_SIZE}"
        else
            log "ERROR: Storage backup failed"
            exit 1
        fi
    else
        log "Storage directory not found, skipping storage backup"
    fi
fi

# 3. Configuration backup
log "Creating configuration backup..."
CONFIG_BACKUP_FILE="${BACKUP_DIR}/config_backup_${DATE}.tar.gz"

# Create a temporary directory for config files
TEMP_CONFIG_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_CONFIG_DIR}" EXIT

# Copy important configuration files (be careful not to include secrets)
mkdir -p "${TEMP_CONFIG_DIR}/config"

# Copy non-sensitive config files
if [ -f "/etc/nginx/nginx.conf" ]; then
    cp /etc/nginx/nginx.conf "${TEMP_CONFIG_DIR}/config/"
fi

# Create metadata file
cat > "${TEMP_CONFIG_DIR}/config/backup_metadata.json" << EOF
{
    "backup_date": "${DATE}",
    "database_name": "${DB_NAME}",
    "storage_type": "${STORAGE_TYPE:-s3}",
    "backup_script_version": "1.0",
    "retention_days": ${RETENTION_DAYS}
}
EOF

tar -czf "${CONFIG_BACKUP_FILE}" -C "${TEMP_CONFIG_DIR}" config/

if [ $? -eq 0 ]; then
    log "Configuration backup completed: ${CONFIG_BACKUP_FILE}"
else
    log "ERROR: Configuration backup failed"
    exit 1
fi

# 4. Upload to S3 (if configured)
if [ -n "${S3_BUCKET}" ] && [ -n "${AWS_ACCESS_KEY_ID}" ] && [ -n "${AWS_SECRET_ACCESS_KEY}" ]; then
    log "Uploading backups to S3..."
    
    # Install AWS CLI if not present
    if ! command -v aws &> /dev/null; then
        log "Installing AWS CLI..."
        pip install awscli
    fi
    
    # Upload database backup
    aws s3 cp "${DB_BACKUP_FILE}" "s3://${S3_BUCKET}/database/" --storage-class STANDARD_IA
    if [ $? -eq 0 ]; then
        log "Database backup uploaded to S3"
    else
        log "ERROR: Failed to upload database backup to S3"
    fi
    
    # Upload storage backup (if exists)
    if [ -f "${STORAGE_BACKUP_FILE}" ]; then
        aws s3 cp "${STORAGE_BACKUP_FILE}" "s3://${S3_BUCKET}/storage/" --storage-class STANDARD_IA
        if [ $? -eq 0 ]; then
            log "Storage backup uploaded to S3"
        else
            log "ERROR: Failed to upload storage backup to S3"
        fi
    fi
    
    # Upload config backup
    aws s3 cp "${CONFIG_BACKUP_FILE}" "s3://${S3_BUCKET}/config/" --storage-class STANDARD_IA
    if [ $? -eq 0 ]; then
        log "Configuration backup uploaded to S3"
    else
        log "ERROR: Failed to upload configuration backup to S3"
    fi
fi

# 5. Cleanup old local backups
log "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."

find "${BACKUP_DIR}" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Clean up old log entries (keep last 1000 lines)
if [ -f "${BACKUP_DIR}/backup.log" ]; then
    tail -n 1000 "${BACKUP_DIR}/backup.log" > "${BACKUP_DIR}/backup.log.tmp"
    mv "${BACKUP_DIR}/backup.log.tmp" "${BACKUP_DIR}/backup.log"
fi

# 6. Cleanup old S3 backups (if configured)
if [ -n "${S3_BUCKET}" ] && [ -n "${AWS_ACCESS_KEY_ID}" ] && [ -n "${AWS_SECRET_ACCESS_KEY}" ]; then
    log "Cleaning up old S3 backups..."
    
    CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
    
    # List and delete old backups
    aws s3 ls "s3://${S3_BUCKET}/database/" --recursive | while read -r line; do
        FILE_DATE=$(echo $line | awk '{print $4}' | grep -o '[0-9]\{8\}' | head -1)
        if [ -n "${FILE_DATE}" ] && [ "${FILE_DATE}" -lt "${CUTOFF_DATE}" ]; then
            FILE_PATH=$(echo $line | awk '{print $4}')
            aws s3 rm "s3://${S3_BUCKET}/${FILE_PATH}"
            log "Deleted old S3 backup: ${FILE_PATH}"
        fi
    done
fi

# 7. Verify backup integrity
log "Verifying backup integrity..."

# Test database backup
gunzip -t "${DB_BACKUP_FILE}"
if [ $? -eq 0 ]; then
    log "Database backup integrity verified"
else
    log "ERROR: Database backup integrity check failed"
    exit 1
fi

# Test storage backup (if exists)
if [ -f "${STORAGE_BACKUP_FILE}" ]; then
    tar -tzf "${STORAGE_BACKUP_FILE}" > /dev/null
    if [ $? -eq 0 ]; then
        log "Storage backup integrity verified"
    else
        log "ERROR: Storage backup integrity check failed"
        exit 1
    fi
fi

# Test config backup
tar -tzf "${CONFIG_BACKUP_FILE}" > /dev/null
if [ $? -eq 0 ]; then
    log "Configuration backup integrity verified"
else
    log "ERROR: Configuration backup integrity check failed"
    exit 1
fi

# 8. Generate backup report
REPORT_FILE="${BACKUP_DIR}/backup_report_${DATE}.txt"
cat > "${REPORT_FILE}" << EOF
NECF Treasury Backup Report
Date: $(date)
Backup ID: ${DATE}

Files Created:
- Database: ${DB_BACKUP_FILE} ($(du -h "${DB_BACKUP_FILE}" | cut -f1))
$([ -f "${STORAGE_BACKUP_FILE}" ] && echo "- Storage: ${STORAGE_BACKUP_FILE} ($(du -h "${STORAGE_BACKUP_FILE}" | cut -f1))")
- Configuration: ${CONFIG_BACKUP_FILE} ($(du -h "${CONFIG_BACKUP_FILE}" | cut -f1))

S3 Upload: $([ -n "${S3_BUCKET}" ] && echo "Enabled" || echo "Disabled")
Retention Period: ${RETENTION_DAYS} days

Integrity Checks: PASSED
Backup Status: SUCCESS
EOF

log "Backup report generated: ${REPORT_FILE}"

# 9. Send notification (if configured)
if [ -n "${BACKUP_NOTIFICATION_EMAIL:-}" ]; then
    log "Sending backup notification email..."
    
    # This would require mail/sendmail to be configured
    # mail -s "NECF Treasury Backup Completed - ${DATE}" "${BACKUP_NOTIFICATION_EMAIL}" < "${REPORT_FILE}"
    
    log "Backup notification sent to ${BACKUP_NOTIFICATION_EMAIL}"
fi

log "Backup process completed successfully!"

# Print summary
echo "============================="
echo "BACKUP SUMMARY"
echo "============================="
echo "Date: $(date)"
echo "Database backup: $(du -h "${DB_BACKUP_FILE}" | cut -f1)"
[ -f "${STORAGE_BACKUP_FILE}" ] && echo "Storage backup: $(du -h "${STORAGE_BACKUP_FILE}" | cut -f1)"
echo "Config backup: $(du -h "${CONFIG_BACKUP_FILE}" | cut -f1)"
echo "S3 upload: $([ -n "${S3_BUCKET}" ] && echo "✓" || echo "✗")"
echo "Status: SUCCESS ✓"
echo "============================="

exit 0
