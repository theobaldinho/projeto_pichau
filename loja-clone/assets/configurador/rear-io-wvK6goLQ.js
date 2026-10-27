var e = [12.5, 31.5], t = {
	usb2: [13, 5.6],
	usb5: [13, 5.6],
	usb10: [13, 5.6],
	usbc: [3, 8.6],
	hdmi: [15, 6],
	dp: [16, 6.6],
	rj45: [16, 13.6],
	sma: [7, 7],
	btn: [5, 5],
	audio: [7, 7],
	spdif: [7, 7],
	ps2: [9.5, 9.5]
}, n = {
	usb2: "USB 2.0",
	usb5: "USB 5G",
	usb10: "USB 10G"
};
function r(r) {
	let i = [];
	r.biosFlashback && i.push({
		kinds: ["btn"],
		label: "BIOS",
		h: 5
	}), r.clearCmos && i.push({
		kinds: ["btn"],
		label: "CMOS",
		h: 5
	}), i.length === 1 && i.push({
		kinds: [],
		label: "",
		h: 0
	}), r.wifi && i.push({
		kinds: ["sma"],
		label: "WI-FI",
		h: 7
	}, {
		kinds: ["sma"],
		label: "WI-FI",
		h: 7
	}), r.ps2 && i.push({
		kinds: ["ps2"],
		label: "PS/2",
		h: 9.5
	});
	for (let e = 0; e < r.hdmi; e++) i.push({
		kinds: ["hdmi"],
		label: "HDMI",
		h: 6
	});
	for (let e = 0; e < r.dp; e++) i.push({
		kinds: ["dp"],
		label: "DP",
		h: 6.6
	});
	for (let e of [
		"usb2",
		"usb5",
		"usb10"
	]) for (let t = r[e]; t > 0; t -= 2) i.push({
		kinds: t >= 2 ? [e, e] : [e],
		label: n[e],
		h: t >= 2 ? 13.6 : 5.6
	});
	for (let e = r.usbc; e > 0; e -= 2) i.push({
		kinds: e >= 2 ? ["usbc", "usbc"] : ["usbc"],
		label: "USB-C",
		h: 8.6
	});
	i.push({
		kinds: ["rj45"],
		label: `LAN ${String(r.lanGbps).replace(".", ",")}G`,
		h: 13.6
	});
	let a = [], o = [], s = 4;
	for (let n = 0; n < i.length; n += 2) {
		let r = i.slice(n, n + 2), c = Math.max(...r.map((e) => e.h));
		r.forEach((n, r) => {
			let i = e[r];
			n.kinds.length === 2 && n.kinds[0] === "usbc" ? a.push({
				kind: "usbc",
				a: i - 3.5,
				b: s + n.h / 2
			}, {
				kind: "usbc",
				a: i + 3.5,
				b: s + n.h / 2
			}) : n.kinds.length === 2 ? a.push({
				kind: n.kinds[0],
				a: i,
				b: s + 2.8
			}, {
				kind: n.kinds[1],
				a: i,
				b: s + 10.8
			}) : n.kinds.length === 1 && a.push({
				kind: n.kinds[0],
				a: i,
				b: s + t[n.kinds[0]][1] / 2
			}), n.label && o.push({
				text: n.label,
				a: i,
				b: s + c + 2.3
			});
		}), s += c + 6.2;
	}
	let c = r.audio === 5 ? [
		["audio", "#3b6fd6"],
		["audio", "#3ddc5a"],
		["audio", "#f06292"],
		["audio", "#ff9800"],
		["audio", "#1b1b1d"]
	] : [
		["audio", "#3b6fd6"],
		["audio", "#3ddc5a"],
		["audio", "#f06292"]
	];
	r.spdif && c.push(["spdif", "#1b1b1d"]);
	for (let e = 0; e < c.length; e += 3) {
		let t = c.slice(e, e + 3);
		t.forEach(([e, n], r) => a.push({
			kind: e,
			a: 22 + (r - (t.length - 1) / 2) * 11,
			b: s + 3.5,
			color: n
		})), s += 9;
	}
	return {
		ports: a,
		labels: o,
		height: s
	};
}
export { r as n, t };
