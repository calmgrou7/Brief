"""Refresh the reviewed campus list from the Korean public university dataset."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SOURCE = "https://www.data.go.kr/data/15107736/standard.do"
DOWNLOAD = "https://www.data.go.kr/download/"
API = "https://api.data.go.kr/openapi/tn_pubr_public_univ_info_api"
REGIONS = {"부산광역시": "busan", "경상남도": "gyeongnam"}
# Editorial selection. The national file also includes graduate schools and historical names.
CAMPUSES = {
    "busan": ["부산대학교", "국립부경대학교", "부산외국어대학교", "동아대학교", "경성대학교", "국립한국해양대학교"],
    "gyeongnam": ["경상국립대학교", "국립창원대학교", "경남대학교", "인제대학교", "영산대학교(양산)", "가야대학교(김해)"],
}


def get_json(url, params):
    req = Request(url + "?" + urlencode(params, doseq=True), headers={"User-Agent": "StayB-CampusDirectory/1.0"})
    with urlopen(req, timeout=30) as response:
        return json.load(response)


def official_download():
    meta = get_json(DOWNLOAD + "columList.json", {"pk": "15107736", "ext": "JSON"})
    count = int(meta["totalCount"])
    fields = meta["tableVO"]
    all_rows = []
    for page in range(1, (count + 9999) // 10000 + 1):
        rows = get_json(DOWNLOAD + "standard.json", {
            "publicDataPk": "15107736", "colNmList": fields["colNmList"],
            "svcTableNm": fields["svcTableNm"], "totalCount": count, "perPage": 10000, "page": page,
        })
        if not isinstance(rows, list):
            raise ValueError("Unexpected national download format")
        all_rows.extend(rows)
    if len(all_rows) != count:
        raise ValueError("The national download is incomplete")
    return all_rows


def openapi():
    key = os.environ.get("DATA_GO_KR_SERVICE_KEY")
    if not key:
        raise ValueError("Set DATA_GO_KR_SERVICE_KEY in the server environment for --source api")
    all_rows = []
    for province in REGIONS:
        page = 1
        seen = 0
        while True:
            response = get_json(API, {"serviceKey": key, "type": "json", "numOfRows": 1000,
                                      "pageNo": page, "CTPV_NM": province})
            data = response.get("response", response)
            if str(data.get("header", {}).get("resultCode", "")) not in ("00","0","0000"):
                raise ValueError("Upstream rejected the request")
            body = data["body"]
            rows = body["items"]
            if isinstance(rows, dict):
                rows = rows.get("item", [])
                if isinstance(rows, dict):
                    rows = [rows]
            if not isinstance(rows, list) or not rows:
                raise ValueError("Empty or unexpected result page")
            all_rows.extend(rows)
            seen += len(rows)
            if seen >= int(body["totalCount"]):
                break
            page += 1
            if page > 25:
                raise ValueError("Unexpected pagination")
    return all_rows


def select(rows):
    found = {}
    for raw in rows:
        row = {k.upper(): str(v or "").strip() for k, v in raw.items()}
        region = REGIONS.get(row.get("CTPV_NM"))
        name = row.get("SCHL_NM")
        if region is None or name not in CAMPUSES[region] or row.get("UNIV_SE_NM") != "대학":
            continue
        rec = dict(region=region, ko=name, en=row["SCHL_ENG_NM"], address=row["LCTN_ROAD_NM_ADDR"],
                   website=row["HMPG_ADDR"], asOf=row["CRTR_YMD"], year=row["CRTR_YR"])
        if not all(rec.values()):
            raise ValueError("Incomplete record for " + name)
        slot = (region, name)
        if slot in found and found[slot] != rec and found[slot]["asOf"] == rec["asOf"]:
            raise ValueError("Ambiguous campus record for " + name)
        if slot not in found or rec["asOf"] > found[slot]["asOf"]:
            found[slot] = rec
    return [found[region, name] for region,names in CAMPUSES.items() for name in names]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=["download","api"], default="download")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[3] / "portfolio-site/stay-b/assets/local/campuses.js")
    args = parser.parse_args()
    try:
        records = select(openapi() if args.source == "api" else official_download())
        payload = {"source": SOURCE, "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "items": records}
        content = "window.StayBCampuses = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
        args.output.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.NamedTemporaryFile("w", dir=args.output.parent, encoding="utf-8", delete=False) as tmp:
            tmp.write(content)
        os.chmod(tmp.name, 0o644)
        os.replace(tmp.name,args.output)
        print(f"Updated {len(records)} campuses using {args.source}.")
    except Exception as exc:
        # Omit upstream URLs from errors as an authenticated request can include the key.
        raise SystemExit(f"Refresh failed ({type(exc).__name__}). Existing campus data retained.") from None


if __name__ == "__main__":
    main()
