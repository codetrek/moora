/**
 * 主应用组件
 */

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  Chip,
} from "@mui/material";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { createSSEConnection, applyPatchesToContext } from "@/utils/sse";
import { useStreamingMessages } from "@/hooks";
import { sendMessage } from "@/utils/api";
import type { ContextOfUser } from "@/types";
import {
  rootStyles,
  appBarStyles,
  appBarIconStyles,
  appBarTitleStyles,
  errorAlertStyles,
  contentBoxStyles,
  loadingBoxStyles,
  messageCountChipStyles,
} from "@/styles/app";

function App() {
  const [context, setContext] = useState<ContextOfUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentBoxRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabledRef = useRef(true);
  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  // 使用流式消息管理 Hook
  const { messages, streamingMessageIds } = useStreamingMessages(context);

  // 检查是否在底部（使用 useCallback 确保函数引用稳定）
  const checkIfAtBottom = useCallback((): boolean => {
    const container = contentBoxRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // 允许 50px 的误差范围
    const threshold = 50;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // 监听滚动事件，检测用户滚动开始和结束
  useEffect(() => {
    const container = contentBoxRef.current;
    if (!container) return;

    // 处理滚动结束
    const handleScrollEnd = () => {
      // 滚动结束后，检查是否在底部
      if (checkIfAtBottom()) {
        // 如果在底部，恢复自动滚动
        autoScrollEnabledRef.current = true;
      }
    };

    // 用户滚动开始：立即停止自动滚动
    const handleUserScrollStart = () => {
      // 用户主动滚动时，无论当前是什么状态，都要关闭自动滚动
      autoScrollEnabledRef.current = false;
      // 重置程序滚动标志，因为用户已经开始控制了
      isProgrammaticScrollRef.current = false;

      // 清除之前的定时器
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
    };

    // 滚动中：重置滚动结束定时器，并检查是否滚动到底部
    const handleScroll = () => {
      // 如果是程序自动滚动，不处理
      if (isProgrammaticScrollRef.current) {
        return;
      }

      // 如果滚动到底部，立即恢复自动滚动
      if (checkIfAtBottom()) {
        autoScrollEnabledRef.current = true;
        // 清除定时器，因为已经恢复自动滚动了
        if (scrollEndTimerRef.current) {
          clearTimeout(scrollEndTimerRef.current);
          scrollEndTimerRef.current = null;
        }
        return;
      }

      // 清除之前的定时器
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }

      // 设置新的定时器，在滚动停止后检查位置
      scrollEndTimerRef.current = setTimeout(() => {
        handleScrollEnd();
      }, 150); // 150ms 无滚动后认为滚动结束
    };

    // 监听各种用户滚动开始事件
    const handleWheel = () => {
      handleUserScrollStart();
    };

    const handleTouchStart = () => {
      handleUserScrollStart();
    };

    const handleMouseDown = () => {
      // 鼠标按下滚动条或滚动区域时
      handleUserScrollStart();
    };

    // 监听滚动事件
    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("mousedown", handleMouseDown);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("mousedown", handleMouseDown);
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, [checkIfAtBottom]);

  // 自动滚动到底部（仅在自动滚动启用时）
  useEffect(() => {
    // 如果自动滚动被禁用，不执行滚动
    if (!autoScrollEnabledRef.current) {
      return;
    }

    // 检查当前是否在底部
    if (checkIfAtBottom()) {
      // 标记为程序自动滚动
      isProgrammaticScrollRef.current = true;
      
      // 使用 requestAnimationFrame 确保在下一帧执行滚动
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        
        // 滚动完成后重置标志（使用 setTimeout 确保滚动动画完成）
        // smooth 滚动通常需要 300-500ms，设置稍长一点确保完成
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 600);
      });
    }
  }, [messages, checkIfAtBottom]);

  useEffect(() => {
    let closeConnection: (() => void) | null = null;

    const connectSSE = () => {
      try {
        closeConnection = createSSEConnection(
          "/api/agent",
          (data: ContextOfUser) => {
            // 全量数据更新
            setContext(data);
            setLoading(false);
            setError(null);
          },
          (patches) => {
            // Patch 更新
            setContext((prevContext) => {
              if (!prevContext) {
                return prevContext;
              }
              return applyPatchesToContext(prevContext, patches);
            });
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "连接失败");
        setLoading(false);
      }
    };

    connectSSE();

    return () => {
      if (closeConnection) {
        closeConnection();
      }
    };
  }, []);

  const handleSend = async (content: string) => {
    setSending(true);
    setError(null);

    // 用户发送消息时，恢复自动滚动，确保滚动到底部
    autoScrollEnabledRef.current = true;

    try {
      await sendMessage(content);
      // 消息发送后，SSE 会推送更新，这里不需要手动更新
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送消息失败");
    } finally {
      setSending(false);
    }
  };

  // 初始加载时滚动到底部
  useEffect(() => {
    if (!loading && messages.length > 0) {
      autoScrollEnabledRef.current = true;
      isProgrammaticScrollRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 100);
    }
  }, [loading, messages.length]);

  return (
    <Box sx={rootStyles}>
      <AppBar position="static" elevation={1} sx={appBarStyles}>
        <Toolbar>
          <Box
            component="img"
            src="/moorex.svg"
            alt="Moorex Logo"
            sx={{
              ...appBarIconStyles,
              width: 32,
              height: 32,
            }}
          />
          <Typography variant="h6" component="h1" sx={appBarTitleStyles}>
            Agent WebUI
          </Typography>
          {!loading && (
            <Chip
              label={`${messages.length} 条消息`}
              size="small"
              sx={messageCountChipStyles}
            />
          )}
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" sx={errorAlertStyles} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box ref={contentBoxRef} sx={contentBoxStyles}>
        {loading ? (
          <Box sx={loadingBoxStyles}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">
              正在连接...
            </Typography>
          </Box>
        ) : (
          <>
            <MessageList messages={messages} streamingMessageIds={streamingMessageIds} />
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      <MessageInput onSend={handleSend} disabled={sending || loading} />
    </Box>
  );
}

export default App;

