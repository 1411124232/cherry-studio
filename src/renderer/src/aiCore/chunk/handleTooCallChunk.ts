/**
 * 工具调用 Chunk 处理模块
 * TODO: Tool包含了providerTool和普通的Tool还有MCPTool,后面需要重构
 * 提供工具调用相关的处理API，每个交互使用一个新的实例
 */

import { ToolCallUnion, ToolResultUnion, ToolSet } from '@cherrystudio/ai-core/index'
import Logger from '@renderer/config/logger'
import { MCPTool, MCPToolResponse } from '@renderer/types'
import { Chunk, ChunkType } from '@renderer/types/chunk'
// import type {
//   AnthropicSearchOutput,
//   WebSearchPluginConfig
// } from '@cherrystudio/ai-core/core/plugins/built-in/webSearchPlugin'

// 为 Provider 执行的工具创建一个通用类型
// 这避免了污染 MCPTool 的定义，同时提供了 UI 显示所需的基本信息
type GenericProviderTool = {
  name: string
  description: string
  type: 'provider'
}
/**
 * 工具调用处理器类
 */
export class ToolCallChunkHandler {
  //   private onChunk: (chunk: Chunk) => void
  private activeToolCalls = new Map<
    string,
    {
      toolCallId: string
      toolName: string
      args: any
      // mcpTool 现在可以是 MCPTool 或我们为 Provider 工具创建的通用类型
      mcpTool: MCPTool | GenericProviderTool
    }
  >()
  constructor(
    private onChunk: (chunk: Chunk) => void,
    private mcpTools: MCPTool[]
  ) {}

  //   /**
  //    * 设置 onChunk 回调
  //    */
  //   public setOnChunk(callback: (chunk: Chunk) => void): void {
  //     this.onChunk = callback
  //   }

  /**
   * 处理工具调用事件
   */
  public handleToolCall(
    chunk: {
      type: 'tool-call'
    } & ToolCallUnion<ToolSet>
  ): void {
    const { toolCallId, toolName, input: args, providerExecuted } = chunk

    if (!toolCallId || !toolName) {
      Logger.warn(`🔧 [ToolCallChunkHandler] Invalid tool call chunk: missing toolCallId or toolName`)
      return
    }

    let tool: MCPTool | GenericProviderTool

    // 根据 providerExecuted 标志区分处理逻辑
    if (providerExecuted) {
      // 如果是 Provider 执行的工具（如 web_search）
      Logger.info(`[ToolCallChunkHandler] Handling provider-executed tool: ${toolName}`)
      tool = {
        name: toolName,
        description: toolName,
        type: 'provider'
      }
    } else {
      // 如果是客户端执行的 MCP 工具，沿用现有逻辑
      Logger.info(`[ToolCallChunkHandler] Handling client-side MCP tool: ${toolName}`)
      const mcpTool = this.mcpTools.find((t) => t.name === toolName)
      if (!mcpTool) {
        Logger.warn(`[ToolCallChunkHandler] MCP tool not found: ${toolName}`)
        return
      }
      tool = mcpTool
    }

    // 记录活跃的工具调用
    this.activeToolCalls.set(toolCallId, {
      toolCallId,
      toolName,
      args,
      mcpTool: tool
    })

    // 创建 MCPToolResponse 格式
    const toolResponse: MCPToolResponse = {
      id: toolCallId,
      tool: tool,
      arguments: args,
      status: 'invoking',
      toolCallId: toolCallId
    }

    // 调用 onChunk
    if (this.onChunk) {
      this.onChunk({
        type: ChunkType.MCP_TOOL_IN_PROGRESS,
        responses: [toolResponse]
      })
    }
  }

  /**
   * 处理工具调用结果事件
   */
  public handleToolResult(
    chunk: {
      type: 'tool-result'
    } & ToolResultUnion<ToolSet>
  ): void {
    const toolCallId = chunk.toolCallId
    const result = chunk.output

    if (!toolCallId) {
      Logger.warn(`🔧 [ToolCallChunkHandler] Invalid tool result chunk: missing toolCallId`)
      return
    }

    // 查找对应的工具调用信息
    const toolCallInfo = this.activeToolCalls.get(toolCallId)
    if (!toolCallInfo) {
      Logger.warn(`🔧 [ToolCallChunkHandler] Tool call info not found for ID: ${toolCallId}`)
      return
    }

    // 创建工具调用结果的 MCPToolResponse 格式
    const toolResponse: MCPToolResponse = {
      id: toolCallId,
      tool: toolCallInfo.mcpTool,
      arguments: toolCallInfo.args,
      status: 'done',
      response: {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ],
        isError: false
      },
      toolCallId: toolCallId
    }
    // 从活跃调用中移除（交互结束后整个实例会被丢弃）
    this.activeToolCalls.delete(toolCallId)

    // 调用 onChunk
    if (this.onChunk) {
      this.onChunk({
        type: ChunkType.MCP_TOOL_COMPLETE,
        responses: [toolResponse]
      })
    }
  }
}
