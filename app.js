// 이 사이트의 파일 처리는 서버 업로드 없이 브라우저 내부에서만 실행됩니다.
// pdf.js: PDF 페이지 렌더링
// pdf-lib: PDF 생성, 분할, 병합, 이미지 삽입
// Tesseract.js: 이미지 OCR 텍스트 추출

const { PDFDocument } = PDFLib;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const compressionOptions = {
  low: { scale: 1.5, quality: 0.85 },
  medium: { scale: 1.2, quality: 0.7 },
  high: { scale: 0.9, quality: 0.5 }
};

const objectUrls = {
  compress: null,
  split: null,
  merge: null,
  imagePdf: null,
  textPdf: null,
  ocrText: null
};

const A4 = {
  width: 595.28,
  height: 841.89,
  margin: 42
};

const $ = (id) => document.getElementById(id);

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `status ${type}`.trim();
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function resetDownload(type, resultBox, link) {
  if (resultBox) resultBox.classList.add("hidden");
  if (link) link.removeAttribute("href");

  if (objectUrls[type]) {
    URL.revokeObjectURL(objectUrls[type]);
    objectUrls[type] = null;
  }
}

function showDownload(type, bytes, filename, mimeType, resultBox, link) {
  const blob = new Blob([bytes], { type: mimeType });
  objectUrls[type] = URL.createObjectURL(blob);

  link.href = objectUrls[type];
  link.download = filename;

  if (resultBox) resultBox.classList.remove("hidden");
}

function getSelectedCompressionOption() {
  const selected = document.querySelector('input[name="compressionLevel"]:checked');
  return compressionOptions[selected ? selected.value : "medium"];
}

function canvasToBlob(canvas, type = "image/jpeg", quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("이미지 변환에 실패했습니다."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

async function canvasToJpegBytes(canvas, quality) {
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  return await blob.arrayBuffer();
}

async function compressPdf() {
  const fileInput = $("compressFile");
  const status = $("compressStatus");
  const resultBox = $("compressResult");
  const downloadLink = $("compressDownload");

  resetDownload("compress", resultBox, downloadLink);

  if (!fileInput.files.length) {
    setStatus(status, "PDF 파일을 먼저 선택해주세요.", "error");
    return;
  }

  const file = fileInput.files[0];
  const option = getSelectedCompressionOption();

  try {
    setStatus(status, "처리 중입니다. PDF 페이지를 이미지로 변환하고 있습니다.");

    const sourceBytes = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: sourceBytes.slice(0) });
    const pdf = await loadingTask.promise;
    const outputPdf = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setStatus(status, `처리 중입니다. ${pageNumber}/${pdf.numPages} 페이지 변환 중...`);

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: option.scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: context, viewport }).promise;

      const jpgBytes = await canvasToJpegBytes(canvas, option.quality);
      const jpgImage = await outputPdf.embedJpg(jpgBytes);

      const newPage = outputPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height
      });

      canvas.width = 0;
      canvas.height = 0;
    }

    const compressedBytes = await outputPdf.save();
    const beforeSize = file.size;
    const afterSize = compressedBytes.length;
    const reduction = ((beforeSize - afterSize) / beforeSize) * 100;

    $("compressBefore").textContent = formatBytes(beforeSize);
    $("compressAfter").textContent = formatBytes(afterSize);
    $("compressReduction").textContent = `${reduction.toFixed(1)}%`;

    showDownload("compress", compressedBytes, "compressed.pdf", "application/pdf", resultBox, downloadLink);
    setStatus(status, "PDF 압축이 완료되었습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, "PDF 압축 중 오류가 발생했습니다. 암호화되었거나 손상된 PDF일 수 있습니다.", "error");
  }
}

async function updateSplitPageCount() {
  const fileInput = $("splitFile");
  const totalPagesElement = $("splitTotalPages");
  const status = $("splitStatus");

  $("splitResult").classList.add("hidden");
  totalPagesElement.textContent = "-";

  if (!fileInput.files.length) return;

  try {
    const bytes = await fileInput.files[0].arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    totalPagesElement.textContent = String(pdf.getPageCount());
    setStatus(status, "페이지 수를 확인했습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, "PDF 페이지 수를 확인할 수 없습니다.", "error");
  }
}

function validatePageNumber(page, totalPages) {
  if (page < 1 || page > totalPages) {
    throw new Error(`페이지 번호는 1부터 ${totalPages} 사이여야 합니다.`);
  }
}

function parsePageRange(input, totalPages) {
  const normalized = input.replace(/\s/g, "");

  if (!normalized) {
    throw new Error("페이지 범위를 입력해주세요.");
  }

  const pages = [];

  for (const part of normalized.split(",")) {
    if (/^\d+$/.test(part)) {
      const page = Number(part);
      validatePageNumber(page, totalPages);
      pages.push(page - 1);
      continue;
    }

    if (/^\d+-\d+$/.test(part)) {
      const [start, end] = part.split("-").map(Number);

      if (start > end) {
        throw new Error("페이지 범위의 시작 번호가 끝 번호보다 클 수 없습니다.");
      }

      validatePageNumber(start, totalPages);
      validatePageNumber(end, totalPages);

      for (let page = start; page <= end; page += 1) {
        pages.push(page - 1);
      }

      continue;
    }

    throw new Error("페이지 범위 형식이 올바르지 않습니다. 예: 1-3,5,7-9");
  }

  return [...new Set(pages)];
}

async function splitPdf() {
  const fileInput = $("splitFile");
  const rangeInput = $("splitRange");
  const status = $("splitStatus");
  const resultBox = $("splitResult");
  const downloadLink = $("splitDownload");

  resetDownload("split", resultBox, downloadLink);

  if (!fileInput.files.length) {
    setStatus(status, "PDF 파일을 먼저 선택해주세요.", "error");
    return;
  }

  try {
    setStatus(status, "처리 중입니다. 선택한 페이지를 추출하고 있습니다.");

    const sourceBytes = await fileInput.files[0].arrayBuffer();
    const sourcePdf = await PDFDocument.load(sourceBytes);
    const totalPages = sourcePdf.getPageCount();
    const selectedIndexes = parsePageRange(rangeInput.value, totalPages);

    const outputPdf = await PDFDocument.create();
    const copiedPages = await outputPdf.copyPages(sourcePdf, selectedIndexes);

    copiedPages.forEach((page) => outputPdf.addPage(page));

    const splitBytes = await outputPdf.save();

    showDownload("split", splitBytes, "extracted.pdf", "application/pdf", resultBox, downloadLink);
    setStatus(status, "페이지 추출이 완료되었습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, error.message || "PDF 분할 중 오류가 발생했습니다.", "error");
  }
}

function updateMergeList() {
  const fileInput = $("mergeFiles");
  const list = $("mergeList");
  const status = $("mergeStatus");

  $("mergeResult").classList.add("hidden");
  list.innerHTML = "";

  if (!fileInput.files.length) {
    setStatus(status, "");
    return;
  }

  Array.from(fileInput.files).forEach((file, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${file.name} (${formatBytes(file.size)})`;
    list.appendChild(item);
  });

  setStatus(status, `${fileInput.files.length}개의 PDF가 선택되었습니다.`);
}

async function mergePdfs() {
  const fileInput = $("mergeFiles");
  const status = $("mergeStatus");
  const resultBox = $("mergeResult");
  const downloadLink = $("mergeDownload");

  resetDownload("merge", resultBox, downloadLink);

  if (!fileInput.files.length) {
    setStatus(status, "PDF 파일을 먼저 선택해주세요.", "error");
    return;
  }

  if (fileInput.files.length < 2) {
    setStatus(status, "병합하려면 PDF 파일을 2개 이상 선택해주세요.", "error");
    return;
  }

  try {
    setStatus(status, "처리 중입니다. PDF 파일을 병합하고 있습니다.");

    const outputPdf = await PDFDocument.create();
    const files = Array.from(fileInput.files);

    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const file = files[fileIndex];
      setStatus(status, `처리 중입니다. ${fileIndex + 1}/${files.length} 파일 병합 중...`);

      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes);
      const copiedPages = await outputPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

      copiedPages.forEach((page) => outputPdf.addPage(page));
    }

    const mergedBytes = await outputPdf.save();

    showDownload("merge", mergedBytes, "merged.pdf", "application/pdf", resultBox, downloadLink);
    setStatus(status, "PDF 병합이 완료되었습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, "PDF 병합 중 오류가 발생했습니다. 파일이 손상되지 않았는지 확인해주세요.", "error");
  }
}

function updateImageList() {
  const fileInput = $("imageFiles");
  const list = $("imageList");
  const status = $("imagePdfStatus");

  $("imagePdfResult").classList.add("hidden");
  list.innerHTML = "";

  if (!fileInput.files.length) {
    setStatus(status, "");
    return;
  }

  Array.from(fileInput.files).forEach((file, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${file.name} (${formatBytes(file.size)})`;
    list.appendChild(item);
  });

  setStatus(status, `${fileInput.files.length}개의 이미지가 선택되었습니다.`);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 파일을 읽을 수 없습니다."));
    };

    image.src = url;
  });
}

async function imageToJpegBytes(file) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  // 투명 배경 PNG도 PDF에서 보기 좋도록 흰 배경을 깔아줍니다.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const jpgBytes = await canvasToJpegBytes(canvas, 0.92);

  canvas.width = 0;
  canvas.height = 0;

  return {
    bytes: jpgBytes,
    width: image.naturalWidth,
    height: image.naturalHeight
  };
}

function fitInsidePage(imageWidth, imageHeight) {
  const maxWidth = A4.width - A4.margin * 2;
  const maxHeight = A4.height - A4.margin * 2;
  const ratio = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);

  const width = imageWidth * ratio;
  const height = imageHeight * ratio;

  return {
    width,
    height,
    x: (A4.width - width) / 2,
    y: (A4.height - height) / 2
  };
}

async function convertImagesToPdf() {
  const fileInput = $("imageFiles");
  const status = $("imagePdfStatus");
  const resultBox = $("imagePdfResult");
  const downloadLink = $("imagePdfDownload");

  resetDownload("imagePdf", resultBox, downloadLink);

  if (!fileInput.files.length) {
    setStatus(status, "이미지 파일을 먼저 선택해주세요.", "error");
    return;
  }

  try {
    setStatus(status, "처리 중입니다. 이미지를 PDF로 변환하고 있습니다.");

    const outputPdf = await PDFDocument.create();
    const files = Array.from(fileInput.files);

    for (let index = 0; index < files.length; index += 1) {
      setStatus(status, `처리 중입니다. ${index + 1}/${files.length} 이미지 변환 중...`);

      const imageData = await imageToJpegBytes(files[index]);
      const jpgImage = await outputPdf.embedJpg(imageData.bytes);
      const page = outputPdf.addPage([A4.width, A4.height]);
      const fitted = fitInsidePage(imageData.width, imageData.height);

      page.drawImage(jpgImage, fitted);
    }

    const pdfBytes = await outputPdf.save();

    showDownload("imagePdf", pdfBytes, "images.pdf", "application/pdf", resultBox, downloadLink);
    setStatus(status, "이미지 PDF 변환이 완료되었습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, "이미지 PDF 변환 중 오류가 발생했습니다.", "error");
  }
}

async function loadTextFile() {
  const fileInput = $("textFile");
  const textArea = $("textContent");
  const status = $("textPdfStatus");

  $("textPdfResult").classList.add("hidden");

  if (!fileInput.files.length) return;

  try {
    const text = await fileInput.files[0].text();
    textArea.value = text;
    setStatus(status, "텍스트 파일을 불러왔습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, "텍스트 파일을 읽을 수 없습니다.", "error");
  }
}

function wrapText(context, text, maxWidth) {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      lines.push("");
      return;
    }

    let line = "";

    for (const char of paragraph) {
      const testLine = line + char;
      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = testLine;
      }
    }

    if (line) lines.push(line);
  });

  return lines;
}

async function textPageToImageBytes(lines, startIndex, linesPerPage) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 1240;
  canvas.height = 1754;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#142033";
  context.font = "32px Arial, sans-serif";
  context.textBaseline = "top";

  const margin = 90;
  const lineHeight = 52;
  const pageLines = lines.slice(startIndex, startIndex + linesPerPage);

  pageLines.forEach((line, index) => {
    context.fillText(line, margin, margin + index * lineHeight);
  });

  const jpgBytes = await canvasToJpegBytes(canvas, 0.95);

  canvas.width = 0;
  canvas.height = 0;

  return jpgBytes;
}

async function convertTextToPdf() {
  const textArea = $("textContent");
  const status = $("textPdfStatus");
  const resultBox = $("textPdfResult");
  const downloadLink = $("textPdfDownload");

  resetDownload("textPdf", resultBox, downloadLink);

  const text = textArea.value.trim();

  if (!text) {
    setStatus(status, "변환할 텍스트를 입력하거나 TXT 파일을 선택해주세요.", "error");
    return;
  }

  try {
    setStatus(status, "처리 중입니다. 텍스트를 PDF로 변환하고 있습니다.");

    const measuringCanvas = document.createElement("canvas");
    const measuringContext = measuringCanvas.getContext("2d");
    measuringContext.font = "32px Arial, sans-serif";

    const lines = wrapText(measuringContext, text, 1060);
    const linesPerPage = 30;
    const outputPdf = await PDFDocument.create();

    for (let start = 0; start < lines.length; start += linesPerPage) {
      setStatus(status, `처리 중입니다. ${Math.floor(start / linesPerPage) + 1} 페이지 생성 중...`);

      const jpgBytes = await textPageToImageBytes(lines, start, linesPerPage);
      const jpgImage = await outputPdf.embedJpg(jpgBytes);
      const page = outputPdf.addPage([A4.width, A4.height]);

      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: A4.width,
        height: A4.height
      });
    }

    const pdfBytes = await outputPdf.save();

    showDownload("textPdf", pdfBytes, "text.pdf", "application/pdf", resultBox, downloadLink);
    setStatus(status, "TXT PDF 변환이 완료되었습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, "텍스트 PDF 변환 중 오류가 발생했습니다.", "error");
  }
}

async function runOcr() {
  const fileInput = $("ocrImage");
  const output = $("ocrOutput");
  const status = $("ocrStatus");

  output.value = "";

  if (!fileInput.files.length) {
    setStatus(status, "OCR을 실행할 이미지 파일을 선택해주세요.", "error");
    return;
  }

  try {
    setStatus(status, "처리 중입니다. OCR 언어 데이터를 준비하고 있습니다.");

    const result = await Tesseract.recognize(fileInput.files[0], "kor+eng", {
      logger: (message) => {
        if (message.status === "recognizing text") {
          const percent = Math.round((message.progress || 0) * 100);
          setStatus(status, `처리 중입니다. OCR 인식 중... ${percent}%`);
        }
      }
    });

    output.value = result.data.text.trim();
    setStatus(status, "OCR 추출이 완료되었습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, "OCR 처리 중 오류가 발생했습니다. 더 선명한 이미지로 다시 시도해주세요.", "error");
  }
}

async function copyOcrText() {
  const output = $("ocrOutput");
  const status = $("ocrStatus");

  if (!output.value.trim()) {
    setStatus(status, "복사할 OCR 결과가 없습니다.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(output.value);
    setStatus(status, "OCR 결과를 복사했습니다.", "success");
  } catch (error) {
    console.error(error);
    setStatus(status, "브라우저에서 복사를 허용하지 않았습니다. 직접 선택해서 복사해주세요.", "error");
  }
}

function downloadOcrText() {
  const output = $("ocrOutput");
  const status = $("ocrStatus");

  if (!output.value.trim()) {
    setStatus(status, "다운로드할 OCR 결과가 없습니다.", "error");
    return;
  }

  resetDownload("ocrText", null, null);

  const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
  objectUrls.ocrText = URL.createObjectURL(blob);

  const tempLink = document.createElement("a");
  tempLink.href = objectUrls.ocrText;
  tempLink.download = "ocr-result.txt";
  tempLink.click();

  setStatus(status, "OCR 결과 TXT 파일을 다운로드했습니다.", "success");
}

document.addEventListener("DOMContentLoaded", () => {
  $("compressButton").addEventListener("click", compressPdf);

  $("splitFile").addEventListener("change", updateSplitPageCount);
  $("splitButton").addEventListener("click", splitPdf);

  $("mergeFiles").addEventListener("change", updateMergeList);
  $("mergeButton").addEventListener("click", mergePdfs);

  $("imageFiles").addEventListener("change", updateImageList);
  $("imagePdfButton").addEventListener("click", convertImagesToPdf);

  $("textFile").addEventListener("change", loadTextFile);
  $("textPdfButton").addEventListener("click", convertTextToPdf);

  $("ocrButton").addEventListener("click", runOcr);
  $("copyOcrButton").addEventListener("click", copyOcrText);
  $("downloadOcrButton").addEventListener("click", downloadOcrText);
});