import { type Immutable } from 'mutative';
import type { Moorex, MoorexEvent, EffectInitializer, CancelFn } from './types';

/**
 * 运行中的 Effect
 */
type RunningEffect<Effect> = {
  key: string;
  effect: Immutable<Effect>;
  complete: Promise<void>;
  cancel: CancelFn;
};

/**
 * 创建一个 Effect Runner
 * 
 * Effect Runner 监听 Moorex 的 effect-started 和 effect-canceled 事件，
 * 并根据这些事件执行或取消 effects。
 * 
 * @example
 * ```typescript
 * const moorex = createMoorex(definition);
 * 
 * const runEffect = (effect, state, key) => ({
 *   start: async (dispatch) => {
 *     // 执行 effect
 *     await doSomething();
 *     // 可以 dispatch 新的信号
 *     dispatch(someSignal);
 *   },
 *   cancel: () => {
 *     // 取消 effect
 *   }
 * });
 * 
 * createEffectRunner(runEffect)(event, moorex);
 * // 或者直接作为订阅处理器
 * moorex.subscribe(createEffectRunner(runEffect));
 * ```
 * 
 * @template State - 机器的状态类型
 * @template Signal - 信号类型
 * @template Effect - Effect 类型
 * @param runEffect - 运行 effect 的函数
 * @param onError - 可选的错误处理函数
 * @returns 事件处理器函数
 */
export const createEffectRunner = <State, Signal, Effect>(
  runEffect: (
    effect: Immutable<Effect>,
    state: Immutable<State>,
    key: string,
  ) => EffectInitializer<Signal>,
  onError?: (effect: Immutable<Effect>, error: unknown) => void,
) => {
  const running = new Map<string, RunningEffect<Effect>>();

  const startEffect = (
    effect: Immutable<Effect>,
    key: string,
    moorex: Moorex<State, Signal, Effect>,
  ) => {
    try {
      const state = moorex.getState();
      const initializer = runEffect(effect, state, key);

      const entry: RunningEffect<Effect> = {
        key,
        effect,
        complete: Promise.resolve(), // 临时值，会在下面更新
        cancel: initializer.cancel,
      };
      running.set(key, entry);

      // 创建一个受保护的 dispatch，确保在 effect 被取消后不能再 dispatch
      const guardedDispatch = (signal: Immutable<Signal>) => {
        if (running.get(key) === entry) {
          moorex.dispatch(signal);
        }
      };

      entry.complete = Promise.resolve(initializer.start(guardedDispatch)).then(
        () => {
          // Effect 成功完成，从运行中移除
          // 检查是否还在 running 中：如果 effect 在完成前被取消，
          // cancelEffect 已经删除了它，这里就不应该再操作
          if (running.get(key) === entry) {
            running.delete(key);
          }
        },
        (error) => {
          // Effect 失败，从运行中移除
          // 同样需要检查：effect 可能在失败前已被取消
          if (running.get(key) === entry) {
            running.delete(key);
          }
          if (onError) {
            onError(effect, error);
          }
        },
      );
    } catch (error) {
      if (onError) {
        onError(effect, error);
      }
    }
  };

  const cancelEffect = (key: string) => {
    const entry = running.get(key);
    // moorex 保证只会取消存在的 effect，所以 entry 一定存在
    // 但为了类型安全，我们还是做检查
    if (!entry) return;

    running.delete(key);
    try {
      entry.cancel();
    } catch (error) {
      if (onError) {
        onError(entry.effect, error);
      }
    }
  };

  return (event: MoorexEvent<State, Signal, Effect>, moorex: Moorex<State, Signal, Effect>) => {
    if (event.type === 'effect-started') {
      startEffect(event.effect, event.key, moorex);
    } else if (event.type === 'effect-canceled') {
      cancelEffect(event.key);
    }
  };
};

