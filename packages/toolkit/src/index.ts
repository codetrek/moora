/**
 * @moora/toolkit
 *
 * 函数式 Toolkit 系统，用于管理工具定义和调用。
 *
 * 提供以下核心能力：
 * 1. 构造 Toolkit
 *    - 从 Tool 列表创建 Toolkit
 *    - 合并多个 Toolkit
 *    - 通过黑名单/白名单过滤创建受限 Toolkit
 * 2. 调用工具
 * 3. 查询工具列表
 * 4. 查询工具详情
 *
 * @packageDocumentation
 */

// ============================================================================
// 导出类型
// ============================================================================
export type {
  ToolDefinition,
  ToolExecuteFn,
  ToolInfo,
  Toolkit,
} from './types';

export type {
  BlacklistOptions,
  WhitelistOptions,
  FilterOptions,
} from './toolkit';

// ============================================================================
// 导出函数
// ============================================================================
export {
  createToolkit,
  mergeToolkits,
  restrictToolkit,
  emptyToolkit,
} from './toolkit';
