import 'vditor/dist/index.css'

import Scrollbar from '@renderer/components/Scrollbar'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useSettings } from '@renderer/hooks/useSettings'
import NotesNavbar from '@renderer/pages/notes/NotesNavbar'
import { ThemeMode } from '@renderer/types'
import { NotesTreeNode } from '@renderer/types/note'
import { Empty } from 'antd'
import { FC, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import Vditor from 'vditor'

import NotesSidebar from './NotesSidebar'
import { NotesService } from './utils/NotesService'

const NotesPage: FC = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [vditor, setVditor] = useState<Vditor | null>(null)
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { showWorkspace } = useSettings()
  const [notesTree, setNotesTree] = useState<NotesTreeNode[]>([])
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadNotesTree = async () => {
      try {
        const tree = await NotesService.getNotesTree()
        setNotesTree(tree)
      } catch (error) {
        console.error('Failed to load notes tree:', error)
      }
    }

    loadNotesTree()
  }, [])

  // 初始化编辑器 - 只有在选择笔记后才初始化
  useEffect(() => {
    if (editorRef.current && !vditor && activeNodeId) {
      const editor = new Vditor(editorRef.current, {
        height: '100%',
        mode: 'ir',
        theme: theme === ThemeMode.dark ? 'dark' : 'classic',
        toolbar: [
          'headings',
          'bold',
          'italic',
          'strike',
          'link',
          '|',
          'list',
          'ordered-list',
          'check',
          'outdent',
          'indent',
          '|',
          'quote',
          'line',
          'code',
          'inline-code',
          '|',
          'upload',
          'table',
          '|',
          'undo',
          'redo',
          '|',
          'fullscreen',
          'preview'
        ],
        placeholder: t('notes.content_placeholder'),
        cache: {
          enable: false
        },
        after: () => {
          setVditor(editor)
        },
        input: (value) => {
          // 自动保存当前笔记
          if (activeNodeId) {
            saveCurrentNote(value)
          }
        }
      })
    }

    return () => {
      if (vditor) {
        vditor.destroy()
        setVditor(null)
      }
    }
  }, [theme, activeNodeId, t])

  // 监听主题变化，更新编辑器样式
  useEffect(() => {
    if (vditor) {
      vditor.setTheme(
        theme === ThemeMode.dark ? 'dark' : 'classic',
        theme === ThemeMode.dark ? 'dark' : 'classic',
        theme === ThemeMode.dark ? 'dark' : 'classic'
      )
    }
  }, [theme, vditor])

  // 自动保存笔记内容
  const saveCurrentNote = async (content: string) => {
    if (!activeNodeId) return

    try {
      const activeNode = findNodeById(notesTree, activeNodeId)
      if (activeNode && activeNode.type === 'file') {
        await NotesService.updateNote(activeNode, content)
      }
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }

  // 在树中查找节点
  const findNodeById = (tree: NotesTreeNode[], nodeId: string): NotesTreeNode | null => {
    for (const node of tree) {
      if (node.id === nodeId) {
        return node
      }
      if (node.children) {
        const found = findNodeById(node.children, nodeId)
        if (found) return found
      }
    }
    return null
  }

  // 创建文件夹
  const handleCreateFolder = async (name: string, parentId?: string) => {
    try {
      setIsLoading(true)
      await NotesService.createFolder(name, parentId)
      const updatedTree = await NotesService.getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      console.error('Failed to create folder:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 创建笔记
  const handleCreateNote = async (name: string, parentId?: string) => {
    try {
      setIsLoading(true)
      const newNote = await NotesService.createNote(name, '', parentId)
      const updatedTree = await NotesService.getNotesTree()
      setNotesTree(updatedTree)

      // 自动选择新创建的笔记
      setActiveNodeId(newNote.id)
    } catch (error) {
      console.error('Failed to create note:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 选择节点
  const handleSelectNode = async (node: NotesTreeNode) => {
    if (node.type === 'file') {
      try {
        setIsLoading(true)
        setActiveNodeId(node.id)

        // 读取笔记内容
        const content = await NotesService.readNote(node)

        // 如果编辑器已初始化，则更新内容
        if (vditor) {
          vditor.setValue(content)
        }
      } catch (error) {
        console.error('Failed to load note:', error)
      } finally {
        setIsLoading(false)
      }
    } else if (node.type === 'folder') {
      // 切换文件夹展开状态
      await handleToggleExpanded(node.id)
    }
  }

  // 删除节点
  const handleDeleteNode = async (nodeId: string) => {
    try {
      setIsLoading(true)
      await NotesService.deleteNode(nodeId)
      const updatedTree = await NotesService.getNotesTree()
      setNotesTree(updatedTree)

      // 如果删除的是当前活动节点，清空编辑器
      if (nodeId === activeNodeId) {
        setActiveNodeId(undefined)
        if (vditor) {
          vditor.destroy()
          setVditor(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete node:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 重命名节点
  const handleRenameNode = async (nodeId: string, newName: string) => {
    try {
      setIsLoading(true)
      await NotesService.renameNode(nodeId, newName)
      const updatedTree = await NotesService.getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      console.error('Failed to rename node:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 切换收藏状态
  const handleToggleStarred = async (nodeId: string) => {
    try {
      await NotesService.toggleStarred(nodeId)
      const updatedTree = await NotesService.getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      console.error('Failed to toggle starred:', error)
    }
  }

  // 切换展开状态
  const handleToggleExpanded = async (nodeId: string) => {
    try {
      await NotesService.toggleNodeExpanded(nodeId)
      const updatedTree = await NotesService.getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      console.error('Failed to toggle expanded:', error)
    }
  }

  // 移动节点
  const handleMoveNode = async (nodeId: string, targetParentId?: string) => {
    try {
      setIsLoading(true)
      await NotesService.moveNode(nodeId, targetParentId)
      const updatedTree = await NotesService.getNotesTree()
      setNotesTree(updatedTree)
    } catch (error) {
      console.error('Failed to move node:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container id="notes-page">
      <NotesNavbar />
      <ContentContainer id="content-container">
        {showWorkspace && (
          <NotesSidebar
            notesTree={notesTree}
            activeNodeId={activeNodeId}
            onSelectNode={handleSelectNode}
            onCreateFolder={handleCreateFolder}
            onCreateNote={handleCreateNote}
            onDeleteNode={handleDeleteNode}
            onRenameNode={handleRenameNode}
            onToggleStarred={handleToggleStarred}
            onToggleExpanded={handleToggleExpanded}
            onMoveNode={handleMoveNode}
          />
        )}
        {isLoading && (
          <LoadingOverlay>
            <LoadingText>{t('common.loading')}</LoadingText>
          </LoadingOverlay>
        )}

        <EditorWrapper>
          {activeNodeId ? (
            <EditorContainer ref={editorRef} />
          ) : (
            <MainContent>
              <Empty description={t('notes.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </MainContent>
          )}
        </EditorWrapper>
      </ContentContainer>
    </Container>
  )
}

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  overflow: hidden;
`

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--color-background-rgb), 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const LoadingText = styled.div`
  color: var(--color-text-2);
  font-size: 14px;
`

const EditorWrapper = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`

const EditorContainer = styled.div`
  flex: 1;
  border-radius: 4px;
  overflow: hidden;

  .vditor {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    height: 100%;
  }
`

const MainContent = styled(Scrollbar)`
  padding: 15px 20px;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding-bottom: 50px;
`

export default NotesPage
