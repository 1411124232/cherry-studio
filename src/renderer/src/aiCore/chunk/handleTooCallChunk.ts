/**
 * 工具调用 Chunk 处理模块
 *
 * 提供工具调用相关的处理API，每个交互使用一个新的实例
 */

import { ToolCallUnion, ToolSet } from '@cherrystudio/ai-core/index'
import Logger from '@renderer/config/logger'
import { MCPTool, MCPToolResponse } from '@renderer/types'
import { Chunk, ChunkType } from '@renderer/types/chunk'

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
      mcpTool: MCPTool
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
    const toolCallId = chunk.toolCallId
    const toolName = chunk.toolName
    const args = chunk.input || {}

    if (!toolCallId || !toolName) {
      Logger.warn(`🔧 [ToolCallChunkHandler] Invalid tool call chunk: missing toolCallId or toolName`)
      return
    }

    // 从 chunk 信息构造 MCPTool
    // const mcpTool = this.createMcpToolFromChunk(chunk)

    // 记录活跃的工具调用
    this.activeToolCalls.set(toolCallId, {
      toolCallId,
      toolName,
      args,
      mcpTool: this.mcpTools.find((tool) => tool.name === toolName)!
    })

    // 创建 MCPToolResponse 格式
    const toolResponse: MCPToolResponse = {
      id: toolCallId,
      tool: this.activeToolCalls.get(toolCallId)!.mcpTool,
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
  public handleToolResult(chunk: any): void {
    const toolCallId = chunk.toolCallId
    const result = chunk.result

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
