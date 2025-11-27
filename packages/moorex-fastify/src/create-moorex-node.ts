import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { MoorexEvent } from '@moora/moorex';
import type { MoorexNode, MoorexNodeOptions } from './types';

/**
 * 创建 MoorexNode 实例
 * 
 * @example
 * ```typescript
 * const moorex = createMoorex(definition);
 * // 配置 effects
 * moorex.subscribe(createEffectRunner(runEffect));
 * 
 * const moorexNode = createMoorexNode({
 *   moorex,
 *   handlePost: async (input, dispatch) => {
 *     const signal = JSON.parse(input);
 *     dispatch(signal);
 *     return { code: 200, content: JSON.stringify({ success: true }) };
 *   }
 * });
 * 
 * // 注册到 Fastify 应用
 * await fastify.register(moorexNode.register, { prefix: '/api/moorex' });
 * ```
 */
export const createMoorexNode = <State, Signal, Effect>(
  options: MoorexNodeOptions<State, Signal, Effect>,
): MoorexNode<State, Signal, Effect> => {
  const { moorex, handlePost } = options;

  // 注册路由的函数（作为 Fastify 插件）
  const register = async (
    fastify: FastifyInstance,
    pluginOptions: { prefix?: string } = {},
  ): Promise<void> => {
    // GET 路由：SSE 流，发送状态和事件
    // Fastify 会自动处理 prefix，所以这里直接使用 '/' 即可
    fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
      // 设置 SSE 响应头
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
      
      // 发送初始状态
      const initialState = moorex.current();
      const initialEvent: MoorexEvent<Signal, Effect, State> = {
        type: 'state-updated',
        state: initialState,
      };
      
      // 发送初始全量状态
      reply.raw.write(`data: ${JSON.stringify(initialEvent)}\n\n`);
      
      // 跟踪连接状态
      let isConnected = true;
      
      // 订阅后续事件
      const unsubscribe = moorex.subscribe((event) => {
        if (!isConnected) {
          return;
        }
        
        try {
          // 检查连接状态
          if (reply.raw.destroyed || reply.raw.closed) {
            isConnected = false;
            unsubscribe();
            return;
          }
          
          // 将事件发送给客户端
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
          // 连接可能已关闭，取消订阅
          isConnected = false;
          unsubscribe();
          fastify.log.error({ err: error }, 'Error sending SSE event');
        }
      });
      
      // 监听客户端断开连接
      const cleanup = () => {
        if (isConnected) {
          isConnected = false;
          unsubscribe();
          if (!reply.raw.destroyed && !reply.raw.closed) {
            reply.raw.end();
          }
        }
      };
      
      request.raw.on('close', cleanup);
      request.raw.on('error', cleanup);
      
      // 保持连接打开
      // 注意：Fastify 不会自动关闭 SSE 连接，需要客户端主动断开
    });
    
    // POST 路由：只有在提供了 handlePost 时才注册
    if (handlePost) {
      fastify.post('/', async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
        try {
          // 获取请求体作为字符串
          const input = typeof request.body === 'string' 
            ? request.body 
            : JSON.stringify(request.body);
          
          // 创建 dispatch 包装函数
          const dispatch = (signal: Signal) => {
            moorex.dispatch(signal);
          };
          
          // 调用 handlePost 回调
          const result = await handlePost(input, dispatch);
          
          // 设置状态码并发送响应
          reply.code(result.code).send(result.content);
        } catch (error) {
          fastify.log.error({ err: error }, 'Error handling POST request');
          reply.code(500).send(
            JSON.stringify({
              error: 'Internal server error',
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
      });
    }
  };
  
  return {
    moorex,
    register,
  };
};

