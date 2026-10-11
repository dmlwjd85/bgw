/**
 * src/doll/art/ 에 투명 PNG를 넣으면 같은 이름의 도형 대신 그 그림이 붙습니다.
 * 캔버스는 304×520(선명하게 하려면 608×1040). 인형이 보일 자리만 그리고 나머지는 투명.
 *
 * body-peach.png, body-milk.png, body-chestnut.png
 * hair-twin-back.png, hair-twin-front.png 처럼 머리는 뒤·앞
 * top-blouse.png, dress-pink.png, shoes-loafer.png 처럼 나머지 아이템은 파일 이름 = 아이템 id
 */
const files = import.meta.glob('./art/*.png', { eager: true, import: 'default' })

const byName = Object.fromEntries(
  Object.entries(files).map(([path, url]) => {
    const name = path.split('/').pop().replace(/\.png$/i, '')
    return [name, url]
  }),
)

export function artUrl(name) {
  return byName[name] || null
}
