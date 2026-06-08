# AI File Tools

AI 작업 전에 필요한 파일 변환 기능을 모은 정적 웹사이트입니다.

PDF 압축, PDF 분할, PDF 병합, 이미지 PDF 변환, TXT PDF 변환, 이미지 OCR 텍스트 추출 기능을 제공합니다.

## 프로젝트 소개

AI File Tools는 백엔드 서버 없이 HTML, CSS, JavaScript만으로 작동하는 브라우저 기반 문서 변환 도구입니다.

사용자가 선택한 파일은 서버로 업로드되지 않고 브라우저 내부에서 처리됩니다.

## 주요 기능

- PDF 압축
- PDF 분할 및 페이지 추출
- PDF 병합
- 이미지 PDF 변환
- TXT PDF 변환
- 이미지 OCR 텍스트 추출

## 파일 구조

```text
index.html
style.css
app.js
privacy.html
about.html
contact.html
faq.html
README.md
```

## 실행 방법

1. 별도의 설치나 빌드 과정이 필요하지 않습니다.
2. 모든 파일을 같은 폴더에 저장합니다.
3. `index.html` 파일을 브라우저에서 엽니다.
4. 원하는 기능을 선택해 사용합니다.
5. CDN 라이브러리를 사용하므로 인터넷 연결이 필요합니다.

## Cloudflare Pages 배포 방법

1. GitHub 저장소를 만듭니다.
2. 프로젝트 파일을 저장소 루트에 업로드합니다.
3. Cloudflare Pages에서 새 프로젝트를 생성합니다.
4. GitHub 저장소를 연결합니다.
5. 빌드 설정은 다음처럼 둡니다.

```text
Framework preset: None
Build command: 비워둠
Output directory: /
```

6. 배포를 실행합니다.

## GitHub Pages 배포 방법

1. GitHub 저장소에 파일을 업로드합니다.
2. 저장소 Settings 메뉴로 이동합니다.
3. Pages 메뉴를 엽니다.
4. Branch를 `main`, 폴더를 `/root`로 설정합니다.
5. 저장하면 GitHub Pages 주소가 생성됩니다.

## 사용 라이브러리

### pdf.js

PDF 페이지를 canvas로 렌더링하는 데 사용합니다.

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
```

### pdf-lib

PDF 생성, 페이지 복사, 병합, 이미지 삽입에 사용합니다.

```html
<script src="https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"></script>
```

### Tesseract.js

이미지 속 글자를 OCR로 추출하는 데 사용합니다.

```html
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
```

## 기능 설명

### PDF 압축

PDF 페이지를 이미지로 렌더링한 뒤 JPEG 품질을 낮춰 새 PDF로 저장합니다.

압축 옵션:

- 낮은 압축: scale 1.5, JPEG quality 0.85
- 보통 압축: scale 1.2, JPEG quality 0.70
- 강한 압축: scale 0.9, JPEG quality 0.50

압축 전 용량, 압축 후 용량, 감소율을 표시합니다.

### PDF 분할

사용자가 입력한 페이지 범위만 새 PDF로 저장합니다.

예시:

```text
1-3,5,7-9
```

### PDF 병합

여러 PDF 파일을 선택한 뒤 하나의 PDF로 병합합니다.

### 이미지 PDF 변환

JPG, PNG, WEBP 등 이미지 파일을 PDF로 변환합니다. 여러 이미지를 선택하면 한 PDF 안에 여러 페이지로 저장됩니다.

### TXT PDF 변환

TXT 파일 또는 직접 입력한 텍스트를 PDF로 변환합니다. 한글 표시를 위해 텍스트를 canvas에 그린 뒤 PDF에 이미지로 삽입합니다.

### 이미지 OCR

Tesseract.js를 사용해 이미지 속 글자를 텍스트로 추출합니다. 한국어와 영어 인식을 지원합니다.

## 한계점

- 모든 처리는 브라우저에서 실행되므로 큰 파일은 느릴 수 있습니다.
- PDF 압축 결과는 이미지 PDF가 될 수 있어 텍스트 선택이 어려울 수 있습니다.
- 텍스트 위주의 PDF는 압축 효과가 작을 수 있습니다.
- OCR 정확도는 이미지 품질에 따라 달라집니다.
- 암호화되었거나 손상된 PDF는 처리되지 않을 수 있습니다.
- TXT PDF 변환 결과는 텍스트 선택이 어려울 수 있습니다.

## 향후 개선 아이디어

- PDF 병합 순서 드래그 앤 드롭 변경
- OCR 결과를 PDF로 저장하는 기능
- PDF OCR 기능
- 이미지 회전 기능
- 다크 모드
- 다국어 UI
- 작업 진행률 표시 개선
