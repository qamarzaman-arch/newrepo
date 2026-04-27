#!/bin/bash
# Setup cron job for daily backup at 2 AM
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/backup-db.sh"
chmod +x "$SCRIPT_PATH"
(crontab -l 2>/dev/null; echo "0 2 * * * $SCRIPT_PATH") | crontab -
echo "Cron job installed for daily backups at 2 AM."
