import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * BODY 안쪽(innerHTML)만 추출
 */
function extractBodyInnerHtml(htmlString) {
  const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1] != null) {
    return bodyMatch[1].trim();
  }
  return htmlString;
}

function formatForTextarea(fullHtmlClean) {
  // 사람 눈에 보기 좋게: </p><p> 사이에 줄바꿈
  return fullHtmlClean.replace(/><p/gi, '>\n<p');
}

function unformatFromTextarea(formattedHtml) {
  // Quill이 다시 먹기 좋게: 우리가 넣은 줄바꿈을 제거
  // ">\n<p"나 ">   \n   <p" 같은 거 전부 "><p" 로 합쳐줌
  return formattedHtml.replace(/>\s*<p/gi, '><p');
}
/**
 * 기존 fullHtml 안의 <BODY ...>...</BODY> 영역만 교체해서 새로운 fullHtml 문자열을 만든다
 * BODY 태그의 속성(contentEditable, scroll 등)은 유지하고 내부만 교체
 */
function replaceBodyInnerHtml(originalFullHtml, newBodyInnerHtml) {
  const bodyWrapperMatch = originalFullHtml.match(/(<body[^>]*>)([\s\S]*?)(<\/body>)/i);

  if (bodyWrapperMatch) {
    const openTag = bodyWrapperMatch[1];  // <BODY ...>
    const closeTag = bodyWrapperMatch[3]; // </BODY>
    return originalFullHtml.replace(
      /<body[^>]*>[\s\S]*?<\/body>/i,
      `${openTag}\n${newBodyInnerHtml}\n${closeTag}`
    );
  }

  // fallback: BODY가 없으면 새로 감싸서 리턴
  return `
<HTML>
  <HEAD></HEAD>
  <BODY>
    ${newBodyInnerHtml}
  </BODY>
</HTML>`.trim();
}

function QuillTest() {
  // fullHtml: 메일로 저장/전송될 전체 HTML 문서 그대로
  const [fullHtml, setFullHtml] = useState(
`<HTML>
  <HEAD></HEAD>
  <BODY contentEditable="true" scroll="auto">
    <P>&nbsp;</P>
  </BODY>
</HTML>`
  );

  // 현재 화면 모드 ('design' | 'html')
  const [mode, setMode] = useState('design');

  // HTML 탭에서 textarea에 표시/편집할 임시 전체 문서 문자열
  const [rawHtmlDraft, setRawHtmlDraft] = useState('');

  // Quill 인스턴스 참조
  const quillRef = useRef(null);

  /**
   * bodyHtml:
   * - "디자인 모드(Quill 화면)"에서 보여줄 BODY 내부 HTML의 현재 값
   * - 이건 Quill이 현재 가지고 있는 그대로 (줄마다 <p>...</p>)
   */
  const [bodyHtml, setBodyHtml] = useState(() => {
    const initialBody = extractBodyInnerHtml(
      `<HTML><HEAD></HEAD><BODY contentEditable="true" scroll="auto"><P>&nbsp;</P></BODY></HTML>`
    );
    return initialBody;
  });

  /**
   * needsSyncFromState:
   * - true일 때만 bodyHtml을 Quill DOM에 주입한다.
   * - 최초 mount 1번, 그리고 HTML 탭에서 디자인 탭으로 돌아온 직후 1번만 true가 된다.
   * - 편집 중엔 false라서 커서가 안 튕긴다.
   */
  const [needsSyncFromState, setNeedsSyncFromState] = useState(true);

  /**
   * Quill 모듈 설정
   * - toolbar: 기본 편집 툴바
   * - keyboard.bindings.handleEnter:
   *   Enter 눌렀을 때 Quill 기본 동작(새 paragraph 블록 생성)을 어느 정도 제어 가능.
   *   완전 제거는 아니어도, 기본 블록 분리를 최소화해서 우리가 원하는 "줄마다 <p>" 형태 그대로 유지 가능.
   */
  const quillModules = useMemo(() => {
    return {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
      keyboard: {
        bindings: {
          handleEnter: {
            key: 13, // Enter
            handler(range, context) {
              const quill = quillRef.current.getEditor();
              // 기본 엔터 동작(블록 쪼개기) 그대로 써도 된다면 사실 여기서 안 막아도 됨.
              // 만약 원하는 느낌이 기본 Quill 엔터 그대로라면 아래 주석 해제 안 해도 됨.
              //
              // 지금은 "그냥 줄 바꿈" 느낌을 선호할 수도 있어서 이렇게 했었는데,
              // 너는 디자인에서 보이는 그대로 <p> 여러 줄 구조가 HTML 탭에도 나오길 원하니까
              // 오히려 Quill 기본 엔터(새 <p>)를 살리는 게 자연스러워.
              //
              // => 그래서 여기선 false 안 돌려주고 기본 동작 허용.
              return true; // true = Quill 기본 처리 계속 진행시켜라
            },
          },
        },
      },
    };
  }, []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'align',
    'list', 'bullet',
    'link', 'image',
  ];

  /**
   * 디자인 → HTML 탭으로 전환
   * - Quill 현재 BODY 내용을 그대로(raw) 집어온다
   * - 그 raw를 fullHtml의 BODY 안에 그대로 넣는다
   * - textarea에는 그 fullHtml 전체를 그대로 뿌린다
   * - 결국 HTML 탭은 디자인에서 보던 것과 똑같은 <p>...</p><p>...</p> 를 보여주게 된다
   */
function goHtmlMode() {
  const editor = quillRef.current?.getEditor();
  // Quill 실제 BODY HTML (원본, clean)
  const currentBodyRaw = editor
    ? editor.root.innerHTML
    : bodyHtml;

  // BODY에 raw 그대로 넣은 fullHtml (clean)
  const updatedFullClean = replaceBodyInnerHtml(fullHtml, currentBodyRaw);

  // textarea에 보여줄건 보기 좋게 개행 넣은 버전 (formatted)
  const formattedForTextarea = formatForTextarea(updatedFullClean);

  // 상태 저장
  setFullHtml(updatedFullClean);         // clean 유지
  setRawHtmlDraft(formattedForTextarea); // textarea는 formatted로 표시
  setMode('html');
}

  /**
   * HTML → 디자인 탭으로 전환
   * - textarea에서 수정된 전체 문서(rawHtmlDraft)를 fullHtml로 받아들임
   * - 그 안에서 BODY 내부만 추출해서 bodyHtml로 반영
   * - Quill에 bodyHtml을 한 번만 주입해야 하니까 needsSyncFromState=true
   */
function goDesignMode() {
  // textarea에서 유저가 편집한 formatted 버전
  const formattedFromTextarea = rawHtmlDraft;

  // 다시 clean 형태로 복구
  const cleanedFull = unformatFromTextarea(formattedFromTextarea);

  // BODY 안쪽만 뽑아서 Quill로 줄 값
  const newBodyInner = extractBodyInnerHtml(cleanedFull);

  // 상태 업데이트
  setFullHtml(cleanedFull);     // clean 버전으로 저장
  setBodyHtml(newBodyInner);    // Quill이 받아야 할 BODY HTML

  // 다음 렌더에서 Quill에게 bodyHtml을 한 번만 강제로 주입
  setNeedsSyncFromState(true);

  setMode('design');
}

  /**
   * Quill 내용이 바뀔 때마다 호출
   * - 사용자가 타이핑 / 엔터 / 지우기 할 때마다 실행됨
   * - Quill이 들고 있는 raw BODY HTML을 그대로 bodyHtml과 fullHtml에 반영한다
   * - 여기서도 변환(merge, <br> 치환 등) 안 한다.
   *   => 즉, <p>...</p><p>...</p> 형태를 그대로 유지
   */
  function handleQuillChange(content, delta, source, editor) {
    const rawFromQuill = editor.getHTML(); // ex: <p>e</p><p>e</p><p><br></p>
    setBodyHtml(rawFromQuill);

    // fullHtml의 BODY 부분도 raw 그대로 교체
    const updatedFull = replaceBodyInnerHtml(fullHtml, rawFromQuill);
    setFullHtml(updatedFull);
  }

  /**
   * 디자인 모드일 때, really "필요할 때만" Quill DOM을 덮어쓰기
   * - needsSyncFromState === true 일 때만 실행
   * - 최초 마운트, HTML 탭에서 돌아온 직후만 true
   * - 편집 도중엔 false라서 커서가 안 튕긴다
   */
useEffect(() => {
  if (mode === 'design' && needsSyncFromState) {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      quill.setContents([]); // 먼저 비우고
      quill.clipboard.dangerouslyPasteHTML(bodyHtml, 'silent'); // bodyHtml 그대로 넣기
    }
    setNeedsSyncFromState(false);
  }
}, [mode, needsSyncFromState, bodyHtml]);

  /**
   * 저장 버튼
   * - fullHtml 전체(HTML, HEAD, BODY 포함)를 서버로 보내면 된다
   */
  function handleSave() {
    console.log('=== 최종 저장(fullHtml) ===');
    console.log(fullHtml);
    alert('console에 fullHtml 전체 HTML이 찍혔습니다.');
  }

  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: 6,
        fontFamily: 'sans-serif',
        maxWidth: 900,
      }}
    >
      {/* 상단 탭 */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #ccc',
          backgroundColor: '#f9f9f9',
        }}
      >
        <TabButton
          active={mode === 'design'}
          onClick={mode === 'design' ? undefined : goDesignMode}
          label="디자인"
        />
        <TabButton
          active={mode === 'html'}
          onClick={mode === 'html' ? undefined : goHtmlMode}
          label="HTML"
        />
      </div>

      {/* 본문 영역 */}
      <div style={{ padding: 12 }}>
        {mode === 'design' && (
          <div style={{ height: 400 }}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              // value를 직접 주입하지 않는다 (커서 안 튕기게)
              onChange={handleQuillChange}
              modules={quillModules}
              formats={quillFormats}
              style={{ height: '100%' }}
            />
          </div>
        )}

        {mode === 'html' && (
          <textarea
            style={{
              width: '100%',
              height: 400,
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: 1.4,
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: 12,
              resize: 'none',
              outline: 'none',
              whiteSpace: 'pre-wrap',   // 보기 편하게 줄바꿈 유지
            }}
            value={rawHtmlDraft}
            onChange={(e) => setRawHtmlDraft(e.target.value)}
          />
        )}
      </div>

      {/* 하단 영역 */}
      <div
        style={{
          borderTop: '1px solid #eee',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fafafa',
          fontSize: 13,
          color: '#555',
        }}
      >
        <div>
          <strong>fullHtml 길이:</strong> {fullHtml.length} chars
        </div>

        <button
          style={{
            border: '1px solid #555',
            background: '#000',
            color: '#fff',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
          onClick={handleSave}
        >
          전체 HTML 저장
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        border: 'none',
        backgroundColor: active ? '#fff' : 'transparent',
        borderBottom: active ? '2px solid #000' : '2px solid transparent',
        fontWeight: active ? 600 : 400,
        fontSize: 14,
        cursor: active ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export default QuillTest;