// 重新导出类型，保持向后兼容
export type {
  MoorexDefinition,
  MoorexEvent,
  Moorex,
  CancelFn,
  EffectInitializer,
} from './types';

// 导出新的类型
export type {
  AutomataDefinition,
  Automata,
  EffectsAt,
  RunEffect,
  EffectController,
  EffectControllerStatus,
  EffectEvent,
} from './types';

// 导出 pubsub
export type { PubSub } from './pubsub';
export { createPubSub, createStreamFromPubSub } from './pubsub';

// 导出主要函数
export { createMoorex } from './create-moorex';
export { createEffectRunner } from './effect-runner';

// 导出新的函数
export { createAutomata } from './create-automata';
export { createMooreEffectController } from './create-effect-controller';
