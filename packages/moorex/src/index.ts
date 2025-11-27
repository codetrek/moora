/**
 * @moora/moorex
 *
 * Moorex 是一个异步 Moore 状态机运行时，用于管理状态和协调副作用（effects）。
 * 它特别适合需要持久化的 AI 代理，能够在崩溃、重启或迁移后安全地恢复未完成的 LLM 交互和工具执行。
 *
 * @packageDocumentation
 */

// ============================================================================
// 导出所有类型
// ============================================================================
export type {
  // 基础类型
  CancelFn,
  Unsubscribe,
  // PubSub 相关
  PubSub,
  // 状态机相关
  Dispatch,
  Procedure,
  OutputHandler,
  Subscribe,
  Transferer,
  StatefulTransferer,
  Initial,
  Transition,
  StateMachine,
  MealyMachine,
  MooreMachine,
  UpdatePack,
  // Moorex 相关
  EffectsAt,
  EffectController,
  MoorexDefinition,
  MoorexEvent,
  Moorex,
} from './types';

// ============================================================================
// 导出函数
// ============================================================================
export { createPubSub } from './pub-sub';
export { createMoorex } from './moorex';
export {
  machine,
  mealy,
  moore,
} from './state-machines';