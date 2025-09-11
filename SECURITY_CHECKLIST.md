# NECF Treasury System - Security Checklist

## Pre-Deployment Security Setup

### Infrastructure Security

#### Server Hardening
- [ ] **Operating System**: Ubuntu 20.04 LTS or newer with latest security patches
- [ ] **Firewall Configuration**: UFW enabled with only necessary ports (22, 80, 443)
- [ ] **SSH Security**: 
  - [ ] Password authentication disabled
  - [ ] SSH key-based authentication only
  - [ ] Root login disabled
  - [ ] Non-standard SSH port (optional but recommended)
- [ ] **System Updates**: Automatic security updates enabled
- [ ] **Fail2Ban**: Installed and configured for SSH, HTTP, and application protection

```bash
# Ubuntu security hardening commands
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo apt install fail2ban unattended-upgrades
```

#### SSL/TLS Configuration
- [ ] **SSL Certificate**: Valid certificate from trusted CA (Let's Encrypt recommended)
- [ ] **HTTPS Redirect**: All HTTP traffic redirected to HTTPS
- [ ] **HSTS Headers**: HTTP Strict Transport Security enabled
- [ ] **TLS Version**: Minimum TLS 1.2, prefer TLS 1.3
- [ ] **Certificate Auto-Renewal**: Automated renewal configured
- [ ] **SSL Labs Grade**: A+ rating on SSL Labs test

```bash
# Verify SSL configuration
curl -I https://your-domain.com
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Application Security

#### Django Security Configuration
- [ ] **SECRET_KEY**: Strong, unique secret key (50+ characters)
- [ ] **DEBUG**: Set to False in production
- [ ] **ALLOWED_HOSTS**: Properly configured with actual domain names
- [ ] **SECURE_SSL_REDIRECT**: Enabled for HTTPS enforcement
- [ ] **SECURE_HSTS**: HSTS settings properly configured
- [ ] **SECURE_CONTENT_TYPE**: Content type sniffing protection enabled
- [ ] **X_FRAME_OPTIONS**: Clickjacking protection enabled
- [ ] **CSRF Protection**: CSRF middleware enabled and properly configured

```python
# Critical Django security settings
SECRET_KEY = 'your-50-character-random-secret-key'
DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
```

#### Database Security
- [ ] **Database Password**: Complex password (minimum 16 characters, mixed case, numbers, symbols)
- [ ] **Database User**: Dedicated user with minimum required permissions
- [ ] **Network Access**: Database accessible only from application containers
- [ ] **Connection Encryption**: SSL/TLS encryption for database connections
- [ ] **Backup Encryption**: Database backups encrypted at rest and in transit

```bash
# Generate secure database password
openssl rand -base64 32

# PostgreSQL security configuration
# In postgresql.conf:
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

#### Authentication & Authorization
- [ ] **Password Policy**: Strong password requirements enforced
- [ ] **Session Security**: Secure session configuration
- [ ] **Session Timeout**: Appropriate session timeout settings
- [ ] **Rate Limiting**: Login attempt rate limiting configured
- [ ] **Account Lockout**: Temporary account lockout after failed attempts
- [ ] **Two-Factor Authentication**: 2FA enabled for admin accounts (recommended)

### Network Security

#### Reverse Proxy Configuration
- [ ] **Nginx Security**: Security headers properly configured
- [ ] **Rate Limiting**: Request rate limiting implemented
- [ ] **DDoS Protection**: Basic DDoS protection measures
- [ ] **IP Whitelisting**: Admin access restricted by IP (if applicable)
- [ ] **Security Headers**: All recommended security headers configured

```nginx
# Nginx security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

#### Container Security
- [ ] **Docker Security**: Latest Docker version with security patches
- [ ] **Image Security**: Base images from trusted sources and regularly updated
- [ ] **Container Isolation**: Proper container isolation and resource limits
- [ ] **Non-Root User**: Application runs as non-root user inside containers
- [ ] **Read-Only Filesystems**: Where possible, use read-only filesystems
- [ ] **Secret Management**: Secrets managed via environment variables or secret management tools

## Data Protection & Privacy

### Data Encryption
- [ ] **Data at Rest**: Database encryption enabled
- [ ] **Data in Transit**: All connections use TLS/SSL
- [ ] **Backup Encryption**: Backups encrypted before storage
- [ ] **File Uploads**: Uploaded files encrypted or stored securely
- [ ] **Key Management**: Encryption keys properly managed and rotated

### Privacy Compliance
- [ ] **Data Minimization**: Only collect necessary personal data
- [ ] **Consent Management**: Proper consent mechanisms for data collection
- [ ] **Data Retention**: Clear data retention policies implemented
- [ ] **Right to Deletion**: Process for data deletion requests
- [ ] **Data Export**: Ability to export user data upon request
- [ ] **Privacy Policy**: Clear privacy policy published and accessible

### Access Control
- [ ] **Role-Based Access**: Proper RBAC implementation
- [ ] **Principle of Least Privilege**: Users have minimum necessary permissions
- [ ] **Regular Access Reviews**: Quarterly review of user permissions
- [ ] **Privileged Access**: Extra controls for admin/privileged accounts
- [ ] **Audit Logging**: All access and changes logged
- [ ] **Emergency Access**: Emergency access procedures documented

## Monitoring & Incident Response

### Security Monitoring
- [ ] **Log Monitoring**: Centralized logging and monitoring
- [ ] **Intrusion Detection**: Basic intrusion detection configured
- [ ] **Vulnerability Scanning**: Regular vulnerability scans scheduled
- [ ] **Security Alerts**: Automated alerts for security events
- [ ] **Performance Monitoring**: Monitor for unusual activity patterns
- [ ] **Uptime Monitoring**: External uptime monitoring configured

### Incident Response
- [ ] **Incident Response Plan**: Written incident response procedures
- [ ] **Emergency Contacts**: 24/7 emergency contact information
- [ ] **Backup Communication**: Alternative communication channels
- [ ] **Forensic Procedures**: Basic digital forensics procedures
- [ ] **Recovery Procedures**: Tested recovery procedures
- [ ] **Incident Documentation**: Process for documenting incidents

## Key Rotation Schedule

### Mandatory Rotations

#### Every 30 Days
- [ ] **JWT Secrets**: Rotate JSON Web Token signing keys
- [ ] **Session Keys**: Rotate session encryption keys
- [ ] **API Rate Limiting**: Review and update rate limiting rules

#### Every 90 Days
- [ ] **Database Passwords**: Rotate database user passwords
- [ ] **Application Secrets**: Rotate Django SECRET_KEY
- [ ] **Email Credentials**: Rotate SMTP authentication credentials
- [ ] **Cloud Storage Keys**: Rotate S3/cloud storage access keys
- [ ] **Monitoring Credentials**: Rotate monitoring service credentials

#### Every 180 Days
- [ ] **SSH Keys**: Rotate server SSH keys
- [ ] **SSL Certificates**: Verify certificate auto-renewal or manually renew
- [ ] **Admin Passwords**: Rotate administrator passwords
- [ ] **Service Account Keys**: Rotate service account credentials

#### Every 365 Days
- [ ] **Root Passwords**: Rotate root/system passwords
- [ ] **Backup Encryption Keys**: Rotate backup encryption keys
- [ ] **Certificate Authority**: Review CA certificate validity

### Rotation Procedures

#### Database Password Rotation
```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update database user password
docker-compose exec db psql -U postgres -c "ALTER USER necf_user PASSWORD '${NEW_PASSWORD}';"

# 3. Update environment file
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${NEW_PASSWORD}/" .env

# 4. Restart application
docker-compose restart backend

# 5. Test connectivity
docker-compose exec backend python manage.py check --database default

# 6. Update documentation
echo "Database password rotated on $(date)" >> /var/log/key-rotation.log
```

#### Django Secret Key Rotation
```bash
# 1. Generate new secret key
NEW_SECRET=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")

# 2. Update environment file
sed -i "s/SECRET_KEY=.*/SECRET_KEY=${NEW_SECRET}/" .env

# 3. Restart application
docker-compose restart backend

# 4. Test application
curl -f https://your-domain.com/api/health/

# 5. Document rotation
echo "Django secret key rotated on $(date)" >> /var/log/key-rotation.log
```

### Automated Rotation Script

Create a script for automated key rotation:

```bash
#!/bin/bash
# /usr/local/bin/rotate-keys.sh

ROTATION_LOG="/var/log/key-rotation.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" | tee -a "$ROTATION_LOG"
}

# Check which keys need rotation
check_rotation_needed() {
    # Check last database password rotation
    LAST_DB_ROTATION=$(grep "Database password" "$ROTATION_LOG" | tail -1 | cut -d' ' -f1-2)
    DB_DAYS_AGO=$(( ($(date +%s) - $(date -d "$LAST_DB_ROTATION" +%s)) / 86400 ))
    
    if [ $DB_DAYS_AGO -gt 90 ]; then
        log "Database password rotation needed (last: $DB_DAYS_AGO days ago)"
        return 0
    fi
    
    return 1
}

# Add to crontab for automated execution
# 0 2 1 * * /usr/local/bin/rotate-keys.sh
```

## Backup Security

### Backup Encryption
- [ ] **Encryption at Rest**: All backups encrypted before storage
- [ ] **Encryption in Transit**: Backup transfers use encryption
- [ ] **Key Management**: Backup encryption keys securely managed
- [ ] **Access Control**: Backup access restricted to authorized personnel
- [ ] **Integrity Verification**: Backup integrity regularly verified

### Backup Storage
- [ ] **Geographic Distribution**: Backups stored in multiple locations
- [ ] **Access Logging**: All backup access logged and monitored
- [ ] **Retention Policy**: Clear backup retention and destruction policy
- [ ] **Offline Backups**: Some backups stored offline/air-gapped
- [ ] **Restoration Testing**: Regular restoration testing performed

### Backup Security Configuration

```bash
# Encrypt backups with GPG
gpg --symmetric --cipher-algo AES256 --compress-algo 2 \
    --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 \
    --output backup.sql.gz.gpg backup.sql.gz

# Upload encrypted backup to S3 with server-side encryption
aws s3 cp backup.sql.gz.gpg s3://backup-bucket/ \
    --server-side-encryption AES256 \
    --storage-class STANDARD_IA
```

## Compliance & Audit

### Data Retention Policy
- [ ] **Financial Records**: 7 years retention for financial transactions
- [ ] **Member Data**: Retention as long as membership is active + 2 years
- [ ] **Audit Logs**: 12 months retention for security logs
- [ ] **Backup Data**: 90 days for operational backups, 7 years for annual archives
- [ ] **Email Communications**: 3 years retention for official communications

### Audit Trail
- [ ] **User Activity**: All user actions logged with timestamps
- [ ] **Administrative Changes**: All system changes logged
- [ ] **Data Modifications**: All data changes tracked with user attribution
- [ ] **Access Logs**: All system access logged and monitored
- [ ] **Report Generation**: Report access and generation logged

### Compliance Reporting
- [ ] **Security Assessments**: Quarterly security assessment reports
- [ ] **Vulnerability Reports**: Monthly vulnerability scan reports
- [ ] **Access Reviews**: Quarterly user access review reports
- [ ] **Incident Reports**: All security incidents documented and reported
- [ ] **Compliance Attestation**: Annual compliance attestation document

## Emergency Procedures

### Security Incident Response

#### Immediate Response (First 30 minutes)
1. **Identify and Contain**
   - [ ] Identify affected systems
   - [ ] Isolate compromised systems if needed
   - [ ] Preserve evidence
   - [ ] Document initial findings

```bash
# Emergency containment commands
# Stop public access if needed
docker-compose stop nginx

# Capture current state
docker-compose logs > incident-logs-$(date +%Y%m%d-%H%M%S).txt
netstat -tulpn > network-state-$(date +%Y%m%d-%H%M%S).txt
```

2. **Assess Impact**
   - [ ] Determine scope of potential data exposure
   - [ ] Identify affected user accounts
   - [ ] Assess system integrity
   - [ ] Estimate recovery time

3. **Initial Communication**
   - [ ] Notify system administrator
   - [ ] Alert key stakeholders
   - [ ] Prepare initial status update

#### Short-term Response (First 4 hours)
1. **Investigation**
   - [ ] Analyze logs for attack vectors
   - [ ] Identify compromised accounts
   - [ ] Assess data integrity
   - [ ] Determine root cause

2. **Containment**
   - [ ] Change all administrative passwords
   - [ ] Revoke API keys and tokens
   - [ ] Update firewall rules if needed
   - [ ] Apply security patches

3. **Communication**
   - [ ] Notify affected users
   - [ ] Update stakeholders on progress
   - [ ] Prepare public communication if needed

#### Recovery Phase (4-24 hours)
1. **System Restoration**
   - [ ] Restore from clean backups if needed
   - [ ] Apply all security updates
   - [ ] Verify system integrity
   - [ ] Test all functionality

2. **Security Hardening**
   - [ ] Implement additional security measures
   - [ ] Update security configurations
   - [ ] Enhance monitoring
   - [ ] Review access controls

3. **Documentation**
   - [ ] Complete incident report
   - [ ] Document lessons learned
   - [ ] Update security procedures
   - [ ] Plan preventive measures

### Data Breach Response

#### Legal and Regulatory Requirements
- [ ] **Notification Timeline**: Understand local notification requirements
- [ ] **Regulatory Reporting**: Know which authorities to notify
- [ ] **User Notification**: Plan for user notification requirements
- [ ] **Legal Counsel**: Have legal counsel contact information ready

#### Communication Templates

**Internal Notification**:
```
Subject: URGENT - Security Incident Detected

A potential security incident has been detected in the NECF Treasury system.

Incident ID: [ID]
Detection Time: [Time]
Severity: [High/Medium/Low]
Affected Systems: [Systems]
Initial Assessment: [Brief description]

Immediate Actions Taken:
- [Action 1]
- [Action 2]

Next Steps:
- [Step 1]
- [Step 2]

Updates will be provided every [timeframe].

Contact: [Emergency contact information]
```

**User Notification Template**:
```
Subject: Important Security Notice - NECF Treasury System

Dear [Member/User],

We are writing to inform you of a security incident that may have affected your account information in our treasury management system.

What Happened:
[Brief, non-technical description]

Information Involved:
[Specific data types that may have been accessed]

What We Are Doing:
[Actions taken to address the incident]

What You Should Do:
1. Change your password immediately
2. Monitor your accounts for unusual activity
3. Contact us if you notice anything suspicious

We sincerely apologize for this incident and any inconvenience it may cause.

Contact Information:
Phone: [Phone]
Email: [Email]

Sincerely,
NECF Administration
```

---

## Security Checklist Summary

### Daily Security Tasks
- [ ] Review security alerts and logs
- [ ] Check system health and performance
- [ ] Verify backup completion
- [ ] Monitor user activity for anomalies

### Weekly Security Tasks  
- [ ] Review access logs
- [ ] Check for system updates
- [ ] Verify SSL certificate status
- [ ] Review backup integrity

### Monthly Security Tasks
- [ ] Conduct security assessment
- [ ] Review user permissions
- [ ] Update security documentation
- [ ] Test incident response procedures

### Quarterly Security Tasks
- [ ] Rotate long-term credentials
- [ ] Conduct vulnerability scan
- [ ] Review and update security policies
- [ ] Test disaster recovery procedures

### Annual Security Tasks
- [ ] Comprehensive security audit
- [ ] Update incident response plan
- [ ] Review compliance requirements
- [ ] Security awareness training

---

*This security checklist should be reviewed and updated regularly to reflect the latest security best practices and threats. Last updated: [Date]*
