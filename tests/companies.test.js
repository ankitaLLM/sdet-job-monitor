import { describe, it, expect } from 'vitest';
const {
  isTop100Company,
  isPittsburghCompany,
  isClarioPeer,
  isNutrienPeer,
  isPeerCompany,
  getPeerCategory,
  CLARIO_PEERS,
  NUTRIEN_PEERS
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

  describe('Nutrien Peers (AgTech, Precision Agronomy, Industrial IoT, Heavy Enterprise)', () => {
    it('accurately identifies Nutrien and direct AgTech / Industrial peers', () => {
      expect(isNutrienPeer('Nutrien')).toBe(true);
      expect(isNutrienPeer('Nutrien Ag Solutions')).toBe(true);
      expect(isNutrienPeer('Corteva Agriscience')).toBe(true);
      expect(isNutrienPeer('Bayer Crop Science')).toBe(true);
      expect(isNutrienPeer('John Deere')).toBe(true);
      expect(isNutrienPeer('Syngenta')).toBe(true);
      expect(isNutrienPeer('Cargill')).toBe(true);
      expect(isNutrienPeer('Trimble Agriculture')).toBe(true);
      expect(isNutrienPeer('Rockwell Automation')).toBe(true);
      expect(isNutrienPeer('Honeywell')).toBe(true);
      expect(isNutrienPeer('Caterpillar')).toBe(true);
      expect(isNutrienPeer('Hitachi Energy')).toBe(true);
    });

    it('returns AgTech & Industrial Tech category label', () => {
      expect(getPeerCategory('Nutrien')).toBe('AgTech & Industrial Tech');
      expect(getPeerCategory('Corteva Agriscience')).toBe('AgTech & Industrial Tech');
      expect(getPeerCategory('John Deere')).toBe('AgTech & Industrial Tech');
    });
  });

  describe('Combined isPeerCompany check', () => {
    it('returns true for both Clario and Nutrien peers and false for unrelated companies', () => {
      expect(isPeerCompany('Clario')).toBe(true);
      expect(isPeerCompany('Nutrien')).toBe(true);
      expect(isPeerCompany('Veeva Systems')).toBe(true);
      expect(isPeerCompany('Corteva')).toBe(true);
      expect(isPeerCompany('Random Startup Inc')).toBe(false);
    });
  });
});
