/**
 * 类型定义主入口文件
 * 
 * 重新导出所有类型定义，保持向后兼容
 */

// 导出状态相关类型
export type {
  ToolCall,
  LLMCall,
  ShortTermMemory,
  ChannelState,
  ReactLoopState,
  MemoryState,
  TaskRunnerState,
} from './task-runner-state';

export {
  ToolCallSchema,
  LLMCallSchema,
  ShortTermMemorySchema,
  ChannelStateSchema,
  ReactLoopStateSchema,
  MemoryStateSchema,
  TaskRunnerStateSchema,
} from './task-runner-state';

// 导出信号相关类型
export type {
  ChannelMessageSignal,
  ToolResultSignal,
  LLMResponseSignal,
  CreateSubTaskRunnerSignal,
  ReactLoopCompletedSignal,
  TaskRunnerSignal,
} from './task-runner-signal';

export {
  ChannelMessageSignalSchema,
  ToolResultSignalSchema,
  LLMResponseSignalSchema,
  CreateSubTaskRunnerSignalSchema,
  ReactLoopCompletedSignalSchema,
  TaskRunnerSignalSchema,
} from './task-runner-signal';

// 导出 Effect 相关类型
export type {
  SendMessageEffect,
  ReactLoopEffect,
  CallToolEffect,
  CallLLMEffect,
  TaskRunnerEffect,
} from './task-runner-effect';

export {
  SendMessageEffectSchema,
  ReactLoopEffectSchema,
  CallToolEffectSchema,
  CallLLMEffectSchema,
  TaskRunnerEffectSchema,
} from './task-runner-effect';

// 导出配置选项相关类型
export type {
  LLMCallFn,
  Tool,
  TaskRunnerOptions,
} from './task-runner-options';
