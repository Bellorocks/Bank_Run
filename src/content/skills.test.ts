import { describe, it, expect } from 'vitest';
import { SKILLS, SKILLS_BY_ID, validateSkillGraph, skillsOfModule } from './skills';

describe('skill tree', () => {
  it('non ha id duplicati', () => {
    expect(SKILLS_BY_ID.size).toBe(SKILLS.length);
  });

  it('e\' un grafo aciclico con prerequisiti esistenti', () => {
    expect(validateSkillGraph()).toEqual([]);
  });

  it('copre tutti i moduli del curriculum', () => {
    // Ogni area curriculare dello spec §5 deve avere almeno una skill,
    // altrimenti c'e' contenuto senza un nodo nel tree su cui misurare la mastery.
    const moduli = [
      'M0-A', 'M0-B', 'M0-C', 'M0-D', 'M0-E', 'M0-F',
      'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11',
    ] as const;
    for (const m of moduli) {
      expect(skillsOfModule(m).length, `modulo ${m} senza skill`).toBeGreaterThan(0);
    }
  });

  it('usa id nel formato area.nome-kebab', () => {
    for (const k of SKILLS) {
      expect(k.id, k.id).toMatch(/^[a-z]+\.[a-z0-9-]+$/);
    }
  });

  it('ha etichetta e descrizione non vuote', () => {
    for (const k of SKILLS) {
      expect(k.label.length, k.id).toBeGreaterThan(0);
      expect(k.description.length, k.id).toBeGreaterThan(10);
    }
  });
});
