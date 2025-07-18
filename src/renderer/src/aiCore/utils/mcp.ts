import { aiSdk, Tool } from '@cherrystudio/ai-core'
// import { AiSdkTool, ToolCallResult } from '@renderer/aiCore/tools/types'
import { SYSTEM_PROMPT_THRESHOLD } from '@renderer/config/constant'
import { isFunctionCallingModel } from '@renderer/config/models'
import { MCPTool, MCPToolResponse, Model } from '@renderer/types'
import { callMCPTool } from '@renderer/utils/mcp-tools'
import { tool } from 'ai'
import { JSONSchema7 } from 'json-schema'

// Setup tools configuration based on provided parameters
export function setupToolsConfig(params: { mcpTools?: MCPTool[]; model: Model; enableToolUse?: boolean }): {
  tools: Record<string, Tool>
  useSystemPromptForTools?: boolean
} {
  const { mcpTools, model, enableToolUse } = params

  let tools: Record<string, Tool> = {}

  if (!mcpTools?.length) {
    return { tools }
  }

  tools = convertMcpToolsToAiSdkTools(mcpTools)

  if (mcpTools.length > SYSTEM_PROMPT_THRESHOLD) {
    return { tools, useSystemPromptForTools: true }
  }

  if (isFunctionCallingModel(model) && enableToolUse) {
    return { tools, useSystemPromptForTools: false }
  }

  return { tools, useSystemPromptForTools: true }
}

/**
 * 将 MCPTool 转换为 AI SDK 工具格式
 */
export function convertMcpToolsToAiSdkTools(mcpTools: MCPTool[]): Record<string, Tool> {
  const tools: Record<string, Tool> = {}

  for (const mcpTool of mcpTools) {
    console.log('mcpTool', mcpTool.inputSchema)
    tools[mcpTool.name] = tool({
      description: mcpTool.description || `Tool from ${mcpTool.serverName}`,
      inputSchema: aiSdk.jsonSchema(mcpTool.inputSchema as JSONSchema7),
      execute: async (params) => {
        console.log('execute_params', params)
        // 创建适配的 MCPToolResponse 对象
        const toolResponse: MCPToolResponse = {
          id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tool: mcpTool,
          arguments: params,
          status: 'invoking',
          toolCallId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        try {
          // 复用现有的 callMCPTool 函数
          const result = await callMCPTool(toolResponse)

          // 返回结果，AI SDK 会处理序列化
          if (result.isError) {
            throw new Error(result.content?.[0]?.text || 'Tool execution failed')
          }
          console.log('result', result)
          // 返回工具执行结果
          return result
        } catch (error) {
          console.error(`MCP Tool execution failed: ${mcpTool.name}`, error)
          throw error
        }
      }
    })
  }

  return tools
}
