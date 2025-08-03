import { UserOutlined } from '@ant-design/icons'
import { loggerService } from '@logger'
import { agentManagementService } from '@renderer/services/AgentManagementService'
import { RootState } from '@renderer/store'
import type { AgentResponse } from '@types'
import { Form, Input, Modal, Select, Space, Upload } from 'antd'
import { FC, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

const logger = loggerService.withContext('AgentManagementModal')

interface AgentManagementModalProps {
  visible: boolean
  onClose: () => void
  onSave: (agent: AgentResponse) => void
  agent?: AgentResponse | null // null for create, AgentResponse for edit
  loading?: boolean
}

const AgentManagementModal: FC<AgentManagementModalProps> = ({ visible, onClose, onSave, agent, loading = false }) => {
  const { t } = useTranslation()
  // loading parameter is reserved for future loading state implementation
  void loading

  // API Server state with proper defaults
  const apiServerConfig = useSelector((state: RootState) => state.settings.apiServer)

  const [tools, setTools] = useState<Array<{ value: string; label: string }>>([])
  const [models, setModels] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await agentManagementService.fetchAvailableMCPTools(apiServerConfig)
        logger.info('tools fetched successfully', { res })
        if (res.success && res.data) {
          const toolOptions = res.data.map((tool) => ({ value: tool.id, label: tool.name }))
          setTools(toolOptions)
        } else {
          logger.warn('No tools data or fetch failed', { error: res.error })
          setTools([])
        }
      } catch (error) {
        logger.error('Failed to fetch tools:', error as Error)
        setTools([])
      }
    }

    if (apiServerConfig.enabled) {
      fetchTools()
    } else {
      setTools([])
    }
  }, [apiServerConfig])

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await agentManagementService.fetchAvailableModels(apiServerConfig)
        logger.info('models fetched successfully', { res })
        if (res.success && res.data) {
          const modelOptions = res.data.map((model) => ({ value: model.id, label: model.name }))
          setModels(modelOptions)
        } else {
          logger.warn('No models data or fetch failed', { error: res.error })
          setModels([])
        }
      } catch (error) {
        logger.error('Failed to fetch models:', error as Error)
        setModels([])
      }
    }

    if (apiServerConfig.enabled) {
      fetchModels()
    } else {
      setModels([])
    }
  }, [apiServerConfig])

  const [form] = Form.useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  const isEditMode = Boolean(agent)
  const modalTitle = isEditMode
    ? t('cherryAgent.modal.edit.title', 'Edit Agent')
    : t('cherryAgent.modal.create.title', 'Create Agent')

  // Initialize form when agent changes
  useEffect(() => {
    if (visible) {
      if (isEditMode && agent) {
        form.setFieldsValue({
          name: agent.name,
          description: agent.description || '',
          instructions: agent.instructions || '',
          model: agent.model,
          tools: agent.tools || [],
          knowledges: agent.knowledges || []
        })
        setAvatarUrl(agent.avatar || '')
      } else {
        form.resetFields()
        setAvatarUrl('')
      }
    }
  }, [visible, agent, isEditMode, form])

  const handleOk = async () => {
    try {
      setIsSubmitting(true)
      const values = await form.validateFields()

      const agentData = {
        name: values.name,
        description: values.description || '',
        avatar: avatarUrl || '',
        instructions: values.instructions || '',
        model: values.model,
        tools: values.tools || [],
        knowledges: values.knowledges || [],
        configuration: {}
      }

      let result: AgentResponse | null = null

      if (isEditMode && agent) {
        // Update existing agent
        // Update existing agent - no need to store input locally
        // const updateInput: UpdateAgentInput = {
        //   id: agent.id,
        //   ...agentData
        // }

        // Call parent's save handler - it should handle the API call
        result = await new Promise<AgentResponse | null>((resolve) => {
          // This is a bit of a hack - we need to modify the parent interface
          // For now, we'll assume onSave handles the API call and returns the result
          onSave(agentData as AgentResponse)
          resolve(agentData as AgentResponse) // Mock return
        })
      } else {
        // Create new agent - no need to store input locally
        // const createInput: CreateAgentInput = agentData

        // Call parent's save handler
        result = await new Promise<AgentResponse | null>((resolve) => {
          onSave(agentData as AgentResponse)
          resolve(agentData as AgentResponse) // Mock return
        })
      }

      if (result) {
        handleCancel() // Close modal and reset form
      }
    } catch (error) {
      logger.error('Failed to save agent:', error as Error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setAvatarUrl('')
    setIsSubmitting(false)
    onClose()
  }

  const handleAvatarChange = useCallback((info: any) => {
    if (info.file.status === 'done') {
      // In a real app, you'd upload the file and get a URL back
      // For now, we'll just use a placeholder or file URL
      const url = info.file.response?.url || URL.createObjectURL(info.file.originFileObj)
      setAvatarUrl(url)
    }
  }, [])

  return (
    <StyledModal
      title={modalTitle}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnClose
      centered
      width={600}
      confirmLoading={isSubmitting}
      okText={isEditMode ? t('common.save', 'Save') : t('agents.add.title', 'Create Agent')}
      cancelText={t('common.cancel', 'Cancel')}
      styles={{
        header: {
          borderBottom: '0.5px solid var(--color-border)',
          paddingBottom: 16,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0
        },
        body: {
          paddingTop: 24,
          maxHeight: '70vh',
          overflowY: 'auto'
        }
      }}>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          name: '',
          description: '',
          instructions: '',
          model: '',
          tools: [],
          knowledges: []
        }}>
        {/* Basic Information Section */}
        <SectionTitle>{t('cherryAgent.modal.section.basic', 'Basic Information')}</SectionTitle>

        <Space direction="horizontal" size={24} style={{ width: '100%', alignItems: 'flex-start' }}>
          <AvatarSection>
            <Form.Item label={t('cherryAgent.modal.avatar', 'Avatar')}>
              <Upload
                name="avatar"
                listType="picture-circle"
                className="avatar-uploader"
                showUploadList={false}
                onChange={handleAvatarChange}
                beforeUpload={() => false} // Prevent auto upload
              >
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="avatar" />
                ) : (
                  <AvatarPlaceholder>
                    <UserOutlined style={{ fontSize: 24, color: 'var(--color-text-tertiary)' }} />
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {t('cherryAgent.modal.avatar.upload', 'Upload')}
                    </div>
                  </AvatarPlaceholder>
                )}
              </Upload>
            </Form.Item>
          </AvatarSection>

          <FormFieldsSection>
            <Form.Item
              label={t('cherryAgent.modal.name', 'Agent Name')}
              name="name"
              rules={[
                {
                  required: true,
                  message: t('cherryAgent.modal.name.required', 'Please enter agent name')
                },
                {
                  max: 50,
                  message: t('cherryAgent.modal.name.maxLength', 'Agent name cannot exceed 50 characters')
                }
              ]}>
              <Input
                placeholder={t('cherryAgent.modal.name.placeholder', 'Enter a name for your agent')}
                showCount
                maxLength={50}
              />
            </Form.Item>

            <Form.Item label={t('cherryAgent.modal.description', 'Description')} name="description">
              <Input.TextArea
                placeholder={t(
                  'cherryAgent.modal.description.placeholder',
                  'Brief description of what this agent does'
                )}
                rows={2}
                showCount
                maxLength={200}
              />
            </Form.Item>
          </FormFieldsSection>
        </Space>

        {/* Configuration Section */}
        <SectionTitle style={{ marginTop: 24 }}>
          {t('cherryAgent.modal.section.configuration', 'Configuration')}
        </SectionTitle>

        <Form.Item
          label={t('cherryAgent.modal.model', 'Language Model')}
          name="model"
          rules={[
            {
              required: true,
              message: t('cherryAgent.modal.model.required', 'Please select a language model')
            }
          ]}>
          <Select
            placeholder={t('cherryAgent.modal.model.placeholder', 'Select a language model')}
            showSearch
            optionFilterProp="label"
            options={models}
          />
        </Form.Item>

        <Form.Item
          label={t('cherryAgent.modal.instructions', 'System Instructions')}
          name="instructions"
          tooltip={t(
            'cherryAgent.modal.instructions.tooltip',
            'These instructions guide how the agent behaves and responds'
          )}>
          <Input.TextArea
            placeholder={t('cherryAgent.modal.instructions.placeholder', 'You are a helpful assistant that...')}
            rows={4}
            showCount
            maxLength={2000}
          />
        </Form.Item>

        {/* Capabilities Section */}
        <SectionTitle style={{ marginTop: 24 }}>
          {t('cherryAgent.modal.section.capabilities', 'Capabilities')}
        </SectionTitle>

        <Form.Item
          label={t('cherryAgent.modal.tools', 'Available Tools')}
          name="tools"
          tooltip={t('cherryAgent.modal.tools.tooltip', 'Select tools that this agent can use')}>
          <Select
            mode="multiple"
            placeholder={t('cherryAgent.modal.tools.placeholder', 'Select tools for your agent')}
            options={tools}
            maxTagCount="responsive"
          />
        </Form.Item>

        <Form.Item
          label={t('cherryAgent.modal.knowledges', 'Knowledge Bases')}
          name="knowledges"
          tooltip={t('cherryAgent.modal.knowledges.tooltip', 'Select knowledge bases this agent can access')}>
          <Select
            mode="multiple"
            placeholder={t('cherryAgent.modal.knowledges.placeholder', 'Select knowledge bases (optional)')}
            options={[]} // This would be populated from actual knowledge bases
            maxTagCount="responsive"
          />
        </Form.Item>
      </Form>
    </StyledModal>
  )
}

const StyledModal = styled(Modal)`
  .ant-modal-title {
    font-size: 16px;
    font-weight: 600;
  }

  .ant-modal-close {
    top: 16px;
    right: 16px;
  }
`

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
`

const AvatarSection = styled.div`
  flex-shrink: 0;

  .ant-upload-circle {
    width: 80px !important;
    height: 80px !important;
  }
`

const FormFieldsSection = styled.div`
  flex: 1;
  min-width: 0;
`

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
`

const AvatarPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    color: var(--color-primary);
  }
`

export default AgentManagementModal
