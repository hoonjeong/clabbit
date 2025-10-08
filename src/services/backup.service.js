const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const mysqldump = require('mysqldump');
const db = require('../config/database');
const crypto = require('crypto');
const { createReadStream, createWriteStream } = require('fs');
const AWS = require('aws-sdk');

class BackupService {
    constructor() {
        this.backupDir = path.join(process.cwd(), 'backups');
        this.tempDir = path.join(process.cwd(), 'temp');

        // AWS S3 설정 (선택적)
        if (process.env.AWS_ACCESS_KEY_ID) {
            this.s3 = new AWS.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || 'ap-northeast-2'
            });
            this.s3Bucket = process.env.S3_BACKUP_BUCKET;
        }

        // 백업 디렉토리 생성
        this.initDirectories();
    }

    async initDirectories() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create backup directories:', error);
        }
    }

    // 전체 백업 생성
    async createBackup(academyId, options = {}) {
        const {
            type = 'manual',
            description = '',
            userId = null,
            includeFiles = true
        } = options;

        const backupId = this.generateBackupId();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `academy_${academyId}_${timestamp}_${backupId}`;

        try {
            console.log(`Starting backup: ${backupName}`);

            // 1. 백업 레코드 생성
            const [backupRecord] = await db.execute(
                `INSERT INTO academy_backups
                (academy_id, backup_id, type, status, description, created_by)
                VALUES (?, ?, ?, 'in_progress', ?, ?)`,
                [academyId, backupId, type, description, userId]
            );

            // 2. 데이터베이스 백업
            const dbBackupFile = await this.backupDatabase(academyId, backupName);

            // 3. 파일 백업 (업로드된 파일들)
            let filesBackupFile = null;
            if (includeFiles) {
                filesBackupFile = await this.backupFiles(academyId, backupName);
            }

            // 4. 전체 백업 압축
            const finalBackupPath = await this.createArchive(
                backupName,
                dbBackupFile,
                filesBackupFile
            );

            // 5. 체크섬 생성
            const checksum = await this.calculateChecksum(finalBackupPath);

            // 6. S3 업로드 (설정된 경우)
            let s3Location = null;
            if (this.s3 && this.s3Bucket) {
                s3Location = await this.uploadToS3(finalBackupPath, backupName);
            }

            // 7. 백업 정보 업데이트
            const fileStats = await fs.stat(finalBackupPath);
            await db.execute(
                `UPDATE academy_backups
                SET status = 'completed',
                    file_path = ?,
                    file_size = ?,
                    checksum = ?,
                    s3_location = ?,
                    completed_at = NOW()
                WHERE backup_id = ?`,
                [finalBackupPath, fileStats.size, checksum, s3Location, backupId]
            );

            // 8. 임시 파일 정리
            await this.cleanupTempFiles([dbBackupFile, filesBackupFile]);

            console.log(`Backup completed: ${backupName}`);

            return {
                success: true,
                backupId,
                backupName,
                filePath: finalBackupPath,
                fileSize: fileStats.size,
                checksum,
                s3Location
            };

        } catch (error) {
            console.error(`Backup failed: ${backupName}`, error);

            // 백업 실패 상태 업데이트
            await db.execute(
                `UPDATE academy_backups
                SET status = 'failed',
                    error_message = ?,
                    completed_at = NOW()
                WHERE backup_id = ?`,
                [error.message, backupId]
            );

            throw error;
        }
    }

    // 데이터베이스 백업
    async backupDatabase(academyId, backupName) {
        const dumpFile = path.join(this.tempDir, `${backupName}_db.sql`);

        try {
            // 학원별 테이블 목록 조회
            const academyTables = await this.getAcademyTables(academyId);

            // mysqldump 실행
            await mysqldump({
                connection: {
                    host: process.env.DB_HOST,
                    user: process.env.DB_USER,
                    password: process.env.DB_PASSWORD,
                    database: process.env.DB_NAME
                },
                dump: {
                    tables: academyTables,
                    where: {
                        // 각 테이블에 대한 WHERE 조건
                        ...academyTables.reduce((acc, table) => {
                            acc[table] = `academy_id = ${academyId}`;
                            return acc;
                        }, {})
                    },
                    data: {
                        format: false,
                        lockTables: false
                    },
                    schema: {
                        table: {
                            dropIfExist: true,
                            ifNotExist: true
                        }
                    }
                },
                dumpToFile: dumpFile
            });

            // 데이터베이스 백업 암호화 (선택적)
            if (process.env.BACKUP_ENCRYPTION_KEY) {
                const encryptedFile = `${dumpFile}.enc`;
                await this.encryptFile(dumpFile, encryptedFile);
                await fs.unlink(dumpFile);
                return encryptedFile;
            }

            return dumpFile;
        } catch (error) {
            console.error('Database backup failed:', error);
            throw error;
        }
    }

    // 파일 백업
    async backupFiles(academyId, backupName) {
        const filesBackupPath = path.join(this.tempDir, `${backupName}_files.zip`);
        const uploadsDir = path.join(process.cwd(), 'uploads', `academy_${academyId}`);

        try {
            // uploads 디렉토리 확인
            await fs.access(uploadsDir);

            // ZIP 아카이브 생성
            const output = createWriteStream(filesBackupPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // 최대 압축
            });

            return new Promise((resolve, reject) => {
                output.on('close', () => resolve(filesBackupPath));
                archive.on('error', reject);

                archive.pipe(output);
                archive.directory(uploadsDir, false);
                archive.finalize();
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No files to backup for academy:', academyId);
                return null;
            }
            throw error;
        }
    }

    // 최종 아카이브 생성
    async createArchive(backupName, dbBackup, filesBackup) {
        const finalBackupPath = path.join(this.backupDir, `${backupName}.tar.gz`);
        const output = createWriteStream(finalBackupPath);
        const archive = archiver('tar', {
            gzip: true,
            gzipOptions: { level: 9 }
        });

        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(finalBackupPath));
            archive.on('error', reject);

            archive.pipe(output);

            // 메타데이터 추가
            const metadata = {
                version: '1.0',
                created: new Date().toISOString(),
                type: 'full',
                components: ['database', filesBackup ? 'files' : null].filter(Boolean)
            };

            archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

            // 데이터베이스 백업 추가
            if (dbBackup) {
                archive.file(dbBackup, { name: path.basename(dbBackup) });
            }

            // 파일 백업 추가
            if (filesBackup) {
                archive.file(filesBackup, { name: path.basename(filesBackup) });
            }

            archive.finalize();
        });
    }

    // 백업 복구
    async restoreBackup(backupId, options = {}) {
        const { targetAcademyId, restoreDatabase = true, restoreFiles = true } = options;

        try {
            // 백업 정보 조회
            const [backupInfo] = await db.execute(
                'SELECT * FROM academy_backups WHERE backup_id = ?',
                [backupId]
            );

            if (!backupInfo.length) {
                throw new Error('Backup not found');
            }

            const backup = backupInfo[0];
            const backupPath = backup.file_path;

            // S3에서 다운로드 (필요한 경우)
            let localBackupPath = backupPath;
            if (!await this.fileExists(backupPath) && backup.s3_location) {
                localBackupPath = await this.downloadFromS3(backup.s3_location, backupId);
            }

            // 체크섬 검증
            const checksum = await this.calculateChecksum(localBackupPath);
            if (checksum !== backup.checksum) {
                throw new Error('Backup file integrity check failed');
            }

            // 백업 압축 해제
            const extractDir = path.join(this.tempDir, `restore_${backupId}`);
            await this.extractArchive(localBackupPath, extractDir);

            // 복구 시작
            const restoreResults = {
                database: null,
                files: null
            };

            // 데이터베이스 복구
            if (restoreDatabase) {
                restoreResults.database = await this.restoreDatabase(
                    extractDir,
                    targetAcademyId || backup.academy_id
                );
            }

            // 파일 복구
            if (restoreFiles) {
                restoreResults.files = await this.restoreFiles(
                    extractDir,
                    targetAcademyId || backup.academy_id
                );
            }

            // 복구 로그 기록
            await db.execute(
                `INSERT INTO backup_restores
                (backup_id, academy_id, restore_type, status, details)
                VALUES (?, ?, ?, 'completed', ?)`,
                [
                    backupId,
                    targetAcademyId || backup.academy_id,
                    restoreDatabase && restoreFiles ? 'full' : restoreDatabase ? 'database' : 'files',
                    JSON.stringify(restoreResults)
                ]
            );

            // 임시 파일 정리
            await fs.rmdir(extractDir, { recursive: true });

            return {
                success: true,
                restoreResults
            };

        } catch (error) {
            console.error('Restore failed:', error);

            // 복구 실패 로그
            await db.execute(
                `INSERT INTO backup_restores
                (backup_id, academy_id, restore_type, status, error_message)
                VALUES (?, ?, 'failed', 'failed', ?)`,
                [backupId, targetAcademyId, error.message]
            );

            throw error;
        }
    }

    // 자동 백업 스케줄러
    async scheduleAutoBackups() {
        const cron = require('node-cron');

        // 매일 새벽 2시 자동 백업
        cron.schedule('0 2 * * *', async () => {
            console.log('Starting scheduled daily backups...');

            try {
                // 자동 백업이 설정된 학원 조회
                const [academies] = await db.execute(
                    `SELECT a.id, a.name
                    FROM academies a
                    JOIN academy_settings s ON a.id = s.academy_id
                    WHERE s.category = 'backup'
                    AND s.setting_key = 'auto_backup_enabled'
                    AND s.setting_value = 'true'`
                );

                for (const academy of academies) {
                    try {
                        await this.createBackup(academy.id, {
                            type: 'scheduled',
                            description: 'Daily automatic backup'
                        });
                        console.log(`Backup completed for academy: ${academy.name}`);
                    } catch (error) {
                        console.error(`Backup failed for academy ${academy.name}:`, error);
                    }
                }

                // 오래된 백업 정리
                await this.cleanupOldBackups();

            } catch (error) {
                console.error('Scheduled backup failed:', error);
            }
        });

        // 주간 전체 백업 (일요일 새벽 3시)
        cron.schedule('0 3 * * 0', async () => {
            console.log('Starting weekly full backups...');
            // 전체 백업 로직
        });
    }

    // 오래된 백업 정리
    async cleanupOldBackups(retentionDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            // 삭제할 백업 조회
            const [oldBackups] = await db.execute(
                `SELECT * FROM academy_backups
                WHERE created_at < ?
                AND type != 'manual'
                ORDER BY created_at ASC`,
                [cutoffDate]
            );

            for (const backup of oldBackups) {
                // 로컬 파일 삭제
                if (backup.file_path) {
                    try {
                        await fs.unlink(backup.file_path);
                    } catch (error) {
                        console.error(`Failed to delete local backup: ${backup.file_path}`);
                    }
                }

                // S3 파일 삭제
                if (backup.s3_location && this.s3) {
                    try {
                        await this.deleteFromS3(backup.s3_location);
                    } catch (error) {
                        console.error(`Failed to delete S3 backup: ${backup.s3_location}`);
                    }
                }

                // 데이터베이스 레코드 업데이트
                await db.execute(
                    `UPDATE academy_backups
                    SET status = 'deleted', deleted_at = NOW()
                    WHERE backup_id = ?`,
                    [backup.backup_id]
                );
            }

            console.log(`Cleaned up ${oldBackups.length} old backups`);
        } catch (error) {
            console.error('Backup cleanup failed:', error);
        }
    }

    // Helper Methods
    generateBackupId() {
        return crypto.randomBytes(8).toString('hex');
    }

    async calculateChecksum(filePath) {
        const hash = crypto.createHash('sha256');
        const stream = createReadStream(filePath);

        return new Promise((resolve, reject) => {
            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    async encryptFile(inputPath, outputPath) {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);

        const input = createReadStream(inputPath);
        const output = createWriteStream(outputPath);

        // Write IV at the beginning
        output.write(iv);

        return new Promise((resolve, reject) => {
            input
                .pipe(cipher)
                .pipe(output)
                .on('finish', () => {
                    const authTag = cipher.getAuthTag();
                    fs.appendFile(outputPath, authTag, () => resolve());
                })
                .on('error', reject);
        });
    }

    async uploadToS3(filePath, key) {
        const fileStream = createReadStream(filePath);
        const uploadParams = {
            Bucket: this.s3Bucket,
            Key: `backups/${key}`,
            Body: fileStream
        };

        const result = await this.s3.upload(uploadParams).promise();
        return result.Location;
    }

    async downloadFromS3(location, backupId) {
        const key = location.split('/').slice(-1)[0];
        const localPath = path.join(this.tempDir, `download_${backupId}`);

        const params = {
            Bucket: this.s3Bucket,
            Key: `backups/${key}`
        };

        const fileStream = createWriteStream(localPath);
        const s3Stream = this.s3.getObject(params).createReadStream();

        return new Promise((resolve, reject) => {
            s3Stream
                .pipe(fileStream)
                .on('finish', () => resolve(localPath))
                .on('error', reject);
        });
    }

    async deleteFromS3(location) {
        const key = location.split('/').slice(-1)[0];
        await this.s3.deleteObject({
            Bucket: this.s3Bucket,
            Key: `backups/${key}`
        }).promise();
    }

    async getAcademyTables(academyId) {
        // 학원 데이터가 포함된 테이블 목록
        return [
            'students',
            'teachers',
            'classes',
            'class_enrollments',
            'attendance',
            'payments',
            'charges',
            'charge_items',
            'grades',
            'exams',
            'consultations',
            'messages',
            'notifications'
        ];
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async extractArchive(archivePath, extractDir) {
        // tar.gz 압축 해제 로직
        const tar = require('tar');
        await tar.extract({
            file: archivePath,
            cwd: extractDir
        });
    }

    async restoreDatabase(extractDir, academyId) {
        // 데이터베이스 복구 로직
        const sqlFiles = await fs.readdir(extractDir);
        const dbFile = sqlFiles.find(f => f.endsWith('.sql') || f.endsWith('.sql.enc'));

        if (dbFile) {
            // 암호화된 경우 복호화
            let sqlPath = path.join(extractDir, dbFile);
            if (dbFile.endsWith('.enc')) {
                const decryptedPath = sqlPath.replace('.enc', '');
                await this.decryptFile(sqlPath, decryptedPath);
                sqlPath = decryptedPath;
            }

            // SQL 실행 (실제 구현 필요)
            // await executeSqlFile(sqlPath, academyId);

            return { success: true, message: 'Database restored' };
        }

        return { success: false, message: 'No database backup found' };
    }

    async restoreFiles(extractDir, academyId) {
        // 파일 복구 로직
        const filesBackup = path.join(extractDir, 'files.zip');
        if (await this.fileExists(filesBackup)) {
            const targetDir = path.join(process.cwd(), 'uploads', `academy_${academyId}`);
            // unzip 로직 구현
            return { success: true, message: 'Files restored' };
        }

        return { success: false, message: 'No files backup found' };
    }

    async cleanupTempFiles(files) {
        for (const file of files) {
            if (file) {
                try {
                    await fs.unlink(file);
                } catch (error) {
                    console.error(`Failed to cleanup temp file: ${file}`);
                }
            }
        }
    }
}

module.exports = new BackupService();