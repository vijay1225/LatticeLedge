import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CodeBlockComponent } from './CodeBlockComponent';
import { ImageNodeView } from './ImageNodeView';
import { VideoNodeView } from './VideoNodeView';

/**
 * Custom Image Node matching standard Markdown `![alt](src "title")`.
 * Resolves local vault assets (e.g. `assets/image.png`) as well as web URLs.
 */
export const CustomImageNode = Node.create({
  name: 'image',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element: HTMLElement) => ({
          src: element.getAttribute('src'),
          alt: element.getAttribute('alt'),
          title: element.getAttribute('title')
        })
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

/**
 * Custom Video Node matching HTML5 `<video src="..."></video>` and YouTube embeds.
 */
export const CustomVideoNode = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
      isYoutube: {
        default: false,
      },
      isShort: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-is-short') === 'true' || Boolean(element.getAttribute('src')?.includes('/shorts/')),
        renderHTML: (attributes) => attributes.isShort ? { 'data-is-short': 'true' } : {}
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'video',
        getAttrs: (element: HTMLElement) => ({
          src: element.getAttribute('src') || element.querySelector('source')?.getAttribute('src'),
          controls: element.hasAttribute('controls'),
          isYoutube: false,
          isShort: false
        })
      },
      {
        tag: 'iframe[src*="youtube.com"], iframe[src*="youtu.be"], iframe[src*="vimeo.com"]',
        getAttrs: (element: HTMLElement) => {
          const src = element.getAttribute('src');
          const isShort = element.getAttribute('data-is-short') === 'true' || Boolean(src && src.includes('/shorts/'));
          return {
            src,
            isYoutube: true,
            isShort
          };
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    if (HTMLAttributes.isYoutube || HTMLAttributes.src?.includes('youtube') || HTMLAttributes.src?.includes('youtu.be')) {
      const isShort = Boolean(HTMLAttributes.isShort || HTMLAttributes.src?.includes('/shorts/'));
      return [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          class: isShort ? 'aspect-[9/16] max-w-[340px] mx-auto w-full rounded-xl' : 'aspect-video w-full rounded-xl',
          allowfullscreen: 'true'
        })
      ];
    }

    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: 'true',
        class: 'w-full rounded-xl'
      })
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },
});

/**
 * Custom CodeBlock Node with language selector and 1-click Copy button.
 */
export const CustomCodeBlockNode = Node.create({
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  addAttributes() {
    return {
      language: {
        default: 'plaintext',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
        getAttrs: (node: HTMLElement) => {
          const code = node.querySelector('code');
          const className = code?.getAttribute('class') || node.getAttribute('class') || '';
          const match = className.match(/language-(\w+)/);
          return {
            language: match ? match[1] : 'plaintext',
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(HTMLAttributes),
      ['code', { class: node.attrs.language ? `language-${node.attrs.language}` : '' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
});
