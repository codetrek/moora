// ============================================================================
// 从 State 推导每个 Channel State 的函数
// ============================================================================

import type { State } from "../types/unified";
import type { Channel, StateForChannel } from "../types/unified";
import {
  Channel_USER_AGENT,
  Channel_AGENT_TOOLKIT,
  Channel_TOOLKIT_AGENT,
  Channel_AGENT_USER,
  Channel_USER_USER,
  Channel_AGENT_AGENT,
  Channel_TOOLKIT_TOOLKIT,
} from "../types/topology";

/**
 * 从 State 推导每个 Channel State 的函数
 */
export function getStateForChannel<C extends Channel>(
  state: State,
  channel: C
): StateForChannel<C> {
  if (channel === Channel_USER_AGENT) {
    return state.userAgent as StateForChannel<C>;
  }
  if (channel === Channel_AGENT_TOOLKIT) {
    return state.agentToolkit as StateForChannel<C>;
  }
  if (channel === Channel_TOOLKIT_AGENT) {
    return state.toolkitAgent as StateForChannel<C>;
  }
  if (channel === Channel_AGENT_USER) {
    return state.agentUser as StateForChannel<C>;
  }
  if (channel === Channel_USER_USER) {
    return state.userUser as StateForChannel<C>;
  }
  if (channel === Channel_AGENT_AGENT) {
    return state.agentAgent as StateForChannel<C>;
  }
  if (channel === Channel_TOOLKIT_TOOLKIT) {
    return state.toolkitToolkit as StateForChannel<C>;
  }
  throw new Error(`Unknown channel: ${channel}`);
}

