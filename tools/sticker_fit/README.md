# 시하 스티커북 에셋 맞춤 도구
- 원본: 삼봉님 스티커 PNG(박스 `/workspace/sticker_upload`, `STICKER_SRC`로 바꿀 수 있음). 원본은 읽기만 함.
- 기준 몸: `4e40d8/pink-haired-anime-girl-2.png`(300×570, 흰 민소매·반바지 포함 → 노출 조합 없음).
- `match.py`/`match2.py`: 옷을 입은 같은 시트 그림에서 부품 위치를 템플릿 매칭으로 찾아 `fit.json` 생성.
- `items.py`/`items_extra.py`: 매칭이 안 되는 부품(분홍 드레스, 로퍼, 머리 장식 등)은 손으로 맞춘 값.
- `python3 tools/build_sticker_assets.py` → `siha-dress-book/public/sticker/`(복사본) + `src/sticker/stickers.json`.
- `python3 tools/sticker_fit/crops.py` → 대표 조합 400% 크롭.
