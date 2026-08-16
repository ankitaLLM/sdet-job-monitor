import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const path = require('path');
const {
  checkIsPittsburghLocation,
  initDatabase,
  processScanResults,
  getJobs,
  getStats,
  setApplicationStatus,
  updateJobNotes
} = require('../src/storage');

describe('Storage, Pittsburgh Location Matcher, and Lifecycle Management', () => {
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

  describe('Storage Status & Note Management', () => {
    it('manages application status updates and personal notes correctly', () => {
      const mockJobs = [
        {
          id: 'test-job-1',
          title: 'Senior SDET',
          company: 'Acme Test Corp',
          location: 'Remote'
        }
      ];

      processScanResults(mockJobs);

      const updateRes = setApplicationStatus({ id: 'test-job-1', status: 'Applied', notes: 'Applied on company portal' });
      expect(updateRes.success).toBe(true);
      expect(updateRes.job.applicationStatus).toBe('Applied');
      expect(updateRes.job.notes).toBe('Applied on company portal');

      const noteRes = updateJobNotes('test-job-1', 'Updated recruiter interview date');
      expect(noteRes.success).toBe(true);
      expect(noteRes.job.notes).toBe('Updated recruiter interview date');
    });
  });
});
