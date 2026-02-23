# ProLog v2.0 - Complete Self-Hosted Deployment

## What's New in v2.0

### Frontend Updates
✅ **Complete Gynaecology tree** with all categories:
- Hysteroscopy (Diagnostic, Polyps, Fibroids, Ablation, etc.)
- Laparoscopy (Tubal, Ovarian, Endometriosis, Myomectomy, Hysterectomy)
- Laparotomy, Cervical Surgery, Urogynaecology
- Vaginal Surgery, Perineal Surgery
- Contraception, Pregnancy Management
- Cystoscopy, Wound Debridement

✅ **New Specialized Fields**:
- Termination of Pregnancy → Gestation (weeks)
- Cystoscopy → Ureteric Catheterisation checkbox
- Endometriosis → Stage (1-4)
- Laparoscopy → AGES Level (1-6) + Adhesiolysis

✅ **Fixed ART Fields**:
- Oocyte Collection fields only show for OC procedures
- ET fields only show for Embryo Transfer
- Proper field layout (Trigger/Hours on row 1, Follicles/Eggs on row 2)

### Backend (Unchanged)
- Node.js + Express REST API
- PostgreSQL database
- JWT authentication
- Session management
- Multi-device sync

## Quick Start

```bash
# 1. Extract package
tar -xzf prolog-v2.0-deployment.tar.gz
cd prolog-v2

# 2. Run installer  
sudo ./scripts/setup.sh

# 3. Access application
# Open: http://your-server-ip
# Login: admin / changeme123
```

## Package Contents

```
prolog-v2/
├── frontend/
│   └── index.html          # Latest ProLog with all features
├── backend/
│   ├── package.json        # Node.js dependencies
│   ├── server.js           # Complete API server
│   └── .env.example        # Configuration template
├── database/
│   └── init.sql            # PostgreSQL schema
├── scripts/
│   ├── setup.sh            # Automated installer
│   └── backup.sh           # Backup script
├── nginx.conf              # Web server config
└── README.md               # This file
```

## Installation Steps

### Prerequisites
- Ubuntu 20.04+ or Debian 11+
- Root/sudo access
- 1GB RAM minimum
- 10GB disk space

### Automated Installation

The `setup.sh` script will:
1. Install Node.js, PostgreSQL, Nginx, PM2
2. Create database with secure random password
3. Generate JWT secret
4. Install backend dependencies
5. Start API server with PM2
6. Configure Nginx reverse proxy
7. Deploy frontend
8. Set up daily backups

**Just run:**
```bash
sudo ./scripts/setup.sh
```

### Manual Installation

If you prefer manual setup, see `INSTALL.md` for step-by-step instructions.

## Post-Installation

### 1. Change Default Password
```bash
sudo -u postgres psql prolog
UPDATE users SET password_hash = crypt('your_new_password', gen_salt('bf', 10)) 
WHERE username = 'admin';
\q
```

### 2. Test Multi-Device Sync
- Log in on computer
- Create a case
- Log in on phone/tablet
- Case should appear immediately

### 3. Verify Backups
```bash
# Check backup created
ls -lh /var/backups/prolog/

# Run manual backup
./scripts/backup.sh
```

## Management Commands

### Check Status
```bash
pm2 status                    # Backend API
sudo systemctl status nginx   # Web server
sudo systemctl status postgresql  # Database
```

### View Logs
```bash
pm2 logs prolog-api
sudo tail -f /var/log/nginx/prolog_access.log
```

### Restart Services
```bash
pm2 restart prolog-api
sudo systemctl restart nginx
```

## Features

### Clinical Categories
- **Obstetrics**: Antenatal, Intrapartum, Postnatal
- **Gynaecology**: 13 subcategories with full procedures
- **ART**: Oocyte Collection, Embryo Transfer, Male Surgery

### Data Management
- Multi-device sync
- Automatic daily backups
- Export to CSV, Excel, PDF
- Analytics and charts
- Pregnancy check tracking

### Security
- Bcrypt password hashing
- JWT authentication
- Session management
- HTTPS ready
- Firewall configuration included

## Troubleshooting

### Backend won't start
```bash
pm2 logs prolog-api --lines 50
# Check database connection in backend/.env
```

### Can't access from browser
```bash
sudo nginx -t
sudo systemctl status nginx
sudo ufw allow 80/tcp
```

### Database errors
```bash
sudo systemctl status postgresql
sudo -u postgres psql -l | grep prolog
```

## Upgrading from v1.0

If you have v1.0 installed:

1. **Backup your data:**
```bash
./scripts/backup.sh
```

2. **Update frontend:**
```bash
sudo cp frontend/index.html /var/www/prolog/
```

3. **No backend changes needed** - v2.0 is frontend-only update

## Support

### Credentials File
After installation, check:
```bash
cat CREDENTIALS.txt
```

Contains:
- Database password
- JWT secret  
- Default admin login

**⚠️ Keep secure!**

### Health Check
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Version Information

- **Version**: 2.0
- **Release**: February 2026
- **Changes from v1.0**:
  - Complete Gynaecology tree
  - New specialized fields (TOP gestation, Cystoscopy)
  - Fixed ART field visibility
  - Improved field layouts

## What's Next

Current features complete! Future additions (optional):
- Email notifications
- Advanced analytics
- Multi-user collaboration
- Admin dashboard
- API documentation UI

---

**Ready to deploy? Run `sudo ./scripts/setup.sh`**
