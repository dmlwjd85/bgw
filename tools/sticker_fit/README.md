# 시하 스티커북 에셋 도구 (v2)
구조도: `structure.mmd` (mermaid)

- 원본: 삼봉님 스티커 PNG (`STICKER_SRC`, 기본 `/workspace/sticker_upload`). **읽기만 함.**
- 업스케일 모델: Real-ESRGAN anime 6B ONNX (`STICKER_ESR_MODEL`, sha256 2648cab4…, 저장소에는 넣지 않음).
- `python3 tools/build_sticker_assets.py` → `siha-dress-book/public/sticker/x4/*.png`(4배 해상도 복사본), `public/sticker/bg/*.jpg`,
  `src/sticker/data/{layers.json,characters/siha.json,parts/*.json,backgrounds/*.json}`
- `python3 tools/sticker_fit/qa_matrix.py` → 모든 부품·치마×양말×신발×상의 조합의 구멍 검사(`/workspace/sb/qa2/holes.json`)
- `qa_compose.py` 는 앱(model.js)과 같은 규칙으로 합성해 400% 크롭을 만든다.

## 부품 JSON (부품 1개 = 파일 1개)
```json
{ "id": "skirt_navy", "name": "남색 주름치마", "category": "bottom", "slot": "bottom", "layer": "bottom",
  "pieces": [ { "src": "x4/skirt_navy-0.png", "x": 101, "y": 299, "w": 166, "h": 104,
                "layer": "(선택) 조각별 레이어 — 앞/뒤 조각 분리용", "alt": {"when": "shoes", "src": "..."}, "onlyWith": "(선택) 다른 부품 id" } ],
  "occlusion": { "hideCharacterPieces": ["feet"], "replaceCharacterPieces": {"feet": "x4/…"}, "clearsSlots": ["top","bottom"] } }
```
여러 자리에 붙는 장식은 `"multi": true, "anchors": ["crown","side","neck","waist","shoe_l","shoe_r","hand"], "size": {w,h}`.
좌표 단위는 스테이지(360×650), PNG 는 그 4배 픽셀. 새 옷·캐릭터는 JSON 한 개 + PNG 만 추가하면 된다.
