import { describe, expect, it } from 'vitest';
import {
  BUDGET_BLUEPRINTS,
  MILESTONE_BLUEPRINTS,
  RISK_BLUEPRINTS,
  ROUTINE_TASK_BLUEPRINTS,
} from './dailyRoutineProgramme';

describe('Daily Routine Check client programme', () => {
  it('preserves the complete client schedule and supporting registers', () => {
    expect(ROUTINE_TASK_BLUEPRINTS).toHaveLength(93);
    expect(new Set(ROUTINE_TASK_BLUEPRINTS.map((task) => task.phase))).toHaveLength(9);
    expect(MILESTONE_BLUEPRINTS).toHaveLength(17);
    expect(BUDGET_BLUEPRINTS).toHaveLength(13);
    expect(RISK_BLUEPRINTS).toHaveLength(10);
  });

  it('has unique WBS numbers, valid programme dates, and clean text', () => {
    const wbs = ROUTINE_TASK_BLUEPRINTS.map((task) => task.wbs);
    const text = JSON.stringify(ROUTINE_TASK_BLUEPRINTS);

    expect(new Set(wbs).size).toBe(93);
    expect(Math.min(...wbs)).toBe(1);
    expect(Math.max(...wbs)).toBe(93);
    expect(ROUTINE_TASK_BLUEPRINTS.every((task) => task.plannedStart <= task.plannedFinish)).toBe(true);
    expect(text).not.toMatch(/Ã|â‚¬|Â/);
  });
});
