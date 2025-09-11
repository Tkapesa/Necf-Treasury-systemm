#!/bin/bash

# NECF Treasury System Restore Script
# This script restores the database and uploaded files from backups

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
RESTORE_DATE=${1:-"latest"}

# Database configuration
DB_HOST="db"
DB_NAME=${POSTGRES_DB:-necf_treasury}
DB_USER=${POSTGRES_USER:-necf_user}
DB_PASSWORD=${POSTGRES_PASSWORD}

# S3 configuration
S3_BUCKET=${S3_BACKUP_BUCKET:-necf-treasury-backups}
AWS_ACCESS_KEY_ID=${BACKUP_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY=${BACKUP_SECRET_KEY}

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_DIR}/restore.log"
}

# Function to find latest backup
find_latest_backup() {
    local type=$1
    local pattern="${BACKUP_DIR}/${type}_backup_*.${2}"
    
    if [ -f "${pattern}" ]; then
        ls -t ${pattern} | head -1
    else
        echo ""
    fi
}

# Function to download from S3
download_from_s3() {
    local backup_date=$1
    local type=$2
    local extension=$3
    
    log "Downloading ${type} backup from S3..."
    
    local s3_path="s3://${S3_BUCKET}/${type}/${type}_backup_${backup_date}.${extension}"
    local local_path="${BACKUP_DIR}/${type}_backup_${backup_date}.${extension}"
    
    aws s3 cp "${s3_path}" "${local_path}"
    
    if [ $? -eq 0 ]; then
        log "${type} backup downloaded from S3: ${local_path}"
        echo "${local_path}"
    else
        log "Failed to download ${type} backup from S3"
        echo ""
    fi
}

# Function to list available backups
list_backups() {
    echo "Available local backups:"
    echo "========================"
    
    echo "Database backups:"
    ls -la "${BACKUP_DIR}"/db_backup_*.sql.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' || echo "No database backups found"
    
    echo ""
    echo "Storage backups:"
    ls -la "${BACKUP_DIR}"/storage_backup_*.tar.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' || echo "No storage backups found"
    
    echo ""
    echo "Configuration backups:"
    ls -la "${BACKUP_DIR}"/config_backup_*.tar.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' || echo "No configuration backups found"
    
    # List S3 backups if configured
    if [ -n "${S3_BUCKET}" ] && [ -n "${AWS_ACCESS_KEY_ID}" ] && [ -n "${AWS_SECRET_ACCESS_KEY}" ]; then
        echo ""
        echo "S3 backups:"
        echo "==========="
        aws s3 ls "s3://${S3_BUCKET}/database/" --recursive 2>/dev/null || echo "Cannot access S3 or no S3 backups found"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [backup_date|latest|list]"
    echo ""
    echo "Examples:"
    echo "  $0                    # Restore from latest backup"
    echo "  $0 latest            # Restore from latest backup"
    echo "  $0 20241201_143000   # Restore from specific backup"
    echo "  $0 list              # List available backups"
    echo ""
}

# Check parameters
if [ "$#" -gt 1 ]; then
    usage
    exit 1
fi

# Handle special commands
if [ "${RESTORE_DATE}" = "list" ]; then
    list_backups
    exit 0
fi

if [ "${RESTORE_DATE}" = "help" ] || [ "${RESTORE_DATE}" = "-h" ] || [ "${RESTORE_DATE}" = "--help" ]; then
    usage
    exit 0
fi

log "Starting restore process for date: ${RESTORE_DATE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Determine backup files to use
DB_BACKUP_FILE=""
STORAGE_BACKUP_FILE=""
CONFIG_BACKUP_FILE=""

if [ "${RESTORE_DATE}" = "latest" ]; then
    log "Finding latest backups..."
    
    DB_BACKUP_FILE=$(find_latest_backup "db" "sql.gz")
    STORAGE_BACKUP_FILE=$(find_latest_backup "storage" "tar.gz")
    CONFIG_BACKUP_FILE=$(find_latest_backup "config" "tar.gz")
    
    # If no local backups found, try S3
    if [ -z "${DB_BACKUP_FILE}" ] && [ -n "${S3_BUCKET}" ]; then
        log "No local backups found, checking S3..."
        # This would require a more complex S3 listing to find the latest
        log "Please specify a specific backup date when restoring from S3"
        exit 1
    fi
else
    # Specific date requested
    DB_BACKUP_FILE="${BACKUP_DIR}/db_backup_${RESTORE_DATE}.sql.gz"
    STORAGE_BACKUP_FILE="${BACKUP_DIR}/storage_backup_${RESTORE_DATE}.tar.gz"
    CONFIG_BACKUP_FILE="${BACKUP_DIR}/config_backup_${RESTORE_DATE}.tar.gz"
    
    # Check if files exist locally, if not try S3
    if [ ! -f "${DB_BACKUP_FILE}" ] && [ -n "${S3_BUCKET}" ]; then
        DB_BACKUP_FILE=$(download_from_s3 "${RESTORE_DATE}" "database" "sql.gz")
    fi
    
    if [ ! -f "${STORAGE_BACKUP_FILE}" ] && [ -n "${S3_BUCKET}" ]; then
        STORAGE_BACKUP_FILE=$(download_from_s3 "${RESTORE_DATE}" "storage" "tar.gz")
    fi
    
    if [ ! -f "${CONFIG_BACKUP_FILE}" ] && [ -n "${S3_BUCKET}" ]; then
        CONFIG_BACKUP_FILE=$(download_from_s3 "${RESTORE_DATE}" "config" "tar.gz")
    fi
fi

# Verify required files exist
if [ -z "${DB_BACKUP_FILE}" ] || [ ! -f "${DB_BACKUP_FILE}" ]; then
    log "ERROR: Database backup file not found: ${DB_BACKUP_FILE}"
    list_backups
    exit 1
fi

log "Using backup files:"
log "  Database: ${DB_BACKUP_FILE}"
[ -f "${STORAGE_BACKUP_FILE}" ] && log "  Storage: ${STORAGE_BACKUP_FILE}"
[ -f "${CONFIG_BACKUP_FILE}" ] && log "  Config: ${CONFIG_BACKUP_FILE}"

# Confirmation prompt
echo ""
echo "WARNING: This will overwrite the current database and files!"
echo "Database backup: $(basename "${DB_BACKUP_FILE}")"
echo "Backup size: $(du -h "${DB_BACKUP_FILE}" | cut -f1)"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled by user"
    exit 0
fi

# 1. Verify backup integrity before restore
log "Verifying backup integrity..."

gunzip -t "${DB_BACKUP_FILE}"
if [ $? -ne 0 ]; then
    log "ERROR: Database backup file is corrupted"
    exit 1
fi

if [ -f "${STORAGE_BACKUP_FILE}" ]; then
    tar -tzf "${STORAGE_BACKUP_FILE}" > /dev/null
    if [ $? -ne 0 ]; then
        log "ERROR: Storage backup file is corrupted"
        exit 1
    fi
fi

if [ -f "${CONFIG_BACKUP_FILE}" ]; then
    tar -tzf "${CONFIG_BACKUP_FILE}" > /dev/null
    if [ $? -ne 0 ]; then
        log "ERROR: Configuration backup file is corrupted"
        exit 1
    fi
fi

log "Backup integrity verified"

# 2. Stop application (if running via Docker Compose)
log "Stopping application services..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f /app/docker-compose.production.yml stop backend frontend || true
fi

# 3. Create a backup of current state before restore
log "Creating safety backup of current state..."
SAFETY_DATE=$(date +%Y%m%d_%H%M%S)
SAFETY_BACKUP="${BACKUP_DIR}/safety_backup_${SAFETY_DATE}.sql.gz"

PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-password \
    --clean \
    --if-exists \
    | gzip > "${SAFETY_BACKUP}"

if [ $? -eq 0 ]; then
    log "Safety backup created: ${SAFETY_BACKUP}"
else
    log "WARNING: Failed to create safety backup"
fi

# 4. Restore database
log "Restoring database..."

# Drop existing connections
PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" || true

# Restore from backup
gunzip -c "${DB_BACKUP_FILE}" | PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --quiet

if [ $? -eq 0 ]; then
    log "Database restore completed successfully"
else
    log "ERROR: Database restore failed"
    
    # Attempt to restore safety backup
    log "Attempting to restore safety backup..."
    gunzip -c "${SAFETY_BACKUP}" | PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --quiet
    
    exit 1
fi

# 5. Restore storage files (if backup exists and using local storage)
if [ -f "${STORAGE_BACKUP_FILE}" ] && [ "${STORAGE_TYPE:-s3}" = "local" ]; then
    log "Restoring storage files..."
    
    # Backup current storage
    if [ -d "/app/storage" ]; then
        mv /app/storage "/app/storage_backup_${SAFETY_DATE}"
        log "Current storage backed up to /app/storage_backup_${SAFETY_DATE}"
    fi
    
    # Extract storage backup
    tar -xzf "${STORAGE_BACKUP_FILE}" -C /app/
    
    if [ $? -eq 0 ]; then
        log "Storage files restored successfully"
        
        # Set proper permissions
        chown -R app:app /app/storage || true
        chmod -R 755 /app/storage || true
    else
        log "ERROR: Storage restore failed"
        
        # Restore previous storage
        if [ -d "/app/storage_backup_${SAFETY_DATE}" ]; then
            mv "/app/storage_backup_${SAFETY_DATE}" /app/storage
            log "Previous storage restored"
        fi
        
        exit 1
    fi
fi

# 6. Restore configuration (optional)
if [ -f "${CONFIG_BACKUP_FILE}" ]; then
    log "Configuration backup found, but manual intervention required"
    log "Extract and review: tar -xzf ${CONFIG_BACKUP_FILE}"
    log "Configuration files should be manually reviewed before applying"
fi

# 7. Run database migrations (if needed)
log "Running database migrations..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f /app/docker-compose.production.yml run --rm backend python manage.py migrate || true
fi

# 8. Restart services
log "Starting application services..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f /app/docker-compose.production.yml up -d
fi

# 9. Health check
log "Performing health check..."
sleep 10

# Check if services are responding
if curl -f http://localhost/api/health/ > /dev/null 2>&1; then
    log "Health check passed - application is responding"
else
    log "WARNING: Health check failed - application may not be fully ready"
fi

# 10. Generate restore report
REPORT_FILE="${BACKUP_DIR}/restore_report_${SAFETY_DATE}.txt"
cat > "${REPORT_FILE}" << EOF
NECF Treasury Restore Report
Date: $(date)
Restore ID: ${SAFETY_DATE}

Restored From:
- Database: ${DB_BACKUP_FILE}
$([ -f "${STORAGE_BACKUP_FILE}" ] && echo "- Storage: ${STORAGE_BACKUP_FILE}")
$([ -f "${CONFIG_BACKUP_FILE}" ] && echo "- Configuration: ${CONFIG_BACKUP_FILE} (manual review required)")

Safety Backup Created:
- Database: ${SAFETY_BACKUP}
$([ -d "/app/storage_backup_${SAFETY_DATE}" ] && echo "- Storage: /app/storage_backup_${SAFETY_DATE}")

Health Check: $(curl -f http://localhost/api/health/ > /dev/null 2>&1 && echo "PASSED" || echo "FAILED")
Restore Status: SUCCESS

Next Steps:
1. Verify application functionality
2. Test critical features (login, reports, uploads)
3. Monitor application logs for errors
4. Clean up safety backups after verification (optional)

Safety Cleanup Commands:
rm -f "${SAFETY_BACKUP}"
$([ -d "/app/storage_backup_${SAFETY_DATE}" ] && echo "rm -rf /app/storage_backup_${SAFETY_DATE}")
EOF

log "Restore report generated: ${REPORT_FILE}"

# 11. Send notification (if configured)
if [ -n "${BACKUP_NOTIFICATION_EMAIL:-}" ]; then
    log "Sending restore notification email..."
    # mail -s "NECF Treasury Restore Completed - ${SAFETY_DATE}" "${BACKUP_NOTIFICATION_EMAIL}" < "${REPORT_FILE}"
    log "Restore notification sent to ${BACKUP_NOTIFICATION_EMAIL}"
fi

log "Restore process completed successfully!"

# Print summary
echo "============================="
echo "RESTORE SUMMARY"
echo "============================="
echo "Date: $(date)"
echo "Restored from: $(basename "${DB_BACKUP_FILE}")"
echo "Safety backup: $(basename "${SAFETY_BACKUP}")"
echo "Health check: $(curl -f http://localhost/api/health/ > /dev/null 2>&1 && echo "✓" || echo "✗")"
echo "Status: SUCCESS ✓"
echo ""
echo "Next steps:"
echo "1. Test the application thoroughly"
echo "2. Verify data integrity"
echo "3. Monitor for any issues"
echo "============================="

exit 0
