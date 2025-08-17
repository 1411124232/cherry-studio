/* eslint-disable @eslint-react/naming-convention/context-name */
import { ImageModelV2 } from '@ai-sdk/provider'
import { LanguageModel } from 'ai'

import { type AiPlugin, createContext, PluginManager } from '../plugins'
import { isProviderSupported } from '../providers/registry'
import { type ProviderId, type ProviderSettingsMap } from '../providers/types'

/**
 * 插件增强的 AI 客户端
 * 专注于插件处理，不暴露用户API
 */
export class PluginEngine<T extends ProviderId = ProviderId> {
  private pluginManager: PluginManager

  constructor(
    private readonly providerId: T,
    // private readonly options: ProviderSettingsMap[T],
    plugins: AiPlugin[] = []
  ) {
    this.pluginManager = new PluginManager(plugins)
  }

  /**
   * 添加插件
   */
  use(plugin: AiPlugin): this {
    this.pluginManager.use(plugin)
    return this
  }

  /**
   * 批量添加插件
   */
  usePlugins(plugins: AiPlugin[]): this {
    plugins.forEach((plugin) => this.use(plugin))
    return this
  }

  /**
   * 移除插件
   */
  removePlugin(pluginName: string): this {
    this.pluginManager.remove(pluginName)
    return this
  }

  /**
   * 获取插件统计
   */
  getPluginStats() {
    return this.pluginManager.getStats()
  }

  /**
   * 获取所有插件
   */
  getPlugins() {
    return this.pluginManager.getPlugins()
  }

  /**
   * 执行带插件的操作（非流式）
   * 提供给AiExecutor使用
   */
  async executeWithPlugins<TParams, TResult>(
    methodName: string,
    modelId: string,
    params: TParams,
    executor: (model: LanguageModel, transformedParams: TParams) => Promise<TResult>,
    _context?: ReturnType<typeof createContext>
  ): Promise<TResult> {
    // 使用正确的createContext创建请求上下文
    const context = _context ? _context : createContext(this.providerId, modelId, params)

    // 🔥 为上下文添加递归调用能力
    context.recursiveCall = async (newParams: any): Promise<TResult> => {
      // 递归调用自身，重新走完整的插件流程
      context.isRecursiveCall = true
      const result = await this.executeWithPlugins(methodName, modelId, newParams, executor, context)
      context.isRecursiveCall = false
      return result
    }

    try {
      // 0. 配置上下文
      await this.pluginManager.executeConfigureContext(context)

      // 1. 触发请求开始事件
      await this.pluginManager.executeParallel('onRequestStart', context)

      // 2. 解析模型
      const model = await this.pluginManager.executeFirst<LanguageModel>('resolveModel', modelId, context)
      if (!model) {
        throw new Error(`Failed to resolve model: ${modelId}`)
      }

      // 3. 转换请求参数
      const transformedParams = await this.pluginManager.executeSequential('transformParams', params, context)

      // 4. 执行具体的 API 调用
      const result = await executor(model, transformedParams)

      // 5. 转换结果（对于非流式调用）
      const transformedResult = await this.pluginManager.executeSequential('transformResult', result, context)

      // 6. 触发完成事件
      await this.pluginManager.executeParallel('onRequestEnd', context, transformedResult)

      return transformedResult
    } catch (error) {
      // 7. 触发错误事件
      await this.pluginManager.executeParallel('onError', context, undefined, error as Error)
      throw error
    }
  }

  /**
   * 执行带插件的图像生成操作
   * 提供给AiExecutor使用
   */
  async executeImageWithPlugins<TParams, TResult>(
    methodName: string,
    modelId: string,
    params: TParams,
    executor: (model: ImageModelV2, transformedParams: TParams) => Promise<TResult>,
    _context?: ReturnType<typeof createContext>
  ): Promise<TResult> {
    // 使用正确的createContext创建请求上下文
    const context = _context ? _context : createContext(this.providerId, modelId, params)

    // 🔥 为上下文添加递归调用能力
    context.recursiveCall = async (newParams: any): Promise<TResult> => {
      // 递归调用自身，重新走完整的插件流程
      context.isRecursiveCall = true
      const result = await this.executeImageWithPlugins(methodName, modelId, newParams, executor, context)
      context.isRecursiveCall = false
      return result
    }

    try {
      // 0. 配置上下文
      await this.pluginManager.executeConfigureContext(context)

      // 1. 触发请求开始事件
      await this.pluginManager.executeParallel('onRequestStart', context)

      // 2. 解析模型
      const model = await this.pluginManager.executeFirst<ImageModelV2>('resolveModel', modelId, context)
      if (!model) {
        throw new Error(`Failed to resolve image model: ${modelId}`)
      }

      // 3. 转换请求参数
      const transformedParams = await this.pluginManager.executeSequential('transformParams', params, context)

      // 4. 执行具体的 API 调用
      const result = await executor(model, transformedParams)

      // 5. 转换结果
      const transformedResult = await this.pluginManager.executeSequential('transformResult', result, context)

      // 6. 触发完成事件
      await this.pluginManager.executeParallel('onRequestEnd', context, transformedResult)

      return transformedResult
    } catch (error) {
      // 7. 触发错误事件
      await this.pluginManager.executeParallel('onError', context, undefined, error as Error)
      throw error
    }
  }

  /**
   * 执行流式调用的通用逻辑（支持流转换器）
   * 提供给AiExecutor使用
   */
  async executeStreamWithPlugins<TParams, TResult>(
    methodName: string,
    modelId: string,
    params: TParams,
    executor: (model: LanguageModel, transformedParams: TParams, streamTransforms: any[]) => Promise<TResult>,
    _context?: ReturnType<typeof createContext>
  ): Promise<TResult> {
    // 创建请求上下文
    const context = _context ? _context : createContext(this.providerId, modelId, params)

    // 🔥 为上下文添加递归调用能力
    context.recursiveCall = async (newParams: any): Promise<TResult> => {
      // 递归调用自身，重新走完整的插件流程
      context.isRecursiveCall = true
      const result = await this.executeStreamWithPlugins(methodName, modelId, newParams, executor, context)
      context.isRecursiveCall = false
      return result
    }

    try {
      // 0. 配置上下文
      await this.pluginManager.executeConfigureContext(context)

      // 1. 触发请求开始事件
      await this.pluginManager.executeParallel('onRequestStart', context)

      // 2. 解析模型
      const model = await this.pluginManager.executeFirst<LanguageModel>('resolveModel', modelId, context)

      if (!model) {
        throw new Error(`Failed to resolve model: ${modelId}`)
      }

      // 3. 转换请求参数
      const transformedParams = await this.pluginManager.executeSequential('transformParams', params, context)

      // 4. 收集流转换器
      const streamTransforms = this.pluginManager.collectStreamTransforms(transformedParams, context)

      // 5. 执行流式 API 调用
      const result = await executor(model, transformedParams, streamTransforms)

      const transformedResult = await this.pluginManager.executeSequential('transformResult', result, context)

      // 6. 触发完成事件（注意：对于流式调用，这里触发的是开始流式响应的事件）
      await this.pluginManager.executeParallel('onRequestEnd', context, transformedResult)

      return transformedResult
    } catch (error) {
      // 7. 触发错误事件
      await this.pluginManager.executeParallel('onError', context, undefined, error as Error)
      throw error
    }
  }
  // === 静态工厂方法 ===

  /**
   * 创建 OpenAI Compatible 客户端
   */
  static createOpenAICompatible(
    config: ProviderSettingsMap['openai-compatible'],
    plugins: AiPlugin[] = []
  ): PluginEngine<'openai-compatible'> {
    return new PluginEngine('openai-compatible', plugins)
  }

  /**
   * 创建标准提供商客户端
   */
  static create<T extends ProviderId>(providerId: T, plugins?: AiPlugin[]): PluginEngine<T>

  static create(providerId: string, plugins?: AiPlugin[]): PluginEngine<'openai-compatible'>

  static create(providerId: string, plugins: AiPlugin[] = []): PluginEngine {
    if (isProviderSupported(providerId)) {
      return new PluginEngine(providerId as ProviderId, plugins)
    } else {
      // 对于未知 provider，使用 openai-compatible
      return new PluginEngine('openai-compatible', plugins)
    }
  }
}
