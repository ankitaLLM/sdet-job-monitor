import { describe, it, expect } from 'vitest';
const { analyzeJobFit } = require('../src/companies');

describe('Resume Fit Scoring Model (100-Point Algorithm)', () => {
  it('awards high score for Senior SDET with Playwright, TypeScript, CI/CD, and AI testing skills', () => {
    const fit = analyzeJobFit(
      'Senior SDET - Playwright & GenAI Testing',
      'Acme Software',
      'We are looking for a Senior SDET with 8+ years experience in Playwright, TypeScript, CI/CD pipelines, and Amazon Bedrock / GenAI evaluation.'
    );

    expect(fit.score).toBeGreaterThanOrEqual(85);
    expect(fit.matchedSkills).toContain('Playwright');
    expect(fit.matchedSkills).toContain('AI / GenAI Testing');
    expect(fit.matchedSkills).toContain('TypeScript / JS');
    expect(fit.matchedSkills).toContain('CI/CD Jenkins');
    expect(fit.confidence).toBe('high');
    expect(fit.breakdown.role).toBeGreaterThanOrEqual(22);
    expect(fit.breakdown.seniority).toBeGreaterThanOrEqual(18);
  });

  it('evaluates evidence strictly from title and description, ignoring company name and search queries', () => {
    // If company is "Playwright Labs" but title is "QA Analyst" without Playwright, it should NOT match Playwright skill
    const fit = analyzeJobFit(
      'QA Analyst',
      'Playwright Technologies Inc',
      'Manual and functional testing for billing workflows.'
    );

    expect(fit.matchedSkills).not.toContain('Playwright');
  });

  it('correctly matches Gherkin without previous gberkin typo', () => {
    const fit = analyzeJobFit(
      'Senior QA Automation Engineer',
      'Fintech Corp',
      'Extensive experience with Cucumber and Gherkin feature files for BDD workflows.'
    );

    expect(fit.matchedSkills).toContain('Cucumber / BDD');
  });

  it('penalizes junior and entry-level positions', () => {
    const seniorFit = analyzeJobFit('Lead SDET', 'TechCorp');
    const juniorFit = analyzeJobFit('Junior SDET / Associate QA Intern', 'TechCorp');

    expect(seniorFit.score).toBeGreaterThan(juniorFit.score);
    expect(juniorFit.breakdown.seniority).toBe(0);
  });

  it('penalizes manual-only and hardware roles if evaluated', () => {
    const fit = analyzeJobFit(
      'QA Specialist',
      'Hardware Corp',
      'Manual only hardware line testing for circuit boards.'
    );

    expect(fit.score).toBeLessThanOrEqual(60);
  });
});
