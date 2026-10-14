"""가공된 복사본만 손질한다. 원본 묶음은 쓰지 않는다.
- 몸을 뒷머리·몸·얼굴·앞머리·흔드는 팔로 나눔
- 옷을 앞/뒤 + 손·소매 이음 조각으로 나눔
- 리본·막대사탕·보석 리본 구멍 메움
- 모눈 배경을 깨끗한 격자로 다시 그림
"""
import json, os, glob, shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
PUB = os.path.join(ROOT, 'siha-dress-book/public/sticker')
DATA = os.path.join(ROOT, 'siha-dress-book/src/sticker/data')
X4 = os.path.join(PUB, 'x4')
DBG = '/tmp/sticker_art'
RES = 4
OX, OY, SW, SH = 30, 40, 360, 650
LINE = np.array([110, 61, 91], np.uint8)
HEAD_CX = 180  # 스테이지 머리 중심 x
# 머리 뒤로 감기는 C자 장식
HEAD_WRAP = {'hat_straw', 'headphones', 'hb_blue', 'hb_rose', 'tiara_gold', 'devil_horns'}
# 소매가 그림에 이미 그려져 있어 맨팔을 숨김
HIDE_ARM = {'dress_blue', 'onesie_bear'}
# 소매 이음을 새로 뗄 옷 (입은 전신 시트가 없는 것)
SLEEVE_IDS = {'dress_pink', 'top_yellow'}

def load_rgba(path):
    return np.array(Image.open(path).convert('RGBA'))

def save_png(arr, path):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    Image.fromarray(arr).save(path, optimize=True)

def ensure_orig(name):
    """첫 실행에서 현재 PNG 를 .orig.png 로 복제해 두고, 이후에는 그걸 읽는다."""
    p = os.path.join(X4, name)
    o = os.path.join(X4, name.replace('.png', '.orig.png'))
    if not os.path.exists(o) and os.path.exists(p):
        shutil.copy2(p, o)
    return o if os.path.exists(o) else p

def crop_piece(arr):
    a = arr[..., 3] > 8
    if not a.any():
        return arr, 0, 0
    ys, xs = np.where(a)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    return arr[y0:y1, x0:x1], x0, y0

def stage_xy(sx, sy, w_px, h_px):
    """스테이지 캔버스 픽셀 → 스테이지 단위 상자."""
    return {
        'x': round(sx / RES, 2),
        'y': round(sy / RES, 2),
        'w': round(w_px / RES, 2),
        'h': round(h_px / RES, 2),
    }

def knockout_bg(arr, mode='black', thr=28):
    rgb = arr[..., :3].astype(np.int16)
    out = arr.copy()
    if mode == 'white':
        bg = rgb.min(2) > (255 - thr)
    else:
        bg = rgb.max(2) < thr
    out[bg, 3] = 0
    if mode == 'white':
        # 흰 배경이 가장자리에 번진 부분
        fringe = (out[..., 3] > 0) & (rgb.min(2) > 245)
        out[fringe, 3] = 0
    return out

def fill_enclosed(arr, min_px=4):
    a = arr[..., 3] < 16
    lab, n = ndimage.label(a)
    if n == 0:
        return arr
    border = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    hole = (lab > 0) & ~np.isin(lab, border)
    if hole.sum() < min_px:
        return arr
    idx = ndimage.distance_transform_edt(~(arr[..., 3] > 16), return_distances=False, return_indices=True)
    out = arr.copy()
    out[hole] = arr[idx[0], idx[1]][hole]
    out[hole, 3] = 255
    return out

def seal_interior_gaps(arr):
    """불투명 덩어리 안의 반투명·작은 틈을 이웃 색으로 메운다 (겉 칼선은 유지)."""
    a = arr[..., 3]
    core = a > 180
    if not core.any():
        return arr
    closed = ndimage.binary_closing(core, iterations=3)
    fill = closed & (a < 180)
    if not fill.any():
        return arr
    idx = ndimage.distance_transform_edt(~core, return_distances=False, return_indices=True)
    out = arr.copy()
    out[fill] = arr[idx[0], idx[1]][fill]
    out[fill, 3] = 255
    return out

# ── 장식 구멍 ─────────────────────────────────────────────
def fix_lollipop(orig):
    """원본 사탕·리본은 그대로 두고, 칼선 제거 때 사라진 막대를 같은 색·선으로 다시 그린다."""
    out = orig.copy()
    H, W = out.shape[:2]
    a = out[..., 3] > 40
    lab, n = ndimage.label(a)
    if n == 0:
        return out
    sizes = [int((lab == i).sum()) for i in range(1, n + 1)]
    keep_i = 1 + int(np.argmax(sizes))
    keep = lab == keep_i
    out[~keep] = 0  # 잘린 막대 조각 제거
    a = keep
    candy_bot, cx = None, W // 2
    for y in range(H - 1, -1, -1):
        xs = np.where(a[y])[0]
        if len(xs) > 20:
            candy_bot = y
            cx = int(np.median(xs))
            break
    if candy_bot is None:
        return out
    y0 = candy_bot - 4
    y1 = H - 14
    inner, outline = 7, 3
    cream = np.array([248, 237, 222], np.float32)
    hi = np.array([255, 252, 244], np.float32)
    sh = np.array([226, 208, 188], np.float32)
    for y in range(y0, y1):
        cap = 1.0
        if y > y1 - 14:
            cap = max(0.2, 1.0 - (y - (y1 - 14)) / 14.0)
        iw = max(2, int(round(inner * cap)))
        tw = iw + outline
        for x in range(cx - tw - 1, cx + tw + 2):
            if not (0 <= x < W):
                continue
            adx = abs(x - cx)
            if adx > tw:
                continue
            # 사탕/리본과 겹치는 위쪽은 빈 칸만
            if y < candy_bot + 2 and out[y, x, 3] >= 80:
                continue
            if adx >= iw:
                out[y, x, :3] = LINE
                out[y, x, 3] = 255
            else:
                u = (x - (cx - iw)) / max(1, 2 * iw)
                col = hi * (1 - u) * 0.4 + cream * 0.6 + sh * u * 0.28
                out[y, x, :3] = np.clip(col, 0, 255)
                out[y, x, 3] = 255
    return out

def _fabric_color(arr, mask):
    pix = arr[mask]
    if len(pix) < 20:
        return np.array([248, 176, 196, 255], np.uint8)
    return np.median(pix, axis=0).astype(np.uint8)

def fix_ribbon(orig):
    """닫힌 구멍과 매듭 근처 좁은 틈만 리본 분홍으로 메운다. 꼬리 사이 큰 V는 남긴다."""
    out = fill_enclosed(orig, min_px=4)
    out = seal_interior_gaps(out)
    rgb = out[..., :3].astype(np.int16)
    pink = (out[..., 3] > 80) & (rgb[..., 0] > 200) & (rgb[..., 1] > 130) & (rgb[..., 1] < 220)
    fabric = _fabric_color(out, pink)
    a = out[..., 3] > 16
    H, W = a.shape
    for y in range(int(H * 0.18), int(H * 0.70)):
        opaque = np.where(a[y])[0]
        if len(opaque) < 8:
            continue
        gaps = np.where(np.diff(opaque) > 1)[0]
        for g in gaps:
            l, r = int(opaque[g]), int(opaque[g + 1])
            gap = r - l
            max_gap = 22 if y < int(H * 0.58) else 10
            if 2 <= gap <= max_gap:
                for x in range(l + 1, r):
                    # 가장자리는 윤곽이 아니라 천
                    out[y, x] = fabric
                    out[y, x, 3] = 255
    return fill_enclosed(out)

def fix_gem_bow(orig):
    """보석 리본: 닫힌 구멍 + 안쪽 반투명 틈. 겉 칼선·반짝임은 유지."""
    out = fill_enclosed(orig, min_px=3)
    out = seal_interior_gaps(out)
    return out

def update_deco_json(pid, png):
    im = load_rgba(os.path.join(X4, png))
    w, h = round(im.shape[1] / RES, 2), round(im.shape[0] / RES, 2)
    path = os.path.join(DATA, 'parts', pid + '.json')
    j = json.load(open(path))
    if j.get('front'):
        j['front'][0]['src'] = f'x4/{png}'
        j['front'][0]['w'] = w
        j['front'][0]['h'] = h
    if j.get('size'):
        j['size'] = {'w': w, 'h': h}
    json.dump(j, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f'  {pid} size {w}x{h}')

# ── 몸 레이어 분리 ────────────────────────────────────────
def split_body():
    """몸은 원본을 유지하고 흔드는 팔만 떼어 옷 아래로 들어가게 한다.
    뒷머리·얼굴·앞머리는 같은 픽셀을 별 레이어로 복사한다(구멍을 메우느라 색이 번지지 않게)."""
    full_path = os.path.join(X4, 'siha-body-full.png')
    src = os.path.join(X4, 'siha-body.orig.png') if os.path.exists(os.path.join(X4, 'siha-body.orig.png')) else os.path.join(X4, 'siha-body.png')
    if os.path.exists(full_path):
        full = load_rgba(full_path)
    else:
        full = load_rgba(src)
        save_png(full, full_path)
    H, W = full.shape[:2]
    rgb = full[..., :3].astype(np.int16)
    al = full[..., 3]
    opq = al > 32
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hair = opq & (r > 160) & (g < 215) & ((r - g) > 25) & (b > 140)
    skin = opq & (r > 210) & (g > 195) & (g < 245) & (b > 180) & ((r - g) < 50) & ~hair
    white = opq & (r > 230) & (g > 230) & (b > 230)
    outline = opq & (r < 160) & (g < 110) & (b < 130)

    lab, n = ndimage.label(skin)
    face_cc = arm_cc = None
    for i in range(1, n + 1):
        s = int((lab == i).sum())
        if s < 8000:
            continue
        ys, xs = np.where(lab == i)
        rec = dict(i=i, s=s, x0=int(xs.min()), y0=int(ys.min()), x1=int(xs.max()), y1=int(ys.max()),
                   cx=int(xs.mean()), cy=int(ys.mean()))
        if rec['y1'] < int(H * 0.40) and rec['x0'] > int(W * 0.25) and rec['cx'] > int(W * 0.35):
            if face_cc is None or rec['s'] > face_cc['s']:
                face_cc = rec
        if rec['x0'] < int(W * 0.12) and rec['cy'] < int(H * 0.42):
            if arm_cc is None or rec['s'] > arm_cc['s']:
                arm_cc = rec

    yy = np.arange(H)[:, None]
    xx = np.arange(W)[None, :]

    # 흔드는 팔: 피부 덩어리에서 탱크·얼굴과 겹치는 어깨 뿌리는 몸에 남김
    arm_mask = np.zeros((H, W), bool)
    if arm_cc:
        tank = white & (yy > int(H * 0.30)) & (yy < int(H * 0.55))
        region = ndimage.binary_dilation(lab == arm_cc['i'], iterations=4)
        region &= (xx < int(W * 0.48)) & (yy < int(H * 0.38))
        region &= ~ndimage.binary_dilation(tank, iterations=5)
        if face_cc:
            region &= ~(lab == face_cc['i'])
        arm_mask = region & opq
        arm_mask = ndimage.binary_fill_holes(ndimage.binary_closing(arm_mask, iterations=8))
        arm_mask |= outline & ndimage.binary_dilation(arm_mask, iterations=2) & (xx < int(W * 0.48))

    # 앞머리(뱅): 이마만. 눈 높이까지 내리지 않음
    if face_cc:
        fh = face_cc['y1'] - face_cc['y0']
        bangs = hair & (yy < face_cc['y0'] + int(0.26 * fh)) & (yy > face_cc['y0'] - 25)
        bangs &= (xx > face_cc['x0'] - 8) & (xx < face_cc['x1'] + 8)
        bangs = ndimage.binary_dilation(bangs, iterations=1) & hair
    else:
        bangs = hair & (yy < int(H * 0.22)) & (xx > int(W * 0.36)) & (xx < int(W * 0.68))

    # 얼굴: 피부를 크게 닫아 눈 구멍을 잇고, 눈 띠를 직접 포함
    face_mask = np.zeros((H, W), bool)
    if face_cc:
        fh = face_cc['y1'] - face_cc['y0']
        face_mask = ndimage.binary_fill_holes(ndimage.binary_closing(lab == face_cc['i'], iterations=16))
        eye_band = ((yy > face_cc['y0'] + int(0.20 * fh)) & (yy < face_cc['y0'] + int(0.60 * fh)) &
                    (xx > face_cc['x0'] + 12) & (xx < face_cc['x1'] - 12))
        face_mask |= eye_band
        face_mask &= opq
        face_mask &= ~bangs
        face_mask |= outline & ndimage.binary_dilation(face_mask, iterations=2) & ndimage.binary_dilation(face_mask, iterations=3)

    back = hair & ~bangs & ~face_mask

    def layer_from(mask, dilate_outline=2):
        m = mask | (outline & ndimage.binary_dilation(mask, iterations=dilate_outline))
        out = np.zeros_like(full)
        out[m] = full[m]
        return out

    back_img = layer_from(back)
    bangs_img = layer_from(bangs)
    face_img = layer_from(face_mask, dilate_outline=1)
    arm_img = layer_from(arm_mask)

    # 몸 = 원본에서 흔드는 팔만 제거. 머리·얼굴은 남겨 빈칸이 생기지 않게 함.
    body_img = full.copy()
    body_img[arm_mask] = 0
    # 어깨 이음 몇 px 만 피부에서 빌려 메움 (머리색이 번지지 않게 피부·흰옷만 원본)
    stump = ndimage.binary_dilation(arm_mask, iterations=4) & ~arm_mask & opq
    stump &= (xx > int(W * 0.26)) & (yy > int(H * 0.22))
    skin_src = (skin | white) & ~arm_mask
    if stump.any() and skin_src.any():
        idx = ndimage.distance_transform_edt(~skin_src, return_distances=False, return_indices=True)
        body_img[stump] = full[idx[0], idx[1]][stump]
        body_img[stump, 3] = 255

    save_png(back_img, os.path.join(X4, 'siha-back-hair.png'))
    save_png(body_img, os.path.join(X4, 'siha-body.png'))
    save_png(face_img, os.path.join(X4, 'siha-face.png'))
    save_png(bangs_img, os.path.join(X4, 'siha-front-hair.png'))
    save_png(arm_img, os.path.join(X4, 'siha-arm-wave.png'))

    os.makedirs(DBG, exist_ok=True)
    ov = full.copy()
    ov[back, :3] = (ov[back, :3].astype(np.float32) * 0.35 + np.array([220, 40, 80]) * 0.65).astype(np.uint8)
    ov[bangs, :3] = (ov[bangs, :3].astype(np.float32) * 0.35 + np.array([40, 220, 80]) * 0.65).astype(np.uint8)
    ov[face_mask, :3] = (ov[face_mask, :3].astype(np.float32) * 0.35 + np.array([40, 80, 230]) * 0.65).astype(np.uint8)
    ov[arm_mask, :3] = (ov[arm_mask, :3].astype(np.float32) * 0.35 + np.array([240, 220, 40]) * 0.65).astype(np.uint8)
    save_png(ov, os.path.join(DBG, 'body_masks.png'))
    print('body split',
          'back', int((back_img[..., 3] > 8).sum()),
          'bangs', int((bangs_img[..., 3] > 8).sum()),
          'face', int((face_img[..., 3] > 8).sum()),
          'arm', int((arm_img[..., 3] > 8).sum()),
          'body', int((body_img[..., 3] > 8).sum()))
    return arm_cc, face_cc

def write_character():
    char_path = os.path.join(DATA, 'characters/siha.json')
    char = json.load(open(char_path))
    box = {'x': OX, 'y': OY, 'w': 300.0, 'h': 570.0}
    char['note'] = '뒷머리·얼굴·앞머리·흔드는 팔은 몸 시트 복사본에서 분리. 속바지는 가장 짧은 치마보다 짧게 유지.'
    char['pieces'] = [
        {'key': 'back_hair', 'src': 'x4/siha-back-hair.png', 'layer': 'back_hair', **box},
        {'key': 'body', 'src': 'x4/siha-body.png', 'layer': 'body', **box},
        {'key': 'feet', 'src': 'x4/siha-feet.png', 'layer': 'body', **box},
        {'key': 'arm_wave', 'src': 'x4/siha-arm-wave.png', 'layer': 'arms', **box},
        {'key': 'face', 'src': 'x4/siha-face.png', 'layer': 'face', **box},
        {'key': 'front_hair', 'src': 'x4/siha-front-hair.png', 'layer': 'front_hair', **box},
    ]
    char['anchors']['face'] = {'x': 180, 'y': 118, 'size': 0.7, 'layer': 'face', 'label': '얼굴'}
    char['anchors']['bangs'] = {'x': 180, 'y': 78, 'size': 0.8, 'layer': 'front_hair', 'label': '앞머리'}
    json.dump(char, open(char_path, 'w'), ensure_ascii=False, indent=2)
    return char

# ── 옷 앞/뒤·이음 ─────────────────────────────────────────
def body_alpha_stage():
    canvas = np.zeros((SH * RES, SW * RES), np.uint8)
    for name in ('siha-back-hair.png', 'siha-body.png', 'siha-feet.png', 'siha-face.png'):
        p = os.path.join(X4, name)
        if not os.path.exists(p):
            continue
        im = load_rgba(p)
        x, y = OX * RES, OY * RES
        h, w = im.shape[:2]
        y1, x1 = min(canvas.shape[0], y + h), min(canvas.shape[1], x + w)
        canvas[y:y1, x:x1] = np.maximum(canvas[y:y1, x:x1], im[:y1 - y, :x1 - x, 3])
    return canvas

def paste_on_stage(src, x, y, w, h):
    canvas = np.zeros((SH * RES, SW * RES, 4), np.uint8)
    im = load_rgba(os.path.join(PUB, src) if not src.startswith('/') else src)
    tw, th = int(round(w * RES)), int(round(h * RES))
    if im.shape[1] != tw or im.shape[0] != th:
        im = np.array(Image.fromarray(im).resize((tw, th), Image.LANCZOS))
    x0, y0 = int(round(x * RES)), int(round(y * RES))
    x1, y1 = min(canvas.shape[1], x0 + im.shape[1]), min(canvas.shape[0], y0 + im.shape[0])
    if x0 < canvas.shape[1] and y0 < canvas.shape[0] and x1 > 0 and y1 > 0:
        px0, py0 = max(0, x0), max(0, y0)
        canvas[py0:y1, px0:x1] = im[py0 - y0:y1 - y0, px0 - x0:x1 - x0]
    return canvas

def extract_from_stage(stage_img, mask):
    out = np.zeros_like(stage_img)
    out[mask] = stage_img[mask]
    cropped, x0, y0 = crop_piece(out)
    if cropped.size == 0 or cropped[..., 3].max() < 8:
        return None
    return cropped, x0, y0

def save_extracted(stage_img, mask, relname, min_px=600, min_density=0.06):
    got = extract_from_stage(stage_img, mask)
    if not got:
        return None
    crop, sx, sy = got
    opq = crop[..., 3] > 64
    n = int(opq.sum())
    dens = n / max(1, crop.shape[0] * crop.shape[1])
    if n < min_px or dens < min_density:
        return None
    save_png(crop, os.path.join(PUB, relname))
    rec = stage_xy(sx, sy, crop.shape[1], crop.shape[0])
    rec['src'] = relname
    return rec

def split_garment(part, body_a, wave_box):
    fronts = list(part.get('front') or [])
    if not fronts:
        return part
    # 다시 돌려도 원본 한 장(-0.png 또는 preview)에서 자른다
    main = next((f for f in fronts if f.get('preview')), None)
    if main is None:
        main = next((f for f in fronts if str(f.get('src') or '').endswith('-0.png')), None)
    if main is None:
        main = next((f for f in fronts if not f.get('onlyWith') and not f.get('patch')), fronts[0])
    g = paste_on_stage(main['src'], main['x'], main['y'], main['w'], main['h'])
    g_a = g[..., 3] > 64
    body = body_a > 64
    hull = ndimage.binary_fill_holes(ndimage.binary_closing(body, iterations=8))
    interior = hull & ~body
    xx = np.arange(g.shape[1])[None, :]
    yy = np.arange(g.shape[0])[:, None]

    # 기존 손 조각·틈 메움은 유지, 이 스크립트가 만든 소매/앞뒤만 교체
    connectors = []
    for c in part.get('connectors') or []:
        src = c.get('src') or ''
        if src.endswith('-sleeve.png') or src.endswith('-front.png') or src.endswith('-back.png'):
            continue
        connectors.append(c)
    back = []

    pid = part.get('id')
    overlap_px = 6 * RES

    if pid in HEAD_WRAP:
        # C자 장식: 머리 중심 왼쪽 = 뒤, 오른쪽 = 앞. 이음새는 겹침.
        split = HEAD_CX * RES
        back_m = g_a & (xx < split + overlap_px)
        front_m = g_a & (xx >= split - overlap_px)
        # 미리보기용 원본은 유지
        preview = dict(main)
        preview.pop('preview', None)
        preview['preview'] = True
        fr = save_extracted(g, front_m, f"x4/{pid}-front.png")
        bk = save_extracted(g, back_m, f"x4/{pid}-back.png")
        new_front = [preview]
        if fr:
            fr['layer'] = part.get('layer', 'hair_acc')
            fr['from'] = (main.get('from') or '') + ' (앞)'
            new_front.append(fr)
        if bk:
            bk['layer'] = 'back_hair'
            bk['from'] = (main.get('from') or '') + ' (뒤, 머리 뒤로)'
            back = [bk]
        for f in fronts:
            src = f.get('src') or ''
            if f.get('preview') or src.endswith('-front.png') or src.endswith('-0.png') or src == main.get('src'):
                continue
            new_front.append(f)
        part['front'] = new_front
        part['back'] = back
        part['connectors'] = connectors
        return part

    # 치마·원피스: 다리 사이 빈칸을 옷 색으로 채워 뒤 조각(감김)을 만든다.
    # 점만 있는 가장자리 조각은 쓰지 않는다.
    if part.get('slot') in ('bottom', 'dress'):
        y0 = int((main['y'] + main['h'] * 0.35) * RES)
        y1 = int((main['y'] + main['h'] * 1.02) * RES)
        # 엉덩이 손 절개(오른쪽 위)는 비워 둔다
        hip = (xx > int(230 * RES)) & (yy < int((main['y'] + main['h'] * 0.55) * RES))
        g_convex = ndimage.binary_fill_holes(ndimage.binary_closing(g_a, iterations=30))
        panel = g_convex & interior & (yy >= y0) & (yy <= y1) & ~hip
        panel = ndimage.binary_closing(panel, iterations=6)
        if panel.sum() > 400:
            back_img = np.zeros_like(g)
            idx = ndimage.distance_transform_edt(~g_a, return_distances=False, return_indices=True)
            back_img[panel] = g[idx[0], idx[1]][panel]
            back_img[panel, 3] = 255
            bk = save_extracted(back_img, panel, f"x4/{pid}-back.png", min_px=400, min_density=0.15)
            if bk:
                bk['layer'] = 'back_hair'
                bk['from'] = '뒤 조각 (다리 사이로 감김)'
                back = [bk]

    # 소매 이음: 흔드는 팔과 겹치는 옷 픽셀을 팔 레이어로
    if wave_box and pid in SLEEVE_IDS:
        x0, y0, x1, y1 = wave_box
        arm_r = np.zeros(g_a.shape, bool)
        arm_r[y0:y1, x0:x1] = True
        sleeve = g_a & ndimage.binary_dilation(arm_r, iterations=8)
        if sleeve.sum() > 120:
            sl = save_extracted(g, sleeve, f"x4/{pid}-sleeve.png")
            if sl:
                sl['layer'] = 'arms'
                sl['from'] = '소매 이음 (팔 레이어)'
                connectors.append(sl)

    if pid in HIDE_ARM:
        hides = list(part.get('hides') or [])
        if 'arm_wave' not in hides:
            hides.append('arm_wave')
        part['hides'] = hides

    part['back'] = back
    part['connectors'] = connectors
    return part

def split_all_clothes():
    body_a = body_alpha_stage()
    arm = load_rgba(os.path.join(X4, 'siha-arm-wave.png'))
    a = arm[..., 3] > 32
    wave_box = None
    if a.any():
        ys, xs = np.where(a)
        wave_box = (OX * RES + int(xs.min()), OY * RES + int(ys.min()),
                    OX * RES + int(xs.max()) + 1, OY * RES + int(ys.max()) + 1)
    for f in sorted(glob.glob(os.path.join(DATA, 'parts/*.json'))):
        part = json.load(open(f))
        if part.get('multi'):
            json.dump(part, open(f, 'w'), ensure_ascii=False, indent=1)
            continue
        part = split_garment(part, body_a, wave_box)
        json.dump(part, open(f, 'w'), ensure_ascii=False, indent=1)
        print('split', part['id'], 'front', len(part.get('front') or []),
              'back', len(part.get('back') or []), 'conn', len(part.get('connectors') or []))

# ── 배경·속바지·양말 ─────────────────────────────────────
def redraw_grids():
    paper = np.array([253, 254, 254], np.uint8)
    line_b = np.array([214, 230, 242], np.uint8)
    line_s = np.array([226, 234, 238], np.uint8)
    W, H = 1000, 1806
    P = 40
    def grid(line):
        img = np.full((H, W, 3), paper, np.uint8)
        img[::P, :] = line
        img[:, ::P] = line
        bold = np.minimum(line.astype(np.int16) - 14, 255).clip(0, 255).astype(np.uint8)
        img[::P * 5, :] = bold
        img[:, ::P * 5] = bold
        return img
    Image.fromarray(grid(line_b)).save(os.path.join(PUB, 'bg/grid_blue.jpg'), quality=94)
    Image.fromarray(grid(line_s)).save(os.path.join(PUB, 'bg/grid_soft.jpg'), quality=94)
    print('grids redrawn')

def shorts_visual_pass():
    """속바지 밑단이 치마보다 길면 안 됨. 이미 짧으면 손대지 않는다."""
    body = load_rgba(os.path.join(X4, 'siha-body.png'))
    H, W = body.shape[:2]
    rgb = body[..., :3].astype(np.int16)
    al = body[..., 3]
    white = (al > 32) & (rgb[..., 0] > 230) & (rgb[..., 1] > 230) & (rgb[..., 2] > 230)
    band = white & (np.arange(H)[:, None] > int(H * 0.44)) & (np.arange(H)[:, None] < int(H * 0.70))
    if not band.any():
        print('shorts: no white band')
        return
    hem = int(np.where(band.any(1))[0].max())
    hem_stage = OY + hem / RES
    print('shorts hem y_px', hem, 'stage', round(hem_stage, 1), '(shortest skirt ~403)')
    # 치마보다 길 때만 2px 정도 정리. 지금은 짧게 유지되므로 색만 확인.
    crop = body[hem - 40: hem + 20, int(W * 0.30): int(W * 0.72)]
    save_png(crop, os.path.join(DBG, 'shorts_hem.png'))

def clean_socks_top():
    """긴 양말 위쪽에 남은 속바지 가로줄을 지운다."""
    path = os.path.join(X4, 'socks_long.png')
    if not os.path.exists(path):
        return
    im = load_rgba(path)
    H, W = im.shape[:2]
    a = im[..., 3] > 32
    rgb = im[..., :3].astype(np.int16)
    # 위 12% 에서 가로로 가늘고 어두운 줄
    y_lim = int(H * 0.18)
    for y in range(0, y_lim):
        row = a[y]
        if not row.any():
            continue
        # 다리가 아닌 가로 띠: 폭이 넓고 세로 연결이 약함
        xs = np.where(row)[0]
        if len(xs) < 8:
            continue
        # 아래 8px 과 이어지지 않은 가로줄 제거
        below = a[min(H - 1, y + 6): min(H, y + 14)].any(0)
        # 줄무늬(채도 낮고 회색)
        sat = (rgb[y].max(1) - rgb[y].min(1))
        lineish = row & (sat < 40) & (rgb[y, :, 0] < 230)
        if lineish.sum() > 20 and (below[lineish].mean() < 0.4):
            im[y, lineish, 3] = 0
    save_png(im, path)
    print('socks_long top cleaned')

def main():
    os.makedirs(X4, exist_ok=True)
    os.makedirs(DBG, exist_ok=True)

    print('fix decorations...')
    lol_src = ensure_orig('lollipop.png')
    rib_src = ensure_orig('ribbon_pink.png')
    gem_src = ensure_orig('bow_blue_gem.png')
    save_png(fix_lollipop(load_rgba(lol_src)), os.path.join(X4, 'lollipop.png'))
    save_png(fix_ribbon(load_rgba(rib_src)), os.path.join(X4, 'ribbon_pink.png'))
    save_png(fix_gem_bow(load_rgba(gem_src)), os.path.join(X4, 'bow_blue_gem.png'))
    for pid, png in (('lollipop', 'lollipop.png'), ('ribbon_pink', 'ribbon_pink.png'), ('bow_blue_gem', 'bow_blue_gem.png')):
        update_deco_json(pid, png)

    print('splitting body...')
    ensure_orig('siha-body.png')
    split_body()
    shorts_visual_pass()
    clean_socks_top()
    write_character()
    print('splitting clothes...')
    split_all_clothes()
    redraw_grids()
    print('done')

if __name__ == '__main__':
    main()
