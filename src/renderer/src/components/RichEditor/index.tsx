import DragHandle from '@tiptap/extension-drag-handle-react'
import { EditorContent } from '@tiptap/react'
import { t } from 'i18next'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2 } from 'lucide-react'
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'

import { MdiLightbulbOn } from '../Icons/SVGIcon'
import {
  getAllCommands,
  getToolbarCommands,
  registerCommand,
  registerToolbarCommand,
  setCommandAvailability,
  unregisterCommand,
  unregisterToolbarCommand
} from './command'
import { ActionMenu, type ActionMenuItem } from './components/ActionMenu'
import { EditorContent as StyledEditorContent, RichEditorWrapper } from './styles'
import { Toolbar } from './toolbar'
import type { FormattingCommand, RichEditorProps, RichEditorRef } from './types'
import { useRichEditor } from './useRichEditor'

const RichEditor = ({
  ref,
  initialContent = '',
  placeholder = t('richEditor.placeholder'),
  onContentChange,
  onHtmlChange,
  onMarkdownChange,
  onBlur,
  editable = true,
  className = '',
  showToolbar = true,
  minHeight,
  maxHeight,
  initialCommands,
  onCommandsReady
  // toolbarItems: _toolbarItems // TODO: Implement custom toolbar items
}: RichEditorProps & { ref?: React.RefObject<RichEditorRef | null> }) => {
  // Use the rich editor hook for complete editor management
  const { editor, markdown, html, formattingState, setMarkdown, setHtml, clear, getPreviewText } = useRichEditor({
    initialContent,
    onChange: onMarkdownChange,
    onHtmlChange,
    onContentChange,
    onBlur,
    placeholder,
    editable,
    onShowTableActionMenu: ({ position, actions }) => {
      const iconMap: Record<string, React.ReactNode> = {
        insertRowBefore: <ArrowUp size={16} />,
        insertColumnBefore: <ArrowLeft size={16} />,
        insertRowAfter: <ArrowDown size={16} />,
        insertColumnAfter: <ArrowRight size={16} />,
        deleteRow: <Trash2 size={16} />,
        deleteColumn: <Trash2 size={16} />
      }

      const items: ActionMenuItem[] = actions.map((a, idx) => ({
        key: String(idx),
        label: a.label,
        icon: iconMap[a.id],
        onClick: a.action
      }))
      setTableActionMenu({ show: true, position, items })
    }
  })

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Table action menu state
  const [tableActionMenu, setTableActionMenu] = useState<{
    show: boolean
    position: { x: number; y: number }
    items: ActionMenuItem[]
  }>({
    show: false,
    position: { x: 0, y: 0 },
    items: []
  })

  // Register initial commands on mount
  useEffect(() => {
    if (initialCommands) {
      initialCommands.forEach((cmd) => {
        if (cmd.showInToolbar) {
          registerToolbarCommand(cmd)
        } else {
          registerCommand(cmd)
        }
      })
    }
  }, [initialCommands])

  // Call onCommandsReady when editor is ready
  useEffect(() => {
    if (editor && onCommandsReady) {
      const commandAPI = {
        registerCommand,
        registerToolbarCommand,
        unregisterCommand,
        unregisterToolbarCommand,
        setCommandAvailability
      }
      onCommandsReady(commandAPI)
    }
  }, [editor, onCommandsReady])

  // Event listener removed; ActionMenu is triggered via hook callback

  const closeTableActionMenu = () => {
    setTableActionMenu({
      show: false,
      position: { x: 0, y: 0 },
      items: []
    })
  }

  const handleCommand = (command: FormattingCommand) => {
    if (!editor) return

    switch (command) {
      case 'bold':
        editor.chain().focus().toggleBold().run()
        break
      case 'italic':
        editor.chain().focus().toggleItalic().run()
        break
      case 'underline':
        editor.chain().focus().toggleUnderline().run()
        break
      case 'strike':
        editor.chain().focus().toggleStrike().run()
        break
      case 'code':
        editor.chain().focus().toggleCode().run()
        break
      case 'clearMarks':
        editor.chain().focus().unsetAllMarks().run()
        break
      case 'paragraph':
        editor.chain().focus().setParagraph().run()
        break
      case 'heading1':
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case 'heading3':
        editor.chain().focus().toggleHeading({ level: 3 }).run()
        break
      case 'heading4':
        editor.chain().focus().toggleHeading({ level: 4 }).run()
        break
      case 'heading5':
        editor.chain().focus().toggleHeading({ level: 5 }).run()
        break
      case 'heading6':
        editor.chain().focus().toggleHeading({ level: 6 }).run()
        break
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run()
        break
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run()
        break
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run()
        break
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run()
        break
      case 'link': {
        const { selection } = editor.state
        const { $from } = selection

        // 如果当前已经是链接，则取消链接
        if (editor.isActive('link')) {
          editor.chain().focus().unsetLink().run()
        } else {
          // 获取当前段落的文本内容
          const paragraphText = $from.parent.textContent

          // 如果段落有文本，将段落文本设置为链接
          if (paragraphText.trim()) {
            const url = paragraphText.trim().startsWith('http')
              ? paragraphText.trim()
              : `https://${paragraphText.trim()}`

            try {
              const { $from } = selection
              const start = $from.start()
              const end = $from.end()
              editor.chain().focus().setTextSelection({ from: start, to: end }).setLink({ href: url }).run()
            } catch (error) {
              editor.chain().focus().toggleLink().run()
            }
          } else {
            editor.chain().focus().toggleLink().run()
          }
        }
        break
      }
      case 'undo':
        editor.chain().focus().undo().run()
        break
      case 'redo':
        editor.chain().focus().redo().run()
        break
      case 'blockMath': {
        // Math is handled by the MathInputDialog component in toolbar
        // This case is here for completeness but shouldn't be called directly
        break
      }
      case 'table':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        break
      case 'image':
        // Image insertion is handled by the ImageUploader component in toolbar
        // This case is here for completeness but shouldn't be called directly
        break
    }
  }

  // Expose editor methods via ref
  useImperativeHandle(
    ref,
    () => ({
      getContent: () => editor?.getText() || '',
      getHtml: () => html,
      getMarkdown: () => markdown,
      setContent: (content: string) => {
        editor?.commands.setContent(content)
      },
      setHtml: (htmlContent: string) => {
        setHtml(htmlContent)
      },
      setMarkdown: (markdownContent: string) => {
        setMarkdown(markdownContent)
      },
      focus: () => {
        editor?.commands.focus()
      },
      clear: () => {
        clear()
        editor?.commands.clearContent()
      },
      insertText: (text: string) => {
        editor?.commands.insertContent(text)
      },
      executeCommand: (command: string, value?: any) => {
        if (editor?.commands && command in editor.commands) {
          editor.commands[command](value)
        }
      },
      getPreviewText: (maxLength?: number) => {
        return getPreviewText(markdown, maxLength)
      },
      getScrollTop: () => {
        return scrollContainerRef.current?.scrollTop ?? 0
      },
      setScrollTop: (value: number) => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = value
        }
      },
      // Dynamic command management
      registerCommand,
      registerToolbarCommand,
      unregisterCommand,
      unregisterToolbarCommand,
      setCommandAvailability,
      getAllCommands,
      getToolbarCommands
    }),
    [editor, html, markdown, setHtml, setMarkdown, clear, getPreviewText]
  )

  return (
    <RichEditorWrapper className={`rich-editor-wrapper ${className}`} $minHeight={minHeight} $maxHeight={maxHeight}>
      {showToolbar && <Toolbar editor={editor} formattingState={formattingState} onCommand={handleCommand} />}
      <StyledEditorContent ref={scrollContainerRef}>
        <DragHandle editor={editor}>
          <MdiLightbulbOn />
        </DragHandle>
        <EditorContent editor={editor} />
      </StyledEditorContent>
      <ActionMenu
        show={tableActionMenu.show}
        position={tableActionMenu.position}
        items={tableActionMenu.items}
        onClose={closeTableActionMenu}
      />
    </RichEditorWrapper>
  )
}

RichEditor.displayName = 'RichEditor'

export default RichEditor
