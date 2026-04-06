import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/** BODY 안쪽(innerHTML)만 추출 */
function extractBodyInnerHtml(htmlString) {
  const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1] != null) {
    return bodyMatch[1].trim();
  }
  return htmlString;
}

/** textarea 보기용 줄바꿈 */
function formatForTextarea(fullHtmlClean) {
  return fullHtmlClean.replace(/><p/gi, '>\n<p');
}

/** 다시 Quill용으로 복구 */
function unformatFromTextarea(formattedHtml) {
  return formattedHtml.replace(/>\s*<p/gi, '><p');
}

/** BODY 내부만 교체 */
function replaceBodyInnerHtml(originalFullHtml, newBodyInnerHtml) {
  const bodyWrapperMatch = originalFullHtml.match(/(<body[^>]*>)([\s\S]*?)(<\/body>)/i);

  if (bodyWrapperMatch) {
    const openTag = bodyWrapperMatch[1];
    const closeTag = bodyWrapperMatch[3];
    return originalFullHtml.replace(
      /<body[^>]*>[\s\S]*?<\/body>/i,
      `${openTag}\n${newBodyInnerHtml}\n${closeTag}`
    );
  }

  return `
<HTML>
  <HEAD></HEAD>
  <BODY>
${newBodyInnerHtml}
  </BODY>
</HTML>`.trim();
}

function QuillTest() {
  const initialFullHtml = `<HTML>
  <HEAD></HEAD>
  <BODY contentEditable="true" scroll="auto">
    <P>&nbsp;</P>
  </BODY>
</HTML>`;

  const [fullHtml, setFullHtml] = useState(initialFullHtml);
  const [mode, setMode] = useState('design');
  const [rawHtmlDraft, setRawHtmlDraft] = useState('');
  const quillRef = useRef(null);

  const [bodyHtml, setBodyHtml] = useState(() =>
    extractBodyInnerHtml(initialFullHtml)
  );

  const [needsSyncFromState, setNeedsSyncFromState] = useState(true);

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ align: [] }],
      ['link'],
      ['clean'],
    ],
  }), []);

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'align', 'link'
  ];

  /** 디자인 → HTML */
  function goHtmlMode() {
    const editor = quillRef.current?.getEditor();
    const currentBody = editor ? editor.root.innerHTML : bodyHtml;

    const cleanFull = replaceBodyInnerHtml(fullHtml, currentBody);
    const formatted = formatForTextarea(cleanFull);

    setFullHtml(cleanFull);
    setRawHtmlDraft(formatted);
    setMode('html');
  }

  /** HTML → 디자인 */
  function goDesignMode() {
    const cleaned = unformatFromTextarea(rawHtmlDraft);
    const newBody = extractBodyInnerHtml(cleaned);

    setFullHtml(cleaned);
    setBodyHtml(newBody);
    setNeedsSyncFromState(true);
    setMode('design');
  }

  /** Quill 변경 */
  function handleQuillChange(content, delta, source, editor) {
    const html = editor.getHTML();
    setBodyHtml(html);
    setFullHtml(prev => replaceBodyInnerHtml(prev, html));
  }

  /** Quill 동기화 */
  useEffect(() => {
    if (mode === 'design' && needsSyncFromState) {
      const quill = quillRef.current?.getEditor();
      if (quill) {
        quill.setContents([]);
        quill.clipboard.dangerouslyPasteHTML(bodyHtml, 'silent');

        // 🔥 커서 맨 끝으로 이동 (앞글자 날아가는 문제 해결)
        setTimeout(() => {
          const length = quill.getLength();
          quill.setSelection(length, 0);
        }, 0);
      }
      setNeedsSyncFromState(false);
    }
  }, [mode, needsSyncFromState, bodyHtml]);

  return (
    <div style={{
      border: '1px solid #ccc',
      borderRadius: 6,
      maxWidth: 900
    }}>
      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        <TabButton active={mode === 'design'} onClick={goDesignMode} label="디자인" />
        <TabButton active={mode === 'html'} onClick={goHtmlMode} label="HTML" />
      </div>

      {/* 내용 */}
      <div style={{ padding: 12 }}>
        <div style={{ height: 400 }}>
          {mode === 'design' && (
            <ReactQuill
              ref={quillRef}
              theme="snow"
              onChange={handleQuillChange}
              modules={quillModules}
              formats={quillFormats}
              style={{ height: '100%' }}
            />
          )}

          {mode === 'html' && (
            <textarea
              value={rawHtmlDraft}
              onChange={(e) => setRawHtmlDraft(e.target.value)}
              style={{
                width: '100%',
                height: '100%',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                border: '1px solid #ccc',
                padding: 10
              }}
            />
          )}
        </div>
      </div>

      {/* 스타일 핵심 */}
      <style>
        {`
        .ql-toolbar {
          height: 42px;
        }
        .ql-container {
          height: calc(100% - 42px);
        }
        .ql-editor {
          height: 100%;
          overflow-y: auto;
        }
        `}
      </style>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={active ? undefined : onClick}
      style={{
        flex: 1,
        padding: 10,
        border: 'none',
        background: active ? '#fff' : '#eee',
        borderBottom: active ? '2px solid black' : 'none'
      }}
    >
      {label}
    </button>
  );
}

export default QuillTest;