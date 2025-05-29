import { isMac } from '@main/constant'
import { OcrProvider } from '@types'
import Logger from 'electron-log'

import BaseOcrProvider from './BaseOcrProvider'
import DefaultOcrProvider from './DefaultOcrProvider'
import Doc2xOcrProvider from './Doc2xOcrProvider'
import MacSysOcrProvider from './MacSysOcrProvider'
import MineruOcrProvider from './MineruOcrProvider'
import MistralOcrProvider from './MistralOcrProvider'
export default class OcrProviderFactory {
  static create(provider: OcrProvider): BaseOcrProvider {
    switch (provider.id) {
      case 'doc2x':
        return new Doc2xOcrProvider(provider)
      case 'mistral':
        return new MistralOcrProvider(provider)
      case 'system':
        if (!isMac) {
          Logger.warn('[OCR] System OCR provider is only available on macOS')
        }
        return new MacSysOcrProvider(provider)
      case 'mineru':
        return new MineruOcrProvider(provider)
      default:
        return new DefaultOcrProvider(provider)
    }
  }
}
