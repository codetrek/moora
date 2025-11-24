import { create } from 'mutative';
import type { CancelFn } from './types';

/**
 * 创建事件发射器
 *
 * @template Event - 事件类型
 * @template Context - 上下文类型
 * @returns 事件发射器对象，包含 emit 和 subscribe 方法
 */
export const createEventEmitter = <Event, Context = void>() => {
  const handlers = new Set<(event: Event, context: Context) => void>();

  const emit = (event: Event, context: Context) => {
    const immutableEvent = create(event, () => {});
    for (const handler of handlers) {
      handler(immutableEvent, context);
    }
  };

  const subscribe = (handler: (event: Event, context: Context) => void): CancelFn => {
    handlers.add(handler);
    return () => handlers.delete(handler);
  };

  return { emit, subscribe };
};

