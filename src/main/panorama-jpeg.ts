/**
 * panorama-jpeg.ts
 *
 * Rendererが生成したJPEGを検証し、正距円筒図法の画像として認識させるための
 * GPano XMPを既存セグメントを保持したまま埋め込む。
 */

const JPEG_MARKER_PREFIX = 0xff
const JPEG_SOI = 0xd8
const JPEG_EOI = 0xd9
const JPEG_SOS = 0xda
const JPEG_APP0 = 0xe0
const JPEG_APP1 = 0xe1
const XMP_IDENTIFIER = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0')
const EXPECTED_WIDTH = 1920
const EXPECTED_HEIGHT = 960
const MAX_JPEG_SEGMENT_LENGTH = 0xffff

interface JpegInspectionResult {
  width: number
  height: number
  xmpExists: boolean
  insertionOffset: number
}

/** XMLへ埋め込む値によってXMP文書の構造が壊れないよう、予約文字を実体参照へ変換する。 */
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** APP1がEXIFなどではなく標準XMPかを、ペイロード先頭の識別子で判定する。 */
function startsWithXmpIdentifier(data: Uint8Array, offset: number, end: number): boolean {
  if (end - offset < XMP_IDENTIFIER.length) return false

  for (let index = 0; index < XMP_IDENTIFIER.length; index += 1) {
    if (data[offset + index] !== XMP_IDENTIFIER[index]) return false
  }

  return true
}

/** SOFとして画像寸法を持つマーカーだけを識別し、予約済みのJPEGマーカーを除外する。 */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
}

/** JPEGをマーカー単位で走査し、XMP挿入前に構造と実画像寸法を検証する。 */
function inspectJpeg(data: Uint8Array): JpegInspectionResult {
  if (data.length < 4 || data[0] !== JPEG_MARKER_PREFIX || data[1] !== JPEG_SOI) {
    throw new Error('JPEGのSOIマーカーを確認できません')
  }

  if (data[data.length - 2] !== JPEG_MARKER_PREFIX || data[data.length - 1] !== JPEG_EOI) {
    throw new Error('JPEGのEOIマーカーを確認できません')
  }

  let offset = 2
  let insertionOffset = 2
  let readingLeadingApp0 = true
  let width: number | null = null
  let height: number | null = null
  let startOfFrameCount = 0
  let xmpExists = false
  let startOfScanFound = false

  while (offset < data.length - 2) {
    const markerStart = offset
    if (data[offset] !== JPEG_MARKER_PREFIX) {
      throw new Error('JPEGセグメントの境界が不正です')
    }

    while (offset < data.length && data[offset] === JPEG_MARKER_PREFIX) offset += 1
    if (offset >= data.length) throw new Error('JPEGマーカーが途中で終了しています')

    const marker = data[offset]
    offset += 1

    if (marker === 0x00) throw new Error('JPEGヘッダー内に不正なマーカーがあります')
    if (marker === JPEG_EOI) throw new Error('JPEGの画像データが見つかりません')
    if (marker === JPEG_SOI || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      throw new Error('JPEGヘッダー内に予期しない単独マーカーがあります')
    }

    if (offset + 2 > data.length) throw new Error('JPEGセグメント長を確認できません')

    const segmentLength = (data[offset] << 8) | data[offset + 1]
    if (segmentLength < 2) throw new Error('JPEGセグメント長が不正です')

    const payloadOffset = offset + 2
    const segmentEnd = offset + segmentLength
    if (segmentEnd > data.length) throw new Error('JPEGセグメントがデータ範囲を超えています')

    if (readingLeadingApp0 && marker === JPEG_APP0) {
      insertionOffset = segmentEnd
    } else {
      readingLeadingApp0 = false
    }

    if (marker === JPEG_APP1 && startsWithXmpIdentifier(data, payloadOffset, segmentEnd)) {
      xmpExists = true
    }

    if (isStartOfFrame(marker)) {
      if (segmentLength < 8) throw new Error('JPEGのSOFセグメントが不正です')

      startOfFrameCount += 1
      height = (data[payloadOffset + 1] << 8) | data[payloadOffset + 2]
      width = (data[payloadOffset + 3] << 8) | data[payloadOffset + 4]
    }

    if (marker === JPEG_SOS) {
      startOfScanFound = true
      break
    }

    offset = segmentEnd

    if (offset <= markerStart) throw new Error('JPEGセグメントの走査に失敗しました')
  }

  if (!startOfScanFound) throw new Error('JPEGのSOSマーカーを確認できません')
  if (startOfFrameCount !== 1 || width === null || height === null) {
    throw new Error('JPEGの画像寸法を一意に確認できません')
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('JPEGの画像寸法が不正です')
  }
  if (width !== height * 2) throw new Error('JPEGのアスペクト比が2:1ではありません')
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
    throw new Error('JPEGの画像寸法が1920×960ではありません')
  }

  return { width, height, xmpExists, insertionOffset }
}

/** 検証済みの実画像寸法から、初期保存基盤に必要なGPano XMPを生成する。 */
function createGpanoXmp(width: number, height: number): Uint8Array {
  const stitchingSoftware = escapeXml('360doegaku')
  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:GPano="http://ns.google.com/photos/1.0/panorama/">
      <GPano:UsePanoramaViewer>True</GPano:UsePanoramaViewer>
      <GPano:ProjectionType>equirectangular</GPano:ProjectionType>
      <GPano:CroppedAreaImageWidthPixels>${width}</GPano:CroppedAreaImageWidthPixels>
      <GPano:CroppedAreaImageHeightPixels>${height}</GPano:CroppedAreaImageHeightPixels>
      <GPano:FullPanoWidthPixels>${width}</GPano:FullPanoWidthPixels>
      <GPano:FullPanoHeightPixels>${height}</GPano:FullPanoHeightPixels>
      <GPano:CroppedAreaLeftPixels>0</GPano:CroppedAreaLeftPixels>
      <GPano:CroppedAreaTopPixels>0</GPano:CroppedAreaTopPixels>
      <GPano:PoseHeadingDegrees>0</GPano:PoseHeadingDegrees>
      <GPano:InitialViewHeadingDegrees>0</GPano:InitialViewHeadingDegrees>
      <GPano:InitialViewPitchDegrees>0</GPano:InitialViewPitchDegrees>
      <GPano:InitialViewRollDegrees>0</GPano:InitialViewRollDegrees>
      <GPano:StitchingSoftware>${stitchingSoftware}</GPano:StitchingSoftware>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`

  return new TextEncoder().encode(xmp)
}

/** JPEGを再エンコードせず、検証済みのセグメント境界へGPano XMP APP1を挿入する。 */
export function embedGpanoXmp(jpegData: Uint8Array): Uint8Array {
  const inspection = inspectJpeg(jpegData)
  if (inspection.xmpExists) throw new Error('JPEGには標準XMPが既に含まれています')

  const xmp = createGpanoXmp(inspection.width, inspection.height)
  const app1Length = 2 + XMP_IDENTIFIER.length + xmp.length
  if (app1Length > MAX_JPEG_SEGMENT_LENGTH) {
    throw new Error('XMP APP1セグメントがJPEGの長さ制限を超えています')
  }

  const app1 = new Uint8Array(2 + app1Length)
  app1[0] = JPEG_MARKER_PREFIX
  app1[1] = JPEG_APP1
  app1[2] = app1Length >> 8
  app1[3] = app1Length & 0xff
  app1.set(XMP_IDENTIFIER, 4)
  app1.set(xmp, 4 + XMP_IDENTIFIER.length)

  const result = new Uint8Array(jpegData.length + app1.length)
  result.set(jpegData.subarray(0, inspection.insertionOffset), 0)
  result.set(app1, inspection.insertionOffset)
  result.set(
    jpegData.subarray(inspection.insertionOffset),
    inspection.insertionOffset + app1.length
  )

  return result
}
