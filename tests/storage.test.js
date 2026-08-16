import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  checkIsPittsburghLocation,
  setStorageDir,
  processScanResults,
  getJobs,
  getStats,
  setApplicationStatus,
  updateJobNotes,
  sanitizeJobForPublic,
  PUBLIC_ALLOWLIST_FIELDS
} = require('../src/storage');

describe('Storage, Pittsburgh Location Matcher, and Lifecycle Management', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdet-storage-test-'));
    setStorageDir(tempDir);
  });

  afterEach(() => {
    setStorageDir(null);
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('checkIsPittsburghLocation', () => {
    it('accurately identifies Pittsburgh and surrounding regional locations', () => {
      expect(checkIsPittsburghLocation('Pittsburgh, PA', 'Generic Co')).toBe(true);
      expect(checkIsPittsburghLocation('Pittsburgh, Pennsylvania, United States', 'Generic Co')).toBe(true);
      expect(checkIsPittsburghLocation('Cranberry Township, PA', 'Generic Co')).toBe(true);
      expect(checkIsPittsburghLocation('Monroeville, PA', 'Generic Co')).toBe(true);
      expect(checkIsPittsburghLocation('Warrendale, PA', 'Generic Co')).toBe(true);
    });

    it('identifies registered Pittsburgh companies even if location is not specified', () => {
      expect(checkIsPittsburghLocation('', 'Duolingo')).toBe(true);
      expect(checkIsPittsburghLocation('', 'PNC Bank')).toBe(true);
      expect(checkIsPittsburghLocation('', 'Highmark Health')).toBe(true);
      expect(checkIsPittsburghLocation('', 'Motional')).toBe(true);
    });

    it('does NOT misclassify non-PA cities like Palm Bay FL or Palo Alto CA as Pittsburgh', () => {
      expect(checkIsPittsburghLocation('Palm Bay, FL', 'Florida Tech')).toBe(false);
      expect(checkIsPittsburghLocation('Palo Alto, CA', 'California Tech')).toBe(false);
      expect(checkIsPittsburghLocation('Paris, TX', 'Texas Co')).toBe(false);
      expect(checkIsPittsburghLocation('Panama City, FL', 'Beach Corp')).toBe(false);
      expect(checkIsPittsburghLocation('Seattle, WA', 'Northwest Co')).toBe(false);
    });
  });

  describe('Storage Isolation & Status/Note Management', () => {
    it('runs completely isolated without modifying production data', () => {
      const mockJobs = [
        {
          id: 'test-job-isolated-1',
          title: 'Senior SDET',
          company: 'Acme Test Corp',
          location: 'Remote',
          notes: 'Private personal recruiter notes',
          applicationStatus: 'Applied',
          appliedAt: '2026-08-15T00:00:00Z',
          isRead: true
        }
      ];

      processScanResults(mockJobs, 'healthy');

      // Verify stored in tempDir
      const storedFile = path.join(tempDir, 'jobs.json');
      expect(fs.existsSync(storedFile)).toBe(true);
      const fileData = JSON.parse(fs.readFileSync(storedFile, 'utf-8'));
      expect(fileData.jobs.length).toBe(1);
      expect(fileData.jobs[0].id).toBe('test-job-isolated-1');

      const updateRes = setApplicationStatus({ id: 'test-job-isolated-1', status: 'Interviewing', notes: 'Round 1 technical scheduled' });
      expect(updateRes.success).toBe(true);
      expect(updateRes.job.applicationStatus).toBe('Interviewing');
      expect(updateRes.job.notes).toBe('Round 1 technical scheduled');

      const noteRes = updateJobNotes('test-job-isolated-1', 'Updated prep notes');
      expect(noteRes.success).toBe(true);
      expect(noteRes.job.notes).toBe('Updated prep notes');
    });

    it('sanitizeJobForPublic strictly redacts notes, applicationStatus, appliedAt, and isRead', () => {
      const privateJob = {
        id: '12345',
        title: 'Senior SDET',
        company: 'Cloud Corp',
        location: 'Remote',
        workplaceType: 'Remote',
        matchScore: 92,
        notes: 'Confidential salary expectations and interview notes',
        applicationStatus: 'Interviewing',
        appliedAt: '2026-08-15T12:00:00Z',
        isRead: true
      };

      const publicJob = sanitizeJobForPublic(privateJob);
      expect(publicJob.id).toBe('12345');
      expect(publicJob.title).toBe('Senior SDET');
      expect(publicJob.matchScore).toBe(92);
      expect(publicJob.notes).toBeUndefined();
      expect(publicJob.applicationStatus).toBeUndefined();
      expect(publicJob.appliedAt).toBeUndefined();
      expect(publicJob.isRead).toBeUndefined();
    });

    it('strictly guards scanCount increment and tracking during degraded and failed scans', () => {
      const mockJobs = [
        { id: 'job-1', title: 'Senior SDET', company: 'Corp A', location: 'Remote' }
      ];

      // 1. Healthy scan increments scanCount
      processScanResults(mockJobs, 'healthy');
      let stats = getStats();
      expect(stats.scanCount).toBe(1);
      expect(stats.degradedAttempts).toBe(0);
      expect(stats.failedAttempts).toBe(0);

      // 2. Degraded scan does NOT increment scanCount, but increments degradedAttempts
      processScanResults(mockJobs, 'degraded');
      stats = getStats();
      expect(stats.scanCount).toBe(1);
      expect(stats.degradedAttempts).toBe(1);

      // 3. Failed scan increments failedAttempts
      processScanResults([], 'failed');
      stats = getStats();
      expect(stats.scanCount).toBe(1);
      expect(stats.failedAttempts).toBe(1);
    });
  });
});
