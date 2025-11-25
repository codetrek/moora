import type { FastifyInstance } from 'fastify';
import type { Moorex } from '@moora/moorex';

/**
 * POST 处理函数的返回值
 */
export type PostResponse = {
  /**
   * HTTP 状态码
   */
  code: number;
  /**
   * 响应体内容（字符串）
   */
  content: string;
};

/**
 * POST 处理回调函数类型
 * 
 * @param input - POST 请求的输入（字符串格式）
 * @param dispatch - 用于分发 Signal 的函数
 * @returns HTTP 状态码和响应体
 */
export type HandlePost<Signal> = (
  input: string,
  dispatch: (signal: Signal) => void,
) => Promise<PostResponse>;

/**
 * Moorex Node 实例类型
 */
export type MoorexNode<State, Signal, Effect> = {
  /**
   * 获取底层的 Moorex 实例
   */
  moorex: Moorex<State, Signal, Effect>;
  
  /**
   * 注册 Fastify 路由（作为 Fastify 插件）
   * 
   * @example
   * ```typescript
   * await fastify.register(moorexNode.register, { prefix: '/api/moorex' });
   * // 或者不使用前缀
   * await fastify.register(moorexNode.register);
   * ```
   */
  register(
    fastify: FastifyInstance,
    options?: { prefix?: string },
  ): Promise<void>;
};

/**
 * 创建 MoorexNode 的选项
 */
export type MoorexNodeOptions<State, Signal, Effect> = {
  /**
   * 已经配置好的 Moorex 实例（包括 effects 等）
   */
  moorex: Moorex<State, Signal, Effect>;
  
  /**
   * 可选的 POST 请求处理函数
   * 如果未提供，则不会注册 POST 路由
   * 
   * @param input - POST 请求的输入（字符串格式）
   * @param dispatch - 用于分发 Signal 的函数
   * @returns HTTP 状态码和响应体
   */
  handlePost?: HandlePost<Signal>;
};
