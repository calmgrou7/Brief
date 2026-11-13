import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
"""진행자 일러스트의 종이 배경 제거: assets/host/*_src.png → *.png (투명 배경)
사용법: cd shorts/assets/host && python3 ../../cutout_host.py"""
for src, dst in [("stand_src.png","stand.png"),("talk_src.png","talk.png")]:
    im = np.asarray(Image.open(src).convert("RGB")).astype(float)
    h, w, _ = im.shape
    border = np.concatenate([im[:20].reshape(-1,3), im[-3:].reshape(-1,3), im[:, :20].reshape(-1,3), im[:, -20:].reshape(-1,3)])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((im - bg) ** 2).sum(-1))
    cand = dist < 22
    lab, n = ndimage.label(cand)
    edge_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    edge_labels = edge_labels[edge_labels > 0]
    bgmask = np.isin(lab, edge_labels)
    # 갇힌 배경(다리·가방 사이 등): 크고 배경색과 아주 가까운 영역도 제거
    sizes = ndimage.sum(np.ones_like(dist), lab, index=np.arange(1, n + 1))
    means = ndimage.mean(dist, lab, index=np.arange(1, n + 1))
    holes = [i + 1 for i in range(n) if sizes[i] > 1500 and means[i] < 9 and (i + 1) not in set(edge_labels)]
    bgmask |= np.isin(lab, holes)
    # 부드러운 가장자리: 배경 영역은 거리 기반 알파, 나머지는 불투명
    a = np.ones((h, w))
    a[bgmask] = np.clip((dist[bgmask] - 6) / 16, 0, 1)
    alpha = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.open(src).convert("RGBA"); out.putalpha(alpha)
    # 투명 영역 여백 잘라내기
    bbox = out.getbbox()
    out.save(dst, optimize=True)
    print(dst, out.size, "bg", bg.round(), "removed %.0f%%" % (bgmask.mean() * 100), "bbox", bbox)
