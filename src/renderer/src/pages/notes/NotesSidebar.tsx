import { loggerService } from '@logger'
import { DeleteIcon } from '@renderer/components/Icons'
import SaveToKnowledgePopup from '@renderer/components/Popups/SaveToKnowledgePopup'
import Scrollbar from '@renderer/components/Scrollbar'
import { useKnowledgeBases } from '@renderer/hooks/useKnowledge'
import { NotesTreeNode } from '@renderer/types/note'
import { Dropdown, Input, MenuProps, Tooltip } from 'antd'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit3,
  File,
  FilePlus,
  FileSearch,
  Folder,
  FolderOpen,
  FolderPlus,
  Star,
  StarOff
} from 'lucide-react'
import { FC, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface NotesSidebarProps {
  onCreateFolder: (name: string, parentId?: string) => void
  onCreateNote: (name: string, parentId?: string) => void
  onSelectNode: (node: NotesTreeNode) => void
  onDeleteNode: (nodeId: string) => void
  onRenameNode: (nodeId: string, newName: string) => void
  onToggleExpanded: (nodeId: string) => void
  onToggleStar: (nodeId: string) => void
  onSortNodes: (sourceNodeId: string, targetNodeId: string, position: 'before' | 'after' | 'inside') => void
  onUploadFiles: (files: File[]) => void
  activeNodeId?: string
  notesTree: NotesTreeNode[]
}

const logger = loggerService.withContext('NotesSidebar')

const NotesSidebar: FC<NotesSidebarProps> = ({
  onCreateFolder,
  onCreateNote,
  onSelectNode,
  onDeleteNode,
  onRenameNode,
  onToggleExpanded,
  onToggleStar,
  onSortNodes,
  onUploadFiles,
  activeNodeId,
  notesTree
}) => {
  const { t } = useTranslation()
  const { bases } = useKnowledgeBases()
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<'before' | 'inside' | 'after'>('inside')
  const [isShowStarred, setIsShowStarred] = useState(false)
  const [isDragOverSidebar, setIsDragOverSidebar] = useState(false)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  const handleCreateFolder = useCallback(() => {
    onCreateFolder(t('notes.untitled_folder'))
  }, [onCreateFolder, t])

  const handleCreateNote = useCallback(() => {
    onCreateNote(t('notes.untitled_note'))
  }, [onCreateNote, t])

  const handleStartEdit = useCallback((node: NotesTreeNode) => {
    setEditingNodeId(node.id)
    setEditingName(node.name)
  }, [])

  const handleFinishEdit = useCallback(() => {
    if (editingNodeId && editingName.trim()) {
      onRenameNode(editingNodeId, editingName.trim())
    }
    setEditingNodeId(null)
    setEditingName('')
    logger.debug(`Renamed node ${editingNodeId} to "${editingName.trim()}"`)
  }, [editingNodeId, editingName, onRenameNode])

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null)
    setEditingName('')
  }, [])

  const handleDeleteNode = useCallback(
    (node: NotesTreeNode) => {
      const confirmText =
        node.type === 'folder'
          ? t('notes.delete_folder_confirm', { name: node.name })
          : t('notes.delete_note_confirm', { name: node.name })

      window.modal.confirm({
        title: t('notes.delete'),
        content: confirmText,
        centered: true,
        okButtonProps: { danger: true },
        onOk: () => {
          onDeleteNode(node.id)
        }
      })
    },
    [onDeleteNode, t]
  )

  const handleExportKnowledge = useCallback(
    async (note: NotesTreeNode) => {
      try {
        if (bases.length === 0) {
          window.message.warning(t('chat.save.knowledge.empty.no_knowledge_base'))
          return
        }

        const result = await SaveToKnowledgePopup.showForNote(note)

        if (result?.success) {
          window.message.success(t('notes.export_success', { count: result.savedCount }))
        }
      } catch (error) {
        window.message.error(t('notes.export_failed'))
        logger.error(`Failed to export note to knowledge base: ${error}`)
      }
    },
    [bases.length, t]
  )

  const handleDragStart = useCallback((e: React.DragEvent, node: NotesTreeNode) => {
    setDraggedNodeId(node.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)

    // 保存拖拽节点的引用
    dragNodeRef.current = e.currentTarget as HTMLDivElement

    if (e.currentTarget.parentElement) {
      const rect = e.currentTarget.getBoundingClientRect()
      const ghostElement = e.currentTarget.cloneNode(true) as HTMLElement
      ghostElement.style.width = `${rect.width}px`
      ghostElement.style.opacity = '0.7'
      ghostElement.style.position = 'absolute'
      ghostElement.style.top = '-1000px'
      document.body.appendChild(ghostElement)
      e.dataTransfer.setDragImage(ghostElement, 10, 10)

      // 在下一帧移除ghost元素
      setTimeout(() => {
        document.body.removeChild(ghostElement)
      }, 0)
    }
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, node: NotesTreeNode) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      if (draggedNodeId === node.id) {
        return // 不允许拖放到自己
      }

      setDragOverNodeId(node.id)

      // 计算拖放位置（顶部、中间、底部）
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const mouseY = e.clientY
      const thresholdTop = rect.top + rect.height * 0.3
      const thresholdBottom = rect.bottom - rect.height * 0.3

      if (mouseY < thresholdTop) {
        // 顶部区域 - 放在节点前
        setDragPosition('before')
      } else if (mouseY > thresholdBottom) {
        // 底部区域 - 放在节点后
        setDragPosition('after')
      } else {
        // 中间区域 - 放入节点内部
        setDragPosition(node.type === 'folder' ? 'inside' : 'after')
      }
    },
    [draggedNodeId]
  )

  const handleDragLeave = useCallback(() => {
    setDragOverNodeId(null)
    setDragPosition('inside')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetNode: NotesTreeNode) => {
      e.preventDefault()
      const draggedId = e.dataTransfer.getData('text/plain')

      if (draggedId && draggedId !== targetNode.id) {
        onSortNodes(draggedId, targetNode.id, dragPosition)
      }

      setDraggedNodeId(null)
      setDragOverNodeId(null)
      setDragPosition('inside')
    },
    [onSortNodes, dragPosition]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedNodeId(null)
    setDragOverNodeId(null)
    setDragPosition('inside')
  }, [])

  // 切换收藏视图
  const handleToggleStarredView = useCallback(() => {
    setIsShowStarred(!isShowStarred)
  }, [isShowStarred])

  // 筛选收藏的笔记
  const filteredTree = useMemo(() => {
    if (!isShowStarred) return notesTree
    const flattenNodes = (nodes: NotesTreeNode[]): NotesTreeNode[] => {
      let result: NotesTreeNode[] = []

      for (const node of nodes) {
        if (node.type === 'file' && node.is_starred) {
          result.push(node)
        }

        if (node.children && node.children.length > 0) {
          result = [...result, ...flattenNodes(node.children)]
        }
      }
      return result
    }

    return flattenNodes(notesTree)
  }, [notesTree, isShowStarred])

  // 实现右键菜单
  const getMenuItems = useCallback(
    (node: NotesTreeNode) => {
      const baseMenuItems: MenuProps['items'] = [
        {
          label: t('notes.rename'),
          key: 'rename',
          icon: <Edit3 size={14} />,
          onClick: () => {
            handleStartEdit(node)
          }
        }
      ]
      if (node.type !== 'folder') {
        baseMenuItems.push(
          {
            label: node.is_starred ? t('notes.unstar') : t('notes.star'),
            key: 'star',
            icon: node.is_starred ? <StarOff size={14} /> : <Star size={14} />,
            onClick: () => {
              onToggleStar(node.id)
            }
          },
          {
            label: t('notes.export_knowledge'),
            key: 'export_knowledge',
            icon: <FileSearch size={14} />,
            onClick: () => {
              handleExportKnowledge(node)
            }
          }
        )
      }
      baseMenuItems.push(
        { type: 'divider' },
        {
          label: t('notes.delete'),
          danger: true,
          key: 'delete',
          icon: <DeleteIcon size={14} className="lucide-custom" />,
          onClick: () => {
            handleDeleteNode(node)
          }
        }
      )

      return baseMenuItems
    },
    [t, handleStartEdit, onToggleStar, handleExportKnowledge, handleDeleteNode]
  )

  const renderTreeNode = useCallback(
    (node: NotesTreeNode, depth: number = 0) => {
      const isActive = node.id === activeNodeId
      const isEditing = editingNodeId === node.id
      const hasChildren = node.children && node.children.length > 0
      const isDragging = draggedNodeId === node.id
      const isDragOver = dragOverNodeId === node.id
      const isDragBefore = isDragOver && dragPosition === 'before'
      const isDragInside = isDragOver && dragPosition === 'inside'
      const isDragAfter = isDragOver && dragPosition === 'after'

      return (
        <div key={node.id}>
          <Dropdown menu={{ items: getMenuItems(node) }} trigger={['contextMenu']}>
            <div>
              <TreeNodeContainer
                active={isActive}
                depth={depth}
                isDragging={isDragging}
                isDragOver={isDragOver}
                isDragBefore={isDragBefore}
                isDragInside={isDragInside}
                isDragAfter={isDragAfter}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, node)}
                onDragOver={(e) => handleDragOver(e, node)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, node)}
                onDragEnd={handleDragEnd}>
                <TreeNodeContent onClick={() => onSelectNode(node)}>
                  <NodeIndent depth={depth} />

                  {node.type === 'folder' && (
                    <ExpandIcon
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleExpanded(node.id)
                      }}
                      title={node.expanded ? t('notes.collapse') : t('notes.expand')}>
                      {node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </ExpandIcon>
                  )}

                  <NodeIcon>
                    {node.type === 'folder' ? (
                      node.expanded ? (
                        <FolderOpen size={16} />
                      ) : (
                        <Folder size={16} />
                      )
                    ) : (
                      <File size={16} />
                    )}
                  </NodeIcon>

                  {isEditing ? (
                    <EditInput
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onPressEnter={handleFinishEdit}
                      onBlur={handleFinishEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          handleCancelEdit()
                        }
                      }}
                      autoFocus
                      size="small"
                    />
                  ) : (
                    <NodeName>{node.name}</NodeName>
                  )}
                </TreeNodeContent>
              </TreeNodeContainer>
            </div>
          </Dropdown>

          {node.type === 'folder' && node.expanded && hasChildren && (
            <div>{node.children!.map((child) => renderTreeNode(child, depth + 1))}</div>
          )}
        </div>
      )
    },
    [
      activeNodeId,
      editingNodeId,
      editingName,
      draggedNodeId,
      dragOverNodeId,
      dragPosition,
      onSelectNode,
      onToggleExpanded,
      handleFinishEdit,
      handleCancelEdit,
      handleDragStart,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleDragEnd,
      getMenuItems,
      t
    ]
  )

  const handleDropFiles = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOverSidebar(false)

      const files = Array.from(e.dataTransfer.files)

      if (files.length > 0) {
        onUploadFiles(files)
      }
    },
    [onUploadFiles]
  )

  return (
    <SidebarContainer
      onDragOver={(e) => {
        e.preventDefault()
        if (!draggedNodeId) {
          setIsDragOverSidebar(true)
        }
      }}
      onDragLeave={() => setIsDragOverSidebar(false)}
      onDrop={(e) => {
        if (!draggedNodeId) {
          handleDropFiles(e)
        }
      }}>
      <SidebarHeader>
        <HeaderActions>
          {!isShowStarred && (
            <>
              <Tooltip title={t('notes.new_folder')} mouseEnterDelay={0.8}>
                <ActionButton onClick={handleCreateFolder}>
                  <FolderPlus size={18} />
                </ActionButton>
              </Tooltip>

              <Tooltip title={t('notes.new_note')} mouseEnterDelay={0.8}>
                <ActionButton onClick={handleCreateNote}>
                  <FilePlus size={18} />
                </ActionButton>
              </Tooltip>

              <Tooltip title={t('notes.show_starred')} mouseEnterDelay={0.8}>
                <ActionButton onClick={handleToggleStarredView}>
                  <Star size={18} />
                </ActionButton>
              </Tooltip>
            </>
          )}
          {isShowStarred && (
            <Tooltip title={t('common.back')} mouseEnterDelay={0.8}>
              <ActionButton onClick={handleToggleStarredView}>
                <ArrowLeft size={18} />
              </ActionButton>
            </Tooltip>
          )}
        </HeaderActions>
      </SidebarHeader>

      <NotesTreeContainer>
        <StyledScrollbar>
          <TreeContent>{filteredTree.map((node) => renderTreeNode(node))}</TreeContent>
        </StyledScrollbar>
      </NotesTreeContainer>

      {isDragOverSidebar && <DragOverIndicator />}
    </SidebarContainer>
  )
}

const SidebarContainer = styled.div`
  width: 280px;
  height: 100vh;
  background-color: var(--color-background);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  position: relative;
`

const SidebarHeader = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const NotesTreeContainer = styled.div`
  flex: 1;
  overflow: hidden;
`

const StyledScrollbar = styled(Scrollbar)`
  height: 100%;
`

const TreeContent = styled.div`
  padding: 8px;
`

const TreeNodeContainer = styled.div<{
  active: boolean
  depth: number
  isDragging?: boolean
  isDragOver?: boolean
  isDragBefore?: boolean
  isDragInside?: boolean
  isDragAfter?: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 2px;
  background-color: ${(props) => {
    if (props.isDragInside) return 'var(--color-primary-background)'
    if (props.active) return 'var(--color-background-soft)'
    return 'transparent'
  }};
  border: 1px solid
    ${(props) => {
      if (props.isDragInside) return 'var(--color-primary)'
      if (props.active) return 'var(--color-border)'
      return 'transparent'
    }};
  opacity: ${(props) => (props.isDragging ? 0.5 : 1)};
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background-color: var(--color-background-soft);

    .node-actions {
      opacity: 1;
    }
  }

  /* 添加拖拽指示线 */
  ${(props) =>
    props.isDragBefore &&
    `
    &::before {
      content: '';
      position: absolute;
      top: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background-color: var(--color-primary);
      border-radius: 1px;
    }
  `}

  ${(props) =>
    props.isDragAfter &&
    `
    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background-color: var(--color-primary);
      border-radius: 1px;
    }
  `}
`

const TreeNodeContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
`

const NodeIndent = styled.div<{ depth: number }>`
  width: ${(props) => props.depth * 16}px;
  flex-shrink: 0;
`

const ExpandIcon = styled.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-2);
  margin-right: 4px;

  &:hover {
    color: var(--color-text);
  }
`

const NodeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  color: var(--color-text-2);
  flex-shrink: 0;
`

const NodeName = styled.div`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--color-text);
`

const EditInput = styled(Input)`
  flex: 1;
  font-size: 13px;

  .ant-input {
    font-size: 13px;
    padding: 2px 6px;
    border: 1px solid var(--color-primary);
  }
`

const ActionButton = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--color-text-2);
  cursor: pointer;

  &:hover {
    background-color: var(--color-background-soft);
    color: var(--color-text);
  }
`

const DragOverIndicator = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 123, 255, 0.1);
  border: 2px dashed rgba(0, 123, 255, 0.6);
  border-radius: 4px;
  pointer-events: none;
`

export default NotesSidebar
