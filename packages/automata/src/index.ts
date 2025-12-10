/**
 * @moora/automata
 *
 * Automata 是一个通用的自动机库，用于构建状态机（Mealy 机和 Moore 机）。
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
  // 自动机相关
  Dispatch,
  OutputHandler,
  SubscribeOutput,
  Transferer,
  StatefulTransferer,
  InitialFn,
  TransitionFn,
  AutomataOutputFn,
  MealyOutputFn,
  MooreOutputFn,
  StateMachine,
  MealyMachine,
  MooreMachine,
  StateTransition,
  UpdatePack,
} from './types';

// 从 @moora/pub-sub 重新导出 PubSub 相关类型
export type {
  Subscribe,
  Publish,
  PubSub,
} from '@moora/pub-sub';

// ============================================================================
// 导出函数
// ============================================================================
// 从 @moora/pub-sub 重新导出 createPubSub
export { createPubSub } from '@moora/pub-sub';
export {
  automata,
  mealy,
  moore,
} from './automata';
