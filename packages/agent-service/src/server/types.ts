/**
 * Server 模块类型定义
 */

/**
 * 创建服务的选项
 */
export type CreateServiceOptions = {
  /**
   * OpenAI 配置
   */
  openai: {
    endpoint: {
      url: string;
      key: string;
    };
    model: string;
  };

  /**
   * System prompt
   */
  prompt: string;
};
