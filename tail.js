<div class="spark-cell">${makeSparkline(series, idx < 10 ? "#ff4757" : "#5468ff")}</div></td><td>${fmt(r.accidents_2019)}</td><td><strong>${fmt(r.accidents_2023)}</strong></td><td>${yoyPill(yoy)}</td></tr>`;
 }).join("")}</tbody>`;
 tbl.querySelectorAll("tr[data-state]").forEach(tr => {
 tr.style.cursor = "pointer";
 tr.onclick = () => { sel.value = tr.dataset.state; renderStateView(); window.scrollTo({ top: 0, behavior: "smooth" }); };
 });
}

function yoyPill(v) {
 if (v == null || isNaN(v)) return `<span class="delta-pill flat"> - </span>`;
 const cls = v > 0.5 ? "up" : v < -0.5 ? "down" : "flat";
 return `<span class="delta-pill ${cls}">${pct(v)}</span>`;
}

function makeSparkline(values, color) {
 const w = 90, h = 22, pad = 2;
 const valid = values.filter(v => v != null);
 if (valid.length < 2) return "";
 const min = Math.min(...valid), max = Math.max(...valid);
 const range = max - min || 1;
 const pts = values.map((v, i) => v == null ? null : `${(pad + (i / (values.length - 1)) * (w - 2 * pad)).toFixed(1)},${(h - pad - ((v - min) / range) * (h - 2 * pad)).toFixed(1)}`).filter(Boolean).join(" ");
 return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderStateView() {
 const name = document.getElementById("state-picker").value;
 const ins = INSIGHTS.states[name];
 const sLong = DATA.states.filter(s => s.state === name).sort((a, b) => a.year - b.year);
 const n23 = DATA.national_yearly.find(r => r.year === 2023);
 const dir = ins.vs_national_severity > 0 ? "above" : "below";
 document.getElementById("state-insight").innerHTML = `<div class="icon">🏛️</div><div class="text"><h3>${name}</h3><p>Recorded <strong>${fmt(ins.accidents_2023)}</strong> accidents in 2023, killing <strong>${fmt(ins.killed_2023)}</strong>. Severity is <strong>${ins.severity_2023}</strong> - ${Math.abs(ins.vs_national_severity)} pts <strong>${dir}</strong> the national average. Accidents changed ${pct(ins.yoy_pct)} YoY and ${pct(ins.five_yr_pct)} since 2019.</p></div>`;
 document.getElementById("kpi-state").innerHTML = `
 <div class="kpi"><div class="kpi-label">Accidents 2023</div><div class="kpi-value">${fmt(ins.accidents_2023)}</div><div class="kpi-trend ${ins.yoy_pct > 0 ? 'up' : 'down'}">${pct(ins.yoy_pct)} YoY</div></div>
 <div class="kpi warn"><div class="kpi-label">Persons killed</div><div class="kpi-value">${fmt(ins.killed_2023)}</div><div class="kpi-trend flat">${ins.killed_2023 ? Math.round(ins.killed_2023 / 365) + ' /day' : ' - '}</div></div>
 <div class="kpi blue"><div class="kpi-label">Severity (deaths/100)</div><div class="kpi-value">${ins.severity_2023}</div><div class="kpi-trend ${ins.vs_national_severity > 0 ? 'up' : 'down'}">${ins.vs_national_severity > 0 ? '+' : ''}${ins.vs_national_severity} vs national</div></div>
 <div class="kpi good"><div class="kpi-label">5-year change</div><div class="kpi-value">${pct(ins.five_yr_pct)}</div><div class="kpi-trend flat">vs 2019</div></div>`;
 if (chartStateTrend) chartStateTrend.destroy();
 chartStateTrend = new Chart(document.getElementById("chart-state-trend"), {
 type: "line",
 data: { labels: sLong.map(r => r.year), datasets: [
 { label: "Accidents", data: sLong.map(r => r.accidents), borderColor: PALETTE[1], backgroundColor: PALETTE[1] + "33", tension: .3, fill: true, yAxisID: "y", pointRadius: 3 },
 { label: "Killed", data: sLong.map(r => r.killed), borderColor: PALETTE[0], tension: .3, fill: false, yAxisID: "y2", pointRadius: 3 },
 ] },
 options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "top", labels: { usePointStyle: true } } }, scales: { y: { position: "left" }, y2: { position: "right", grid: { drawOnChartArea: false } } } }
 });
 buildGauge(ins.severity_2023, n23.severity);
 const stateAcc = ins.accidents_2023, nationAcc = 480583;
 const stateKill = ins.killed_2023, nationKill = 172890;
 const stateSev = ins.severity_2023, nationSev = n23.severity;
 document.getElementById("state-compare-bars").innerHTML = `
 <h3 style="font-size:11px; text-transform:uppercase; color:var(--muted); letter-spacing:0.06em; margin-bottom:12px">vs national average</h3>
 <div class="cmp-bar-row"><div class="cmp-bar-label">${name} accidents</div><div class="cmp-bar-track"><div class="cmp-bar-fill accent" style="width:${Math.min((stateAcc / nationAcc) * 100, 100)}%"></div></div><div class="cmp-bar-val">${(stateAcc / nationAcc * 100).toFixed(1)}%</div></div>
 <div class="cmp-bar-row"><div class="cmp-bar-label">${name} deaths</div><div class="cmp-bar-track"><div class="cmp-bar-fill accent" style="width:${Math.min((stateKill / nationKill) * 100, 100)}%"></div></div><div class="cmp-bar-val">${(stateKill / nationKill * 100).toFixed(1)}%</div></div>
 <div class="cmp-bar-row"><div class="cmp-bar-label">Severity</div><div class="cmp-bar-track"><div class="cmp-bar-fill ${stateSev > nationSev ? 'accent' : 'muted'}" style="width:${Math.min(stateSev, 100)}%"></div></div><div class="cmp-bar-val">${stateSev}</div></div>
 <div class="cmp-bar-row" style="opacity:.7"><div class="cmp-bar-label">National avg</div><div class="cmp-bar-track"><div class="cmp-bar-fill muted" style="width:${nationSev}%"></div></div><div class="cmp-bar-val">${nationSev}</div></div>`;
}

function buildGauge(value, ref) {
 const v = Math.min(value, 100);
 const ang = (v / 100) * 180;
 const cx = 110, cy = 110, r = 90;
 const polar = (a) => [cx + r * Math.cos(Math.PI * (180 - a) / 180), cy - r * Math.sin(Math.PI * (180 - a) / 180)];
 const [x1, y1] = polar(0);
 const [x2, y2] = polar(ang);
 const large = ang > 180 ? 1 : 0;
 const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
 const valuePath = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
 const color = v > ref + 5 ? "#ff4757" : v < ref - 5 ? "#2dd4bf" : "#ffb547";
 const refAng = (Math.min(ref, 100) / 100) * 180;
 const [rx, ry] = polar(refAng);
 document.getElementById("state-gauge").innerHTML = `
 <svg class="gauge-svg" viewBox="0 0 220 130">
 <path d="${trackPath}" stroke="var(--panel-3)" stroke-width="16" fill="none" stroke-linecap="round"/>
 <path d="${valuePath}" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round" style="filter: drop-shadow(0 0 6px ${color}aa)"/>
 <line x1="${cx}" y1="${cy}" x2="${rx}" y2="${ry}" stroke="currentColor" stroke-width="2" opacity="0.5" stroke-dasharray="4 3"/>
 <text x="110" y="100" text-anchor="middle" font-size="32" font-weight="800" fill="var(--text)">${value}</text>
 <text x="110" y="118" text-anchor="middle" font-size="10" fill="var(--muted)">deaths per 100</text>
 </svg>
 <div class="gauge-vs">National avg: <strong>${ref}</strong> · ${v > ref ? `<span style="color:var(--accent)">+${(v - ref).toFixed(1)}</span>` : `<span style="color:var(--good)">${(v - ref).toFixed(1)}</span>`}</div>`;
}

function exportStateCSV() {
 const name = document.getElementById("state-picker").value;
 const rows = DATA.states.filter(s => s.state === name);
 const csv = ["state,year,accidents,killed,fatality_rate_per_100"].concat(rows.map(r => [r.state, r.year, r.accidents, r.killed, r.fatality_rate_per_100].join(","))).join("\n");
 download(`${name.replace(/ /g, "_")}.csv`, csv, "text/csv");
}

let chartCityBar = null, chartCityRank = null;
function buildCityView() {
 const sel = document.getElementById("city-picker");
 const cities = DATA.cities.map(c => c.city).sort();
 sel.innerHTML = cities.map(c => `<option>${c}</option>`).join("");
 sel.value = "Chennai";
 sel.onchange = renderCityView;
 renderCityView();

 const ranks = DATA.cities.slice().sort((a, b) => b.accidents_2023 - a.accidents_2023);
 const tbl = document.getElementById("table-city-ranking");
 tbl.innerHTML = `<thead><tr><th>Rank</th><th>City</th><th>Trend</th><th>2022</th><th>2023</th><th>Killed</th><th>Severity</th><th>YoY</th></tr></thead><tbody>${ranks.map((r, idx) => {
 const yoy = (r.accidents_2023 - r.accidents_2022) / r.accidents_2022 * 100;
 const cls = idx === 0 ? "top1" : idx < 3 ? "top3" : idx < 10 ? "top10" : "";
 return `<tr data-city="${r.city}"><td><span class="rank-pill ${cls}">${idx + 1}</span></td><td>${r.city}</td><td><div class="spark-cell">${makeSparkline([r.accidents_2022, r.accidents_2023], idx < 10 ? "#ff4757" : "#5468ff")}</div></td><td>${fmt(r.accidents_2022)}</td><td><strong>${fmt(r.accidents_2023)}</strong></td><td>${fmt(r.killed_2023)}</td><td>${r.fatality_rate_2023}</td><td>${yoyPill(yoy)}</td></tr>`;
 }).join("")}</tbody>`;
 tbl.querySelectorAll("tr[data-city]").forEach(tr => {
 tr.style.cursor = "pointer";
 tr.onclick = () => { sel.value = tr.dataset.city; renderCityView(); window.scrollTo({ top: 0, behavior: "smooth" }); };
 });
}

function renderCityView() {
 const name = document.getElementById("city-picker").value;
 const c = DATA.cities.find(x => x.city === name);
 const ins = INSIGHTS.cities[name];
 const dir = ins.vs_national_severity > 0 ? "above" : "below";
 document.getElementById("city-insight").innerHTML = `<div class="icon">🏙️</div><div class="text"><h3>${name}</h3><p>Ranked <strong>#${ins.rank_2023}</strong> of 50 million-plus cities. <strong>${fmt(ins.accidents_2023)}</strong> accidents in 2023, killing <strong>${fmt(ins.killed_2023)}</strong>. Fatality rate <strong>${ins.fatality_rate_2023}</strong> - ${Math.abs(ins.vs_national_severity)} pts <strong>${dir}</strong> national avg. Change ${pct(ins.yoy_pct)} YoY.</p></div>`;
 document.getElementById("kpi-city").innerHTML = `
 <div class="kpi"><div class="kpi-label">Rank (50 cities)</div><div class="kpi-value">#${ins.rank_2023}</div><div class="kpi-trend flat">by accidents 2023</div></div>
 <div class="kpi blue"><div class="kpi-label">Accidents 2023</div><div class="kpi-value">${fmt(ins.accidents_2023)}</div><div class="kpi-trend ${ins.yoy_pct > 0 ? 'up' : 'down'}">${pct(ins.yoy_pct)} YoY</div></div>
 <div class="kpi warn"><div class="kpi-label">Persons killed</div><div class="kpi-value">${fmt(ins.killed_2023)}</div><div class="kpi-trend flat">2023</div></div>
 <div class="kpi good"><div class="kpi-label">Fatality rate</div><div class="kpi-value">${ins.fatality_rate_2023}</div><div class="kpi-trend ${ins.vs_national_severity > 0 ? 'up' : 'down'}">${ins.vs_national_severity > 0 ? '+' : ''}${ins.vs_national_severity} vs nat</div></div>`;
 if (chartCityBar) chartCityBar.destroy();
 chartCityBar = new Chart(document.getElementById("chart-city-bar"), {
 type: "bar",
 data: { labels: ["Accidents", "Killed", "Injured"], datasets: [
 { label: "2022", data: [c.accidents_2022, c.killed_2022, c.injured_2022], backgroundColor: PALETTE[1], borderRadius: 6 },
 { label: "2023", data: [c.accidents_2023, c.killed_2023, c.injured_2023], backgroundColor: PALETTE[0], borderRadius: 6 },
 ] },
 options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { usePointStyle: true } }, tooltip: { callbacks: { label: c => c.dataset.label + ": " + fmt(c.parsed.y) } } } }
 });
 const sorted = DATA.cities.slice().sort((a, b) => b.accidents_2023 - a.accidents_2023);
 const idx = sorted.findIndex(x => x.city === name);
 const slice = sorted.slice(Math.max(0, idx - 3), Math.min(sorted.length, idx + 4));
 if (chartCityRank) chartCityRank.destroy();
 chartCityRank = new Chart(document.getElementById("chart-city-rank"), {
 type: "bar",
 data: { labels: slice.map(s => s.city), datasets: [{ data: slice.map(s => s.accidents_2023), backgroundColor: slice.map(s => s.city === name ? PALETTE[0] : PALETTE[1] + "88"), borderRadius: 4 }] },
 options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
 });
}

function exportCityCSV() {
 const name = document.getElementById("city-picker").value;
 const c = DATA.cities.find(x => x.city === name);
 const rows = ["metric,2022,2023", `accidents,${c.accidents_2022},${c.accidents_2023}`, `killed,${c.killed_2022},${c.killed_2023}`, `injured,${c.injured_2022},${c.injured_2023}`, `fatality_rate,${c.fatality_rate_2022},${c.fatality_rate_2023}`].join("\n");
 download(`${name.replace(/ /g, "_")}.csv`, rows, "text/csv");
}

const compareSel = []; let chartCmpAcc = null, chartCmpFat = null, chartCmpRadar = null;
function buildCompare() {
 document.getElementById("compare-mode").onchange = refreshCompareOptions;
 refreshCompareOptions();
}
function refreshCompareOptions() {
 const mode = document.getElementById("compare-mode").value;
 const list = mode === "state" ? DATA.states_wide_acc.map(s => s.state).sort() : DATA.cities.map(c => c.city).sort();
 document.getElementById("compare-add").innerHTML = list.map(x => `<option>${x}</option>`).join("");
 compareSel.length = 0;
 if (mode === "state") compareSel.push("Tamil Nadu", "Uttar Pradesh");
 else compareSel.push("Delhi", "Bengaluru");
 renderCompare();
}
function addCompare() {
 if (compareSel.length >= 4) return alert("Maximum 4 items.");
 const v = document.getElementById("compare-add").value;
 if (!compareSel.includes(v)) compareSel.push(v);
 renderCompare();
}
function rmCompare(name) {
 const i = compareSel.indexOf(name);
 if (i >= 0) compareSel.splice(i, 1);
 renderCompare();
}
function renderCompare() {
 document.getElementById("compare-chips").innerHTML = compareSel.map((s, i) => `<span class="chip"><span class="dot" style="background:${PALETTE[i]}"></span>${s}<span class="x" onclick="rmCompare('${s}')">×</span></span>`).join(" ");
 const mode = document.getElementById("compare-mode").value;
 const years = [2019, 2020, 2021, 2022, 2023];
 if (chartCmpAcc) chartCmpAcc.destroy();
 if (chartCmpFat) chartCmpFat.destroy();
 if (chartCmpRadar) chartCmpRadar.destroy();
 let datasetsAcc = [], datasetsFat = [], rowsTbl = [], radarSets = [];
 if (mode === "state") {
 compareSel.forEach((name, idx) => {
 const sLong = DATA.states.filter(s => s.state === name).sort((a, b) => a.year - b.year);
 datasetsAcc.push({ label: name, data: sLong.map(r => r.accidents), borderColor: PALETTE[idx], backgroundColor: PALETTE[idx] + "33", tension: .3, fill: false, pointRadius: 3 });
 datasetsFat.push({ label: name, data: sLong.map(r => r.killed), borderColor: PALETTE[idx], borderDash: [5, 3], fill: false, tension: .3, pointRadius: 3 });
 const last = sLong[sLong.length - 1], first = sLong[0];
 rowsTbl.push({ name, accidents: last.accidents, killed: last.killed, severity: last.fatality_rate_per_100, change: ((last.accidents - first.accidents) / first.accidents * 100) });
 radarSets.push({ label: name, data: [(last.accidents||0)/1000, (last.killed||0)/100, last.fatality_rate_per_100, (last.accidents/480583)*100, (last.killed/172890)*100], borderColor: PALETTE[idx], backgroundColor: PALETTE[idx] + "33", borderWidth: 2 });
 });
 } else {
 compareSel.forEach((name, idx) => {
 const c = DATA.cities.find(x => x.city === name);
 const top = DATA.cities_top10.find(x => x.city === name);
 let series = top ? years.map(y => top["accidents_" + y]) : years.map(y => y === 2022 ? c.accidents_2022 : y === 2023 ? c.accidents_2023 : null);
 datasetsAcc.push({ label: name, data: series, borderColor: PALETTE[idx], backgroundColor: PALETTE[idx] + "33", tension: .3, fill: false, spanGaps: true, pointRadius: 3 });
 datasetsFat.push({ label: name, data: years.map(y => y === 2022 ? c.killed_2022 : y === 2023 ? c.killed_2023 : null), borderColor: PALETTE[idx], borderDash: [5, 3], fill: false, spanGaps: true, pointRadius: 3 });
 rowsTbl.push({ name, accidents: c.accidents_2023, killed: c.killed_2023, severity: c.fatality_rate_2023, change: ((c.accidents_2023 - c.accidents_2022) / c.accidents_2022 * 100) });
 radarSets.push({ label: name, data: [c.accidents_2023/100, c.killed_2023/50, c.fatality_rate_2023, (c.accidents_2023/81144)*100, (c.killed_2023/17255)*100], borderColor: PALETTE[idx], backgroundColor: PALETTE[idx] + "33", borderWidth: 2 });
 });
 }
 chartCmpAcc = new Chart(document.getElementById("chart-compare-acc"), { type: "line", data: { labels: years, datasets: datasetsAcc }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { usePointStyle: true } } } } });
 chartCmpFat = new Chart(document.getElementById("chart-compare-fat"), { type: "line", data: { labels: years, datasets: datasetsFat }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { usePointStyle: true } } } } });
 const radarLabels = mode === "state" ? ["Accidents (k)", "Killed (x100)", "Severity", "% of India acc", "% of India deaths"] : ["Acc/100", "Killed/50", "Severity", "% of 50-city acc", "% of 50-city deaths"];
 chartCmpRadar = new Chart(document.getElementById("chart-compare-radar"), { type: "radar", data: { labels: radarLabels, datasets: radarSets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { usePointStyle: true } } }, scales: { r: { angleLines: { color: "rgba(255,255,255,0.1)" }, grid: { color: "rgba(255,255,255,0.1)" } } } } });
 document.getElementById("compare-table").innerHTML = `<table><thead><tr><th>${mode === "state" ? "State" : "City"}</th><th>Accidents</th><th>Killed</th><th>Sev</th><th>Change</th></tr></thead><tbody>${rowsTbl.map((r, i) => `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${PALETTE[i]};margin-right:8px;vertical-align:middle"></span>${r.name}</td><td>${fmt(r.accidents)}</td><td>${fmt(r.killed)}</td><td>${r.severity}</td><td>${yoyPill(r.change)}</td></tr>`).join("")}</tbody></table>`;
}

function buildAnalytics() {
 const causes = DATA.causes;
 new Chart(document.getElementById("an-causes"), { type: "polarArea", data: { labels: causes.map(c => c.cause), datasets: [{ data: causes.map(c => c.accidents_2023), backgroundColor: PALETTE.slice(0, causes.length).map(c => c + "cc") }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { boxWidth: 12 } } } } });
 new Chart(document.getElementById("an-causes-yoy"), { type: "bar", data: { labels: causes.map(c => c.cause), datasets: [
 { label: "2022", data: causes.map(c => c.accidents_2022), backgroundColor: PALETTE[1], borderRadius: 4 },
 { label: "2023", data: causes.map(c => c.accidents_2023), backgroundColor: PALETTE[0], borderRadius: 4 },
 ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { usePointStyle: true } } } } });
 const rf = DATA.road_features;
 new Chart(document.getElementById("an-roadfeatures"), { type: "bar", data: { labels: rf.map(r => r.road_feature), datasets: [
 { label: "Accidents 2023", data: rf.map(r => r.accidents_2023), backgroundColor: PALETTE[0], borderRadius: 4 },
 { label: "Killed 2023", data: rf.map(r => r.killed_2023), backgroundColor: PALETTE[2], borderRadius: 4 },
 ] }, options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { usePointStyle: true } } } } });
 const nb = DATA.neighborhood;
 new Chart(document.getElementById("an-neighborhood"), { type: "bar", data: { labels: nb.map(r => r.area), datasets: [
 { label: "Accidents 2023", data: nb.map(r => r.accidents_2023), backgroundColor: PALETTE[1], borderRadius: 4 },
 { label: "Killed 2023", data: nb.map(r => r.killed_2023), backgroundColor: PALETTE[0], borderRadius: 4 },
 ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { usePointStyle: true } } } } });
 const states = DATA.states.filter(s => s.year === 2023 && s.fatality_rate_per_100 != null).sort((a, b) => b.fatality_rate_per_100 - a.fatality_rate_per_100);
 new Chart(document.getElementById("an-state-severity"), { type: "bar", data: { labels: states.map(s => s.state), datasets: [{ data: states.map(s => s.fatality_rate_per_100), backgroundColor: states.map(s => lerpColor(Math.min(s.fatality_rate_per_100 / 90, 1))) }] }, options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
 const stateGrowth = DATA.states_wide_acc.map(s => ({ state: s.state, change: s.accidents_2019 ? (s.accidents_2023 - s.accidents_2019) / s.accidents_2019 * 100 : null })).filter(s => s.change != null).sort((a, b) => b.change - a.change);
 new Chart(document.getElementById("an-state-growth"), { type: "bar", data: { labels: stateGrowth.map(s => s.state), datasets: [{ data: stateGrowth.map(s => +s.change.toFixed(1)), backgroundColor: stateGrowth.map(s => s.change > 0 ? PALETTE[0] : PALETTE[3]) }] }, options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}

function downloadChart(canvasId, name) {
 const c = document.getElementById(canvasId);
 const link = document.createElement("a");
 link.download = name + ".png";
 link.href = c.toDataURL("image/png", 1.0);
 link.click();
}
function download(filename, content, mime) {
 const blob = new Blob([content], { type: mime });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url; a.download = filename; a.click();
 URL.revokeObjectURL(url);
}

bootstrap();
</script>

</body>
</html>
