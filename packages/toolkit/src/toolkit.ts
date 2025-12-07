/**
 * Toolkit Core Implementation
 *
 * 函数式实现 Toolkit 的创建和组合
 */

import type { ToolDefinition, ToolInfo, Toolkit } from './types';

// ============================================================================
// 内部辅助函数
// ============================================================================

/**
 * 从 ToolDefinition 提取 ToolInfo（不包含 execute）
 */
const toToolInfo = (tool: ToolDefinition): ToolInfo => ({
  name: tool.name,
  description: tool.description,
  parameterSchema: tool.parameterSchema,
});

/**
 * 创建工具 Map
 */
const createToolMap = (
  tools: readonly ToolDefinition[]
): ReadonlyMap<string, ToolDefinition> => {
  const map = new Map<string, ToolDefinition>();
  for (const tool of tools) {
    if (map.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    map.set(tool.name, tool);
  }
  return map;
};

// ============================================================================
// Toolkit 构造函数
// ============================================================================

/**
 * 从 Tool 列表创建 Toolkit
 *
 * @param tools - 工具定义列表
 * @returns Toolkit 实例
 * @throws 如果存在重复的工具名称
 *
 * @example
 * ```ts
 * const toolkit = createToolkit([
 *   {
 *     name: 'add',
 *     description: 'Add two numbers',
 *     parameterSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
 *     execute: async (params) => {
 *       const { a, b } = JSON.parse(params);
 *       return JSON.stringify({ result: a + b });
 *     },
 *   },
 * ]);
 * ```
 */
export const createToolkit = (tools: readonly ToolDefinition[]): Toolkit => {
  const toolMap = createToolMap(tools);

  const getToolNames = (): readonly string[] => [...toolMap.keys()];

  const getToolInfo = (name: string): ToolInfo | undefined => {
    const tool = toolMap.get(name);
    return tool ? toToolInfo(tool) : undefined;
  };

  const getAllToolInfos = (): readonly ToolInfo[] =>
    [...toolMap.values()].map(toToolInfo);

  const invoke = async (name: string, parameters: string): Promise<string> => {
    const tool = toolMap.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(parameters);
  };

  const hasTool = (name: string): boolean => toolMap.has(name);

  return {
    getToolNames,
    getToolInfo,
    getAllToolInfos,
    invoke,
    hasTool,
  };
};

/**
 * 合并多个 Toolkit 成为一个功能更全的 Toolkit
 *
 * @param toolkits - 要合并的 Toolkit 列表
 * @returns 合并后的 Toolkit
 * @throws 如果存在重复的工具名称
 *
 * @example
 * ```ts
 * const mathToolkit = createToolkit([...]);
 * const stringToolkit = createToolkit([...]);
 * const combined = mergeToolkits([mathToolkit, stringToolkit]);
 * ```
 */
export const mergeToolkits = (toolkits: readonly Toolkit[]): Toolkit => {
  // 收集所有工具信息并检查重复
  const allToolInfos: ToolInfo[] = [];
  const invokeMap = new Map<
    string,
    (name: string, parameters: string) => Promise<string>
  >();

  for (const toolkit of toolkits) {
    const toolNames = toolkit.getToolNames();
    for (const name of toolNames) {
      if (invokeMap.has(name)) {
        throw new Error(`Duplicate tool name when merging: ${name}`);
      }
      const info = toolkit.getToolInfo(name);
      if (info) {
        allToolInfos.push(info);
        invokeMap.set(name, toolkit.invoke);
      }
    }
  }

  const getToolNames = (): readonly string[] => [...invokeMap.keys()];

  const getToolInfo = (name: string): ToolInfo | undefined =>
    allToolInfos.find((info) => info.name === name);

  const getAllToolInfos = (): readonly ToolInfo[] => [...allToolInfos];

  const invoke = async (name: string, parameters: string): Promise<string> => {
    const invoker = invokeMap.get(name);
    if (!invoker) {
      throw new Error(`Tool not found: ${name}`);
    }
    return invoker(name, parameters);
  };

  const hasTool = (name: string): boolean => invokeMap.has(name);

  return {
    getToolNames,
    getToolInfo,
    getAllToolInfos,
    invoke,
    hasTool,
  };
};

/**
 * 黑名单过滤选项
 */
export interface BlacklistOptions {
  /** 要排除的工具名称列表 */
  readonly blacklist: readonly string[];
}

/**
 * 白名单过滤选项
 */
export interface WhitelistOptions {
  /** 要保留的工具名称列表 */
  readonly whitelist: readonly string[];
}

/**
 * 过滤选项，支持黑名单或白名单模式
 */
export type FilterOptions = BlacklistOptions | WhitelistOptions;

/**
 * 类型守卫：检查是否为黑名单选项
 */
const isBlacklistOptions = (
  options: FilterOptions
): options is BlacklistOptions => 'blacklist' in options;

/**
 * 创建受限的 Toolkit
 *
 * 支持两种模式：
 * - 黑名单模式：排除指定的工具
 * - 白名单模式：只保留指定的工具
 *
 * @param toolkit - 原始 Toolkit
 * @param options - 过滤选项
 * @returns 受限后的 Toolkit
 *
 * @example
 * ```ts
 * // 黑名单模式：排除危险工具
 * const safeToolkit = restrictToolkit(fullToolkit, {
 *   blacklist: ['deleteFile', 'executeCommand'],
 * });
 *
 * // 白名单模式：只保留特定工具
 * const limitedToolkit = restrictToolkit(fullToolkit, {
 *   whitelist: ['read', 'search'],
 * });
 * ```
 */
export const restrictToolkit = (
  toolkit: Toolkit,
  options: FilterOptions
): Toolkit => {
  const originalNames = toolkit.getToolNames();

  // 计算过滤后的工具名称集合
  const allowedNames: ReadonlySet<string> = isBlacklistOptions(options)
    ? new Set(originalNames.filter((name) => !options.blacklist.includes(name)))
    : new Set(options.whitelist.filter((name) => toolkit.hasTool(name)));

  const getToolNames = (): readonly string[] => [...allowedNames];

  const getToolInfo = (name: string): ToolInfo | undefined => {
    if (!allowedNames.has(name)) {
      return undefined;
    }
    return toolkit.getToolInfo(name);
  };

  const getAllToolInfos = (): readonly ToolInfo[] =>
    [...allowedNames]
      .map((name) => toolkit.getToolInfo(name))
      .filter((info): info is ToolInfo => info !== undefined);

  const invoke = async (name: string, parameters: string): Promise<string> => {
    if (!allowedNames.has(name)) {
      throw new Error(`Tool not found or restricted: ${name}`);
    }
    return toolkit.invoke(name, parameters);
  };

  const hasTool = (name: string): boolean => allowedNames.has(name);

  return {
    getToolNames,
    getToolInfo,
    getAllToolInfos,
    invoke,
    hasTool,
  };
};

/**
 * 创建空的 Toolkit
 *
 * @returns 空的 Toolkit 实例
 *
 * @example
 * ```ts
 * const empty = emptyToolkit();
 * console.log(empty.getToolNames()); // []
 * ```
 */
export const emptyToolkit = (): Toolkit => createToolkit([]);
