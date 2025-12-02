// ============================================================================
// 步骤 6：最后统合去冗余 - 统合全局类型定义
// ============================================================================

import type {
  StateUserAgent,
  StateAgentToolkit,
  StateToolkitAgent,
  StateAgentUser,
  StateUserUser,
  StateAgentAgent,
  StateToolkitToolkit,
} from "./state";
import type {
  OutputFromUser,
  OutputFromAgent,
  OutputFromToolkit,
} from "./signal";
import type {
  EffectOfUser,
  EffectOfAgent,
  EffectOfToolkit,
} from "./effects";
import type {
  Channel,
  ChannelUserAgent,
  ChannelAgentToolkit,
  ChannelToolkitAgent,
  ChannelAgentUser,
  ChannelUserUser,
  ChannelAgentAgent,
  ChannelToolkitToolkit,
} from "./topology";

// ============================================================================
// 全局 State 类型（所有 Channel State 的合并）
// ============================================================================

/**
 * 全局 State 类型
 * 
 * 合并所有 Channel 的 State 类型，形成统一的全局状态。
 * 关键洞察：All Observation == All State（有向图的所有入边等于所有出边）
 */
export type State = {
  // Channel USER -> AGENT 的 State
  userAgent: StateUserAgent;
  // Channel AGENT -> TOOLKIT 的 State
  agentToolkit: StateAgentToolkit;
  // Channel TOOLKIT -> AGENT 的 State
  toolkitAgent: StateToolkitAgent;
  // Channel AGENT -> USER 的 State
  agentUser: StateAgentUser;
  // Channel USER -> USER (Loopback) 的 State
  userUser: StateUserUser;
  // Channel AGENT -> AGENT (Loopback) 的 State
  agentAgent: StateAgentAgent;
  // Channel TOOLKIT -> TOOLKIT (Loopback) 的 State
  toolkitToolkit: StateToolkitToolkit;
};

// ============================================================================
// Signal 类型（各个 Participant Output 的 union）
// ============================================================================

/**
 * Signal 类型
 * 
 * Signal 是各个 Participant Output 的 union。
 * 注意：改名为 Signal，不再是 Input。
 */
export type Signal = OutputFromUser | OutputFromAgent | OutputFromToolkit;

// ============================================================================
// Effect 类型（各个 Participant Effect 的 union）
// ============================================================================

/**
 * Effect 类型
 * 
 * Effect 是各个 Participant Effect 的 union。
 */
export type Effect = EffectOfUser | EffectOfAgent | EffectOfToolkit;

// ============================================================================
// 从 Channel 类型推导对应的 State 类型
// ============================================================================

/**
 * 从 Channel 类型推导对应的 State 类型
 */
export type StateForChannel<C extends Channel> =
  C extends ChannelUserAgent
    ? StateUserAgent
    : C extends ChannelAgentToolkit
      ? StateAgentToolkit
      : C extends ChannelToolkitAgent
        ? StateToolkitAgent
        : C extends ChannelAgentUser
          ? StateAgentUser
          : C extends ChannelUserUser
            ? StateUserUser
            : C extends ChannelAgentAgent
              ? StateAgentAgent
              : C extends ChannelToolkitToolkit
                ? StateToolkitToolkit
                : never;

// ============================================================================
// makeRunEffect 的 options 类型
// ============================================================================

import type {
  MakeRunEffectForUserOptions,
  MakeRunEffectForAgentOptions,
  MakeRunEffectForToolkitOptions,
} from "./effects";

/**
 * makeRunEffect 函数选项
 * 
 * 包含所有 Participant 需要的依赖注入选项。
 */
export type MakeRunEffectOptions = MakeRunEffectForUserOptions &
  MakeRunEffectForAgentOptions &
  MakeRunEffectForToolkitOptions;

