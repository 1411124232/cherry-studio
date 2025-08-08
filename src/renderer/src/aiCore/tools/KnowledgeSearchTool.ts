import { processKnowledgeSearch } from '@renderer/services/KnowledgeService'
import type { Assistant, KnowledgeReference } from '@renderer/types'
import { ExtractResults, KnowledgeExtractResults } from '@renderer/utils/extract'
import { type InferToolInput, type InferToolOutput, tool } from 'ai'
import { isEmpty } from 'lodash'
import { z } from 'zod'

/**
 * 知识库搜索工具
 * 使用预提取关键词，直接使用插件阶段分析的搜索意图，避免重复分析
 */
export const knowledgeSearchTool = (
  assistant: Assistant,
  extractedKeywords: KnowledgeExtractResults,
  userMessage?: string
) => {
  return tool({
    name: 'builtin_knowledge_search',
    description: `Search the knowledge base for relevant information using pre-analyzed search intent.

Pre-extracted search queries: "${extractedKeywords.question.join(', ')}"
Rewritten query: "${extractedKeywords.rewrite}"

This tool searches your knowledge base for relevant documents and returns results for easy reference. 
Call this tool to execute the search. You can optionally provide additional context to refine the search.`,

    inputSchema: z.object({
      additionalContext: z
        .string()
        .optional()
        .describe('Optional additional context or specific focus to enhance the knowledge search')
    }),

    execute: async ({ additionalContext }) => {
      try {
        // 获取助手的知识库配置
        const knowledgeBaseIds = assistant.knowledge_bases?.map((base) => base.id)
        const hasKnowledgeBase = !isEmpty(knowledgeBaseIds)
        const knowledgeRecognition = assistant.knowledgeRecognition || 'on'

        // 检查是否有知识库
        if (!hasKnowledgeBase) {
          return []
        }

        let finalQueries = [...extractedKeywords.question]
        let finalRewrite = extractedKeywords.rewrite

        if (additionalContext?.trim()) {
          // 如果大模型提供了额外上下文，使用更具体的描述
          console.log(`🔍 AI enhanced knowledge search with: ${additionalContext}`)
          const cleanContext = additionalContext.trim()
          if (cleanContext) {
            finalQueries = [cleanContext]
            finalRewrite = cleanContext
            console.log(`➕ Added additional context: ${cleanContext}`)
          }
        }

        // 检查是否需要搜索
        if (finalQueries[0] === 'not_needed') {
          return []
        }

        // 构建搜索条件
        let searchCriteria: { question: string[]; rewrite: string }

        if (knowledgeRecognition === 'off') {
          // 直接模式：使用用户消息内容
          const directContent = userMessage || finalQueries[0] || 'search'
          searchCriteria = {
            question: [directContent],
            rewrite: directContent
          }
        } else {
          // 自动模式：使用意图识别的结果
          searchCriteria = {
            question: finalQueries,
            rewrite: finalRewrite
          }
        }

        // 构建 ExtractResults 对象
        const extractResults: ExtractResults = {
          websearch: undefined,
          knowledge: searchCriteria
        }

        console.log('Knowledge search extractResults:', extractResults)

        // 执行知识库搜索
        const knowledgeReferences = await processKnowledgeSearch(extractResults, knowledgeBaseIds)

        // 返回结果数组
        return knowledgeReferences.map((ref: KnowledgeReference) => ({
          id: ref.id,
          content: ref.content,
          sourceUrl: ref.sourceUrl,
          type: ref.type,
          file: ref.file
        }))
      } catch (error) {
        console.error('🔍 [KnowledgeSearchTool] Search failed:', error)

        // 返回空数组而不是抛出错误，避免中断对话流程
        return []
      }
    }
  })
}

export type KnowledgeSearchToolInput = InferToolInput<ReturnType<typeof knowledgeSearchTool>>
export type KnowledgeSearchToolOutput = InferToolOutput<ReturnType<typeof knowledgeSearchTool>>

export default knowledgeSearchTool
