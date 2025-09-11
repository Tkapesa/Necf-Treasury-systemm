# NECF Treasury System - Deployment Documentation

## Overview

This documentation provides comprehensive deployment instructions for the NECF Treasury System, designed specifically for church administrators and pastors who need to deploy and maintain the system.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Security Checklist](#security-checklist)
3. [Deployment Options](#deployment-options)
4. [Backup and Recovery](#backup-and-recovery)
5. [User Onboarding](#user-onboarding)
6. [Monthly Reports Walkthrough](#monthly-reports-walkthrough)
7. [Maintenance and Monitoring](#maintenance-and-monitoring)
8. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

### System Requirements

- [ ] **Server**: Minimum 2 CPU cores, 4GB RAM, 50GB storage
- [ ] **Operating System**: Ubuntu 20.04 LTS or newer (recommended)
- [ ] **Domain**: Registered domain name (e.g., `treasury.necf.org`)
- [ ] **SSL Certificate**: Valid SSL certificate for HTTPS
- [ ] **Email Service**: SMTP credentials for notifications
- [ ] **Cloud Storage**: AWS S3 or compatible service (optional but recommended)

### Technical Prerequisites

- [ ] Docker and Docker Compose installed
- [ ] Git installed
- [ ] Basic command line knowledge
- [ ] Access to domain DNS settings
- [ ] Cloud provider account (Render, DigitalOcean, AWS, etc.)

### Information Gathering

Before deployment, collect the following information:

- [ ] **Domain Name**: `_______________`
- [ ] **Admin Email**: `_______________`
- [ ] **Organization Details**:
  - Church Name: `_______________`
  - Address: `_______________`
  - Contact Information: `_______________`
- [ ] **SMTP Settings**:
  - SMTP Host: `_______________`
  - SMTP Port: `_______________`
  - Email Username: `_______________`
  - Email Password: `_______________`

## Security Checklist

### Essential Security Measures

#### 1. HTTPS Configuration
- [ ] **SSL Certificate Installed**: Ensure valid SSL certificate is configured
- [ ] **HTTP Redirect**: All HTTP traffic redirects to HTTPS
- [ ] **HSTS Enabled**: HTTP Strict Transport Security headers configured
- [ ] **Certificate Auto-Renewal**: Set up automatic certificate renewal (Let's Encrypt recommended)

```bash
# Verify SSL certificate
curl -I https://your-domain.com
# Should return: Strict-Transport-Security header
```

#### 2. Database Security
- [ ] **Strong Database Password**: Use a complex password (minimum 16 characters)
- [ ] **Database User Permissions**: Create dedicated user with minimum required permissions
- [ ] **Network Access**: Database only accessible from application containers
- [ ] **Encryption at Rest**: Enable database encryption (if supported by provider)

```bash
# Generate strong password
openssl rand -base64 32
```

#### 3. Application Security
- [ ] **Secret Key Rotation**: Generate and set strong Django SECRET_KEY
- [ ] **Environment Variables**: All sensitive data in environment variables (never in code)
- [ ] **User Authentication**: Strong password requirements enabled
- [ ] **Session Security**: Secure session configuration
- [ ] **Rate Limiting**: API rate limiting configured

```bash
# Generate Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### 4. Infrastructure Security
- [ ] **Firewall Configuration**: Only necessary ports open (80, 443, 22)
- [ ] **SSH Key Authentication**: Password authentication disabled for SSH
- [ ] **Regular Updates**: System packages kept up to date
- [ ] **Fail2Ban**: Intrusion prevention system configured
- [ ] **Monitoring**: Security monitoring and alerting enabled

#### 5. Key Rotation Schedule

Set up regular rotation of critical security keys:

- [ ] **Database Passwords**: Rotate every 90 days
- [ ] **API Keys**: Rotate every 90 days
- [ ] **JWT Secrets**: Rotate every 30 days
- [ ] **SSL Certificates**: Auto-renewal configured
- [ ] **SSH Keys**: Rotate every 180 days

Create calendar reminders for manual rotations:
```
Calendar Entry: "Rotate NECF Treasury Database Password"
Frequency: Every 90 days
Steps:
1. Generate new password
2. Update environment variables
3. Restart application
4. Test functionality
5. Update password manager
```

### Security Compliance Checklist

#### Data Protection
- [ ] **Personal Data Handling**: Compliance with local data protection laws
- [ ] **Data Retention Policy**: Define and implement data retention periods
- [ ] **Access Logging**: All data access logged and monitored
- [ ] **Data Backup Encryption**: Backups encrypted both in transit and at rest

#### Access Control
- [ ] **Role-Based Access**: Implement proper user roles (Pastor, Treasurer, Member)
- [ ] **Regular Access Review**: Quarterly review of user permissions
- [ ] **Account Deactivation**: Process for removing access when staff changes
- [ ] **Two-Factor Authentication**: Enable 2FA for admin accounts (recommended)

#### Audit Trail
- [ ] **Activity Logging**: All financial transactions logged
- [ ] **Change Tracking**: Track all data modifications
- [ ] **Report Generation**: Regular security audit reports
- [ ] **Log Retention**: Logs retained for at least 12 months

## Deployment Options

### Option 1: Docker Compose (Single Server)

**Recommended for**: Small to medium churches, simple deployment

#### Requirements
- Single server with Docker installed
- 4GB RAM, 2 CPU cores minimum
- 50GB storage minimum

#### Deployment Steps

1. **Clone Repository**
```bash
git clone https://github.com/your-org/necf-treasury.git
cd necf-treasury
```

2. **Configure Environment**
```bash
cd deployment/docker-compose
cp .env.example .env
nano .env
```

3. **Update Environment Variables**
```env
# Database
POSTGRES_DB=necf_treasury
POSTGRES_USER=necf_user
POSTGRES_PASSWORD=your_secure_password_here

# Django
SECRET_KEY=your_secret_key_here
DEBUG=False
ALLOWED_HOSTS=your-domain.com

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# Storage (optional)
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=necf-treasury-files
```

4. **Start Services**
```bash
docker-compose -f docker-compose.production.yml up -d
```

5. **Initialize Database**
```bash
docker-compose -f docker-compose.production.yml exec backend python manage.py migrate
docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser
```

6. **Verify Deployment**
```bash
curl https://your-domain.com/api/health/
```

### Option 2: Kubernetes

**Recommended for**: Larger churches, high availability requirements

#### Prerequisites
- Kubernetes cluster (managed service recommended)
- kubectl configured
- cert-manager installed
- Ingress controller installed

#### Deployment Steps

1. **Configure Secrets**
```bash
cd deployment/kubernetes
kubectl create namespace necf-treasury

# Create secrets
kubectl create secret generic necf-treasury-secrets \
  --from-literal=postgres-password=your_secure_password \
  --from-literal=django-secret-key=your_secret_key \
  --from-literal=email-password=your_email_password \
  -n necf-treasury
```

2. **Update Configuration**
```bash
# Edit necf-treasury.yaml
# Update domain names, resource limits, etc.
nano necf-treasury.yaml
```

3. **Deploy Application**
```bash
kubectl apply -f necf-treasury.yaml
```

4. **Verify Deployment**
```bash
kubectl get pods -n necf-treasury
kubectl get ingress -n necf-treasury
```

### Option 3: Cloud Platform (Render/Heroku)

**Recommended for**: Churches wanting managed hosting

#### Render Deployment

1. **Fork Repository**
   - Fork the NECF Treasury repository to your GitHub account

2. **Create Render Account**
   - Sign up at render.com
   - Connect your GitHub account

3. **Create Database**
   - Create a new PostgreSQL database
   - Note the connection details

4. **Create Web Service**
   - Create new Web Service from your repository
   - Set environment variables:
   ```
   DJANGO_SETTINGS_MODULE=config.settings.production
   SECRET_KEY=your_secret_key
   DATABASE_URL=postgresql://...
   ALLOWED_HOSTS=your-app.onrender.com
   ```

5. **Deploy**
   - Render will automatically deploy from your repository
   - Set up automatic deploys from main branch

## Backup and Recovery

### Backup Strategy

#### 1. Automated Daily Backups

**Database Backup** (Critical):
- **Frequency**: Daily at 2 AM local time
- **Retention**: 30 days local, 90 days in cloud storage
- **Method**: PostgreSQL dump with compression

**File Storage Backup** (Important):
- **Frequency**: Daily at 3 AM local time
- **Retention**: 30 days local, 90 days in cloud storage
- **Method**: Compressed archive of upload directory

**Configuration Backup** (Important):
- **Frequency**: Weekly or after changes
- **Retention**: 90 days
- **Method**: Environment files and configurations

#### 2. Backup Configuration

**Using Docker Compose**:
```bash
# Add backup service to docker-compose.production.yml
# Backup service is already included - ensure environment variables are set:

BACKUP_RETENTION_DAYS=30
S3_BACKUP_BUCKET=necf-treasury-backups
BACKUP_ACCESS_KEY=your_s3_access_key
BACKUP_SECRET_KEY=your_s3_secret_key
BACKUP_NOTIFICATION_EMAIL=admin@necf.org
```

**Manual Backup**:
```bash
# Run backup script manually
cd deployment/scripts
chmod +x backup.sh
./backup.sh
```

#### 3. Backup Verification

**Monthly Verification Process**:
1. **Test Backup Integrity**
   ```bash
   # Check backup files
   ./backup.sh
   # Verify files are not corrupted
   gunzip -t /backups/db_backup_*.sql.gz
   ```

2. **Test Restore Process** (on staging environment):
   ```bash
   # Restore to test environment
   ./restore.sh latest
   # Verify data integrity
   # Test application functionality
   ```

3. **Document Results**:
   - Create backup verification log
   - Note any issues or failures
   - Update procedures if needed

### Recovery Procedures

#### Database Recovery

**Complete Database Restore**:
```bash
cd deployment/scripts
chmod +x restore.sh

# List available backups
./restore.sh list

# Restore from latest backup
./restore.sh latest

# Restore from specific date
./restore.sh 20241201_143000
```

**Partial Data Recovery**:
```bash
# Connect to database
docker-compose exec db psql -U necf_user -d necf_treasury

# Restore specific table from backup
gunzip -c /backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
  grep -A 10000 "COPY table_name" | \
  head -n 10001 | \
  psql -U necf_user -d necf_treasury
```

#### File Recovery

**Complete File Restore**:
```bash
# Stop application
docker-compose -f docker-compose.production.yml stop

# Restore files
cd deployment/scripts
./restore.sh latest

# Restart application
docker-compose -f docker-compose.production.yml start
```

**Individual File Recovery**:
```bash
# Extract specific files from backup
tar -xzf /backups/storage_backup_YYYYMMDD_HHMMSS.tar.gz storage/receipts/specific_file.pdf
```

### Disaster Recovery Plan

#### Recovery Time Objectives (RTO)
- **Database Recovery**: 2 hours maximum
- **Complete System Recovery**: 4 hours maximum
- **Partial Service Recovery**: 1 hour maximum

#### Recovery Point Objectives (RPO)
- **Maximum Data Loss**: 24 hours (daily backups)
- **Critical Data Loss**: 1 hour (if recent backup available)

#### Emergency Contacts
```
Primary Contact: Pastor [Name]
Phone: [Number]
Email: [Email]

Technical Contact: IT Administrator [Name]
Phone: [Number]
Email: [Email]

Backup Contact: Treasurer [Name]
Phone: [Number]
Email: [Email]
```

#### Disaster Recovery Steps

1. **Assess Situation**
   - Determine extent of data loss
   - Identify affected systems
   - Estimate recovery time

2. **Communicate**
   - Notify stakeholders
   - Set expectations for recovery time
   - Provide regular updates

3. **Execute Recovery**
   - Follow backup restoration procedures
   - Verify data integrity
   - Test system functionality

4. **Post-Recovery**
   - Document incident
   - Review backup procedures
   - Update disaster recovery plan

## User Onboarding

### Initial System Setup

#### 1. Administrator Account Setup

**After deployment, create the first administrator account**:

```bash
# Create superuser account
docker-compose exec backend python manage.py createsuperuser

# Or via web interface after first login
# Navigate to: https://your-domain.com/admin/
```

**Administrator Details**:
- Username: `pastor` or `admin`
- Email: Primary contact email
- Password: Strong password (minimum 12 characters)
- Role: System Administrator

#### 2. Organization Configuration

**Navigate to Admin Panel** → **Organization Settings**:

1. **Basic Information**:
   - Organization Name: "New Era Christian Fellowship"
   - Address: Complete mailing address
   - Phone: Primary contact number
   - Email: Official organization email
   - Website: Church website URL

2. **Financial Settings**:
   - Default Currency: USD (or local currency)
   - Fiscal Year Start: January 1st (or adjust as needed)
   - Tax ID: Organization tax identification number
   - Bank Account: Primary bank account details

3. **Report Settings**:
   - Report Header: Church letterhead information
   - Footer Text: Standard footer for reports
   - Logo Upload: Church logo image
   - Signature Block: Authorized signatory information

### User Role Configuration

#### 1. Pastor Role

**Permissions**:
- View all financial data
- Generate all reports
- Approve large transactions
- Manage user accounts
- Configure system settings

**Setup Steps**:
1. Create user account
2. Assign "Pastor" role
3. Set email for report notifications
4. Configure approval thresholds

#### 2. Treasurer Role

**Permissions**:
- Enter transactions
- Reconcile accounts
- Generate financial reports
- Manage receipt uploads
- View member giving records

**Setup Steps**:
1. Create user account
2. Assign "Treasurer" role
3. Set up transaction approval limits
4. Configure backup access

#### 3. Financial Secretary Role

**Permissions**:
- Enter member giving
- Upload receipts
- Generate giving statements
- View limited financial data
- Manage member records

**Setup Steps**:
1. Create user account
2. Assign "Financial Secretary" role
3. Set data entry permissions
4. Configure report access

#### 4. Member Role

**Permissions**:
- View own giving records
- Download personal statements
- Update contact information
- Access limited reports

**Setup Steps**:
1. Create user accounts
2. Assign "Member" role
3. Set privacy preferences
4. Configure statement delivery

### New User Onboarding Process

#### Step 1: Account Creation

**Administrator creates new user**:
1. Login to admin panel
2. Navigate to Users → Add User
3. Fill out user information:
   - Username (e.g., firstname.lastname)
   - Email address
   - First and last name
   - Phone number
   - Role assignment

4. Generate temporary password
5. Send welcome email with login instructions

#### Step 2: First Login

**New user first login process**:
1. User receives welcome email with temporary password
2. User logs in at: `https://your-domain.com/login/`
3. System prompts for password change
4. User completes profile information
5. User reviews and accepts terms of use

#### Step 3: Training and Orientation

**Required training for each role**:

**Treasurer Training** (2-3 hours):
- System navigation and basic features
- Transaction entry and categorization
- Receipt management and uploads
- Bank reconciliation process
- Report generation and review
- Backup and security procedures

**Financial Secretary Training** (1-2 hours):
- Member giving entry
- Receipt processing
- Giving statement generation
- Privacy and confidentiality guidelines

**Pastor Training** (1 hour):
- Report access and interpretation
- User management basics
- System oversight and monitoring
- Approval workflows

**Member Training** (30 minutes):
- Account access and password management
- Viewing giving records
- Updating personal information
- Downloading statements

#### Step 4: Ongoing Support

**Support Resources**:
- User manual and documentation
- Video tutorials for common tasks
- Help desk contact information
- Regular training updates

**Quarterly Review Process**:
- Review user access and permissions
- Update training materials
- Gather feedback for improvements
- Plan additional training sessions

## Monthly Reports Walkthrough

### Overview

The monthly reporting process is designed to provide comprehensive financial oversight for church leadership and comply with organizational requirements.

### Report Schedule

**Monthly Reports** (Generated by 5th of each month):
- Financial Summary Report
- Income and Expense Report
- Giving Summary Report
- Account Balance Report

**Quarterly Reports** (Generated by 15th after quarter end):
- Quarterly Financial Review
- Giving Analysis Report
- Budget vs. Actual Report

**Annual Reports** (Generated by January 31st):
- Annual Financial Statement
- Individual Giving Statements
- Tax Reporting Documents

### Monthly Report Generation Process

#### Step 1: Data Preparation (Days 1-3 of month)

**Treasurer Responsibilities**:
1. **Reconcile Bank Accounts**:
   - Download bank statements
   - Match transactions in system
   - Resolve any discrepancies
   - Mark accounts as reconciled

2. **Verify Transaction Categories**:
   - Review uncategorized transactions
   - Correct any miscategorized items
   - Ensure all receipts are uploaded
   - Verify member giving attributions

3. **Update Outstanding Items**:
   - Record any pending deposits
   - Account for outstanding checks
   - Update recurring transactions
   - Verify budget allocations

#### Step 2: Report Generation (Day 4)

**Automated Report Creation**:
1. **Login to System**:
   ```
   Navigate to: https://your-domain.com/reports/
   ```

2. **Generate Monthly Package**:
   - Click "Generate Monthly Reports"
   - Select reporting month
   - Choose report types:
     ☑ Financial Summary
     ☑ Income Statement
     ☑ Balance Sheet
     ☑ Giving Summary
     ☑ Budget Comparison
     ☑ Cash Flow Statement

3. **Review Generated Reports**:
   - Verify data accuracy
   - Check for unusual variances
   - Confirm totals and calculations
   - Review formatting and presentation

#### Step 3: Report Review and Approval (Day 5)

**Pastor Review Process**:
1. **Receive Report Notification**:
   - Email notification with report links
   - Summary of key financial metrics
   - Alerts for significant variances

2. **Review Reports**:
   - **Financial Summary**: Overall financial health
   - **Income Analysis**: Giving trends and patterns
   - **Expense Review**: Budget compliance and variances
   - **Cash Flow**: Liquidity and operational needs

3. **Approval Process**:
   - Review and approve reports online
   - Add comments or request clarifications
   - Authorize distribution to board/leadership

#### Step 4: Distribution (Day 5-6)

**Distribution List**:
- Board of Directors (email + printed copies)
- Finance Committee members
- Senior leadership team
- Denominational reporting (if required)
- Archived copies for record keeping

### Report Templates and Content

#### Financial Summary Report

**Key Sections**:
1. **Executive Summary**:
   - Total income for month
   - Total expenses for month
   - Net income/deficit
   - Cash position
   - Key performance indicators

2. **Income Analysis**:
   - Tithes and offerings breakdown
   - Special collections
   - Other income sources
   - Year-to-date comparisons

3. **Expense Analysis**:
   - Ministry expenses by category
   - Administrative costs
   - Facility expenses
   - Personnel costs

4. **Budget Comparison**:
   - Actual vs. budgeted amounts
   - Variance analysis
   - Year-to-date performance
   - Projected year-end position

#### Giving Summary Report

**Content Includes**:
- Total giving by month
- Number of giving families
- Average gift amounts
- Giving trends and patterns
- Special offering results
- Online vs. traditional giving

#### Account Balance Report

**Account Details**:
- Checking account balances
- Savings account balances
- Investment account values
- Restricted fund balances
- Designated giving accounts

### Customization for Church Needs

#### Report Customization Options

**Denominational Requirements**:
- Modify reports for specific denominational formats
- Add required reporting elements
- Include necessary compliance information

**Leadership Preferences**:
- Adjust detail levels for different audiences
- Customize charts and graphs
- Add commentary sections
- Include comparative analysis

**Board Meeting Integration**:
- Format reports for board presentation
- Create summary slides
- Prepare talking points
- Include action items and recommendations

### Quality Assurance Process

#### Monthly Review Checklist

**Before Report Generation**:
- [ ] All bank accounts reconciled
- [ ] All transactions categorized
- [ ] All receipts uploaded and matched
- [ ] Member giving properly attributed
- [ ] Budget adjustments updated
- [ ] Prior month corrections completed

**After Report Generation**:
- [ ] Mathematical accuracy verified
- [ ] Data consistency across reports
- [ ] Formatting and presentation reviewed
- [ ] Comparative data validated
- [ ] Approval workflow completed
- [ ] Distribution list updated

#### Error Resolution Process

**When Discrepancies Found**:
1. **Document Issue**:
   - Record specific discrepancy
   - Note potential causes
   - Assign responsibility for resolution

2. **Investigate and Correct**:
   - Review source transactions
   - Make necessary corrections
   - Update categorizations
   - Re-run affected reports

3. **Verify Correction**:
   - Re-check calculations
   - Confirm data consistency
   - Test report generation
   - Approve corrected reports

4. **Document Resolution**:
   - Record correction made
   - Update procedures if needed
   - Communicate changes to stakeholders
   - File corrected reports

### Annual Report Considerations

#### Year-End Procedures

**December Closing** (Critical for tax reporting):
1. **Final Transaction Entry**:
   - All December transactions entered by January 3rd
   - Final bank reconciliation completed
   - All receipts processed and uploaded

2. **Giving Statement Generation**:
   - Individual donor statements prepared
   - Tax-deductible amounts calculated
   - Statements reviewed for accuracy
   - Distribution by January 31st deadline

3. **Annual Report Preparation**:
   - Comprehensive financial review
   - Board presentation materials
   - Denominational reporting requirements
   - Audit preparation if required

## Maintenance and Monitoring

### Daily Monitoring

#### System Health Checks

**Automated Monitoring** (Every 5 minutes):
- Application response time
- Database connectivity
- SSL certificate validity
- Disk space usage
- Memory utilization
- Error rate monitoring

**Daily Health Check** (Every morning):
```bash
# Run health check script
curl https://your-domain.com/api/health/

# Check application logs
docker-compose logs --tail=100 backend

# Monitor resource usage
docker stats
```

#### Application Monitoring

**Key Metrics to Monitor**:
- Response time: < 2 seconds average
- Error rate: < 1% of requests
- Database queries: < 100ms average
- Uptime: > 99.9% monthly
- User activity: Track login patterns

**Monitoring Tools**:
- **Prometheus + Grafana**: Included in Docker Compose setup
- **Application Logs**: Centralized logging
- **Uptime Monitoring**: External service (e.g., Pingdom, UptimeRobot)

### Weekly Maintenance

#### System Updates

**Security Updates** (Every Tuesday):
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d

# Restart services if needed
docker-compose restart
```

#### Backup Verification

**Weekly Backup Review**:
1. **Verify Backup Completion**:
   ```bash
   # Check backup logs
   tail -50 /backups/backup.log
   
   # Verify backup files exist
   ls -la /backups/db_backup_*.sql.gz
   ```

2. **Test Backup Integrity**:
   ```bash
   # Test database backup
   gunzip -t /backups/db_backup_$(date +%Y%m%d)*.sql.gz
   
   # Test file backup
   tar -tzf /backups/storage_backup_$(date +%Y%m%d)*.tar.gz
   ```

3. **Verify Cloud Storage**:
   ```bash
   # Check S3 uploads (if configured)
   aws s3 ls s3://necf-treasury-backups/database/
   ```

### Monthly Maintenance

#### Performance Review

**Monthly Performance Analysis**:
1. **Database Performance**:
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- Check database size
   SELECT pg_size_pretty(pg_database_size('necf_treasury'));
   ```

2. **Application Performance**:
   - Review response time trends
   - Analyze error patterns
   - Check resource utilization
   - Review user activity patterns

3. **Storage Analysis**:
   ```bash
   # Check disk usage
   df -h
   
   # Check log file sizes
   du -sh /var/log/*
   
   # Check backup storage
   du -sh /backups/
   ```

#### Security Review

**Monthly Security Checklist**:
- [ ] Review user access logs
- [ ] Check for failed login attempts
- [ ] Verify SSL certificate status
- [ ] Review system logs for anomalies
- [ ] Update security patches
- [ ] Review firewall rules
- [ ] Check backup encryption
- [ ] Verify monitoring alerts

#### Data Maintenance

**Database Maintenance**:
```bash
# Run database maintenance
docker-compose exec db psql -U necf_user -d necf_treasury -c "VACUUM ANALYZE;"

# Check database statistics
docker-compose exec db psql -U necf_user -d necf_treasury -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;"
```

**Log Rotation**:
```bash
# Rotate application logs
docker-compose exec backend python manage.py clearsessions

# Clean old backup logs
find /backups -name "backup.log.*" -mtime +30 -delete
```

### Quarterly Maintenance

#### Comprehensive System Review

**Quarterly Review Process** (January, April, July, October):

1. **Performance Analysis**:
   - 3-month performance trends
   - Resource utilization patterns
   - User growth and activity
   - System capacity planning

2. **Security Audit**:
   - User access review
   - Permission audit
   - Security patch status
   - Vulnerability assessment

3. **Backup Testing**:
   - Full restore test on staging environment
   - Disaster recovery drill
   - Backup procedure review
   - Recovery time testing

4. **Documentation Updates**:
   - Update deployment procedures
   - Review user documentation
   - Update emergency contacts
   - Revise security policies

#### Capacity Planning

**Growth Analysis**:
- User growth trends
- Data storage growth
- Transaction volume trends
- Resource utilization trends

**Scaling Decisions**:
- Server resource adjustments
- Database optimization needs
- Storage expansion requirements
- Performance optimization

### Annual Maintenance

#### Major System Review

**Annual System Audit** (December/January):

1. **Complete Security Review**:
   - External security audit (recommended)
   - Penetration testing
   - Compliance verification
   - Risk assessment update

2. **Disaster Recovery Testing**:
   - Full disaster recovery drill
   - Business continuity planning
   - Recovery procedure validation
   - Emergency contact updates

3. **System Optimization**:
   - Performance optimization
   - Database tuning
   - Code review and updates
   - Infrastructure assessment

4. **Budget and Planning**:
   - Technology budget review
   - System upgrade planning
   - Training needs assessment
   - Vendor relationship review

#### Documentation and Training

**Annual Updates**:
- Complete documentation review
- User training material updates
- Process improvement implementation
- Best practices documentation

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Application Not Responding

**Symptoms**:
- Website returns 502/503 errors
- Slow response times
- Connection timeouts

**Diagnosis Steps**:
```bash
# Check if containers are running
docker-compose ps

# Check container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Check system resources
docker stats
df -h
free -m
```

**Solutions**:
```bash
# Restart application containers
docker-compose restart backend frontend

# If database issues:
docker-compose restart db

# Complete restart:
docker-compose down
docker-compose up -d

# Check for updates:
docker-compose pull
docker-compose up -d
```

#### Issue 2: Database Connection Errors

**Symptoms**:
- "Connection refused" errors
- "Database unavailable" messages
- Authentication failures

**Diagnosis Steps**:
```bash
# Check database container
docker-compose logs db

# Test database connection
docker-compose exec db psql -U necf_user -d necf_treasury -c "SELECT 1;"

# Check database size and connections
docker-compose exec db psql -U necf_user -d necf_treasury -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions**:
```bash
# Restart database
docker-compose restart db

# Check environment variables
docker-compose config

# Verify database permissions
docker-compose exec db psql -U postgres -c "SELECT usename, usecreatedb, usesuper FROM pg_user;"

# Reset database password (if needed)
docker-compose exec db psql -U postgres -c "ALTER USER necf_user PASSWORD 'new_password';"
```

#### Issue 3: SSL Certificate Issues

**Symptoms**:
- Browser security warnings
- "Certificate expired" errors
- HTTPS redirects not working

**Diagnosis Steps**:
```bash
# Check certificate status
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiration
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Check nginx configuration
docker-compose exec nginx nginx -t
```

**Solutions**:
```bash
# Renew Let's Encrypt certificate
docker-compose exec nginx certbot renew

# Reload nginx configuration
docker-compose exec nginx nginx -s reload

# Check certificate files
docker-compose exec nginx ls -la /etc/letsencrypt/live/your-domain.com/
```

#### Issue 4: Email Delivery Problems

**Symptoms**:
- Reports not being sent
- User registration emails not delivered
- Password reset emails missing

**Diagnosis Steps**:
```bash
# Check email configuration
docker-compose exec backend python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])

# Check application logs for email errors
docker-compose logs backend | grep -i email
```

**Solutions**:
```bash
# Verify SMTP settings in environment
cat .env | grep EMAIL

# Test SMTP connection
telnet smtp.gmail.com 587

# Update email configuration
# Edit .env file with correct SMTP settings
docker-compose restart backend
```

#### Issue 5: Storage/Upload Issues

**Symptoms**:
- File uploads failing
- "Disk full" errors
- Missing receipt images

**Diagnosis Steps**:
```bash
# Check disk space
df -h

# Check storage configuration
docker-compose exec backend python manage.py shell
>>> from django.conf import settings
>>> print(settings.MEDIA_ROOT)
>>> print(settings.DEFAULT_FILE_STORAGE)

# Check file permissions
docker-compose exec backend ls -la /app/media/
```

**Solutions**:
```bash
# Clear temporary files
docker system prune -f

# Check storage permissions
docker-compose exec backend chown -R app:app /app/media/

# Increase storage if needed (cloud provider)
# Or configure S3 storage for uploads

# Clean old log files
find /var/log -name "*.log" -mtime +30 -delete
```

### Performance Issues

#### Slow Database Queries

**Diagnosis**:
```sql
-- Enable query logging (temporarily)
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats;
```

**Solutions**:
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_transactions_date ON transactions(transaction_date);
CREATE INDEX CONCURRENTLY idx_transactions_member ON transactions(member_id);

-- Update table statistics
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE;
```

#### High Memory Usage

**Diagnosis**:
```bash
# Check container memory usage
docker stats

# Check system memory
free -m
cat /proc/meminfo

# Check for memory leaks
docker-compose exec backend ps aux --sort=-%mem | head
```

**Solutions**:
```bash
# Adjust container memory limits
# Edit docker-compose.production.yml
deploy:
  resources:
    limits:
      memory: 1G

# Restart containers
docker-compose restart

# Tune database memory settings
# Add to postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
```

### Emergency Procedures

#### Complete System Failure

**Immediate Actions**:
1. **Assess Situation**:
   - Determine scope of failure
   - Check infrastructure status
   - Estimate recovery time

2. **Communication**:
   - Notify key stakeholders
   - Set up status page
   - Provide regular updates

3. **Recovery Process**:
   ```bash
   # Check system status
   docker-compose ps
   
   # Review logs for errors
   docker-compose logs
   
   # Attempt service restart
   docker-compose restart
   
   # If restart fails, restore from backup
   cd deployment/scripts
   ./restore.sh latest
   ```

#### Data Corruption

**Recovery Steps**:
1. **Stop Application**:
   ```bash
   docker-compose stop backend frontend
   ```

2. **Assess Damage**:
   ```bash
   # Check database integrity
   docker-compose exec db pg_dump necf_treasury > /dev/null
   
   # Check file system
   docker-compose exec backend find /app/media -type f -exec file {} \;
   ```

3. **Restore from Backup**:
   ```bash
   # Restore database
   ./restore.sh latest
   
   # Verify data integrity
   docker-compose exec backend python manage.py check
   ```

#### Security Breach

**Immediate Response**:
1. **Isolate System**:
   ```bash
   # Stop public access
   docker-compose stop nginx
   
   # Review access logs
   docker-compose logs nginx | grep -E "(40[1-4]|50[0-5])"
   ```

2. **Assess Damage**:
   - Review user activity logs
   - Check for unauthorized changes
   - Verify data integrity

3. **Recovery Actions**:
   - Change all passwords
   - Revoke access tokens
   - Update security configurations
   - Restore from clean backup if needed

4. **Communication**:
   - Notify affected users
   - Report to authorities if required
   - Document incident details

### Support Contacts

#### Technical Support

**Primary Support**:
- **System Administrator**: [Name]
- **Phone**: [Phone Number]
- **Email**: [Email Address]
- **Availability**: Monday-Friday, 9 AM - 5 PM

**Emergency Support**:
- **Emergency Contact**: [Name]
- **Phone**: [Emergency Phone]
- **Email**: [Emergency Email]
- **Availability**: 24/7 for critical issues

#### Vendor Support

**Hosting Provider**:
- **Provider**: [Provider Name]
- **Support URL**: [Support Portal]
- **Phone**: [Support Phone]
- **Account ID**: [Account Identifier]

**Email Service**:
- **Provider**: [Email Provider]
- **Support Contact**: [Support Information]
- **Account Details**: [Account Information]

#### Community Resources

**Documentation**:
- **Project Documentation**: [Documentation URL]
- **User Manual**: [Manual URL]
- **FAQ**: [FAQ URL]

**Community Support**:
- **Discussion Forum**: [Forum URL]
- **Bug Reports**: [Issue Tracker URL]
- **Feature Requests**: [Request Portal URL]

---

*This documentation should be reviewed and updated quarterly to ensure accuracy and completeness. Last updated: [Date]*
