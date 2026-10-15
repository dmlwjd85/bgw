# 시하 스티커북

삼봉님 스티커를 끌어다 붙여 시하를 꾸미는 웹 스티커북입니다.

- 스티커북: https://dmlwjd85.github.io/bgw/siha/
- 기존 드레스 북(그대로 유지): https://dmlwjd85.github.io/bgw/siha/#dress

두 화면의 저장 데이터는 키가 달라 서로 건드리지 않습니다.

- 스티커북: `localStorage` 키 `siha-sticker-book-v1` + 저장 버튼으로 PNG 내려받기
- 드레스 북: `siha-dress-book-v1`

## 바로 쓰기

```bash
cd siha-dress-book
npm install
npm run dev
```

브라우저에서 http://localhost:5178/ 가 스티커북, `#dress` 가 드레스 북입니다.

## 폴더 안내

| 경로 | 역할 |
| --- | --- |
| `src/sticker/data/layers.json` | 아래→위 13겹 레이어 순서 표 |
| `src/sticker/data/characters/siha.json` | 시하 몸 그림 + 옷·장식이 붙는 앵커 좌표 |
| `src/sticker/data/parts/*.json` | 부품 1개 = 설정 파일 1개 |
| `src/sticker/data/backgrounds/*.json` | 배경 |
| `public/sticker/` | 가공한 복사본 PNG (런타임에서 씀) |
| `src/App.jsx`, `src/doll/` | 기존 드레스 북. 이 스티커북 작업에서 바꾸지 않음 |

원본 그림은 저장소에서 손대지 않습니다. 위치와 묶음 목록은 저장소 루트 `archive/siha-sticker-original/` 을 보세요.

## 새 옷·캐릭터 추가

**투명 PNG 한 장 + 부품 JSON 한 파일**이면 됩니다. 자세한 절차는 [docs/부품-추가하기.md](docs/부품-추가하기.md) 를 보세요.

자동으로 잘 안 되는 그림 작업(앞/뒤 분리, 속바지 손칠, 구멍 메움 검수)은 [docs/수동-작업.md](docs/수동-작업.md) 에 모아 두었습니다.

## 사진첩 저장 (사진·영상)
- 웹: `navigator.canShare({ files })` 가 되면 공유 시트 → iOS '이미지/비디오 저장', 안드로이드 갤러리. 안 되면 내려받기. (`src/sticker/gallerySave.js`)
- Capacitor 앱: 루트에 `@capacitor/filesystem` + `@capacitor-community/media`(둘 다 무료·MIT). `npm run cap:sync` 뒤 네이티브에서 `window.Capacitor.Plugins` 로 찾아 사진첩 '시하 스티커북' 앨범에 바로 저장. 웹 번들은 플러그인을 import 하지 않아서 웹 빌드에 영향 없음.
- 네이티브 권한: iOS `Info.plist` 에 `NSPhotoLibraryAddUsageDescription`(예: "시하 스티커북 그림과 영상을 사진첩에 저장해요"). 안드로이드(API 29+)는 앱 앨범 저장에 따로 권한이 필요 없음(28 이하만 `WRITE_EXTERNAL_STORAGE`).
