import { describe, it, expect, vi } from 'vitest';
import {
  createToolkit,
  mergeToolkits,
  restrictToolkit,
  emptyToolkit,
  type ToolDefinition,
} from '../src';

// ============================================================================
// Test Utilities
// ============================================================================

const createMockTool = (name: string, description?: string): ToolDefinition => ({
  name,
  description: description ?? `Description for ${name}`,
  parameterSchema: {
    type: 'object',
    properties: {
      input: { type: 'string' },
    },
  },
  execute: vi.fn(async (params) => {
    const parsed = JSON.parse(params);
    return JSON.stringify({ result: `${name}: ${parsed.input}` });
  }),
});

// ============================================================================
// createToolkit Tests
// ============================================================================

describe('createToolkit', () => {
  it('should create a toolkit from tool definitions', () => {
    const tools = [createMockTool('tool1'), createMockTool('tool2')];
    const toolkit = createToolkit(tools);

    expect(toolkit.getToolNames()).toEqual(['tool1', 'tool2']);
  });

  it('should throw error for duplicate tool names', () => {
    const tools = [createMockTool('tool1'), createMockTool('tool1')];

    expect(() => createToolkit(tools)).toThrow('Duplicate tool name: tool1');
  });

  it('should return tool info by name', () => {
    const tools = [
      {
        name: 'add',
        description: 'Add numbers',
        parameterSchema: { type: 'object' },
        execute: async () => '{}',
      },
    ];
    const toolkit = createToolkit(tools);

    const info = toolkit.getToolInfo('add');
    expect(info).toEqual({
      name: 'add',
      description: 'Add numbers',
      parameterSchema: { type: 'object' },
    });
  });

  it('should return undefined for non-existent tool', () => {
    const toolkit = createToolkit([createMockTool('tool1')]);

    expect(toolkit.getToolInfo('nonexistent')).toBeUndefined();
  });

  it('should return all tool infos', () => {
    const tools = [createMockTool('tool1'), createMockTool('tool2')];
    const toolkit = createToolkit(tools);

    const infos = toolkit.getAllToolInfos();
    expect(infos).toHaveLength(2);
    expect(infos[0]?.name).toBe('tool1');
    expect(infos[1]?.name).toBe('tool2');
  });

  it('should invoke tool with parameters', async () => {
    const tools = [createMockTool('tool1')];
    const toolkit = createToolkit(tools);

    const result = await toolkit.invoke('tool1', '{"input":"hello"}');
    expect(JSON.parse(result)).toEqual({ result: 'tool1: hello' });
  });

  it('should throw error when invoking non-existent tool', async () => {
    const toolkit = createToolkit([createMockTool('tool1')]);

    await expect(toolkit.invoke('nonexistent', '{}')).rejects.toThrow(
      'Tool not found: nonexistent'
    );
  });

  it('should check if tool exists', () => {
    const toolkit = createToolkit([createMockTool('tool1')]);

    expect(toolkit.hasTool('tool1')).toBe(true);
    expect(toolkit.hasTool('nonexistent')).toBe(false);
  });
});

// ============================================================================
// mergeToolkits Tests
// ============================================================================

describe('mergeToolkits', () => {
  it('should merge multiple toolkits', () => {
    const toolkit1 = createToolkit([createMockTool('tool1')]);
    const toolkit2 = createToolkit([createMockTool('tool2')]);

    const merged = mergeToolkits([toolkit1, toolkit2]);

    expect(merged.getToolNames()).toEqual(['tool1', 'tool2']);
  });

  it('should throw error for duplicate tool names when merging', () => {
    const toolkit1 = createToolkit([createMockTool('tool1')]);
    const toolkit2 = createToolkit([createMockTool('tool1')]);

    expect(() => mergeToolkits([toolkit1, toolkit2])).toThrow(
      'Duplicate tool name when merging: tool1'
    );
  });

  it('should invoke tools from merged toolkit', async () => {
    const toolkit1 = createToolkit([createMockTool('tool1')]);
    const toolkit2 = createToolkit([createMockTool('tool2')]);

    const merged = mergeToolkits([toolkit1, toolkit2]);

    const result1 = await merged.invoke('tool1', '{"input":"a"}');
    const result2 = await merged.invoke('tool2', '{"input":"b"}');

    expect(JSON.parse(result1)).toEqual({ result: 'tool1: a' });
    expect(JSON.parse(result2)).toEqual({ result: 'tool2: b' });
  });

  it('should handle empty merge', () => {
    const merged = mergeToolkits([]);

    expect(merged.getToolNames()).toEqual([]);
  });

  it('should merge with empty toolkit', () => {
    const toolkit1 = createToolkit([createMockTool('tool1')]);
    const empty = emptyToolkit();

    const merged = mergeToolkits([toolkit1, empty]);

    expect(merged.getToolNames()).toEqual(['tool1']);
  });
});

// ============================================================================
// restrictToolkit Tests
// ============================================================================

describe('restrictToolkit', () => {
  describe('blacklist mode', () => {
    it('should exclude tools in blacklist', () => {
      const toolkit = createToolkit([
        createMockTool('tool1'),
        createMockTool('tool2'),
        createMockTool('tool3'),
      ]);

      const restricted = restrictToolkit(toolkit, {
        blacklist: ['tool2'],
      });

      expect(restricted.getToolNames()).toEqual(['tool1', 'tool3']);
    });

    it('should not invoke blacklisted tools', async () => {
      const toolkit = createToolkit([
        createMockTool('tool1'),
        createMockTool('tool2'),
      ]);

      const restricted = restrictToolkit(toolkit, {
        blacklist: ['tool2'],
      });

      await expect(restricted.invoke('tool2', '{}')).rejects.toThrow(
        'Tool not found or restricted: tool2'
      );
    });

    it('should return undefined for blacklisted tool info', () => {
      const toolkit = createToolkit([createMockTool('tool1')]);

      const restricted = restrictToolkit(toolkit, {
        blacklist: ['tool1'],
      });

      expect(restricted.getToolInfo('tool1')).toBeUndefined();
    });

    it('should handle non-existent tools in blacklist', () => {
      const toolkit = createToolkit([createMockTool('tool1')]);

      const restricted = restrictToolkit(toolkit, {
        blacklist: ['nonexistent'],
      });

      expect(restricted.getToolNames()).toEqual(['tool1']);
    });
  });

  describe('whitelist mode', () => {
    it('should only include tools in whitelist', () => {
      const toolkit = createToolkit([
        createMockTool('tool1'),
        createMockTool('tool2'),
        createMockTool('tool3'),
      ]);

      const restricted = restrictToolkit(toolkit, {
        whitelist: ['tool1', 'tool3'],
      });

      expect(restricted.getToolNames()).toEqual(['tool1', 'tool3']);
    });

    it('should invoke whitelisted tools', async () => {
      const toolkit = createToolkit([
        createMockTool('tool1'),
        createMockTool('tool2'),
      ]);

      const restricted = restrictToolkit(toolkit, {
        whitelist: ['tool1'],
      });

      const result = await restricted.invoke('tool1', '{"input":"test"}');
      expect(JSON.parse(result)).toEqual({ result: 'tool1: test' });
    });

    it('should not invoke non-whitelisted tools', async () => {
      const toolkit = createToolkit([
        createMockTool('tool1'),
        createMockTool('tool2'),
      ]);

      const restricted = restrictToolkit(toolkit, {
        whitelist: ['tool1'],
      });

      await expect(restricted.invoke('tool2', '{}')).rejects.toThrow(
        'Tool not found or restricted: tool2'
      );
    });

    it('should handle non-existent tools in whitelist', () => {
      const toolkit = createToolkit([createMockTool('tool1')]);

      const restricted = restrictToolkit(toolkit, {
        whitelist: ['tool1', 'nonexistent'],
      });

      expect(restricted.getToolNames()).toEqual(['tool1']);
    });
  });

  it('should report hasTool correctly after restriction', () => {
    const toolkit = createToolkit([
      createMockTool('tool1'),
      createMockTool('tool2'),
    ]);

    const restricted = restrictToolkit(toolkit, {
      blacklist: ['tool2'],
    });

    expect(restricted.hasTool('tool1')).toBe(true);
    expect(restricted.hasTool('tool2')).toBe(false);
  });

  it('should return correct getAllToolInfos after restriction', () => {
    const toolkit = createToolkit([
      createMockTool('tool1'),
      createMockTool('tool2'),
      createMockTool('tool3'),
    ]);

    const restricted = restrictToolkit(toolkit, {
      whitelist: ['tool1', 'tool3'],
    });

    const infos = restricted.getAllToolInfos();
    expect(infos).toHaveLength(2);
    expect(infos.map((i) => i.name)).toEqual(['tool1', 'tool3']);
  });
});

// ============================================================================
// emptyToolkit Tests
// ============================================================================

describe('emptyToolkit', () => {
  it('should create an empty toolkit', () => {
    const toolkit = emptyToolkit();

    expect(toolkit.getToolNames()).toEqual([]);
    expect(toolkit.getAllToolInfos()).toEqual([]);
  });

  it('should return undefined for any tool info', () => {
    const toolkit = emptyToolkit();

    expect(toolkit.getToolInfo('any')).toBeUndefined();
  });

  it('should throw when invoking any tool', async () => {
    const toolkit = emptyToolkit();

    await expect(toolkit.invoke('any', '{}')).rejects.toThrow(
      'Tool not found: any'
    );
  });

  it('should report hasTool as false for any tool', () => {
    const toolkit = emptyToolkit();

    expect(toolkit.hasTool('any')).toBe(false);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration', () => {
  it('should support complex tool with async execution', async () => {
    const asyncTool: ToolDefinition = {
      name: 'fetchData',
      description: 'Fetches data asynchronously',
      parameterSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        },
        required: ['url'],
      },
      execute: async (params) => {
        const { url } = JSON.parse(params);
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return JSON.stringify({ data: `Response from ${url}` });
      },
    };

    const toolkit = createToolkit([asyncTool]);
    const result = await toolkit.invoke(
      'fetchData',
      '{"url":"https://example.com"}'
    );

    expect(JSON.parse(result)).toEqual({
      data: 'Response from https://example.com',
    });
  });

  it('should chain operations: create, merge, restrict', async () => {
    // Create two toolkits
    const mathToolkit = createToolkit([
      createMockTool('add'),
      createMockTool('subtract'),
    ]);
    const stringToolkit = createToolkit([
      createMockTool('concat'),
      createMockTool('split'),
    ]);

    // Merge them
    const merged = mergeToolkits([mathToolkit, stringToolkit]);
    expect(merged.getToolNames()).toHaveLength(4);

    // Restrict the merged toolkit
    const restricted = restrictToolkit(merged, {
      blacklist: ['subtract', 'split'],
    });

    expect(restricted.getToolNames()).toEqual(['add', 'concat']);
    expect(restricted.hasTool('subtract')).toBe(false);
    expect(restricted.hasTool('add')).toBe(true);
  });
});
