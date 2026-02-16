import type { ApiClient } from '../types/api';
import { mockDiagnosis } from './diagnosis';
import { mockScore } from './score';
import { mockRoles } from './roles';
import { mockRewrite } from './rewrite';
import { mockRecheck } from './recheck';
import { randomDelay } from './delay';

// Parse-only version (no annotations)
const mockParseOnly = {
  ...mockDiagnosis,
  sections: mockDiagnosis.sections.map(s => ({ ...s, annotations: [] as typeof s.annotations })),
};

let counter = 0;

export const mockClient: ApiClient = {
  async analyze(_file) {
    await randomDelay(800, 1500);
    counter++;
    return {
      taskId: `task-${counter}-${Date.now().toString(36)}`,
      parse: mockParseOnly,
    };
  },

  async getTask(_taskId) {
    await randomDelay(200, 400);
    return {
      taskId: _taskId,
      parse: mockDiagnosis,
      scoring: mockScore,
      annotations: mockDiagnosis.sections,
      roles: null,
    };
  },

  async score(_taskId) {
    await randomDelay(1000, 2000);
    return mockScore;
  },

  async annotate(_taskId) {
    await randomDelay(2000, 3500);
    return { sections: mockDiagnosis.sections };
  },

  async getRoles(_taskId) {
    await randomDelay(1000, 2000);
    return mockRoles;
  },

  async rewrite(_taskId, _selectedRole) {
    await randomDelay(1500, 2500);
    return mockRewrite;
  },

  async recheck(_taskId, _updatedResume) {
    await randomDelay(1000, 2000);
    return mockRecheck;
  },
};
