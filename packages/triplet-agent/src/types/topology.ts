// ============================================================================
// 步骤 1：对节点 - 识别参与方
// 步骤 3：识别单向数据流 - 定义 Channel 和拓扑结构
// ============================================================================

// ============================================================================
// Participants 定义
// ============================================================================

/**
 * User 节点常量
 * 
 * 代表用户交互节点，负责：
 * - 接收用户输入（消息、操作等）
 * - 展示 Agent 的响应给用户
 */
export const USER = "user";

/**
 * Agent 节点常量
 * 
 * 代表 AI Agent 节点，负责：
 * - 处理用户消息
 * - 调用 LLM 生成响应
 * - 决定是否需要调用工具
 * - 生成最终回复
 */
export const AGENT = "agent";

/**
 * Toolkit 节点常量
 * 
 * 代表工具包节点，负责：
 * - 接收 Agent 的工具调用请求
 * - 执行具体的工具操作
 * - 返回工具执行结果
 */
export const TOOLKIT = "toolkit";

/**
 * 参与者类型
 * 
 * 所有参与交互的节点类型
 */
export type Participants = typeof USER | typeof AGENT | typeof TOOLKIT;

// ============================================================================
// Channel 常量定义
// ============================================================================

/**
 * Channel: USER -> AGENT
 * 
 * 用户发送消息给 Agent 的通道。
 * 信息流：OutputFromUser -> InputForAgent
 */
export const Channel_USER_AGENT = {
  source: USER,
  target: AGENT,
} as const;

/**
 * Channel: AGENT -> TOOLKIT
 * 
 * Agent 调用工具的通道。
 * 信息流：OutputFromAgent -> InputForToolkit
 */
export const Channel_AGENT_TOOLKIT = {
  source: AGENT,
  target: TOOLKIT,
} as const;

/**
 * Channel: TOOLKIT -> AGENT
 * 
 * Toolkit 返回工具执行结果给 Agent 的通道。
 * 信息流：OutputFromToolkit -> InputForAgent
 */
export const Channel_TOOLKIT_AGENT = {
  source: TOOLKIT,
  target: AGENT,
} as const;

/**
 * Channel: AGENT -> USER
 * 
 * Agent 发送消息给用户的通道。
 * 信息流：OutputFromAgent -> InputForUser
 */
export const Channel_AGENT_USER = {
  source: AGENT,
  target: USER,
} as const;

/**
 * Channel: USER -> USER (Loopback)
 * 
 * User 节点的自环通道，用于感知自身状态迭代。
 * 信息流：OutputFromUser -> InputForUser
 */
export const Channel_USER_USER = {
  source: USER,
  target: USER,
} as const;

/**
 * Channel: AGENT -> AGENT (Loopback)
 * 
 * Agent 节点的自环通道，用于感知自身状态迭代。
 * 信息流：OutputFromAgent -> InputForAgent
 */
export const Channel_AGENT_AGENT = {
  source: AGENT,
  target: AGENT,
} as const;

/**
 * Channel: TOOLKIT -> TOOLKIT (Loopback)
 * 
 * Toolkit 节点的自环通道，用于感知自身状态迭代。
 * 信息流：OutputFromToolkit -> InputForToolkit
 */
export const Channel_TOOLKIT_TOOLKIT = {
  source: TOOLKIT,
  target: TOOLKIT,
} as const;

// ============================================================================
// Channel 类型定义
// ============================================================================

/**
 * Channel USER -> AGENT 的类型
 */
export type ChannelUserAgent = typeof Channel_USER_AGENT;

/**
 * Channel AGENT -> TOOLKIT 的类型
 */
export type ChannelAgentToolkit = typeof Channel_AGENT_TOOLKIT;

/**
 * Channel TOOLKIT -> AGENT 的类型
 */
export type ChannelToolkitAgent = typeof Channel_TOOLKIT_AGENT;

/**
 * Channel AGENT -> USER 的类型
 */
export type ChannelAgentUser = typeof Channel_AGENT_USER;

/**
 * Channel USER -> USER (Loopback) 的类型
 */
export type ChannelUserUser = typeof Channel_USER_USER;

/**
 * Channel AGENT -> AGENT (Loopback) 的类型
 */
export type ChannelAgentAgent = typeof Channel_AGENT_AGENT;

/**
 * Channel TOOLKIT -> TOOLKIT (Loopback) 的类型
 */
export type ChannelToolkitToolkit = typeof Channel_TOOLKIT_TOOLKIT;

/**
 * 所有 Channel 的联合类型
 */
export type Channel =
  | ChannelUserAgent
  | ChannelAgentToolkit
  | ChannelToolkitAgent
  | ChannelAgentUser
  | ChannelUserUser
  | ChannelAgentAgent
  | ChannelToolkitToolkit;

// ============================================================================
// Channel 工具类型
// ============================================================================

/**
 * 从 Channel 类型推导 Source 节点类型
 */
export type ChannelSource<C extends Channel> = C["source"];

/**
 * 从 Channel 类型推导 Target 节点类型
 */
export type ChannelTarget<C extends Channel> = C["target"];

/**
 * 检查是否为有效的 Channel
 */
export function isValidChannel(
  channel: { source: Participants; target: Participants }
): channel is Channel {
  return (
    channel === Channel_USER_AGENT ||
    channel === Channel_AGENT_TOOLKIT ||
    channel === Channel_TOOLKIT_AGENT ||
    channel === Channel_AGENT_USER ||
    channel === Channel_USER_USER ||
    channel === Channel_AGENT_AGENT ||
    channel === Channel_TOOLKIT_TOOLKIT
  );
}

