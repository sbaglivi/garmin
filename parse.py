import json
import garth
from pathlib import Path
from new import login


BASE_URL = "https://connect.garmin.com/modern/activity"

def parse_title(title):
    return title.replace("Bresso", "").replace("-", "").strip()

def parse_date(date):
    month = date[5:7]
    day = date[8:10]
    return "%s/%s" % (day, month)

def generate_link(id, text):
    # return '<div id=":t6" class="Am aiL Al editable LW-avf tS-tW tS-tY" hidefocus="true" aria-label="Message Body" writingsuggestions="false" g_editable="true" role="textbox" aria-multiline="true" contenteditable="true" style="direction: ltr; min-height: 376px;" tabindex="1" itacorner="6,7:1,1,0,0" spellcheck="false" aria-owns=":vl" aria-controls=":vl" aria-expanded="false"><a href="%s/%s">%s</a><br></div>' % (BASE_URL, id, text)
    return '%s/%s %s' % (BASE_URL, id, text)

def get_show_splits(prompt: str) -> bool:
    return True # for now I'll always show

    show_splits = False
    choice = "y"
    while not show_splits and choice:
        choice = input(prompt)
        choice = choice.strip()
        show_splits = choice.lower() == "y"
    
    return show_splits

def get_splits(id: str):
    return garth.connectapi(f"activity-service/activity/{id}/typedsplits")["splits"]
    
def main():
    save_file = Path("data/cache.json")
    save = {}
    if save_file.is_file():
        with save_file.open() as f:
            save = json.load(f)

    with open("data/monthly/calendar10.json") as f:
        content = json.load(f)

    for ci in content["calendarItems"]:
        if ci['itemType'] != "activity":
            continue
        if ci["id"] in save:
            print("c", save[ci["id"]])
            continue

        detail = garth.connectapi(f"/activity-service/activity/{ci['id']}")
        with open(f"data/activities/{ci['id']}.json", "w") as f:
            json.dump(detail, f)

        show_splits = get_show_splits(f"show splits for {parse_date(ci['date'])} {parse_title(ci['title'])}?")
        title = parse_title(ci["title"])
        splits = None
        if show_splits:
            splits = get_splits(ci["id"])
        result = summarize_run(detail, title, splits)
        save[ci["id"]] = result
        print(result)

    with save_file.open("w") as f:
        json.dump(save, f)

def summarize_run(activity: dict, title: str, splits: dict | None) -> str:
    """Summarize a Garmin activity dict into a concise text output (km, min/km, HR, etc.).
       Optionally include split details if show_splits=True.
    """
    summary = activity.get("summaryDTO", {})
    start_time = summary["startTimeLocal"]

    # Core values
    dist_km = summary.get("distance", 0) / 1000
    dur_sec = summary.get("duration", 0)
    pace_sec_per_km = dur_sec / dist_km if dist_km > 0 else 0

    avg_hr = summary.get("averageHR")
    max_hr = summary.get("maxHR")
    elev_gain = summary.get("elevationGain")
    cadence = summary.get("averageRunCadence")
    training_effect = summary.get("trainingEffect")
    aerobic_msg = summary.get("aerobicTrainingEffectMessage", "")
    anaerobic_msg = summary.get("anaerobicTrainingEffectMessage", "")

    # Format pace
    pace_min = int(pace_sec_per_km // 60)
    pace_sec = int(round(pace_sec_per_km % 60))
    pace_str = f"{pace_min}:{pace_sec:02d} min/km"

    # Build summary string
    parts = [
        parse_date(start_time),
        title if title != "Running" else None,
        f"Dist: {dist_km:.2f} km",
        f"Time: {int(dur_sec//60)}m{int(dur_sec%60):02d}s",
        f"Pace: {pace_str}",
        f"HR: {avg_hr:.0f} avg / {max_hr:.0f} max",
        f"Elev+: {elev_gain:.0f} m",
        f"Cad: {cadence:.0f} spm" if cadence else None,
        f"TE: {training_effect:.1f} ({aerobic_msg}, {anaerobic_msg})" if training_effect else None
    ]
    parts = [p for p in parts if p]  # filter None

    # Base summary
    result = " | ".join(parts)

    # Add splits if requested
    if splits:
        split_lines = []
        keep = {
            "INTERVAL_WARMUP",
            "INTERVAL_ACTIVE",
            "INTERVAL_RECOVERY",
            "INTERVAL_COOLDOWN",
        }
        splits = [s for s in splits if s.get("type") in keep]
        if len(splits) == 1:
            splits = []

        for i,s in enumerate(splits):
            d_km = s.get("distance", 0) / 1000
            t_sec = s.get("duration", 0)
            pace = t_sec / d_km if d_km > 0 else 0
            p_min, p_sec = int(pace // 60), int(round(pace % 60))
            cadence = s.get("averageRunCadence")
            split_lines.append(
                f"Split {i} ({s['type']}): {d_km:.2f} km, {p_min}:{p_sec:02d} min/km, HR {s.get('averageHR'):.0f} Cad: {cadence:.0f}"
            )
        if split_lines:
            result += "\nSplits:\n" + "\n".join(split_lines)

    return result

if __name__ == "__main__":
    login()
    main()
