"""
Extract clean CSVs from MoRTH 'Road Accidents in India 2023' PDF.
The 2023 report contains 5-year trend tables (2019-2023) for all key indicators,
so it serves as the master source.
"""
import os, re
import pdfplumber
import pandas as pd

PDF_2023 = "/sessions/compassionate-zen-fermi/mnt/uploads/RA_2023.pdf"
OUT = "/sessions/compassionate-zen-fermi/mnt/outputs/data"
os.makedirs(OUT, exist_ok=True)

def to_int(s):
 if s is None: return None
 s = str(s).strip().replace(",", "").replace(" ", "")
 if s in ("", "NA", "Na", "N/A", "-", "#N/A"): return None
 try: return int(float(s))
 except ValueError: return None

def to_float(s):
 if s is None: return None
 s = str(s).strip().replace(",", "")
 if s in ("", "NA", "Na", "-"): return None
 try: return float(s)
 except: return None

def extract_national_yearly(pdf):
 txt = pdf.pages[31].extract_text()
 rows = []
 for line in txt.split("\n"):
 m = re.match(r"^(20\d{2})\s+([\d,]+)\s+([\d,]+)\s*\(([\d.]+)\)\s+([\d,]+)\s+([\d,]+)\s+([\d.]+)", line)
 if m:
 year, total_acc, fatal_acc, fatal_pct, killed, injured, severity = m.groups()
 rows.append({
 "year": int(year),
 "total_accidents": to_int(total_acc),
 "fatal_accidents": to_int(fatal_acc),
 "fatal_share_pct": to_float(fatal_pct),
 "persons_killed": to_int(killed),
 "persons_injured": to_int(injured),
 "severity": to_float(severity),
 })
 df = pd.DataFrame(rows).sort_values("year").reset_index(drop=True)
 df.to_csv(f"{OUT}/national_yearly.csv", index=False)
 print(f"national_yearly.csv rows={len(df)} years={df.year.min()}-{df.year.max()}")
 return df

STATE_NAME_FIX = {
 "J & K #": "Jammu & Kashmir",
 "Dadra & Nagar Haveli*": "Dadra & Nagar Haveli",
}

def extract_state_accidents(pdf):
 txt = pdf.pages[88].extract_text()
 rows = []
 for line in txt.split("\n"):
 m = re.match(
 r"^(\d{1,2})\s+([A-Za-z][A-Za-z &.()\-#*]+?)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)",
 line,
 )
 if m:
 sl, name, y19, y20, y21, y22, y23 = m.groups()
 name = STATE_NAME_FIX.get(name.strip(), name.strip())
 rows.append({
 "sl_no": int(sl),
 "state": name,
 "accidents_2019": to_int(y19),
 "accidents_2020": to_int(y20),
 "accidents_2021": to_int(y21),
 "accidents_2022": to_int(y22),
 "accidents_2023": to_int(y23),
 })
 df = pd.DataFrame(rows)
 df.to_csv(f"{OUT}/state_accidents.csv", index=False)
 print(f"state_accidents.csv rows={len(df)}")
 return df

def extract_state_fatalities(pdf):
 txt = pdf.pages[93].extract_text()
 rows = []
 lines = txt.split("\n")
 i = 0
 while i < len(lines):
 line = lines[i].strip()
 m = re.match(
 r"^(\d{1,2})\s+([A-Za-z][A-Za-z &.()\-#*]+?)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)",
 line,
 )
 if m:
 sl, name, y19, y20, y21, y22, y23 = m.groups()
 name = STATE_NAME_FIX.get(name.strip(), name.strip())
 rows.append({
 "sl_no": int(sl),
 "state": name,
 "killed_2019": to_int(y19),
 "killed_2020": to_int(y20),
 "killed_2021": to_int(y21),
 "killed_2022": to_int(y22),
 "killed_2023": to_int(y23),
 })
 else:
 if (re.match(r"^\d{1,2}\s+[A-Za-z]", line) and i+1 < len(lines)):
 merged = line + " " + lines[i+1].strip()
 m2 = re.match(
 r"^(\d{1,2})\s+([A-Za-z][A-Za-z &.()\-#*]+?)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)\s+([\d,]+|NA)",
 merged,
 )
 if m2:
 sl, name, y19, y20, y21, y22, y23 = m2.groups()
 name = STATE_NAME_FIX.get(name.strip(), name.strip())
 rows.append({
 "sl_no": int(sl),
 "state": name,
 "killed_2019": to_int(y19),
 "killed_2020": to_int(y20),
 "killed_2021": to_int(y21),
 "killed_2022": to_int(y22),
 "killed_2023": to_int(y23),
 })
 i += 1
 i += 1
 df = pd.DataFrame(rows).drop_duplicates(subset=["sl_no", "state"])
 df.to_csv(f"{OUT}/state_fatalities.csv", index=False)
 print(f"state_fatalities.csv rows={len(df)}")
 return df

def make_state_long(acc_df, fat_df):
 long_rows = []
 fat_lookup = fat_df.set_index("state").to_dict("index")
 for _, r in acc_df.iterrows():
 for y in (2019, 2020, 2021, 2022, 2023):
 killed = fat_lookup.get(r.state, {}).get(f"killed_{y}")
 long_rows.append({
 "state": r.state,
 "year": y,
 "accidents": r[f"accidents_{y}"],
 "killed": killed,
 })
 df = pd.DataFrame(long_rows)
 df["fatality_rate_per_100"] = (df.killed / df.accidents * 100).round(2)
 df.to_csv(f"{OUT}/state_long.csv", index=False)
 print(f"state_long.csv rows={len(df)}")
 return df

def extract_top10_cities(pdf):
 txt = pdf.pages[101].extract_text()
 rows = []
 for line in txt.split("\n"):
 m = re.match(r"^(\d{1,2})\s+([A-Za-z][A-Za-z\s().,]+?)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*$", line)
 if m:
 sl, city, y19, y20, y21, y22, y23 = m.groups()
 rows.append({
 "rank_2023": int(sl),
 "city": city.strip(),
 "accidents_2019": to_int(y19),
 "accidents_2020": to_int(y20),
 "accidents_2021": to_int(y21),
 "accidents_2022": to_int(y22),
 "accidents_2023": to_int(y23),
 })
 df = pd.DataFrame(rows)
 df.to_csv(f"{OUT}/cities_top10_accidents.csv", index=False)
 print(f"cities_top10_accidents.csv rows={len(df)}")
 return df

def extract_all_cities(pdf):
 txt = pdf.pages[100].extract_text()
 rows = []
 for line in txt.split("\n"):
 m = re.match(
 r"^(\d{1,2})\s+([A-Za-z][A-Za-z\s().\-]+?)\s+([\d,]+)\s+([\d,]+)\s+(\d+)\s+(\d+)\s+([\d,]+)\s+([\d,]+)\s+(\d+)\s+(\d+)\s+([\d,]+)\s+([\d,]+)\s+(\d+)\s+(\d+)\s*$",
 line,
 )
 if m:
 (sl, city, a22, a23, ar22, ar23, k22, k23, kr22, kr23, i22, i23, ir22, ir23) = m.groups()
 rows.append({
 "sl_no": int(sl),
 "city": city.strip(),
 "accidents_2022": to_int(a22),
 "accidents_2023": to_int(a23),
 "accidents_rank_2022": int(ar22),
 "accidents_rank_2023": int(ar23),
 "killed_2022": to_int(k22),
 "killed_2023": to_int(k23),
 "killed_rank_2022": int(kr22),
 "killed_rank_2023": int(kr23),
 "injured_2022": to_int(i22),
 "injured_2023": to_int(i23),
 "injured_rank_2022": int(ir22),
 "injured_rank_2023": int(ir23),
 })
 df = pd.DataFrame(rows)
 df["fatality_rate_2023"] = (df.killed_2023 / df.accidents_2023 * 100).round(2)
 df["fatality_rate_2022"] = (df.killed_2022 / df.accidents_2022 * 100).round(2)
 df.to_csv(f"{OUT}/cities_2022_2023.csv", index=False)
 print(f"cities_2022_2023.csv rows={len(df)}")
 return df

def extract_causes():
 rows = [
 ("Over-speeding", 333323, 119904, 322795, 328727, 117682, 320416),
 ("Drunken driving / alcohol & drugs", 10080, 4201, 8809, 9143, 3674, 8421),
 ("Driving on wrong side / lane indiscipline", 22586, 9094, 21745, 25242, 9432, 24435),
 ("Jumping red light", 4021, 1462, 3450, 2440, 818, 2157),
 ("Use of mobile phone", 7558, 3395, 6255, 7122, 2884, 6445),
 ("Others", 83744, 30435, 80312, 107909, 38400, 100951),
 ]
 df = pd.DataFrame(rows, columns=[
 "cause",
 "accidents_2022", "killed_2022", "injured_2022",
 "accidents_2023", "killed_2023", "injured_2023",
 ])
 df.to_csv(f"{OUT}/causes.csv", index=False)
 print(f"causes.csv rows={len(df)}")
 return df

def extract_road_features():
 rows = [
 ("Straight road", 309247, 322005, 111815, 114447, 297694, 310678),
 ("Curved road", 54593, 58626, 20573, 22263, 55866, 59447),
 ("Bridge", 14111, 15528, 6258, 6552, 13062, 14781),
 ("Culvert", 7384, 10308, 3473, 4271, 6309, 9302),
 ("Potholes", 4446, 5840, 1856, 2161, 3734, 5309),
 ("Steep grade", 4475, 5094, 2056, 2154, 4089, 4906),
 ("Ongoing road works/Under construction", 9211, 9425, 4054, 3904, 7955, 8246),
 ("Others", 57845, 53757, 18406, 17138, 54657, 50156),
 ]
 df = pd.DataFrame(rows, columns=[
 "road_feature",
 "accidents_2022", "accidents_2023",
 "killed_2022", "killed_2023",
 "injured_2022", "injured_2023",
 ])
 df.to_csv(f"{OUT}/road_features.csv", index=False)
 print(f"road_features.csv rows={len(df)}")
 return df

def extract_neighborhood():
 rows = [
 ("Residential Area", 86292, 94901, 29950, 32253, 78906, 88258),
 ("Institutional Area", 29384, 34277, 10223, 10809, 28452, 33606),
 ("Market/Commercial area", 66125, 74950, 19950, 22055, 61335, 70389),
 ("Open Area", 219988, 220454, 92772, 92739, 213878, 214193),
 ("Others", 59523, 56001, 15596, 15034, 60795, 56379),
 ]
 df = pd.DataFrame(rows, columns=[
 "area",
 "accidents_2022", "accidents_2023",
 "killed_2022", "killed_2023",
 "injured_2022", "injured_2023",
 ])
 df.to_csv(f"{OUT}/neighborhood.csv", index=False)
 print(f"neighborhood.csv rows={len(df)}")
 return df

def extract_road_category():
 rows = [
 (2019, "National Highways", 137191, 53872, 137584),
 (2020, "National Highways", 116496, 47984, 116279),
 (2021, "National Highways", 128825, 53615, 128911),
 (2022, "National Highways", 151997, 61038, 144352),
 (2023, "National Highways", 150177, 63112, 142755),
 (2019, "State Highways", 111171, 41461, 110843),
 (2020, "State Highways", 92251, 35754, 87184),
 (2021, "State Highways", 96382, 37963, 92583),
 (2022, "State Highways", 106682, 41012, 106485),
 (2023, "State Highways", 105662, 39439, 107120),
 (2019, "Other Roads", 204731, 60936, 200917),
 (2020, "Other Roads", 160315, 52378, 149476),
 (2021, "Other Roads", 187225, 60002, 174100),
 (2022, "Other Roads", 202633, 66441, 192529),
 (2023, "Other Roads", 224744, 70339, 212674),
 ]
 df = pd.DataFrame(rows, columns=["year", "category", "accidents", "killed", "injured"])
 df.to_csv(f"{OUT}/national_road_category.csv", index=False)
 print(f"national_road_category.csv rows={len(df)}")
 return df

def extract_accident_type():
 rows = [
 (2019, 145332, 151335, 131555, 28737, 456959),
 (2020, 127307, 112768, 110314, 21792, 372181),
 (2021, 142163, 126394, 119633, 24242, 412432),
 (2022, 155781, 143374, 135360, 26797, 461312),
 (2023, 160509, 145672, 143006, 31396, 480583),
 ]
 df = pd.DataFrame(rows, columns=["year", "fatal", "grievous_injury", "minor_injury", "non_injury", "total"])
 df.to_csv(f"{OUT}/national_accident_type.csv", index=False)
 print(f"national_accident_type.csv rows={len(df)}")
 return df

def main():
 with pdfplumber.open(PDF_2023) as pdf:
 extract_national_yearly(pdf)
 sa = extract_state_accidents(pdf)
 sf = extract_state_fatalities(pdf)
 make_state_long(sa, sf)
 extract_top10_cities(pdf)
 extract_all_cities(pdf)
 extract_causes()
 extract_road_features()
 extract_neighborhood()
 extract_road_category()
 extract_accident_type()
 print("\nALL CSVs written to", OUT)

if __name__ == "__main__":
 main()
