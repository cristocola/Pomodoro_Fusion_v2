#!/bin/bash

# --- Configuration ---
# The absolute path to the application directory on the EC2 instance
APP_DIR="/home/ec2-user/Pomodoro_Fusion_v2"
# The S3 bucket name you created
S3_BUCKET="pomo-fusion-logs"
# The AWS region of your bucket
S3_REGION="eu-north-1"

# --- Script ---
echo "Starting backup process..."

# Create a timestamped backup filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="/tmp/pomodoro_backup_$TIMESTAMP.tar.gz"

# Create the compressed backup from the data directory
# The -C flag tells tar to change to the APP_DIR before archiving.
tar -czf "$BACKUP_FILE" -C "$APP_DIR" "data"

# Check if the tarball was created successfully
if [ $? -ne 0 ]; then
  echo "Error: Failed to create tarball. Aborting."
  exit 1
fi

echo "Successfully created local archive: $BACKUP_FILE"

# Upload the backup to S3, specifying the region
aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/" --region "$S3_REGION"

# Check if the upload was successful
if [ $? -eq 0 ]; then
  echo "Successfully uploaded backup to S3 bucket: $S3_BUCKET"
else
  echo "Error: S3 upload failed. The local backup file is at $BACKUP_FILE for manual recovery."
  exit 1
fi

# Clean up the local backup file
rm "$BACKUP_FILE"
echo "Local backup file cleaned up. Backup complete."

exit 0
