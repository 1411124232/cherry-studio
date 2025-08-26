/**
 * Provider 初始化器
 * 负责根据配置创建 providers 并注册到全局管理器
 * 集成了来自 ModelCreator 的特殊处理逻辑
 */

import { customProvider } from 'ai'

import { isOpenAIChatCompletionOnlyModel } from '../../utils/model'
import { globalRegistryManagement } from './RegistryManagement'
import { baseProviders, type DynamicProviderRegistration } from './schemas'

/**
 * Provider 初始化错误类型
 */
class ProviderInitializationError extends Error {
  constructor(
    message: string,
    public providerId?: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'ProviderInitializationError'
  }
}

/**
 * Provider 初始化器类
 */
export class ProviderInitializer {
  /**
   * 初始化单个 provider 并注册
   */
  static initializeProvider(providerId: string, options: any): void {
    try {
      // 1. 从 schemas 获取 provider 配置
      const providerConfig = baseProviders.find((p) => p.id === providerId)
      if (!providerConfig) {
        throw new ProviderInitializationError(`Provider configuration for '${providerId}' not found`, providerId)
      }

      // 2. 使用 creator 函数创建已配置的 provider
      const configuredProvider = providerConfig.creator(options)

      // 3. 处理特殊逻辑并注册到全局管理器
      this.handleProviderSpecificLogic(configuredProvider, providerId)
    } catch (error) {
      if (error instanceof ProviderInitializationError) {
        throw error
      }
      throw new ProviderInitializationError(
        `Failed to initialize provider ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        providerId,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * 批量初始化 providers
   */
  static initializeProviders(providers: Record<string, any>): void {
    Object.entries(providers).forEach(([providerId, options]) => {
      try {
        this.initializeProvider(providerId, options)
      } catch (error) {
        console.error(`Failed to initialize provider ${providerId}:`, error)
      }
    })
  }

  /**
   * 处理特定 provider 的特殊逻辑 (从 ModelCreator 迁移并改进)
   */
  private static handleProviderSpecificLogic(provider: any, providerId: string): void {
    if (providerId === 'openai') {
      // 🎯 OpenAI 默认注册 (responses 模式)
      globalRegistryManagement.registerProvider('openai', provider)

      // 🎯 使用 AI SDK 官方的 customProvider 创建 chat 模式变体
      const openaiChatProvider = customProvider({
        fallbackProvider: {
          ...provider,
          // 覆盖 languageModel 方法指向 chat
          languageModel: (modelId: string) => provider.chat(modelId)
        }
      })

      globalRegistryManagement.registerProvider('openai-chat', openaiChatProvider)
    } else {
      // 其他 provider 直接注册
      globalRegistryManagement.registerProvider(providerId, provider)
    }
  }

  /**
   * 初始化图像生成 provider (从 ModelCreator 迁移)
   *
   * @deprecated 不再需要单独的图像provider初始化，使用 initializeProvider() 即可
   * 一个provider实例可以同时支持文本和图像功能，无需分别初始化
   *
   * TODO: 考虑在下个版本中删除此方法
   */
  // static initializeImageProvider(providerId: string, options: any): void {
  //   try {
  //     const providerConfig = baseProviders.find((p) => p.id === providerId)
  //     if (!providerConfig) {
  //       throw new ProviderInitializationError(`Provider configuration for '${providerId}' not found`, providerId)
  //     }

  //     if (!providerConfig.supportsImageGeneration) {
  //       throw new ProviderInitializationError(`Provider "${providerId}" does not support image generation`, providerId)
  //     }

  //     const provider = providerConfig.creator(options)

  //     // 注册图像 provider (使用特殊前缀区分)
  //     globalRegistryManagement.registerProvider(`${providerId}-image`, provider as any)
  //   } catch (error) {
  //     if (error instanceof ProviderInitializationError) {
  //       throw error
  //     }
  //     throw new ProviderInitializationError(
  //       `Failed to initialize image provider ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
  //       providerId,
  //       error instanceof Error ? error : undefined
  //     )
  //   }
  // }

  /**
   * 检查 provider 是否已初始化
   */
  static isProviderInitialized(providerId: string): boolean {
    return globalRegistryManagement.getRegisteredProviders().includes(providerId)
  }

  /**
   * 重新初始化 provider（更新配置）
   */
  static reinitializeProvider(providerId: string, options: any): void {
    this.initializeProvider(providerId, options) // 会覆盖已有的
  }

  /**
   * 清除所有已初始化的 providers
   */
  static clearAllProviders(): void {
    globalRegistryManagement.clear()
  }
}

// ==================== 便捷函数导出 ====================

export const initializeProvider = ProviderInitializer.initializeProvider.bind(ProviderInitializer)
export const initializeProviders = ProviderInitializer.initializeProviders.bind(ProviderInitializer)
// export const initializeImageProvider = ProviderInitializer.initializeImageProvider.bind(ProviderInitializer) // deprecated: 使用 initializeProvider 即可
export const isProviderInitialized = ProviderInitializer.isProviderInitialized.bind(ProviderInitializer)
export const reinitializeProvider = ProviderInitializer.reinitializeProvider.bind(ProviderInitializer)
export const clearAllProviders = ProviderInitializer.clearAllProviders.bind(ProviderInitializer)

// ==================== 全局管理器导出 ====================

export { globalRegistryManagement as providerRegistry }

// ==================== 便捷访问方法 ====================

export const getLanguageModel = (id: string) => globalRegistryManagement.languageModel(id as any)
export const getTextEmbeddingModel = (id: string) => globalRegistryManagement.textEmbeddingModel(id as any)
export const getImageModel = (id: string) => globalRegistryManagement.imageModel(id as any)

// ==================== 工具函数 (从 ModelCreator 迁移) ====================

/**
 * 获取支持的 Providers 列表 (从 ModelCreator 迁移)
 */
export function getSupportedProviders(): Array<{
  id: string
  name: string
}> {
  return baseProviders.map((provider) => ({
    id: provider.id,
    name: provider.name
  }))
}

/**
 * 检查 Provider 是否被支持
 */
export function isProviderSupported(providerId: string): boolean {
  return getProviderInfo(providerId).isSupported
}

/**
 * 获取 Provider 信息 (从 ModelCreator 迁移并改进)
 */
export function getProviderInfo(providerId: string): {
  id: string
  name: string
  isSupported: boolean
  isInitialized: boolean
  effectiveProvider: string
} {
  const provider = baseProviders.find((p) => p.id === providerId)
  const isInitialized = globalRegistryManagement.getRegisteredProviders().includes(providerId)

  return {
    id: providerId,
    name: provider?.name || providerId,
    isSupported: !!provider,
    isInitialized,
    effectiveProvider: isInitialized ? providerId : 'openai-compatible'
  }
}

/**
 * 获取所有已初始化的 providers
 */
export function getInitializedProviders(): string[] {
  return globalRegistryManagement.getRegisteredProviders()
}

/**
 * 检查是否有任何已初始化的 providers
 */
export function hasInitializedProviders(): boolean {
  return globalRegistryManagement.hasProviders()
}

// ==================== 动态Provider注册功能 ====================

// 全局动态provider存储
const dynamicProviders = new Map<string, DynamicProviderRegistration>()

/**
 * 注册动态provider
 */
export function registerDynamicProvider(config: DynamicProviderRegistration): boolean {
  try {
    // 验证配置
    if (!config.id || !config.name) {
      return false
    }

    // 检查是否与基础provider冲突
    if (baseProviders.find((p) => p.id === config.id)) {
      console.warn(`Dynamic provider "${config.id}" conflicts with base provider`)
      return false
    }

    // 存储动态provider配置
    dynamicProviders.set(config.id, config)

    // 如果有creator函数，立即初始化
    if (config.creator) {
      try {
        const provider = config.creator({}) as any // 使用空配置初始化，类型断言为any
        const aliases = config.mappings ? Object.keys(config.mappings) : undefined
        globalRegistryManagement.registerProvider(config.id, provider, aliases)
      } catch (error) {
        console.error(`Failed to initialize dynamic provider "${config.id}":`, error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error(`Failed to register dynamic provider:`, error)
    return false
  }
}

/**
 * 批量注册动态providers
 */
export function registerMultipleProviders(configs: DynamicProviderRegistration[]): number {
  let successCount = 0
  configs.forEach((config) => {
    if (registerDynamicProvider(config)) {
      successCount++
    }
  })
  return successCount
}

/**
 * 获取provider映射（解析别名）
 */
export function getProviderMapping(providerId: string): string {
  return globalRegistryManagement.resolveProviderId(providerId)
}

/**
 * 检查是否为动态provider
 */
export function isDynamicProvider(providerId: string): boolean {
  return dynamicProviders.has(providerId)
}

/**
 * 获取所有动态providers
 */
export function getDynamicProviders(): DynamicProviderRegistration[] {
  return Array.from(dynamicProviders.values())
}

/**
 * 获取所有别名映射关系
 */
export function getAllDynamicMappings(): Record<string, string> {
  return globalRegistryManagement.getAllAliases()
}

/**
 * 清理所有动态providers
 */
export function cleanup(): void {
  dynamicProviders.clear()
  globalRegistryManagement.clear()
}

// ==================== 导出别名相关API ====================

export const resolveProviderId = (id: string) => globalRegistryManagement.resolveProviderId(id)
export const isAlias = (id: string) => globalRegistryManagement.isAlias(id)
export const getAllAliases = () => globalRegistryManagement.getAllAliases()

// ==================== 导出错误类型和工具函数 ====================

export { isOpenAIChatCompletionOnlyModel, ProviderInitializationError }
