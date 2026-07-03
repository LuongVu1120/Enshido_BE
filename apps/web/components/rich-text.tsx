'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import clsx from 'clsx';

// ─── Phase 010 — Trình soạn ghi chú rich content (TipTap WYSIWYG) ────────────
// Output HTML; server vẫn sanitize lại khi lưu (Hiến pháp VI). Trang chỉ "xem"
// dùng <RichTextView> (không nạp TipTap → không gánh bundle).

function ToolbarButton({ active, disabled, onClick, title, children }: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // giữ selection trong editor
      onClick={onClick}
      className={clsx(
        'h-7 min-w-7 rounded px-1.5 text-sm font-medium transition disabled:opacity-40',
        active ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Nhập liên kết (http/https/mailto):', prev ?? 'https://');
    if (url === null) return; // hủy
    if (url.trim() === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1">
      <ToolbarButton title="Đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
      <ToolbarButton title="Nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolbarButton>
      <ToolbarButton title="Gạch chân" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarButton>
      <ToolbarButton title="Gạch ngang" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <ToolbarButton title="Tiêu đề" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H</ToolbarButton>
      <ToolbarButton title="Danh sách chấm" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</ToolbarButton>
      <ToolbarButton title="Danh sách số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
      <ToolbarButton title="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolbarButton>
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <ToolbarButton title="Liên kết" active={editor.isActive('link')} onClick={setLink}>🔗</ToolbarButton>
      <ToolbarButton title="Xóa định dạng" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>⌫</ToolbarButton>
    </div>
  );
}

export function RichText({ value, onChange, placeholder }: {
  value: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false, // tránh lệch hydration trong Next.js App Router
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener nofollow', target: '_blank' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Nhập ghi chú...' }),
    ],
    content: value || '',
    editorProps: { attributes: { class: 'rich-content min-h-[120px] px-3 py-2' } },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Đồng bộ khi value đến muộn (trang sửa đơn load async) mà không phá con trỏ.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || '';
    if (incoming !== current && incoming !== (current === '<p></p>' ? '' : current)) {
      editor.commands.setContent(incoming, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

// Khối hiển thị ghi chú (HTML đã sanitize ở server). Fallback text thuần an toàn.
export function RichTextView({ html, className }: { html?: string | null; className?: string }) {
  if (!html || !html.trim()) return <p className="text-sm text-slate-400">Chưa có ghi chú.</p>;
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(html);
  if (looksHtml) {
    return <div className={clsx('rich-content', className)} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  // Ghi chú cũ (text thuần) — giữ xuống dòng, không cho HTML chen vào.
  return <div className={clsx('rich-content whitespace-pre-wrap', className)}>{html}</div>;
}
