import { describe, it, expect } from 'vitest';
const {
  isTop100Company,
  isPittsburghCompany,
  isClarioPeer,
  isNutrienPeer,
  isAgTechCompany,
  isAgriFinanceCompany,
  isPeerCompany,
  checkAgriClassification,
  getPeerCategory,
  CLARIO_PEERS,
  NUTRIEN_PEERS,
  AGTECH_COMPANIES,
  AGRI_FINANCE_COMPANIES
} = require('../src/companies');

describe('Company Directory & Industry Peer Matching (Clario & Nutrien)', () => {
  describe('Clario Peers (Life Sciences, Clinical Trials, HealthTech, Diagnostic Software)', () => {
    it('accurately identifies Clario and direct life sciences / clinical tech peers', () => {
      expect(isClarioPeer('Clario')).toBe(true);
      expect(isClarioPeer('Medidata Solutions')).toBe(true);
      expect(isClarioPeer('Veeva Systems')).toBe(true);
      expect(isClarioPeer('IQVIA')).toBe(true);
      expect(isClarioPeer('Signant Health')).toBe(true);
      expect(isClarioPeer('Tempus Labs')).toBe(true);
      expect(isClarioPeer('Flatiron Health')).toBe(true);
      expect(isClarioPeer('Epic Systems')).toBe(true);
      expect(isClarioPeer('Philips Healthcare')).toBe(true);
      expect(isClarioPeer('Thermo Fisher Scientific')).toBe(true);
      expect(isClarioPeer('Medtronic')).toBe(true);
      expect(isClarioPeer('Abbott')).toBe(true);
      expect(isClarioPeer('Labcorp')).toBe(true);
    });

    it('returns Life Sciences & HealthTech category label', () => {
      expect(getPeerCategory('Clario')).toBe('Life Sciences & HealthTech');
      expect(getPeerCategory('Veeva Systems')).toBe('Life Sciences & HealthTech');
      expect(getPeerCategory('Medidata Solutions')).toBe('Life Sciences & HealthTech');
    });
  });

  describe('Agricultural Technology (AgTech) Peers', () => {
    it('identifies precision ag, digital agronomy, and farm robotics companies', () => {
      expect(isAgTechCompany('Nutrien Ag Solutions')).toBe(true);
      expect(isAgTechCompany('Corteva Agriscience')).toBe(true);
      expect(isAgTechCompany('Granular')).toBe(true);
      expect(isAgTechCompany('Bayer Crop Science')).toBe(true);
      expect(isAgTechCompany('Climate FieldView')).toBe(true);
      expect(isAgTechCompany('John Deere')).toBe(true);
      expect(isAgTechCompany('Syngenta Digital')).toBe(true);
      expect(isAgTechCompany('Trimble Agriculture')).toBe(true);
      expect(isAgTechCompany('Indigo Ag')).toBe(true);
      expect(isAgTechCompany('AGCO Corporation')).toBe(true);
    });
  });

  describe('Agri-Finance, Commodity Trading & Crop FinTech Peers', () => {
    it('identifies commodity risk, farm credit, crop insurance, and agri-fintech companies', () => {
      expect(isAgriFinanceCompany('Cargill')).toBe(true);
      expect(isAgriFinanceCompany('ADM')).toBe(true);
      expect(isAgriFinanceCompany('Archer Daniels Midland')).toBe(true);
      expect(isAgriFinanceCompany('Bunge')).toBe(true);
      expect(isAgriFinanceCompany('Louis Dreyfus Company')).toBe(true);
      expect(isAgriFinanceCompany('CHS Inc')).toBe(true);
      expect(isAgriFinanceCompany('Farm Credit Services of America')).toBe(true);
      expect(isAgriFinanceCompany('CoBank')).toBe(true);
      expect(isAgriFinanceCompany('Bushel')).toBe(true);
      expect(isAgriFinanceCompany('AgVend')).toBe(true);
      expect(isAgriFinanceCompany('ProducePay')).toBe(true);
    });
  });

  describe('checkAgriClassification domain intelligence', () => {
    it('classifies job by title/description keywords even if company is a generic staffing/tech agency', () => {
      const agTechJob = checkAgriClassification(
        'Senior QA Automation Engineer - Precision Ag & Telematics',
        'Apex Systems',
        'Automated testing for tractor telematics, crop yield maps, and digital agronomy software.'
      );
      expect(agTechJob.isAgTech).toBe(true);
      expect(agTechJob.agriCategory).toBe('Precision AgTech');

      const agriFinJob = checkAgriClassification(
        'SDET Lead - Commodity Trading & Risk Management',
        'Global Tech Corp',
        'Building Playwright automation for agricultural commodity trading, grain contracts, and crop financing.'
      );
      expect(agriFinJob.isAgriFinance).toBe(true);
      expect(agriFinJob.agriCategory).toBe('Agri-Finance & Commodities');
    });
  });

  describe('Combined isPeerCompany check', () => {
    it('returns true for Clario, Nutrien, AgTech, and AgriFinance peers and false for unrelated companies', () => {
      expect(isPeerCompany('Clario')).toBe(true);
      expect(isPeerCompany('Nutrien')).toBe(true);
      expect(isPeerCompany('Cargill')).toBe(true);
      expect(isPeerCompany('ADM')).toBe(true);
      expect(isPeerCompany('Veeva Systems')).toBe(true);
      expect(isPeerCompany('Corteva')).toBe(true);
      expect(isPeerCompany('Random Startup Inc')).toBe(false);
    });
  });
});
