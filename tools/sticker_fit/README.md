# 시하 스티커북 에셋 도구 (v2)

구조도: `structure.mmd` (mermaid)

- 원본: 삼봉님 스티커 PNG (`STICKER_SRC`, 기본 저장소 `archive/siha-sticker-original/`). **읽기만 함.**
- 업스케일 모델: Real-ESRGAN anime 6B ONNX (`STICKER_ESR_MODEL`, sha256 2648cab4…, 저장소에는 넣지 않음).
- `python3 tools/build_sticker_assets.py` → `siha-dress-book/public/sticker/x4/*.png`(4배 해상도 복사본), `public/sticker/bg/*.jpg`,
  `src/sticker/data/{layers.json,characters/siha.json,parts/*.json,backgrounds/*.json}`
- 새 옷은 보통 이 스크립트 없이 **투명 PNG 하나 + `data/parts/<id>.json` 하나**로 추가합니다. 안내: `siha-dress-book/docs/부품-추가하기.md`
- `python3 tools/sticker_fit/qa_matrix.py` → 모든 부품·치마×양말×신발×상의 조합의 구멍 검사
- `qa_compose.py` 는 앱(model.js)과 같은 규칙으로 합성해 400% 크롭을 만든다.

## 부품 JSON (부품 1개 = 파일 1개)

```json
{
  "id": "skirt_navy",
  "name": "남색 주름치마",
  "layer": "bottom",
  "anchor": "waist",
  "scale": 1,
  "hides": [],
  "front": [{ "src": "x4/skirt_navy-0.png", "x": 101, "y": 299, "w": 166, "h": 104 }],
  "back": []
}
```

여러 자리에 붙는 장식은 `"anchors": ["crown","side","neck","waist","shoe_l","shoe_r","hand"]`.
좌표 단위는 스테이지(360×650), PNG 는 그 4배 픽셀. `src` 만 주고 `x`/`y` 를 생략하면 캐릭터 앵커에 맞춰 놓습니다.
