/**
 * Tool Definition Types
 *
 * 定义 Tool 和 Toolkit 的核心类型
 */

/**
 * Tool 执行函数类型
 * 接收 JSON 字符串参数，返回 JSON 字符串结果
 */
export type ToolExecuteFn = (parameters: string) => Promise<string>;

/**
 * Tool 定义
 * 包含工具的名称、描述、参数 schema 和执行函数
 */
export interface ToolDefinition {
  /** 工具名称，必须唯一 */
  readonly name: string;
  /** 工具描述 */
  readonly description: string;
  /** 参数的 JSON Schema */
  readonly parameterSchema: Record<string, unknown>;
  /** 执行函数 */
  readonly execute: ToolExecuteFn;
}

/**
 * Tool 详情（不包含执行函数）
 * 用于查询工具信息时返回
 */
export interface ToolInfo {
  /** 工具名称 */
  readonly name: string;
  /** 工具描述 */
  readonly description: string;
  /** 参数的 JSON Schema */
  readonly parameterSchema: Record<string, unknown>;
}

/**
 * Toolkit 接口
 * 提供工具集的管理和调用能力
 */
export interface Toolkit {
  /**
   * 获取所有工具名称列表
   */
  readonly getToolNames: () => readonly string[];

  /**
   * 根据名称获取工具详情
   * @param name - 工具名称
   * @returns 工具详情，如果不存在则返回 undefined
   */
  readonly getToolInfo: (name: string) => ToolInfo | undefined;

  /**
   * 获取所有工具的详情列表
   */
  readonly getAllToolInfos: () => readonly ToolInfo[];

  /**
   * 调用工具
   * @param name - 工具名称
   * @param parameters - JSON 字符串格式的参数
   * @returns 执行结果的 JSON 字符串
   * @throws 如果工具不存在则抛出错误
   */
  readonly invoke: (name: string, parameters: string) => Promise<string>;

  /**
   * 检查工具是否存在
   * @param name - 工具名称
   */
  readonly hasTool: (name: string) => boolean;
}
