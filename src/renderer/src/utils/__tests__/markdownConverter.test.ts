import { describe, expect, it } from 'vitest'

import { htmlToMarkdown, markdownToHtml, sanitizeHtml } from '../markdownConverter'

describe('markdownConverter', () => {
  describe('htmlToMarkdown', () => {
    it('should convert HTML to Markdown', () => {
      const html = '<h1>Hello World</h1>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('# Hello World')
    })

    it('should convert task list HTML back to Markdown', () => {
      const html =
        '<ul data-type="taskList" class="task-list"><li data-type="taskItem" class="task-list-item" data-checked="false"><input type="checkbox" disabled> abcd</li><li data-type="taskItem" class="task-list-item" data-checked="true"><input type="checkbox" checked disabled> efgh</li></ul>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('- [ ] abcd')
      expect(result).toContain('- [x] efgh')
    })

    it('should convert task list HTML back to Markdown with label', () => {
      const html =
        '<ul data-type="taskList" class="task-list"><li data-type="taskItem" class="task-list-item" data-checked="false"><label><input type="checkbox"> abcd</label></li><li data-type="taskItem" class="task-list-item" data-checked="true"><label><input type="checkbox" checked> efgh</lable></li></ul>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('- [ ] abcd\n\n- [x] efgh')
    })

    it('should handle empty HTML', () => {
      const result = htmlToMarkdown('')
      expect(result).toBe('')
    })

    it('should handle null/undefined input', () => {
      expect(htmlToMarkdown(null as any)).toBe('')
      expect(htmlToMarkdown(undefined as any)).toBe('')
    })

    it('should keep math block containers intact', () => {
      const html = '<div data-latex="a+b+c" data-type="block-math"></div>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('$$$a+b+c$$$')
    })

    it('should convert multiple math blocks to Markdown', () => {
      const html =
        '<div data-latex="\\begin{array}{c}\n\\nabla \\times \\vec{\\mathbf{B}} -\\, \\frac1c\\, \\frac{\\partial\\vec{\\mathbf{E}}}{\\partial t} &amp;\n= \\frac{4\\pi}{c}\\vec{\\mathbf{j}}    \\nabla \\cdot \\vec{\\mathbf{E}} &amp; = 4 \\pi \\rho \\\\\n\n\\nabla \\times \\vec{\\mathbf{E}}\\, +\\, \\frac1c\\, \\frac{\\partial\\vec{\\mathbf{B}}}{\\partial t} &amp; = \\vec{\\mathbf{0}} \\\\\n\n\\nabla \\cdot \\vec{\\mathbf{B}} &amp; = 0\n\n\\end{array}" data-type="block-math"></div>'
      const result = htmlToMarkdown(html)
      expect(result).toBe(
        '$$$\\begin{array}{c}\n\\nabla \\times \\vec{\\mathbf{B}} -\\, \\frac1c\\, \\frac{\\partial\\vec{\\mathbf{E}}}{\\partial t} &\n= \\frac{4\\pi}{c}\\vec{\\mathbf{j}}    \\nabla \\cdot \\vec{\\mathbf{E}} & = 4 \\pi \\rho \\\\\n\n\\nabla \\times \\vec{\\mathbf{E}}\\, +\\, \\frac1c\\, \\frac{\\partial\\vec{\\mathbf{B}}}{\\partial t} & = \\vec{\\mathbf{0}} \\\\\n\n\\nabla \\cdot \\vec{\\mathbf{B}} & = 0\n\n\\end{array}$$$'
      )
    })

    it('should convert math inline syntax to Markdown', () => {
      const html = '<span data-latex="a+b+c" data-type="inline-math"></span>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('$$a+b+c$$')
    })

    it('shoud convert multiple math blocks and inline math to Markdown', () => {
      const html =
        '<div data-latex="a+b+c" data-type="block-math"></div><p><span data-latex="d+e+f" data-type="inline-math"></span></p>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('$$$a+b+c$$$\n\n$$d+e+f$$')
    })

    it('should convert heading and img to Markdown', () => {
      const html = '<h1>Hello</h1>\n<p><img src="https://example.com/image.png" alt="alt text" /></p>\n'
      const result = htmlToMarkdown(html)
      expect(result).toBe('# Hello\n\n![alt text](https://example.com/image.png)')
    })

    it('should convert heading and paragraph to Markdown', () => {
      const html = '<h1>Hello</h1>\n<p>Hello</p>\n'
      const result = htmlToMarkdown(html)
      expect(result).toBe('# Hello\n\nHello')
    })

    it('should convert code block to Markdown', () => {
      const html = '<pre><code>console.log("Hello, world!");</code></pre>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('```\nconsole.log("Hello, world!");\n```')
    })

    it('should convert code block with language to Markdown', () => {
      const html = '<pre><code class="language-javascript">console.log("Hello, world!");</code></pre>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('```javascript\nconsole.log("Hello, world!");\n```')
    })

    it('should convert table to Markdown', () => {
      const html =
        '<table><tbody><tr><th ><p>f</p></th><th ><p></p></th><th ><p></p></th></tr><tr><td ><p></p></td><td ><p>f</p></td><td ><p></p></td></tr><tr><td ><p></p></td><td ><p></p></td><td ><p>f</p></td></tr></tbody></table><p></p>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('| f   |     |     |\n| --- | --- | --- |\n|     | f   |     |\n|     |     | f   |')
    })
  })

  describe('markdownToHtml', () => {
    it('should convert \\n to <br>', () => {
      const markdown = 'Hello\nWorld'
      const result = markdownToHtml(markdown)
      expect(result).toBe('<p>Hello\nWorld</p>')
    })

    it('should convert Markdown to HTML', () => {
      const markdown = '# Hello World'
      const result = markdownToHtml(markdown)
      expect(result).toContain('<h1>Hello World</h1>')
    })

    it('should convert math block syntax to HTML', () => {
      const markdown = '$$$a+b+c$$$'
      const result = markdownToHtml(markdown)
      expect(result).toContain('<div data-latex="a+b+c" data-type="block-math"></div>')
    })

    it('should convert math inline syntax to HTML', () => {
      const markdown = '$$a+b+c$$'
      const result = markdownToHtml(markdown)
      expect(result).toContain('<span data-latex="a+b+c" data-type="inline-math"></span>')
    })

    it('should convert multiple math blocks to HTML', () => {
      const markdown = `$$$\\begin{array}{c}
\\nabla \\times \\vec{\\mathbf{B}} -\\, \\frac1c\\, \\frac{\\partial\\vec{\\mathbf{E}}}{\\partial t} &
= \\frac{4\\pi}{c}\\vec{\\mathbf{j}}    \\nabla \\cdot \\vec{\\mathbf{E}} & = 4 \\pi \\rho \\\\

\\nabla \\times \\vec{\\mathbf{E}}\\, +\\, \\frac1c\\, \\frac{\\partial\\vec{\\mathbf{B}}}{\\partial t} & = \\vec{\\mathbf{0}} \\\\

\\nabla \\cdot \\vec{\\mathbf{B}} & = 0

\\end{array}$$$`
      const result = markdownToHtml(markdown)
      expect(result).toContain(
        '<div data-latex="\\begin{array}{c}\n\\nabla \\times \\vec{\\mathbf{B}} -\\, \\frac1c\\, \\frac{\\partial\\vec{\\mathbf{E}}}{\\partial t} &amp;\n= \\frac{4\\pi}{c}\\vec{\\mathbf{j}}    \\nabla \\cdot \\vec{\\mathbf{E}} &amp; = 4 \\pi \\rho \\\\\n\n\\nabla \\times \\vec{\\mathbf{E}}\\, +\\, \\frac1c\\, \\frac{\\partial\\vec{\\mathbf{B}}}{\\partial t} &amp; = \\vec{\\mathbf{0}} \\\\\n\n\\nabla \\cdot \\vec{\\mathbf{B}} &amp; = 0\n\n\\end{array}" data-type="block-math"></div>'
      )
    })

    it('should convert task list syntax to proper HTML', () => {
      const markdown = '- [ ] abcd\n\n- [x] efgh\n\n'
      const result = markdownToHtml(markdown)
      expect(result).toContain('data-type="taskList"')
      expect(result).toContain('data-type="taskItem"')
      expect(result).toContain('data-checked="false"')
      expect(result).toContain('data-checked="true"')
      expect(result).toContain('<input type="checkbox" disabled>')
      expect(result).toContain('<input type="checkbox" checked disabled>')
      expect(result).toContain('abcd')
      expect(result).toContain('efgh')
    })

    it('should convert mixed task list with checked and unchecked items', () => {
      const markdown = '- [ ] First task\n\n- [x] Second task\n\n- [ ] Third task'
      const result = markdownToHtml(markdown)
      expect(result).toContain('data-type="taskList"')
      expect(result).toContain('First task')
      expect(result).toContain('Second task')
      expect(result).toContain('Third task')
      expect(result.match(/data-checked="false"/g)).toHaveLength(2)
      expect(result.match(/data-checked="true"/g)).toHaveLength(1)
    })

    it('should NOT convert standalone task syntax to task list', () => {
      const markdown = '[x] abcd'
      const result = markdownToHtml(markdown)
      expect(result).toContain('<p>[x] abcd</p>')
      expect(result).not.toContain('data-type="taskList"')
    })

    it('should handle regular list items alongside task lists', () => {
      const markdown = '- Regular item\n\n- [ ] Task item\n\n- Another regular item'
      const result = markdownToHtml(markdown)
      expect(result).toContain('data-type="taskList"')
      expect(result).toContain('Regular item')
      expect(result).toContain('Task item')
      expect(result).toContain('Another regular item')
    })

    it('should handle empty Markdown', () => {
      const result = markdownToHtml('')
      expect(result).toBe('')
    })

    it('should handle null/undefined input', () => {
      expect(markdownToHtml(null as any)).toBe('')
      expect(markdownToHtml(undefined as any)).toBe('')
    })

    it('should handle heading and img', () => {
      const markdown = `# 🌠 Screenshot

![](https://example.com/image.png)`
      const result = markdownToHtml(markdown)
      expect(result).toBe('<h1>🌠 Screenshot</h1>\n<p><img src="https://example.com/image.png" alt="" /></p>\n')
    })

    it('should handle heading and paragraph', () => {
      const markdown = '# Hello\n\nHello'
      const result = markdownToHtml(markdown)
      expect(result).toBe('<h1>Hello</h1>\n<p>Hello</p>\n')
    })

    it('should convert code block to HTML', () => {
      const markdown = '```\nconsole.log("Hello, world!");\n```'
      const result = markdownToHtml(markdown)
      expect(result).toBe('<pre><code>console.log("Hello, world!");\n</code></pre>')
    })

    it('should convert code block with language to HTML', () => {
      const markdown = '```javascript\nconsole.log("Hello, world!");\n```'
      const result = markdownToHtml(markdown)
      expect(result).toBe('<pre><code class="language-javascript">console.log("Hello, world!");\n</code></pre>')
    })

    it('should convert table to HTML', () => {
      const markdown = '| f   |     |     |\n| --- | --- | --- |\n|     | f   |     |\n|     |     | f   |'
      const result = markdownToHtml(markdown)
      expect(result).toBe(
        '<table>\n<thead>\n<tr>\n<th>f</th>\n<th></th>\n<th></th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n<td>f</td>\n<td></td>\n</tr>\n<tr>\n<td></td>\n<td></td>\n<td>f</td>\n</tr>\n</tbody>\n</table>\n'
      )
    })

    it('should escape XML-like tags in code blocks', () => {
      const markdown = '```jsx\nconst component = <><div>content</div></>\n```'
      const result = markdownToHtml(markdown)
      expect(result).toBe(
        '<pre><code class="language-jsx">const component = &#x3C;&#x3E;&#x3C;div&#x3E;content&#x3C;/div&#x3E;&#x3C;/&#x3E;\n</code></pre>'
      )
    })

    it('should escape XML-like tags in inline code', () => {
      const markdown = 'Use `<>` for fragments'
      const result = markdownToHtml(markdown)
      expect(result).toBe('<p>Use <code>&#x3C;&#x3E;</code> for fragments</p>\n')
    })

    it('shoud convert XML-like tags in paragraph', () => {
      const markdown = '<abc></abc>'
      const result = markdownToHtml(markdown)
      expect(result).toBe('<p><abc></abc></p>\n')
    })
  })

  describe('sanitizeHtml', () => {
    it('should sanitize HTML content and remove scripts', () => {
      const html = '<h1>Hello</h1><script>alert("xss")</script>'
      const result = sanitizeHtml(html)
      expect(result).toContain('<h1>Hello</h1>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('should preserve task list HTML elements', () => {
      const html =
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><input type="checkbox" checked disabled> Task item</li></ul>'
      const result = sanitizeHtml(html)
      expect(result).toContain('data-type="taskList"')
      expect(result).toContain('data-type="taskItem"')
      expect(result).toContain('data-checked="true"')
      expect(result).toContain('<input type="checkbox"')
      expect(result).toContain('checked')
      expect(result).toContain('disabled')
    })

    it('should handle empty HTML', () => {
      const result = sanitizeHtml('')
      expect(result).toBe('')
    })
  })

  describe('Task List with Labels', () => {
    it('should wrap task items with labels when label option is true', () => {
      const markdown = '- [ ] abcd\n\n- [x] efgh'
      const result = markdownToHtml(markdown)
      expect(result).toBe(
        '<ul data-type="taskList" class="task-list">\n<li data-type="taskItem" class="task-list-item" data-checked="false">\n<p><label><input type="checkbox" disabled> abcd</label></p>\n</li>\n<li data-type="taskItem" class="task-list-item" data-checked="true">\n<p><label><input type="checkbox" checked disabled> efgh</label></p>\n</li>\n</ul>\n'
      )
    })

    it('should preserve labels in sanitized HTML', () => {
      const html =
        '<ul data-type="taskList"><li data-type="taskItem"><label><input type="checkbox" checked disabled> Task with label</label></li></ul>'
      const result = sanitizeHtml(html)
      expect(result).toContain('<label>')
      expect(result).toContain('<input type="checkbox" checked')
      expect(result).toContain('Task with label')
    })
  })

  describe('Task List Round Trip', () => {
    it('should maintain task list structure through markdown → html → markdown conversion', () => {
      const originalMarkdown = '- [ ] abcd\n\n- [x] efgh'
      const html = markdownToHtml(originalMarkdown)
      const backToMarkdown = htmlToMarkdown(html)

      expect(backToMarkdown).toBe(originalMarkdown)
    })

    it('should handle complex task lists with multiple items', () => {
      const originalMarkdown =
        '- [ ] First unchecked task\n\n- [x] First checked task\n\n- [ ] Second unchecked task\n\n- [x] Second checked task'
      const html = markdownToHtml(originalMarkdown)
      const backToMarkdown = htmlToMarkdown(html)

      expect(backToMarkdown).toBe(originalMarkdown)
    })
  })
})
