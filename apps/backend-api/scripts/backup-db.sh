#!/bin/bash
# Database Backup Script
BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Dump and gzip
# Note: Use your actual environment credentials in production
mysqldump -h 127.0.0.1 -u root -p"PLACEHOLDER_PASSWORD" restaurant_pos | gzip > "$FILE"

# Clean up backups older than 7 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete

echo "Backup created at $FILE"
# Placeholder for AWS S3 upload:
# aws s3 cp "$FILE" s3://your-bucket-name/backups/
