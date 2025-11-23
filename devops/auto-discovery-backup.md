# Auto-Discovery Backup with Restic

Convention-driven, auto-discoverable backup system for Docker applications.

## Key Features

- Auto-discovers DB containers (MySQL, Postgres, MariaDB)
- Auto-archives all named volumes
- Backs up compose/config trees
- Label-based include/exclude
- Restic + retention + integrity check
- Systemd timer (no cron)

## One-Time Setup

```bash
sudo apt update && sudo apt install -y restic jq

sudo mkdir -p /var/lib/asgard-backup && sudo chmod 700 /var/lib/asgard-backup

sudo tee /etc/asgard-backup.env >/dev/null <<'EOF_ENV'
# Edit these
RESTIC_REPOSITORY="s3:https://s3.example.com/your-bucket"
AWS_ACCESS_KEY_ID="YOUR_KEY"
AWS_SECRET_ACCESS_KEY="YOUR_SECRET"
RESTIC_PASSWORD="a-long-unique-passphrase"

# What to include
ASGARD_CONFIG_ROOTS="/opt /etc/nginx /etc/letsencrypt"

# Retention
ASGARD_KEEP_DAILY=7
ASGARD_KEEP_WEEKLY=4
ASGARD_KEEP_MONTHLY=6
EOF_ENV

sudo chmod 600 /etc/asgard-backup.env

# Init repo
source /etc/asgard-backup.env
restic init
```

## Label Convention

Skip volume from backup:
```yaml
volumes:
  my_cache:
    labels:
      asgard.backup: "skip"
```

Skip DB container dump:
```yaml
services:
  ephemeral_db:
    labels:
      asgard.db.backup: "skip"
```

## Systemd Timer

```bash
sudo tee /etc/systemd/system/asgard-backup.timer >/dev/null <<'UNIT'
[Unit]
Description=Nightly Asgard Backup

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now asgard-backup.timer
systemctl status asgard-backup.timer
```

