import { Mark, Node, mergeAttributes } from '@tiptap/core'
import { TextStyle, Color, FontFamily } from '@tiptap/extension-text-style'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    underlineMark: {
      setUnderline: () => ReturnType
      toggleUnderline: () => ReturnType
      unsetUnderline: () => ReturnType
    }
    linkMark: {
      setLink: (attributes: { href: string; target?: string; rel?: string }) => ReturnType
      unsetLink: () => ReturnType
    }
    imageBlock: {
      setImageBlock: (options: { src: string; alt?: string; title?: string; width?: string }) => ReturnType
    }
  }
}

const UnderlineMark = Mark.create({
  name: 'underline',
  parseHTML() {
    return [{ tag: 'u' }, { style: 'text-decoration=underline' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['u', mergeAttributes(HTMLAttributes, { class: 'editor-underline' }), 0]
  },
  addCommands() {
    return {
      setUnderline:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleUnderline:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetUnderline:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})

const LinkMark = Mark.create({
  name: 'link',
  inclusive: false,
  addAttributes() {
    return {
      href: { default: null },
      target: { default: '_blank' },
      rel: { default: 'noopener noreferrer' },
    }
  },
  parseHTML() {
    return [{ tag: 'a[href]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes), 0]
  },
  addCommands() {
    return {
      setLink:
        (attributes) =>
        ({ chain }) =>
          chain().setMark(this.name, attributes).run(),
      unsetLink:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    }
  },
})

const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: '100%' },
    }
  },
  parseHTML() {
    return [{ tag: 'img[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    const width = typeof HTMLAttributes.width === 'string' ? HTMLAttributes.width : '100%'
    return ['div', { class: 'editor-image-wrap' }, ['img', mergeAttributes(HTMLAttributes, { class: 'editor-image', loading: 'lazy', style: `width: ${width};` })]]
  },
  addCommands() {
    return {
      setImageBlock:
        (options) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    }
  },
})

export const editorExtensions = [TextStyle, Color, FontFamily, UnderlineMark, LinkMark, ImageBlock]
