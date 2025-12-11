/**
 * Workforce 初始状态函数
 */

import { ROOT_TASK_ID } from "../types";
import type { WorkforceState, WorkforceConfig } from "./types";

/**
 * 创建初始 Workforce 状态
 *
 * @param config - Workforce 配置
 * @returns 初始状态
 */
export function initial(config: WorkforceConfig): WorkforceState {
  return {
    tasks: {},
    children: {
      [ROOT_TASK_ID]: [],
    },
    workingAgents: {},
    config,
    destroyed: false,
  };
}
