import { ExclamationCircleOutlined } from '@ant-design/icons'
import { loggerService } from '@logger'
import { createAnthropicOAuth } from '@renderer/pages/settings/ProviderSettings/anthropicOAuth'
import { Alert, Button, Input, message, Modal } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const logger = loggerService.withContext('AnthropicSettings')

enum AuthStatus {
  NOT_STARTED,
  AUTHENTICATING,
  AUTHENTICATED
}

const AnthropicSettings = () => {
  const { t } = useTranslation()
  const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.NOT_STARTED)
  const [loading, setLoading] = useState<boolean>(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [codeModalVisible, setCodeModalVisible] = useState<boolean>(false)
  const [authCode, setAuthCode] = useState<string>('')

  // 初始化检查认证状态
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const anthropicOAuth = createAnthropicOAuth()
        const token = await anthropicOAuth.getValidAccessToken()

        if (token) {
          setAuthToken(token)
          setAuthStatus(AuthStatus.AUTHENTICATED)
        }
      } catch (error) {
        logger.error('Failed to check authentication status:', error as Error)
      }
    }

    checkAuthStatus()
  }, [])

  // 处理OAuth重定向
  const handleRedirectOAuth = async () => {
    try {
      setLoading(true)
      const anthropicOAuth = createAnthropicOAuth()
      await anthropicOAuth.startOAuthFlow()
      setAuthStatus(AuthStatus.AUTHENTICATING)
      setCodeModalVisible(true)
    } catch (error) {
      logger.error('OAuth redirect failed:', error as Error)
      window.message.error(t('settings.provider.anthropic.auth_failed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理授权码提交
  const handleSubmitCode = async () => {
    if (!authCode.trim()) {
      return window.message.error(t('settings.provider.anthropic.code_required'))
    }

    try {
      setLoading(true)
      const anthropicOAuth = createAnthropicOAuth()
      const token = await anthropicOAuth.completeOAuthWithCode(authCode)
      setAuthToken(token)
      setAuthStatus(AuthStatus.AUTHENTICATED)
      setCodeModalVisible(false)
      window.message.success(t('settings.provider.anthropic.auth_success'))
    } catch (error) {
      logger.error('OAuth code exchange failed:', error as Error)
      window.message.error(t('settings.provider.anthropic.code_exchange_failed'))
    } finally {
      setLoading(false)
      setAuthCode('')
    }
  }

  // 处理取消认证
  const handleCancelAuth = () => {
    const anthropicOAuth = createAnthropicOAuth()
    anthropicOAuth.cancelOAuthFlow()
    setAuthStatus(AuthStatus.NOT_STARTED)
    setCodeModalVisible(false)
    setAuthCode('')
  }

  // 处理登出
  const handleLogout = async () => {
    try {
      const anthropicOAuth = createAnthropicOAuth()
      await anthropicOAuth.clearCredentials()
      setAuthToken(null)
      setAuthStatus(AuthStatus.NOT_STARTED)
      window.message.success(t('settings.provider.anthropic.logout_success'))
    } catch (error) {
      logger.error('Logout failed:', error as Error)
      window.message.error(t('settings.provider.anthropic.logout_failed'))
    }
  }

  // 渲染认证内容
  const renderAuthContent = () => {
    switch (authStatus) {
      case AuthStatus.AUTHENTICATED:
        return (
          <StartContainer>
            <Alert
              type="success"
              message={t('settings.provider.anthropic.authenticated')}
              description={t('settings.provider.anthropic.authenticated_detail')}
              action={
                <Button type="primary" onClick={handleLogout}>
                  {t('settings.provider.anthropic.logout')}
                </Button>
              }
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
          </StartContainer>
        )
      case AuthStatus.AUTHENTICATING:
        return (
          <StartContainer>
            <Alert
              type="info"
              message={t('settings.provider.anthropic.authenticating')}
              description={t('settings.provider.anthropic.authenticating_detail')}
              action={
                <Button type="primary" loading={loading} onClick={() => setCodeModalVisible(true)}>
                  {t('settings.provider.anthropic.enter_code')}
                </Button>
              }
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
          </StartContainer>
        )
      default:
        return (
          <StartContainer>
            <Alert
              type="info"
              message={t('settings.provider.anthropic.description')}
              description={t('settings.provider.anthropic.description_detail')}
              action={
                <Button type="primary" loading={loading} onClick={handleRedirectOAuth}>
                  {t('settings.provider.anthropic.start_auth')}
                </Button>
              }
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
          </StartContainer>
        )
    }
  }

  return (
    <Container>
      {renderAuthContent()}
      <Modal
        title={t('settings.provider.anthropic.enter_auth_code')}
        open={codeModalVisible}
        onOk={handleSubmitCode}
        onCancel={handleCancelAuth}
        okButtonProps={{ loading }}
        okText={t('settings.provider.anthropic.submit_code')}
        cancelText={t('settings.provider.anthropic.cancel')}>
        <Input
          value={authCode}
          onChange={(e) => setAuthCode(e.target.value)}
          placeholder={t('settings.provider.anthropic.code_placeholder')}
        />
      </Modal>
    </Container>
  )
}

const Container = styled.div`
  padding-top: 15px;
`

const StartContainer = styled.div`
  margin-bottom: 20px;
`

export default AnthropicSettings
