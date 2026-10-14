"""부품 JSON (새 형식 + 예전 형식)을 앱과 같은 규칙으로 읽는다."""
CHAR_PIECES = {'body', 'feet'}
SLOTS = {'dress', 'top', 'bottom', 'socks', 'shoes', 'head', 'neck'}
SLOT_ANCHOR = {
    'dress': 'torso',
    'top': 'torso',
    'bottom': 'waist',
    'socks': 'legs',
    'shoes': 'feet',
    'head': 'head',
    'neck': 'neck',
}

def pieces_of(p):
    if p.get('front') is not None or p.get('back') is not None or p.get('connectors') is not None or p.get('src'):
        out = []
        for pc in p.get('back') or []:
            q = dict(pc)
            q.setdefault('layer', 'back_hair')
            out.append(q)
        for pc in p.get('front') or []:
            q = dict(pc)
            q.setdefault('layer', p.get('layer'))
            out.append(q)
        out += [dict(pc) for pc in (p.get('connectors') or [])]
        if p.get('src') and not any(x.get('src') == p['src'] for x in out):
            out.insert(0, {'src': p['src'], 'layer': p.get('layer')})
        return out
    return list(p.get('pieces') or [])

def occ_of(p):
    if p.get('occlusion'):
        o = p['occlusion']
        return {
            'hideCharacterPieces': list(o.get('hideCharacterPieces') or []),
            'clearsSlots': list(o.get('clearsSlots') or []),
            'hideSlots': list(o.get('hideSlots') or []),
            'replaceCharacterPieces': dict(o.get('replaceCharacterPieces') or {}),
        }
    hp, cl = [], []
    for h in p.get('hides') or []:
        (hp if h in CHAR_PIECES else cl).append(h)
    return {
        'hideCharacterPieces': hp,
        'clearsSlots': cl,
        'hideSlots': list(p.get('covers') or []),
        'replaceCharacterPieces': dict(p.get('replacePieces') or {}),
    }

def slot_of(p):
    if p.get('multi') or (p.get('slot') is None and p.get('anchors')):
        return None
    if 'slot' in p and p['slot'] is not None:
        return p['slot']
    return p.get('layer')

def size_of(p):
    if p.get('size'):
        return p['size']
    pcs = pieces_of(p)
    if pcs and pcs[0].get('w') is not None:
        return {'w': pcs[0]['w'], 'h': pcs[0]['h']}
    return {'w': 0, 'h': 0}

def split_pieces(pieces, layer):
    """그린 조각 목록을 front / back / connectors 로 나눈다."""
    front, back, connectors = [], [], []
    for pc in pieces:
        if pc.get('patch') or (pc.get('layer') and pc.get('layer') != layer):
            if pc.get('layer') == 'back_hair':
                back.append(pc)
            else:
                connectors.append(pc)
        else:
            front.append(pc)
    return front, back, connectors

def dump_part(base, pieces):
    """앱이 읽는 새 스키마 dict 를 만든다."""
    slot = slot_of(base)
    multi = bool(base.get('multi'))
    occ = occ_of(base) if 'occlusion' in base or 'hides' in base else {
        'hideCharacterPieces': base.get('hide') or [],
        'clearsSlots': base.get('clears') or [],
        'hideSlots': base.get('hideSlots') or [],
        'replaceCharacterPieces': base.get('replacePieces') or {},
    }
    front, back, connectors = split_pieces(pieces, base.get('layer'))
    hides = list(occ['hideCharacterPieces']) + list(occ['clearsSlots'])
    out = {
        'id': base['id'],
        'name': base['name'],
        'category': base.get('category'),
        'layer': base.get('layer'),
        'scale': base.get('scale', 1),
    }
    if multi:
        out['slot'] = None
        out['multi'] = True
        out['anchors'] = base.get('anchors') or []
        out['freePlacement'] = True
        if base.get('size'):
            out['size'] = base['size']
        if base.get('anchorOffset'):
            out['anchorOffset'] = base['anchorOffset']
    else:
        out['slot'] = slot
        out['anchor'] = base.get('anchor') or SLOT_ANCHOR.get(slot)
    if hides:
        out['hides'] = hides
    if occ['hideSlots']:
        out['covers'] = occ['hideSlots']
    if occ['replaceCharacterPieces']:
        out['replacePieces'] = occ['replaceCharacterPieces']
    out['front'] = front
    out['back'] = back
    out['connectors'] = connectors
    return out
