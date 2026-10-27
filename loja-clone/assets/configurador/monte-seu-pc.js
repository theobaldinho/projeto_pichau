import { n as e } from "./rear-io-wvK6goLQ.js";
// src/core/types.ts
var t = [
	{
		slot: "cpu",
		label: "Processador",
		required: !0
	},
	{
		slot: "cooler",
		label: "Cooler Processador",
		required: !0
	},
	{
		slot: "mobo",
		label: "Placa Mãe",
		required: !0
	},
	{
		slot: "ram",
		label: "Memória RAM",
		required: !0
	},
	{
		slot: "gpu",
		label: "Placa de Vídeo",
		required: !0
	},
	{
		slot: "storage",
		label: "HD & SSD",
		required: !0
	},
	{
		slot: "case",
		label: "Gabinete",
		required: !0
	},
	{
		slot: "psu",
		label: "Fonte de Alimentação",
		required: !0
	},
	{
		slot: "extras",
		label: "Periféricos, Acessórios e Extras",
		required: !1
	}
], n = [
	"incompatible",
	"nofit",
	"power"
], r = .15, i = 12, a = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL"
}), o = (e) => a.format(e / 100), s = (e) => Math.round(e / .85);
function c(e) {
	let t = s(e), n = t > 0 ? 12 : 1;
	return {
		pix: e,
		card: t,
		installments: n,
		installment: Math.round(t / n)
	};
}
// src/core/rules.ts
var l = {
	itx: "Mini-ITX",
	matx: "Micro-ATX",
	atx: "ATX",
	eatx: "E-ATX"
};
function u(e) {
	let t = [], { cpu: n, mobo: r, ram: i, cooler: a, gpu: o, psu: s, storage: c, case: u } = e, d = (e, n, r) => t.push({
		code: e,
		severity: "incompatible",
		slots: n,
		message: r
	}), f = (e, n, r) => t.push({
		code: e,
		severity: "warning",
		slots: n,
		message: r
	});
	if (n && r) {
		if (n.socket !== r.socket) d("socket", ["mobo", "cpu"], `Socket diferente: processador ${n.socket}, placa-mãe ${r.socket}`);
		else {
			let e = r.cpuGenerations[n.generation];
			e ? e === "bios" && f("bios", ["mobo", "cpu"], "A placa-mãe pode precisar de atualização de BIOS para este processador") : d("chipset", ["mobo", "cpu"], "O chipset da placa-mãe não suporta este processador");
		}
	}
	if (i && r && (i.memType === r.memType ? i.modules > r.memSlots && d("mem-slots", ["ram", "mobo"], `A memória tem ${i.modules} pentes e a placa-mãe só ${r.memSlots} slots`) : d("mem-type", ["ram", "mobo"], `A placa-mãe usa ${r.memType} e a memória é ${i.memType}`)), i && n && !n.memTypes.includes(i.memType) && d("cpu-mem", ["ram", "cpu"], `O processador não suporta memória ${i.memType}`), r && u && !u.formFactors.includes(r.formFactor) && d("form-factor", ["case", "mobo"], `O gabinete não aceita placa-mãe ${l[r.formFactor]}`), a) {
		let e = n?.socket ?? r?.socket;
		e && !a.sockets.includes(e) ? d("cooler-socket", ["cooler", n ? "cpu" : "mobo"], `O cooler não é compatível com o socket ${e}`) : n && a.tdpRatingW < n.tdpW && f("cooler-tdp", ["cooler", "cpu"], `O cooler dissipa até ${a.tdpRatingW}W e o processador chega a ${n.tdpW}W`);
	}
	if (o && s) {
		let e = o.powerConnectors.filter((e) => !s.connectors.includes(e));
		e.length && d("gpu-connector", ["psu", "gpu"], `A placa de vídeo usa conector ${e.join(", ")} e a fonte não tem`);
	}
	return c && r && c.interface === "m2" && r.m2Slots === 0 && d("m2-slot", ["storage", "mobo"], "A placa-mãe não tem slot M.2"), t;
}
// src/core/fit.ts
var d = (e) => e.toLocaleString("pt-BR");
function f(e, t) {
	for (let n of [
		"top",
		"front",
		"rear"
	]) if (e.radiatorMounts[n].includes(t)) return n;
	return null;
}
function p(e) {
	let t = e.case;
	if (!t) return [];
	let n = [], { gpu: r, cooler: i, psu: a } = e, o = (e, t, r, i) => n.push({
		code: e,
		severity: "nofit",
		slots: t,
		message: r,
		...i ? { deltaMm: i } : {}
	}), s;
	if (i?.kind === "aio" && i.radiatorMm && (s = f(t, i.radiatorMm), s || o("radiator", ["cooler", "case"], `O gabinete não tem suporte para radiador de ${i.radiatorMm} mm`)), i?.kind === "air" && i.heightMm && i.heightMm > t.maxCoolerHeightMm && o("cooler-height", ["cooler", "case"], `O cooler tem ${i.heightMm} mm de altura e o gabinete aceita até ${t.maxCoolerHeightMm} mm`, i.heightMm - t.maxCoolerHeightMm), r) {
		let e = s === "front", n = e ? t.maxGpuLengthFrontRadMm ?? t.maxGpuLengthMm : t.maxGpuLengthMm;
		r.lengthMm > n && o("gpu-length", e ? [
			"gpu",
			"case",
			"cooler"
		] : ["gpu", "case"], `A placa de vídeo tem ${r.lengthMm} mm e o gabinete aceita até ${n} mm${e ? " com o radiador na frente" : ""}`, r.lengthMm - n), r.slotWidth > t.expansionSlots && o("gpu-slots", ["gpu", "case"], `A placa de vídeo ocupa ${d(r.slotWidth)} slots e o gabinete tem ${t.expansionSlots}`);
	}
	return a && a.lengthMm > t.maxPsuLengthMm && o("psu-length", ["psu", "case"], `A fonte tem ${a.lengthMm} mm e o gabinete aceita até ${t.maxPsuLengthMm} mm`, a.lengthMm - t.maxPsuLengthMm), n;
}
// src/core/power.ts
var m = 75, h = .7, g = .85, _ = (e) => (e.cpu?.tdpW ?? 0) + (e.gpu?.tbpW ?? 0) + 75, v = (e) => Math.ceil(e / h / 50) * 50;
function y(e, t) {
	let n = _(e), r = v(n), i = e.psu;
	if (!i) return {
		needW: n,
		recommendedW: r,
		level: "none"
	};
	let a = n / i.wattage, o = a > .85 ? "block" : a > .7 ? "warn" : "ok", s = {
		needW: n,
		recommendedW: r,
		psuW: i.wattage,
		loadPct: Math.round(a * 100),
		level: o
	};
	if (o !== "ok") {
		let n = e.gpu?.powerConnectors ?? [];
		s.suggestion = t.filter((e) => e.wattage >= r && n.every((t) => e.connectors.includes(t))).sort((e, t) => e.wattage - t.wattage || e.pricePix - t.pricePix)[0];
	}
	return s;
}
function b(e) {
	if (e.level !== "block" && e.level !== "warn") return [];
	let t = `A fonte de ${e.psuW}W ficaria com ${e.loadPct}% de carga (consumo estimado de ${e.needW}W). Recomendado: ${e.recommendedW}W ou mais`;
	return [e.level === "block" ? {
		code: "power",
		severity: "power",
		slots: [
			"psu",
			"gpu",
			"cpu"
		],
		message: t
	} : {
		code: "power-warn",
		severity: "warning",
		slots: ["psu"],
		message: t
	}];
}
// src/core/engine.ts
var x = {
	ok: 0,
	warning: 1,
	power: 2,
	nofit: 3,
	incompatible: 4
}, S = (e) => e.reduce((e, t) => x[t.severity] > x[e] ? t.severity : e, "ok"), C = (e) => n.includes(e.severity), w = (e) => t.find((t) => t.slot === e)?.label ?? e;
function T(e) {
	let t = e.issues.filter(C).length, n = e.issues.filter((e) => e.severity === "warning").length, r = e.missingRequired.length ? "incomplete" : t ? "blocked" : n ? "warning" : "ready", i = (e, t, n) => `${e} ${e === 1 ? t : n}`, a = [
		`${e.doneCount}/${e.requiredCount} peças`,
		...t ? [i(t, "conflito", "conflitos")] : [],
		...n ? [i(n, "aviso", "avisos")] : []
	];
	return {
		level: r,
		conflicts: t,
		warnings: n,
		title: {
			incomplete: "Faltam peças",
			blocked: "Com conflitos",
			warning: "Completa, com avisos",
			ready: "Pronta para comprar"
		}[r],
		summary: a.join(" · ")
	};
}
function E(e, t) {
	let n = {};
	for (let [r, i] of Object.entries(t)) {
		let t = e.parts.find((e) => e.id === i && e.slot === r);
		t && (n[r] = t);
	}
	return n;
}
function D(e, t) {
	return [
		...u(e),
		...p(e),
		...b(y(e, t))
	];
}
function ee(e, t) {
	return e.flatMap((e) => {
		if (e.severity !== "nofit") return [e];
		let n = t.find((t) => t.code === e.code);
		if (!n) return [e];
		let r = (e.deltaMm ?? 0) - (n.deltaMm ?? 0);
		return r <= 0 ? [] : [{
			...e,
			severity: "warning",
			message: `Aumenta em ${r} mm um conflito que já existe: ${e.message.charAt(0).toLowerCase()}${e.message.slice(1)}`,
			deltaMm: r
		}];
	});
}
function O(e, n) {
	let r = E(e, n), i = e.parts.filter((e) => e.slot === "psu"), a = D(r, i), o = (e) => {
		let t = { ...r };
		return delete t[e], D(t, i);
	}, s = {};
	for (let { slot: n } of t) {
		let t = e.parts.filter((e) => e.slot === n).sort((e, t) => e.pricePix - t.pricePix).map((e) => {
			let t = ee(D({
				...r,
				[n]: e
			}, i).filter((e) => e.slots.includes(n)), o(n));
			return {
				part: e,
				status: S(t),
				reasons: t
			};
		});
		s[n] = {
			selected: r[n],
			options: t
		};
	}
	let l = t.filter((e) => e.required), u = l.filter((e) => !r[e.slot]).map((e) => e.slot), d = a.filter(C), f = [...u.length ? [`Falta escolher: ${u.map(w).join(", ")}`] : [], ...d.map((e) => e.message)], p = Object.values(r).reduce((e, t) => e + (t?.pricePix ?? 0), 0);
	return {
		build: { ...n },
		selected: r,
		slots: s,
		issues: a,
		power: y(r, i),
		totals: c(p),
		missingRequired: u,
		requiredCount: l.length,
		doneCount: l.length - u.length,
		blockers: f,
		canBuy: f.length === 0
	};
}
// src/core/share.ts
var k = "b";
function te(e) {
	return t.filter((t) => e[t.slot]).map((t) => `${t.slot}:${e[t.slot]}`).join(",");
}
function A(e, t) {
	let n = {};
	for (let r of e.split(",")) {
		let [e, i] = r.split(":");
		t.parts.some((t) => t.id === i && t.slot === e) && (n[e] = i);
	}
	return n;
}
function ne(e, t) {
	let n = e.searchParams.get("b");
	return n ? A(n, t) : {};
}
function re(e, t) {
	let n = new URL(e), r = te(t);
	return r ? n.searchParams.set("b", r) : n.searchParams.delete("b"), n;
}
// src/core/validate.ts
var ie = {
	cpu: {
		socket: "string",
		tdpW: "number",
		memTypes: "string[]",
		generation: "string"
	},
	mobo: {
		socket: "string",
		formFactor: "string",
		memType: "string",
		memSlots: "number",
		m2Slots: "number",
		cpuGenerations: "object"
	},
	ram: {
		memType: "string",
		modules: "number",
		capacityGb: "number",
		heightMm: "number"
	},
	gpu: {
		lengthMm: "number",
		slotWidth: "number",
		tbpW: "number",
		powerConnectors: "string[]"
	},
	cooler: {
		kind: "string",
		sockets: "string[]",
		tdpRatingW: "number"
	},
	case: {
		formFactors: "string[]",
		maxGpuLengthMm: "number",
		expansionSlots: "number",
		maxCoolerHeightMm: "number",
		radiatorMounts: "object",
		maxPsuLengthMm: "number"
	},
	psu: {
		wattage: "number",
		lengthMm: "number",
		connectors: "string[]"
	},
	storage: {
		interface: "string",
		capacityGb: "number"
	},
	extras: {}
};
function ae(e, t) {
	return t === "string[]" ? Array.isArray(e) && e.every((e) => typeof e == "string") : t === "number[]" ? Array.isArray(e) && e.every((e) => typeof e == "number") : t === "object" ? typeof e == "object" && !!e && !Array.isArray(e) : typeof e === t && (t !== "number" || Number.isFinite(e));
}
var oe = {
	usb2: "number",
	usb5: "number",
	usb10: "number",
	usbc: "number",
	hdmi: "number",
	dp: "number",
	lanGbps: "number",
	audio: "number",
	wifi: "boolean",
	spdif: "boolean",
	ps2: "boolean",
	biosFlashback: "boolean",
	clearCmos: "boolean"
};
function se(e) {
	let n = [], r = e?.parts;
	if (!Array.isArray(r)) return ["catálogo sem lista \"parts\""];
	let i = new Set(t.map((e) => e.slot)), a = /* @__PURE__ */ new Set();
	return r.forEach((e, t) => {
		let r = `parts[${t}]${e?.id ? ` (${e.id})` : ""}`;
		if (typeof e?.id != "string" || !e.id) return void n.push(`${r}: id ausente`);
		if (a.has(e.id) && n.push(`${r}: id duplicado`), a.add(e.id), !i.has(e.slot)) return void n.push(`${r}: slot desconhecido "${e.slot}"`);
		typeof e.name == "string" && e.name || n.push(`${r}: name ausente`), (!Number.isInteger(e.pricePix) || e.pricePix <= 0) && n.push(`${r}: pricePix deve ser inteiro em centavos`), e.image === void 0 || typeof e.image == "string" && e.image || n.push(`${r}: image deve ser uma URL (texto)`);
		for (let [t, i] of Object.entries(ie[e.slot])) ae(e[t], i) || n.push(`${r}: campo "${t}" deve ser ${i}`);
		if (e.slot === "mobo" && e.rearIo !== void 0) for (let [t, i] of Object.entries(oe)) {
			let a = e.rearIo?.[t];
			(typeof a !== i || i === "number" && !(a >= 0)) && n.push(`${r}: rearIo.${t} deve ser ${i === "number" ? "número ≥ 0" : "true/false"}`);
		}
		if (e.slot === "cooler" && (e.kind === "air" && !ae(e.heightMm, "number") && n.push(`${r}: cooler a ar precisa de heightMm`), e.kind === "aio" && !ae(e.radiatorMm, "number") && n.push(`${r}: water cooler precisa de radiatorMm`)), e.slot === "case") for (let t of [
			"front",
			"top",
			"rear"
		]) ae(e.radiatorMounts?.[t], "number[]") || n.push(`${r}: radiatorMounts.${t} deve ser number[]`);
	}), n;
}
// src/core/filters.ts
var j = (e) => (t) => e(t.part), ce = (e) => e === void 0 ? void 0 : e ? "Sim" : "Não", le = (e) => e.toLocaleString("pt-BR"), ue = (e) => e >= 1e3 ? `${le(e / 1e3)} TB` : `${e} GB`, de = {
	zen3: "Ryzen 5000 (Zen 3)",
	zen4: "Ryzen 7000 (Zen 4)",
	zen5: "Ryzen 9000 (Zen 5)",
	intel12: "Core 12ª geração",
	intel13: "Core 13ª geração",
	intel14: "Core 14ª geração"
}, fe = {
	"8pin": "8 pinos (PCIe)",
	"12V-2x6": "12V-2x6 (16 pinos)"
}, M = {
	kind: "range",
	key: "price",
	label: "Preço",
	unit: "R$",
	step: 1,
	get: (e) => e.part.pricePix / 100
}, N = {
	kind: "select",
	key: "brand",
	label: "Marca",
	get: (e) => e.part.brand
}, pe = [
	{
		kind: "bool",
		key: "fits",
		label: "Só o que é compatível",
		get: (e) => e.status === "ok" || e.status === "warning"
	},
	{
		kind: "bool",
		key: "sale",
		label: "Em oferta",
		get: (e) => !!e.part.onSale
	},
	{
		kind: "bool",
		key: "outlet",
		label: "Em outlet",
		get: (e) => !!e.part.outlet
	}
], me = {
	cpu: [
		M,
		{
			kind: "range",
			key: "tdp",
			label: "Potência",
			unit: "W",
			step: 1,
			get: j((e) => e.tdpW)
		},
		{
			kind: "range",
			key: "clock",
			label: "Potência de clock",
			unit: "GHz",
			step: .1,
			get: j((e) => e.boostGhz)
		},
		{
			kind: "range",
			key: "ramMhz",
			label: "Frequência de RAM",
			unit: "MHz",
			step: 50,
			get: j((e) => e.ramMhz)
		},
		{
			kind: "checks",
			key: "maker",
			label: "Fabricante",
			get: j((e) => e.socket.startsWith("AM") ? "AMD" : "Intel")
		},
		{
			kind: "select",
			key: "series",
			label: "Tipo de processador",
			get: j((e) => e.series)
		},
		{
			kind: "select",
			key: "gen",
			label: "Geração",
			get: j((e) => de[e.generation] ?? e.generation)
		},
		{
			kind: "select",
			key: "socket",
			label: "Soquete",
			get: j((e) => e.socket)
		},
		{
			kind: "select",
			key: "ddr",
			label: "Versão da DDR",
			get: j((e) => e.memTypes)
		},
		{
			kind: "select",
			key: "cond",
			label: "Condição",
			get: (e) => e.part.outlet ? "Openbox" : "Novo"
		},
		{
			kind: "select",
			key: "maxRam",
			label: "RAM máxima",
			any: "Qualquer",
			get: j((e) => e.maxRamGb ? `${e.maxRamGb} GB` : void 0)
		},
		{
			kind: "select",
			key: "cores",
			label: "Número de núcleos",
			get: j((e) => e.cores?.toString())
		},
		{
			kind: "select",
			key: "threads",
			label: "Threads",
			get: j((e) => e.threads?.toString())
		},
		{
			kind: "bool",
			key: "igpu",
			label: "VGA Integrado",
			get: j((e) => e.igpu)
		},
		{
			kind: "bool",
			key: "oc",
			label: "Overclock habilitado",
			get: j((e) => e.overclock)
		},
		{
			kind: "bool",
			key: "stock",
			label: "Cooler embutido",
			get: j((e) => e.coolerIncluded)
		}
	],
	cooler: [
		M,
		{
			kind: "range",
			key: "tdp",
			label: "Potência",
			unit: "W",
			step: 5,
			get: j((e) => e.tdpRatingW)
		},
		{
			kind: "range",
			key: "size",
			label: "Tamanho do radiador / altura",
			unit: "mm",
			step: 5,
			get: j((e) => e.radiatorMm ?? e.heightMm)
		},
		{
			kind: "range",
			key: "cfm",
			label: "Fluxo de ar",
			unit: "CFM",
			step: 1,
			get: j((e) => e.airflowCfm)
		},
		{
			kind: "range",
			key: "press",
			label: "Pressão estática",
			unit: "mmH₂O",
			step: .5,
			get: j((e) => e.pressureMmH2O)
		},
		{
			kind: "range",
			key: "noise",
			label: "Nível de ruído",
			unit: "dBA",
			step: 1,
			get: j((e) => e.noiseDba)
		},
		{
			kind: "range",
			key: "rpm",
			label: "Rotação",
			unit: "RPM",
			step: 50,
			get: j((e) => e.maxRpm)
		},
		N,
		{
			kind: "select",
			key: "fan",
			label: "Tamanho",
			get: j((e) => e.fanMm ? `${e.fanMm} mm` : void 0)
		},
		{
			kind: "select",
			key: "fans",
			label: "Ventoinhas inclusas",
			get: j((e) => e.fans?.toString())
		},
		{
			kind: "select",
			key: "type",
			label: "Tipo",
			get: j((e) => e.kind === "aio" ? "Water cooler" : (e.heightMm ?? 0) < 70 ? "Low profile" : (e.fans ?? 1) > 1 ? "Torre dupla" : "Torre")
		},
		{
			kind: "select",
			key: "cooling",
			label: "Refrigeração",
			get: j((e) => e.kind === "aio" ? "Líquida" : "Ar")
		},
		{
			kind: "select",
			key: "socket",
			label: "Soquete suportado",
			get: j((e) => e.sockets)
		},
		{
			kind: "select",
			key: "color",
			label: "Cor",
			get: j((e) => e.color)
		}
	],
	mobo: [
		M,
		N,
		{
			kind: "select",
			key: "slots",
			label: "Slots de memória",
			get: j((e) => e.memSlots.toString())
		},
		{
			kind: "select",
			key: "chipset",
			label: "Chipset",
			get: j((e) => e.chipset)
		},
		{
			kind: "select",
			key: "ff",
			label: "Tamanho",
			get: j((e) => l[e.formFactor])
		},
		{
			kind: "select",
			key: "socket",
			label: "Soquete",
			get: j((e) => e.socket)
		},
		{
			kind: "select",
			key: "mem",
			label: "Memória",
			get: j((e) => e.memType)
		},
		{
			kind: "select",
			key: "vrm",
			label: "Dissipador do VRM",
			get: j((e) => ce(e.vrmHeatsink))
		},
		{
			kind: "select",
			key: "sata",
			label: "Tem interface Sata III",
			get: j((e) => e.sataPorts === void 0 ? void 0 : ce(e.sataPorts > 0))
		},
		{
			kind: "select",
			key: "m2",
			label: "Tem interface SSD M.2",
			get: j((e) => ce(e.m2Slots > 0))
		},
		{
			kind: "select",
			key: "maxRam",
			label: "RAM máxima",
			any: "Qualquer",
			get: j((e) => e.maxRamGb ? `${e.maxRamGb} GB` : void 0)
		},
		{
			kind: "select",
			key: "pcie",
			label: "Versão de PCIe",
			get: j((e) => e.pcieGen ? `PCIe ${e.pcieGen}.0` : void 0)
		},
		{
			kind: "select",
			key: "wifi",
			label: "Wi-Fi",
			get: j((e) => ce(e.rearIo?.wifi))
		}
	],
	ram: [
		M,
		{
			kind: "range",
			key: "mhz",
			label: "Frequência",
			unit: "MHz",
			step: 100,
			get: j((e) => e.mhz)
		},
		{
			kind: "range",
			key: "cl",
			label: "Latência",
			unit: "CL",
			step: 1,
			get: j((e) => e.cl)
		},
		N,
		{
			kind: "select",
			key: "type",
			label: "Tipo",
			get: j((e) => e.memType)
		},
		{
			kind: "select",
			key: "cap",
			label: "Capacidade",
			get: j((e) => `${e.capacityGb} GB`)
		},
		{
			kind: "select",
			key: "mods",
			label: "Módulos",
			get: j((e) => `${e.modules} pentes`)
		},
		{
			kind: "bool",
			key: "rgb",
			label: "RGB",
			get: j((e) => e.rgb)
		}
	],
	gpu: [
		M,
		{
			kind: "range",
			key: "len",
			label: "Comprimento",
			unit: "mm",
			step: 5,
			get: j((e) => e.lengthMm)
		},
		{
			kind: "range",
			key: "tbp",
			label: "Consumo",
			unit: "W",
			step: 10,
			get: j((e) => e.tbpW)
		},
		N,
		{
			kind: "select",
			key: "vram",
			label: "Memória de vídeo",
			get: j((e) => e.vramGb ? `${e.vramGb} GB` : void 0)
		},
		{
			kind: "select",
			key: "width",
			label: "Largura",
			get: j((e) => `${le(e.slotWidth)} slots`)
		},
		{
			kind: "select",
			key: "conn",
			label: "Conector de energia",
			get: j((e) => e.powerConnectors.map((e) => fe[e] ?? e))
		}
	],
	storage: [
		M,
		{
			kind: "range",
			key: "read",
			label: "Leitura",
			unit: "MB/s",
			step: 50,
			get: j((e) => e.readMbps)
		},
		N,
		{
			kind: "select",
			key: "iface",
			label: "Interface",
			get: j((e) => e.interface === "m2" ? "M.2 NVMe" : "SATA III")
		},
		{
			kind: "select",
			key: "cap",
			label: "Capacidade",
			get: j((e) => ue(e.capacityGb))
		},
		{
			kind: "select",
			key: "form",
			label: "Formato",
			get: j((e) => e.interface === "m2" ? "M.2 2280" : "2,5 polegadas")
		}
	],
	case: [
		M,
		{
			kind: "range",
			key: "gpu",
			label: "Placa de vídeo até",
			unit: "mm",
			step: 5,
			get: j((e) => e.maxGpuLengthMm)
		},
		{
			kind: "range",
			key: "cooler",
			label: "Altura do cooler até",
			unit: "mm",
			step: 5,
			get: j((e) => e.maxCoolerHeightMm)
		},
		{
			kind: "range",
			key: "psu",
			label: "Fonte até",
			unit: "mm",
			step: 5,
			get: j((e) => e.maxPsuLengthMm)
		},
		N,
		{
			kind: "select",
			key: "tower",
			label: "Tamanho",
			get: j((e) => e.formFactors.includes("eatx") ? "Full-Tower" : e.formFactors.includes("atx") ? "Mid-Tower" : e.formFactors.includes("matx") ? "Micro-ATX" : "Mini-ITX")
		},
		{
			kind: "select",
			key: "ff",
			label: "Placa-mãe suportada",
			get: j((e) => e.formFactors.map((e) => l[e]))
		},
		{
			kind: "select",
			key: "fans",
			label: "Ventoinhas inclusas",
			get: j((e) => e.fansIncluded?.toString())
		},
		{
			kind: "select",
			key: "rad",
			label: "Radiador na frente",
			get: j((e) => e.radiatorMounts.front.length ? `até ${Math.max(...e.radiatorMounts.front)} mm` : "Não suporta")
		},
		{
			kind: "select",
			key: "color",
			label: "Cor",
			get: j((e) => e.color)
		},
		{
			kind: "bool",
			key: "glass",
			label: "Lateral de vidro",
			get: j((e) => e.glass)
		}
	],
	psu: [
		M,
		{
			kind: "range",
			key: "watt",
			label: "Potência",
			unit: "W",
			step: 50,
			get: j((e) => e.wattage)
		},
		{
			kind: "range",
			key: "len",
			label: "Comprimento",
			unit: "mm",
			step: 5,
			get: j((e) => e.lengthMm)
		},
		N,
		{
			kind: "select",
			key: "eff",
			label: "Certificação",
			get: j((e) => e.efficiency ? `80 Plus ${e.efficiency}` : void 0)
		},
		{
			kind: "select",
			key: "mod",
			label: "Modular",
			get: j((e) => e.modular)
		},
		{
			kind: "bool",
			key: "atx31",
			label: "Conector 12V-2x6 (ATX 3.1)",
			get: j((e) => e.connectors.includes("12V-2x6"))
		}
	],
	extras: [M, N]
};
function he(e) {
	return [...me[e], ...pe];
}
var ge = (e) => e === void 0 ? [] : Array.isArray(e) ? e : [e];
function _e(e, t) {
	let n = e.map(t.get).filter((e) => e !== void 0);
	if (!n.length) return [0, t.step];
	let r = (e) => Math.round(e / t.step) * t.step, i = r(Math.floor(Math.min(...n) / t.step + 1e-9) * t.step), a = r(Math.ceil(Math.max(...n) / t.step - 1e-9) * t.step);
	return a <= i && (a = i + t.step), [+i.toFixed(4), +a.toFixed(4)];
}
function ve(e, t) {
	let n = new Set(e.flatMap((e) => ge(t.get(e)))), r = (e) => e === "Sim" ? -2 : e === "Não" ? -1 : parseFloat(e.replace(/^\D*(?=\d)/, ""));
	return [...n].sort((e, t) => r(e) - r(t) || e.localeCompare(t, "pt-BR", { numeric: !0 }));
}
function ye(e, t, n) {
	if (n === void 0 || n === "" || n === !1 || Array.isArray(n) && !n.length) return !0;
	switch (t.kind) {
		case "range": {
			let r = t.get(e), [i, a] = n;
			return r !== void 0 && r >= i - 1e-9 && r <= a + 1e-9;
		}
		case "checks": return ge(t.get(e)).some((e) => n.includes(e));
		case "select": return ge(t.get(e)).includes(n);
		case "bool": return t.get(e) === !0;
	}
}
function be(e, t, n) {
	return t === void 0 || t === "" || t === !1 ? !1 : e.kind === "range" && n ? t[0] > n[0] || t[1] < n[1] : !Array.isArray(t) || t.length > 0;
}
var xe = (e) => e.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function Se(e, t, n, r = "", i) {
	let a = xe(r).split(/\s+/).filter(Boolean);
	return e.filter((e) => a.every((t) => xe(e.part.name).includes(t)) && t.every((t) => t.key === i || ye(e, t, n[t.key])));
}
function Ce(e, t, n, r, i = "") {
	let a = Se(e, t, n, i, r.key), o = /* @__PURE__ */ new Map();
	for (let e of a) for (let t of ge(r.get(e))) o.set(t, (o.get(t) ?? 0) + 1);
	return o;
}
var we = {
	ok: 0,
	warning: 1,
	nofit: 2,
	power: 2,
	incompatible: 3
};
function Te(e, t) {
	let n = {
		rel: (e, t) => we[e.status] - we[t.status],
		"price-asc": (e, t) => e.part.pricePix - t.part.pricePix,
		"price-desc": (e, t) => t.part.pricePix - e.part.pricePix,
		name: (e, t) => e.part.name.localeCompare(t.part.name, "pt-BR")
	};
	return [...e].sort(n[t]);
}
// node_modules/@lit/reactive-element/css-tag.js
var Ee = globalThis, De = Ee.ShadowRoot && (Ee.ShadyCSS === void 0 || Ee.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Oe = Symbol(), ke = /* @__PURE__ */ new WeakMap(), Ae = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== Oe) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (De && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = ke.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && ke.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, je = (e) => new Ae(typeof e == "string" ? e : e + "", void 0, Oe), Me = (e, ...t) => new Ae(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, Oe), Ne = (e, t) => {
	if (De) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = Ee.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, Pe = De ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return je(t);
})(e) : e, { is: Fe, defineProperty: Ie, getOwnPropertyDescriptor: Le, getOwnPropertyNames: Re, getOwnPropertySymbols: ze, getPrototypeOf: Be } = Object, Ve = globalThis, He = Ve.trustedTypes, Ue = He ? He.emptyScript : "", We = Ve.reactiveElementPolyfillSupport, Ge = (e, t) => e, Ke = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? Ue : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, qe = (e, t) => !Fe(e, t), Je = {
	attribute: !0,
	type: String,
	converter: Ke,
	reflect: !1,
	useDefault: !1,
	hasChanged: qe
};
Symbol.metadata ??= Symbol("metadata"), Ve.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var Ye = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = Je) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && Ie(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = Le(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? Je;
	}
	static _$Ei() {
		if (this.hasOwnProperty(Ge("elementProperties"))) return;
		let e = Be(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(Ge("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(Ge("properties"))) {
			let e = this.properties, t = [...Re(e), ...ze(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(Pe(e));
		} else e !== void 0 && t.push(Pe(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return Ne(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? Ke : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? Ke : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? qe)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
Ye.elementStyles = [], Ye.shadowRootOptions = { mode: "open" }, Ye[Ge("elementProperties")] = /* @__PURE__ */ new Map(), Ye[Ge("finalized")] = /* @__PURE__ */ new Map(), We?.({ ReactiveElement: Ye }), (Ve.reactiveElementVersions ??= []).push("2.1.2");
// node_modules/lit-html/lit-html.js
var Xe = globalThis, Ze = (e) => e, Qe = Xe.trustedTypes, $e = Qe ? Qe.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, et = "$lit$", P = `lit$${Math.random().toFixed(9).slice(2)}$`, tt = "?" + P, nt = `<${tt}>`, F = document, rt = () => F.createComment(""), it = (e) => e === null || typeof e != "object" && typeof e != "function", at = Array.isArray, ot = (e) => at(e) || typeof e?.[Symbol.iterator] == "function", st = "[ 	\n\f\r]", ct = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, lt = /-->/g, ut = />/g, I = RegExp(`>|${st}(?:([^\\s"'>=/]+)(${st}*=${st}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), dt = /'/g, ft = /"/g, pt = /^(?:script|style|textarea|title)$/i, mt = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), L = mt(1), R = mt(2), ht = Symbol.for("lit-noChange"), z = Symbol.for("lit-nothing"), gt = /* @__PURE__ */ new WeakMap(), B = F.createTreeWalker(F, 129);
function _t(e, t) {
	if (!at(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return $e === void 0 ? t : $e.createHTML(t);
}
var vt = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = ct;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === ct ? c[1] === "!--" ? o = lt : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = I) : (pt.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = I) : o = ut : o === I ? c[0] === ">" ? (o = i ?? ct, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? I : c[3] === "\"" ? ft : dt) : o === ft || o === dt ? o = I : o === lt || o === ut ? o = ct : (o = I, i = void 0);
		let d = o === I && e[t + 1].startsWith("/>") ? " " : "";
		a += o === ct ? n + nt : l >= 0 ? (r.push(s), n.slice(0, l) + et + n.slice(l) + P + d) : n + P + (l === -2 ? t : d);
	}
	return [_t(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, yt = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = vt(t, n);
		if (this.el = e.createElement(l, r), B.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = B.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(et)) {
					let t = u[o++], n = i.getAttribute(e).split(P), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? wt : r[1] === "?" ? Tt : r[1] === "@" ? Et : Ct
					}), i.removeAttribute(e);
				} else e.startsWith(P) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (pt.test(i.tagName)) {
					let e = i.textContent.split(P), t = e.length - 1;
					if (t > 0) {
						i.textContent = Qe ? Qe.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], rt()), B.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], rt());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === tt) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(P, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += P.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = F.createElement("template");
		return n.innerHTML = e, n;
	}
};
function bt(e, t, n = e, r) {
	if (t === ht) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = it(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = bt(e, i._$AS(e, t.values), i, r)), t;
}
var xt = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? F).importNode(t, !0);
		B.currentNode = r;
		let i = B.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new St(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Dt(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = B.nextNode(), a++);
		}
		return B.currentNode = F, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, St = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = z, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = bt(this, e, t), it(e) ? e === z || e == null || e === "" ? (this._$AH !== z && this._$AR(), this._$AH = z) : e !== this._$AH && e !== ht && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ot(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== z && it(this._$AH) ? this._$AA.nextSibling.data = e : this.T(F.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = yt.createElement(_t(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new xt(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = gt.get(e.strings);
		return t === void 0 && gt.set(e.strings, t = new yt(e)), t;
	}
	k(t) {
		at(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(rt()), this.O(rt()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = Ze(e).nextSibling;
			Ze(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Ct = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = z, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = z;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = bt(this, e, t, 0), a = !it(e) || e !== this._$AH && e !== ht, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = bt(this, r[n + o], t, o), s === ht && (s = this._$AH[o]), a ||= !it(s) || s !== this._$AH[o], s === z ? e = z : e !== z && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === z ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, wt = class extends Ct {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === z ? void 0 : e;
	}
}, Tt = class extends Ct {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== z);
	}
}, Et = class extends Ct {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = bt(this, e, t, 0) ?? z) === ht) return;
		let n = this._$AH, r = e === z && n !== z || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== z && (n === z || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Dt = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		bt(this, e);
	}
}, Ot = Xe.litHtmlPolyfillSupport;
Ot?.(yt, St), (Xe.litHtmlVersions ??= []).push("3.3.3");
var kt = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new St(t.insertBefore(rt(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, At = globalThis, V = class extends Ye {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = kt(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return ht;
	}
};
V._$litElement$ = !0, V.finalized = !0, At.litElementHydrateSupport?.({ LitElement: V });
var jt = At.litElementPolyfillSupport;
jt?.({ LitElement: V }), (At.litElementVersions ??= []).push("4.2.2");
// src/ui/icons.ts
var H = (e) => L`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${e}</svg>`, Mt = {
	cpu: H(R`<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>`),
	cooler: H(R`<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>`),
	mobo: H(R`<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="5" height="5"/><path d="M15 7h2M15 10h2M7 16h10"/>`),
	ram: H(R`<rect x="2" y="7" width="20" height="9" rx="1"/><path d="M6 16v3M10 16v3M14 16v3M18 16v3M6 10v3M10 10v3M14 10v3M18 10v3"/>`),
	gpu: H(R`<rect x="2" y="6" width="20" height="11" rx="1"/><circle cx="9" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="3"/><path d="M5 17v3"/>`),
	storage: H(R`<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/>`),
	case: H(R`<rect x="6" y="2" width="12" height="20" rx="1"/><circle cx="12" cy="15" r="3"/><path d="M9 6h6"/>`),
	psu: H(R`<rect x="2" y="5" width="20" height="14" rx="1"/><circle cx="9" cy="12" r="4"/><path d="M16 9h3M16 12h3M16 15h3"/>`),
	extras: H(R`<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>`)
}, Nt = L`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`, Pt = L`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 7v6M12 16v1" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`, Ft = L`<svg viewBox="0 0 24 24" width="20" height="22" fill="#ffb020" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>`, It = L`<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" stroke="currentColor" stroke-width="2"/></svg>`, Lt = L`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`, Rt = L`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`, zt = L`<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="24" cy="24" r="20"/><path d="M24 15v18M15 24h18"/></svg>`, Bt = L`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/></svg>`, U = (e, t = 20, n = 2) => L`<svg viewBox="0 0 24 24" width=${t} height=${t} fill="none" stroke="currentColor" stroke-width=${n} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${e}/></svg>`, Vt = U("M6 6l12 12M18 6 6 18", 24, 2.4), Ht = L`<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 3v2h2V9H5Zm3 0v2h2V9H8Zm3 0v2h2V9h-2Zm3 0v2h2V9h-2Zm3 0v2h2V9h-2ZM5 12v2h2v-2H5Zm3 0v2h2v-2H8Zm3 0v2h2v-2h-2Zm3 0v2h2v-2h-2Zm3 0v2h2v-2h-2ZM7 15v1.5h10V15H7Z"/></svg>`, Ut = U("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4.3-4.3", 22, 2.2), Wt = U("M5 12h14m-6-6 6 6-6 6", 20, 2.4), Gt = U("m5 12.5 4.2 4.2L19 7", 18, 2.6), Kt = U("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5", 13, 2), qt = U("M6 6v12M18 6l-6 6 6 6", 18, 2.2), Jt = U("m15 6-6 6 6 6", 18, 2.2), Yt = U("m9 6 6 6-6 6", 18, 2.2), Xt = U("M18 6v12M6 6l6 6-6 6", 18, 2.2), Zt = U("M3 5h18l-7 8v6l-4 1v-7L3 5Z", 18, 2), Qt = L`<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="var(--mp-chip, #2f2f2f)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`, $t = L`<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m8.5 8.5 7 7m0-7-7 7" fill="none" stroke="var(--mp-chip, #2f2f2f)" stroke-width="2.4" stroke-linecap="round"/></svg>`, en = L`<svg viewBox="0 0 24 24" width="14" height="16" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>`, tn = (e) => e.toLocaleString("pt-BR"), nn = (e) => e >= 1e3 ? `${tn(e / 1e3)}TB` : `${e}GB`;
function rn(e) {
	switch (e.slot) {
		case "cpu": return [
			e.socket,
			e.memTypes.join("/"),
			`${e.tdpW}W`
		];
		case "mobo": {
			let t = e.rearIo, n = t ? t.usb2 + t.usb5 + t.usb10 + t.usbc : 0;
			return [
				e.socket,
				l[e.formFactor],
				e.memType,
				...t ? [`${n} USB traseiras`, ...t.wifi ? ["Wi-Fi"] : []] : []
			];
		}
		case "ram": return [
			e.memType,
			`${e.capacityGb}GB`,
			`${e.modules} pentes`
		];
		case "gpu": return [
			`${e.lengthMm} mm`,
			`${tn(e.slotWidth)} slots`,
			`${e.tbpW}W`
		];
		case "cooler": return e.kind === "aio" ? [`Radiador ${e.radiatorMm} mm`, `até ${e.tdpRatingW}W`] : [`${e.heightMm} mm de altura`, `até ${e.tdpRatingW}W`];
		case "case": return [
			e.formFactors.map((e) => l[e]).join(", "),
			`GPU até ${e.maxGpuLengthMm} mm`,
			`Cooler até ${e.maxCoolerHeightMm} mm`
		];
		case "psu": return [`${e.wattage}W`, e.connectors.join(" + ")];
		case "storage": return [e.interface === "m2" ? "M.2 NVMe" : "SATA", nn(e.capacityGb)];
		default: return [];
	}
}
function an(e) {
	let t = (e) => e.map((e) => ({ t: e }));
	switch (e.slot) {
		case "cpu": return [
			...e.igpu === void 0 ? [] : [e.igpu ? {
				t: "VGA Integrado",
				ic: "ok"
			} : {
				t: "Sem VGA integrado",
				ic: "no"
			}],
			...e.coolerIncluded ? [{
				t: "Cooler Incluído",
				ic: "ok"
			}] : [],
			...e.overclock ? [{
				t: "Overclock",
				ic: "ok"
			}] : [],
			...t([e.socket, e.memTypes.join("/")]),
			...e.cores ? t([`${e.cores} núcleos / ${e.threads} threads`]) : [],
			{
				t: `${e.tdpW}W`,
				ic: "bolt"
			}
		];
		case "gpu": return [
			...t(rn(e).slice(0, 2)),
			...e.vramGb ? t([`${e.vramGb} GB`]) : [],
			{
				t: `${e.tbpW}W`,
				ic: "bolt"
			}
		];
		case "psu": return [{
			t: `${e.wattage}W`,
			ic: "bolt"
		}, ...t([...e.efficiency ? [`80 Plus ${e.efficiency}`] : [], e.connectors.join(" + ")])];
		case "ram": return [
			...t(rn(e)),
			...e.mhz ? t([`${e.mhz} MHz`]) : [],
			...e.rgb ? [{
				t: "RGB",
				ic: "ok"
			}] : []
		];
		case "case": return [...t(rn(e)), ...e.glass ? [{
			t: "Lateral de vidro",
			ic: "ok"
		}] : []];
		default: return t(rn(e));
	}
}
var on = {
	incompatible: "Incompatível",
	nofit: "Não cabe",
	power: "Fonte insuficiente",
	warning: "Atenção"
}, sn = {
	cpu: "Ver processadores compatíveis",
	cooler: "Ver coolers compatíveis",
	mobo: "Ver placas-mãe compatíveis",
	ram: "Ver memórias compatíveis",
	gpu: "Ver placas de vídeo compatíveis",
	storage: "Ver armazenamento compatível",
	case: "Ver gabinetes compatíveis",
	psu: "Ver fontes compatíveis",
	extras: "Ver extras"
}, cn = {
	cooler: "Ver coolers que cabem",
	gpu: "Ver placas de vídeo que cabem",
	case: "Ver gabinetes onde cabe",
	psu: "Ver fontes que cabem"
};
function ln(e, t) {
	return t === "power" ? "Ver fontes que atendem" : t === "nofit" && cn[e] || sn[e];
}
function un(e) {
	let t = (e, t) => e ? [`${e}× ${t}`] : [];
	return [
		...e.biosFlashback ? ["Botão de BIOS Flashback"] : [],
		...e.clearCmos ? ["Botão Clear CMOS"] : [],
		...e.wifi ? ["2 conectores de antena Wi-Fi"] : [],
		...e.ps2 ? ["1× PS/2 (teclado/mouse)"] : [],
		...t(e.hdmi, "HDMI"),
		...t(e.dp, "DisplayPort"),
		...t(e.usb2, "USB 2.0 (preta)"),
		...t(e.usb5, "USB 5 Gbps (azul)"),
		...t(e.usb10, "USB 10 Gbps (vermelha)"),
		...t(e.usbc, "USB-C"),
		`Rede ${String(e.lanGbps).replace(".", ",")} Gbps (RJ45)`,
		`${e.audio} conectores de áudio P2${e.spdif ? " + saída óptica" : ""}`
	];
}
// src/ui/styles.ts
var dn = Me`
  :host {
    --mp-accent: var(--red, #e90313);
    --mp-text: var(--txt, #fff);
    --mp-muted: var(--mut, #c8c8c8);
    --mp-surface: var(--box, #3a3a3a);
    --mp-surface-2: var(--field, #454545);
    --mp-border: var(--edge, #5d5d5d);
    --mp-line: var(--line, #444);
    --mp-hover: var(--hover, #3d3d3d);
    --mp-pop: var(--panel, #2f2f2f);
    --mp-chip: var(--chip, #2f2f2f);
    --mp-shadow: var(--shadow, rgba(0, 0, 0, .5));
    --mp-price: var(--price, #3ddc5a);        /* verde de texto com contraste AA sobre as superfícies */
    --mp-buy: #087a23;            /* fundo do COMPRAR (branco sobre ele: 5,5:1) */
    --mp-danger: #e5484d;         /* bordas e fundos de conflito */
    --mp-danger-text: var(--danger-txt, #ffa3a3);
    --mp-warn: #ffc94d;           /* fundo (barra, selo) */
    --mp-warn-text: var(--warn-txt, #ffc94d);
    --mp-focus: var(--focus, #fff);
    --mp-radius: 6px;
    color: var(--mp-text);
    font-family: inherit;
  }
  *, *::before, *::after { box-sizing: border-box; }
  button { font: inherit; color: inherit; }
  :focus-visible { outline: 2px solid var(--mp-focus); outline-offset: 2px; }
  .ph {
    background: repeating-linear-gradient(45deg, var(--ph-1, #4d4d4d) 0 10px, var(--ph-2, #474747) 10px 20px);
    outline: 1px dashed var(--ph-o, #6a6a6a); outline-offset: -1px; border-radius: 4px; flex: none;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .chip { font-size: 11px; line-height: 1; padding: 4px 6px; border-radius: 4px; background: var(--mp-chip); color: var(--mp-muted); }
  .price { color: var(--mp-price); font-weight: 700; white-space: nowrap; }
  .badge { font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 4px; white-space: nowrap; }
  .badge.incompatible { background: #5a5a5a; color: #fff; }
  .badge.nofit, .badge.power { background: var(--mp-danger); color: #fff; }
  .badge.warning { background: var(--mp-warn); color: #1a1a1a; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`, fn = 0, pn = class extends V {
	static properties = {
		slotId: { attribute: !1 },
		label: { attribute: !1 },
		required: { type: Boolean },
		options: { attribute: !1 },
		selected: { attribute: !1 },
		issues: { attribute: !1 },
		highlight: { type: Boolean }
	};
	_id = `mp${++fn}`;
	constructor() {
		super(), this.label = "", this.required = !1, this.options = [], this.issues = [], this.highlight = !1;
	}
	show({ onlyFits: e = !1 } = {}) {
		this.dispatchEvent(new CustomEvent("mp-open", {
			detail: {
				slot: this.slotId,
				onlyFits: e
			},
			bubbles: !0,
			composed: !0
		}));
	}
	focusTrigger() {
		this.renderRoot.querySelector(".trigger")?.focus();
	}
	_remove() {
		this.dispatchEvent(new CustomEvent("mp-remove", {
			detail: { slot: this.slotId },
			bubbles: !0,
			composed: !0
		})), this.updateComplete.then(() => this.focusTrigger());
	}
	_thumb(e, t) {
		return e.image ? L`<img src=${e.image} alt="" width=${t} height=${t} loading="lazy">` : L`<div class="ph" style="width:${t}px;height:${t}px"></div>`;
	}
	render() {
		let e = this.selected, t = this.issues.find((e) => e.severity !== "warning") ?? this.issues[0], n = e ? "1 peça selecionada" : this.required ? "Nenhuma peça selecionada" : "Opcional · nenhuma peça selecionada", r = this.highlight && this.required && !e, i = () => this.show();
		return L`
      <div class="card ${t ? t.severity : ""} ${r ? "missing" : ""}">
        <div class="head">
          <span class="ic">${Mt[this.slotId]}</span>
          <div class="ttl"><h3 id="${this._id}-l">${this.label}</h3><small>${n}</small></div>
          ${e ? z : L`<!-- Atalho visual: o botão acessível é a área tracejada abaixo (um só ponto de Tab por peça). -->
            <button class="add" tabindex="-1" aria-hidden="true" @click=${i}>${Rt}</button>`}
        </div>
        <div class="row">
          <button class="trigger ${e ? "has" : "empty"}" aria-haspopup="dialog"
              aria-labelledby="${this._id}-l ${this._id}-v" @click=${i}>
            <span id="${this._id}-v" class="val">
              ${e ? L`${this._thumb(e, 72)}
                    <span class="body"><span class="name">${e.name}</span>
                      <span class="chips">${rn(e).map((e) => L`<span class="chip">${e}</span>`)}</span></span>
                    <span class="price">${o(e.pricePix)}</span>` : L`<span class="plus">${zt}</span>
                    <span class="name">Nenhum item selecionado</span>
                    <small>Clique para adicionar este componente ${this.required ? "obrigatório" : "opcional"} · ${this.options.length} opções</small>`}
            </span>
            ${e ? L`<span class="chev">${Lt}</span>` : z}
          </button>
          ${e ? L`<button class="rm" @click=${this._remove} aria-label="Remover ${this.label}">Remover</button>` : z}
        </div>
        ${r ? L`<p class="req">${Bt}${this.label} é obrigatório</p>` : z}
        ${this.issues.length ? L`<ul class="issues">${this.issues.map((e) => L`<li class=${e.severity}>
              <span class="badge ${e.severity}">${on[e.severity]}</span>${e.message}${e.deltaMm ? L` <b>(faltam ${e.deltaMm} mm)</b>` : z}</li>`)}</ul>` : z}
      </div>`;
	}
	static styles = [dn, Me`
    :host { display: block; position: relative; }
    .card { background: var(--mp-surface-2); border-radius: 8px; padding: 18px 18px 18px 20px; border: 1px solid var(--mp-line); }
    .card.nofit, .card.power, .card.incompatible { border-color: var(--mp-danger); }
    /* Próxima obrigatória que falta: faixa vermelha à esquerda e fundo levemente avermelhado. */
    .card.missing { border-left: 3px solid var(--mp-danger); padding-left: 18px; background: linear-gradient(rgba(229, 72, 77, .07), rgba(229, 72, 77, .07)), var(--mp-surface-2); }
    .head { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .ttl { flex: 1; min-width: 0; }
    .add { width: 40px; height: 40px; border-radius: 50%; border: 0; background: #12a33a; color: #fff; display: grid; place-items: center; cursor: pointer; flex: none; box-shadow: 0 2px 8px var(--mp-shadow); }
    .add:hover { filter: brightness(1.1); }
    .ic { color: var(--mp-accent); display: grid; }
    h3 { margin: 0 0 2px; font-size: 17px; font-weight: 700; }
    .head small { font-size: 14px; color: var(--mp-muted); }
    .row { display: flex; gap: 8px; align-items: stretch; }
    .trigger { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer;
      background: transparent; border: 1px solid var(--mp-border); border-radius: var(--mp-radius); padding: 10px 12px; min-height: 64px; }
    /* Vazio: área grande tracejada, centralizada, como "Nenhum item selecionado / Clique para adicionar". */
    .trigger.empty { border: 2px dashed var(--mp-border); border-radius: 8px; min-height: 180px; justify-content: center; padding: 24px 16px; background: rgba(0, 0, 0, .06); }
    .trigger.empty .val { flex-direction: column; justify-content: center; text-align: center; gap: 10px; }
    .trigger.empty .name { font-size: 16px; font-weight: 700; color: var(--mp-muted); }
    .trigger.empty small { font-size: 13px; color: var(--mp-muted); }
    .trigger:hover { border-color: var(--mp-muted); }
    .trigger.empty:hover { background: rgba(255, 255, 255, .03); }
    .trigger.empty:hover .plus { color: var(--mp-text); }
    .card.nofit .trigger.has, .card.power .trigger.has { border-color: var(--mp-danger); background: rgba(229, 72, 77, .08); }
    .val { flex: 1; min-width: 0; display: flex; align-items: center; gap: 14px; }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .name { font-size: 14px; line-height: 1.3; }
    .body small { font-size: 12px; color: var(--mp-muted); }
    .plus { color: var(--mp-muted); display: grid; flex: none; }
    /* Aviso fixo escuro (igual nos dois temas): texto branco sobre quase preto. */
    .req { display: flex; align-items: center; gap: 10px; margin: 16px 0 0; padding: 16px 18px; border-radius: 4px; background: #170b0c; color: #fff; font-size: 14px; }
    .req svg { color: #ff5a5f; flex: none; }
    .chev { color: var(--mp-muted); display: grid; }
    .rm { background: none; border: 1px solid var(--mp-border); border-radius: var(--mp-radius); color: var(--mp-danger-text); cursor: pointer; padding: 0 12px; min-width: 44px; font-size: 13px; }
    .issues { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; font-size: 13px; }
    .issues li { line-height: 1.5; }
    .issues .badge { margin-right: 8px; }
    .issues li.nofit, .issues li.power, .issues li.incompatible { color: var(--mp-danger-text); }
    .issues li.warning { color: var(--mp-warn-text); }
    img { border-radius: 4px; object-fit: cover; flex: none; }
    @media (prefers-reduced-motion: no-preference) {
      .trigger { transition: border-color .15s, background-color .15s; }
    }
    @media (max-width: 560px) {
      .card { padding: 14px 12px; }
      .row { flex-direction: column; }
      .rm { align-self: flex-end; min-height: 44px; }
      .trigger.empty { min-height: 150px; }
      .trigger.has .val { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 6px 12px; align-items: start; }
      .val > .ph, .val > img { grid-row: span 2; width: 56px !important; height: 56px !important; }
      .val > .price { grid-column: 2; }
    }
  `];
};
customElements.get("mp-part-picker") || customElements.define("mp-part-picker", pn);
// src/ui/picker-dialog.ts
var mn = 8, hn = [
	["rel", "Relevância"],
	["price-asc", "Menor preço"],
	["price-desc", "Maior preço"],
	["name", "Nome (A–Z)"]
], gn = class extends V {
	static properties = {
		evaluation: { attribute: !1 },
		_step: { state: !0 },
		_open: { state: !0 },
		_filters: { state: !0 },
		_query: { state: !0 },
		_sort: { state: !0 },
		_page: { state: !0 },
		_keys: { state: !0 },
		_showFilters: { state: !0 },
		_msg: { state: !0 }
	};
	constructor() {
		super(), this._step = "cpu", this._open = !1, this._filters = {}, this._query = {}, this._sort = {}, this._page = 1, this._keys = !1, this._showFilters = !1, this._msg = "";
	}
	get _dlg() {
		return this.renderRoot.querySelector("dialog");
	}
	open(e, { onlyFits: t = !1 } = {}) {
		this._step = e, this._page = 1, t && this._set("fits", !0), this._open = !0, this.updateComplete.then(() => {
			let e = this._dlg;
			e && !e.open && e.showModal(), this.renderRoot.querySelector(".search input")?.focus();
		});
	}
	close() {
		this._dlg?.close();
	}
	_onClose() {
		this._open = !1, this._keys = !1, this.dispatchEvent(new CustomEvent("mp-dialog-close", {
			detail: { slot: this._step },
			bubbles: !0,
			composed: !0
		}));
	}
	_go(e) {
		this._step = e, this._page = 1, this._showFilters = !1, this.updateComplete.then(() => {
			this.renderRoot.querySelector(".steps [aria-current=step]")?.scrollIntoView({
				block: "nearest",
				inline: "center"
			}), this.renderRoot.querySelector(".main")?.scrollTo({ top: 0 });
		});
	}
	_move(e) {
		let n = t.findIndex((e) => e.slot === this._step) + e;
		if (n >= t.length) return this.close();
		n >= 0 && this._go(t[n].slot);
	}
	get _state() {
		return this._filters[this._step] ?? {};
	}
	_set(e, t) {
		let n = { ...this._state };
		t === void 0 || t === "" || t === !1 || Array.isArray(t) && !t.length ? delete n[e] : n[e] = t, this._filters = {
			...this._filters,
			[this._step]: n
		}, this._page = 1;
	}
	_reset() {
		this._filters = {
			...this._filters,
			[this._step]: {}
		}, this._query = {
			...this._query,
			[this._step]: ""
		}, this._page = 1;
	}
	_pick(e) {
		e.status !== "incompatible" && (this.dispatchEvent(new CustomEvent("mp-pick", {
			detail: {
				slot: this._step,
				id: e.part.id
			},
			bubbles: !0,
			composed: !0
		})), this._msg = `${e.part.name} adicionado.`);
	}
	_remove(e) {
		this.dispatchEvent(new CustomEvent("mp-remove", {
			detail: { slot: this._step },
			bubbles: !0,
			composed: !0
		})), this._msg = `${e.part.name} removido.`;
	}
	_onKey(e) {
		let t = e.composedPath()[0], n = t instanceof HTMLInputElement && !["checkbox", "range"].includes(t.type) || t instanceof HTMLSelectElement;
		e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft") ? (e.preventDefault(), this._move(e.key === "ArrowRight" ? 1 : -1)) : n || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== "s" || (e.preventDefault(), this.renderRoot.querySelector(".search input")?.focus());
	}
	_label(e, t) {
		let n = be(e, this._state[e.key], t);
		return L`<div class="flabel"><span id="f-${e.key}">${e.label}${e.kind === "range" ? L` <span class="unit">(${e.unit})</span>` : z}</span>
      <button class="freset" ?disabled=${!n} aria-label="Restaurar ${e.label} ao padrão" @click=${() => this._set(e.key, void 0)}>${Kt}</button></div>`;
	}
	_range(e, t) {
		let [n, r] = _e(t, e), [i, a] = this._state[e.key] ?? [n, r], o = (e) => (e - n) / (r - n) * 100, s = (t) => Math.min(r, Math.max(n, Math.round(t / e.step) * e.step)), c = (t, i) => {
			let a = +s(Math.min(t, i)).toFixed(4), o = +s(Math.max(t, i)).toFixed(4);
			this._set(e.key, a <= n && o >= r ? void 0 : [a, o]);
		}, l = (e) => +e.target.value;
		return L`<div class="filter slider">
      ${this._label(e, [n, r])}
      <div class="sl"><div class="bar"><i style="left:${o(i)}%;width:${o(a) - o(i)}%"></i></div>
        <input type="range" min=${n} max=${r} step=${e.step} .value=${String(i)} aria-label="${e.label} mínimo" style="z-index:${i > r - (r - n) / 10 ? 4 : 3}"
          @input=${(e) => c(Math.min(l(e), a), a)}>
        <input type="range" min=${n} max=${r} step=${e.step} .value=${String(a)} aria-label="${e.label} máximo"
          @input=${(e) => c(i, Math.max(l(e), i))}></div>
      <div class="nums">
        <label class="num"><input type="number" min=${n} max=${r} step=${e.step} .value=${String(i)} aria-label="${e.label} mínimo"
          @change=${(e) => c(l(e), a)}><span aria-hidden="true">${e.unit}</span></label>
        <label class="num"><input type="number" min=${n} max=${r} step=${e.step} .value=${String(a)} aria-label="${e.label} máximo"
          @change=${(e) => c(i, l(e))}><span aria-hidden="true">${e.unit}</span></label>
      </div></div>`;
	}
	_checks(e, t, n, r) {
		let i = Ce(t, n, this._state, e, r), a = this._state[e.key] ?? [];
		return L`<fieldset class="filter checks"><legend>${e.label}</legend>
      ${ve(t, e).map((t) => L`<label class="chk"><input type="checkbox" .checked=${a.includes(t)}
        @change=${(n) => this._set(e.key, n.target.checked ? [...a, t] : a.filter((e) => e !== t))}>
        <span>${t}</span><small>(${i.get(t) ?? 0})</small></label>`)}</fieldset>`;
	}
	_select(e, t, n, r) {
		let i = Ce(t, n, this._state, e, r), a = this._state[e.key] ?? "";
		return L`<div class="filter sel">
      ${this._label(e)}
      <div class="dd"><select aria-labelledby="f-${e.key}" @change=${(t) => this._set(e.key, t.target.value)}>
        <option value="" ?selected=${!a}>${e.any ?? "Todas"}</option>
        ${ve(t, e).map((e) => L`<option value=${e} ?selected=${e === a}>${e} (${i.get(e) ?? 0})</option>`)}
      </select>${Lt}</div></div>`;
	}
	_filtersPanel(e, t, n, r) {
		let i = t.filter((e) => e.kind === "range"), a = t.filter((e) => e.kind === "checks" || e.kind === "select"), o = t.filter((e) => e.kind === "bool"), s = t.filter((t) => be(t, this._state[t.key], t.kind === "range" ? _e(e, t) : void 0)).length + +!!n;
		return L`<aside class="filters ${this._showFilters ? "on" : ""}" id="dlg-filters" aria-label="Filtros">
      <div class="fgroup">${i.map((t) => this._range(t, e))}</div>
      <div class="fgroup pair">${a.map((r) => r.kind === "checks" ? this._checks(r, e, t, n) : this._select(r, e, t, n))}</div>
      <fieldset class="fgroup bools"><legend class="sr-only">Outras opções</legend>
        ${o.map((e) => L`<label class="chk"><input type="checkbox" .checked=${this._state[e.key] === !0}
          @change=${(t) => this._set(e.key, t.target.checked)}><span>${e.label}</span></label>`)}</fieldset>
      ${s ? L`<button class="resetall" @click=${this._reset}>${Kt} Redefinir filtros (${s})</button>` : z}
      <div class="fdone"><button @click=${this._closeFilters}>Ver ${r === 1 ? "1 produto" : `${r} produtos`}</button></div>
    </aside>`;
	}
	_closeFilters = () => {
		this._showFilters = !1, this.updateComplete.then(() => this.renderRoot.querySelector(".ftoggle")?.focus());
	};
	_row(e, t) {
		let n = e.part, r = e.reasons.find((t) => t.severity === e.status)?.message, i = {
			ok: Qt,
			no: $t,
			bolt: en
		};
		return L`<li class="prod ${e.status} ${t ? "sel" : ""}">
      <div class="pimg">${n.image ? L`<img src=${n.image} alt="" width="120" height="120" loading="lazy">` : L`<div class="ph"></div>`}</div>
      <div class="info">
        <h3 class="pname">${n.name}</h3>
        <div class="tags">${an(n).map((e) => L`<span class="tag ${e.ic ?? ""}">${e.ic ? i[e.ic] : z}${e.t}</span>`)}</div>
        ${e.status === "ok" ? z : L`<p class="why ${e.status}"><span class="badge ${e.status}">${on[e.status]}</span> ${r ?? ""}</p>`}
      </div>
      <div class="pr">
        ${n.listPrice && n.listPrice > n.pricePix ? L`<s aria-label="Preço anterior ${o(n.listPrice)}">${o(n.listPrice)}</s>` : z}
        <b class="price">${o(n.pricePix)}</b><small>no PIX com 15% desconto</small>
      </div>
      <div class="act">
        ${t ? L`<span class="cur">${Gt}Selecionado</span><button class="rm" @click=${() => this._remove(e)} aria-label="Remover ${n.name}">Remover</button>` : L`<button class="addp" ?disabled=${e.status === "incompatible"} @click=${() => this._pick(e)}
              aria-label=${e.status === "incompatible" ? `${n.name}: incompatível com a montagem` : `Adicionar ${n.name}`}>${Rt}</button>`}
      </div>
    </li>`;
	}
	_pager(e) {
		if (e <= 1) return z;
		let t = this._page, n = (t) => {
			this._page = Math.min(e, Math.max(1, t)), this.renderRoot.querySelector(".main")?.scrollTo({ top: 0 });
		}, r = [...new Set([
			1,
			t - 1,
			t,
			t + 1,
			e
		].filter((t) => t >= 1 && t <= e))].sort((e, t) => e - t), i = [];
		return r.forEach((e, t) => {
			t && e - r[t - 1] > 1 && i.push("…"), i.push(e);
		}), L`<nav class="pager" aria-label="Páginas">
      <button ?disabled=${t === 1} aria-label="Primeira página" @click=${() => n(1)}>${qt}</button>
      <button ?disabled=${t === 1} aria-label="Página anterior" @click=${() => n(t - 1)}>${Jt}</button>
      ${i.map((e) => e === "…" ? L`<span aria-hidden="true">…</span>` : L`<button class=${e === t ? "on" : ""} aria-current=${e === t ? "page" : z} aria-label="Página ${e}" @click=${() => n(e)}>${e}</button>`)}
      <button ?disabled=${t === e} aria-label="Próxima página" @click=${() => n(t + 1)}>${Yt}</button>
      <button ?disabled=${t === e} aria-label="Última página" @click=${() => n(e)}>${Xt}</button>
    </nav>`;
	}
	render() {
		let e = this.evaluation;
		return L`<dialog aria-labelledby="dlg-t" @close=${this._onClose} @keydown=${this._onKey}
        @click=${(e) => {
			e.target === this._dlg && this.close();
		}}>
      ${e && this._open ? this._content(e) : z}
      <div class="sr-only" aria-live="polite">${this._msg}</div>
    </dialog>`;
	}
	_content(e) {
		let n = t.find((e) => e.slot === this._step), { options: r, selected: i } = e.slots[this._step], a = he(this._step), s = this._query[this._step] ?? "", c = Te(Se(r, a, this._state, s), this._sort[this._step] ?? "rel"), l = Math.max(1, Math.ceil(c.length / mn)), u = Math.min(this._page, l), d = c.slice((u - 1) * mn, u * mn), f = e.issues.filter((e) => e.slots.includes(this._step) && (e.code !== "power" || this._step === "psu")), p = Object.keys(this._state).length, m = t.indexOf(n);
		return L`
      <div class="win">
        <header class="top">
          <h2 id="dlg-t">Selecionar Componente</h2>
          <div class="tacts">
            <button class="ico" aria-label="Atalhos de teclado" aria-expanded=${this._keys ? "true" : "false"} aria-controls="dlg-keys" @click=${() => this._keys = !this._keys}>${Ht}</button>
            <button class="ico" aria-label="Fechar" @click=${() => this.close()}>${Vt}</button>
          </div>
          ${this._keys ? L`<div class="keys" id="dlg-keys"><b>Atalhos de teclado</b>
            <dl><dt><kbd>S</kbd></dt><dd>Buscar produtos</dd><dt><kbd>Alt</kbd> + <kbd>→</kbd></dt><dd>Próxima etapa</dd>
            <dt><kbd>Alt</kbd> + <kbd>←</kbd></dt><dd>Etapa anterior</dd><dt><kbd>Esc</kbd></dt><dd>Fechar a janela</dd></dl></div>` : z}
        </header>

        <div class="stepsbar">
          <nav class="steps" aria-label="Etapas da montagem"><ol>
            ${t.map((t, n) => {
			let r = !!e.slots[t.slot].selected, i = t.slot === this._step;
			return L`<li><button class="${i ? "cur" : ""} ${r ? "done" : ""}" aria-current=${i ? "step" : z}
                aria-label="${n + 1} - ${t.label}${r ? ", escolhido" : t.required ? ", obrigatório" : ""}" @click=${() => this._go(t.slot)}>
                ${r && !i ? Gt : z}${n + 1} - ${t.label}</button></li>`;
		})}
          </ol></nav>
          <button class="next" @click=${() => this._move(1)}>${m === t.length - 1 ? "CONCLUIR" : "PRÓXIMO"} ${Wt}</button>
        </div>

        <div class="body">
          ${this._filtersPanel(r, a, s, c.length)}
          <section class="main" aria-label=${n.label}>
            ${n.required && !i ? L`<p class="req">${Bt}${n.label} é obrigatório</p>` : z}
            ${f.map((e) => L`<p class="req ${e.severity}"><span class="badge ${e.severity}">${on[e.severity]}</span>${e.message}${e.deltaMm ? ` (faltam ${e.deltaMm} mm)` : ""}</p>`)}
            <div class="tools">
              <label class="search">${Ut}<input type="search" placeholder="Buscar produtos... (S)" aria-label="Buscar produtos" aria-keyshortcuts="S"
                .value=${s} @input=${(e) => {
			this._query = {
				...this._query,
				[this._step]: e.target.value
			}, this._page = 1;
		}}></label>
              <label class="sort"><span>Ordenação</span><select @change=${(e) => {
			this._sort = {
				...this._sort,
				[this._step]: e.target.value
			};
		}}>
                ${hn.map(([e, t]) => L`<option value=${e} ?selected=${(this._sort[this._step] ?? "rel") === e}>${t}</option>`)}</select>${Lt}</label>
              <button class="ftoggle" aria-controls="dlg-filters" aria-expanded=${this._showFilters ? "true" : "false"} @click=${() => {
			this._showFilters = !0, this.updateComplete.then(() => this.renderRoot.querySelector(".filters input, .filters select")?.focus());
		}}>
                ${Zt}Filtros${p ? ` (${p})` : ""}</button>
            </div>
            <p class="count" role="status">${c.length === 1 ? "1 produto" : `${c.length} produtos`}${c.length === r.length ? "" : ` de ${r.length}`}</p>
            ${d.length ? L`<ul class="plist">${d.map((e) => this._row(e, e.part.id === i?.id))}</ul>` : L`<div class="none"><p>Nenhum produto com esses filtros.</p><button class="resetall" @click=${this._reset}>${Kt} Redefinir filtros</button></div>`}
          </section>
        </div>

        <footer class="foot">
          <b class="total">Total: ${o(e.totals.pix)}</b>
          ${this._pager(l)}
        </footer>
      </div>`;
	}
	static styles = [dn, Me`
    :host { display: contents; }
    dialog { padding: 0; border: 0; background: transparent; color: var(--mp-text); max-width: none; max-height: none; width: min(1520px, 96vw); height: min(940px, 94vh); overflow: visible; }
    dialog::backdrop { background: rgba(0, 0, 0, .62); }
    .win { height: 100%; display: flex; flex-direction: column; background: var(--mp-surface); border-radius: 10px; overflow: hidden; box-shadow: 0 24px 60px rgba(0, 0, 0, .5); position: relative; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 24px; position: relative; }
    h2 { margin: 0; font-size: 22px; font-weight: 700; }
    .tacts { display: flex; gap: 6px; }
    .ico { width: 44px; height: 44px; border: 0; background: none; border-radius: 50%; display: grid; place-items: center; cursor: pointer; }
    .ico:hover { background: var(--mp-hover); }
    .keys { position: absolute; z-index: 5; right: 70px; top: 60px; background: var(--mp-pop); border: 1px solid var(--mp-border); border-radius: 8px; padding: 14px 16px; box-shadow: 0 12px 30px var(--mp-shadow); font-size: 14px; }
    .keys dl { display: grid; grid-template-columns: auto auto; gap: 8px 14px; margin: 10px 0 0; } .keys dd { margin: 0; color: var(--mp-muted); }
    kbd { display: inline-block; min-width: 22px; padding: 2px 6px; border: 1px solid var(--mp-border); border-bottom-width: 2px; border-radius: 4px; font: 12px/1.4 inherit; text-align: center; background: var(--mp-surface-2); }

    .stepsbar { display: flex; align-items: center; gap: 16px; padding: 12px 24px 14px; background: var(--mp-surface-2); border-top: 1px solid var(--mp-line); border-bottom: 1px solid var(--mp-line); }
    .steps { flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: thin; padding-bottom: 6px; }
    .steps ol { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; white-space: nowrap; }
    .steps button { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border: 0; border-radius: 20px; background: none; font-size: 16px; font-weight: 500; cursor: pointer; }
    .steps button:hover { background: var(--mp-hover); }
    .steps button.cur { background: var(--mp-accent); color: #fff; font-weight: 700; }
    .steps button.done:not(.cur) svg { color: var(--mp-price); }
    .next { display: inline-flex; align-items: center; gap: 10px; height: 46px; padding: 0 20px; border: 0; border-radius: 4px; background: var(--mp-buy); color: #fff; font-weight: 800; font-size: 16px; cursor: pointer; flex: none; box-shadow: 0 3px 10px var(--mp-shadow); }
    .next:hover { filter: brightness(1.1); }

    .body { flex: 1; min-height: 0; display: grid; grid-template-columns: 360px minmax(0, 1fr); }
    .filters { overflow: auto; padding: 18px; border-right: 1px solid var(--mp-line); display: grid; gap: 14px; align-content: start; scrollbar-width: thin; overscroll-behavior: contain; }
    .fgroup { background: var(--mp-chip); border: 0; border-radius: 8px; padding: 16px; margin: 0; display: grid; gap: 18px; min-width: 0; }
    .fgroup.pair { grid-template-columns: 1fr 1fr; gap: 14px 12px; align-items: end; }
    .fgroup.pair .flabel { font-size: 13px; line-height: 1.25; }
    .fgroup.pair .checks { grid-column: 1 / -1; }
    .filter { min-width: 0; border: 0; margin: 0; padding: 0; }
    .flabel { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 14px; font-weight: 700; margin-bottom: 8px; min-height: 26px; }
    .unit { font-weight: 400; color: var(--mp-muted); }
    .freset { width: 26px; height: 26px; border: 0; background: none; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--mp-text); flex: none; }
    .freset:disabled { opacity: .3; cursor: default; }
    .freset:not(:disabled):hover { background: var(--mp-hover); }
    .sl { position: relative; height: 28px; }
    .sl .bar { position: absolute; left: 9px; right: 9px; top: 12px; height: 4px; border-radius: 2px; background: var(--mp-border); }
    .sl .bar i { position: absolute; top: 0; bottom: 0; background: var(--mp-accent); border-radius: 2px; }
    .sl input[type=range] { position: absolute; inset: 0; width: 100%; margin: 0; background: none; pointer-events: none; -webkit-appearance: none; appearance: none; height: 28px; }
    .sl input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; pointer-events: auto; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid var(--mp-accent); cursor: pointer; }
    .sl input[type=range]::-moz-range-thumb { pointer-events: auto; width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 3px solid var(--mp-accent); cursor: pointer; }
    .sl input[type=range]::-moz-range-track { background: none; }
    .sl input[type=range]:focus-visible { outline: none; }
    .sl input[type=range]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--mp-focus); }
    .nums { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    .num { display: flex; align-items: center; border: 1px solid var(--mp-border); border-radius: 4px; background: var(--mp-surface); padding-right: 8px; }
    .num input { width: 100%; min-width: 0; height: 36px; border: 0; background: none; color: var(--mp-text); padding: 0 8px; font: inherit; font-size: 14px; }
    .num span { font-size: 12px; color: var(--mp-muted); }
    .num:focus-within { outline: 2px solid var(--mp-focus); outline-offset: 1px; }
    .num input:focus-visible { outline: none; }
    legend { font-size: 14px; font-weight: 700; padding: 0; margin-bottom: 8px; }
    .chk { display: flex; align-items: center; gap: 10px; min-height: 36px; font-size: 15px; cursor: pointer; }
    .chk input { width: 20px; height: 20px; margin: 0; accent-color: var(--mp-accent); flex: none; }
    .chk small { margin-left: auto; color: var(--mp-muted); font-size: 13px; }
    .bools { gap: 2px; }
    .dd, .sort { position: relative; display: flex; align-items: center; }
    .dd select, .sort select { width: 100%; height: 40px; -webkit-appearance: none; appearance: none; border: 1px solid var(--mp-border); border-radius: 4px; background: var(--mp-surface); color: var(--mp-text); padding: 0 30px 0 10px; font: inherit; font-size: 14px; cursor: pointer; text-overflow: ellipsis; }
    .dd svg, .sort > svg { position: absolute; right: 8px; pointer-events: none; color: var(--mp-muted); }
    .resetall { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border: 1px solid var(--mp-border); border-radius: 4px; background: none; cursor: pointer; font-weight: 700; }
    .resetall:hover { background: var(--mp-hover); }
    .fdone { display: none; }

    .main { overflow: auto; padding: 18px 22px; scrollbar-width: thin; overscroll-behavior: contain; min-width: 0; }
    .req { display: flex; align-items: center; gap: 12px; margin: 0 0 14px; padding: 18px 20px; border-radius: 6px; background: #170b0c; color: #ff8f93; font-size: 18px; font-weight: 700; }
    .req svg { color: #ff5a5f; flex: none; width: 24px; height: 24px; }
    .req.warning { color: #ffd27a; font-size: 15px; } .req.nofit, .req.power, .req.incompatible { font-size: 15px; }
    .req .badge { flex: none; }
    .tools { display: flex; gap: 12px; align-items: end; margin-bottom: 6px; }
    .search { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; height: 50px; padding: 0 16px; border: 1px solid var(--mp-border); border-radius: 4px; background: var(--mp-surface-2); color: var(--mp-muted); }
    .search:focus-within { outline: 2px solid var(--mp-focus); outline-offset: 1px; }
    .search input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; color: var(--mp-text); font: inherit; font-size: 17px; }
    .search input:focus-visible { outline: none; }
    .sort { width: 230px; flex: none; flex-direction: column; align-items: stretch; }
    .sort span { font-size: 12px; color: var(--mp-muted); margin-bottom: 2px; }
    .sort select { height: 50px; font-size: 16px; background: var(--mp-surface-2); }
    .sort > svg { bottom: 15px; }
    .ftoggle { display: none; }
    .count { font-size: 13px; color: var(--mp-muted); margin: 6px 0 10px; }
    .plist { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .prod { display: grid; grid-template-columns: 120px minmax(0, 1fr) auto auto; gap: 18px; align-items: center; padding: 16px 18px; border: 1px solid var(--mp-line); border-radius: 8px; background: var(--mp-surface-2); }
    .prod.sel { border-color: var(--mp-price); box-shadow: inset 0 0 0 1px var(--mp-price); }
    .prod.nofit, .prod.power { border-color: var(--mp-danger); }
    .prod.incompatible .pimg, .prod.incompatible .pname, .prod.incompatible .pr { opacity: .55; }
    .pimg { width: 120px; height: 120px; background: #fff; border-radius: 4px; display: grid; place-items: center; overflow: hidden; }
    .pimg img { width: 100%; height: 100%; object-fit: contain; }
    .pimg .ph { width: 100%; height: 100%; }
    .pname { margin: 0 0 10px; font-size: 16px; font-weight: 400; line-height: 1.45; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 4px; background: var(--mp-chip); color: var(--mp-text); font-size: 13px; font-weight: 500; }
    .tag.ok svg { color: var(--mp-text); } .tag.no svg { color: var(--mp-muted); }
    .why { margin: 10px 0 0; font-size: 13px; color: var(--mp-muted); }
    .why.nofit, .why.power { color: var(--mp-danger-text); } .why.warning { color: var(--mp-warn-text); }
    .pr { display: flex; flex-direction: column; align-items: flex-end; text-align: right; min-width: 150px; }
    .pr s { font-size: 12px; color: var(--mp-muted); }
    .pr .price { font-size: 26px; line-height: 1.15; }
    .pr small { font-size: 12px; color: var(--mp-muted); }
    .act { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .addp { width: 50px; height: 50px; border: 0; border-radius: 4px; background: #12a33a; color: #fff; display: grid; place-items: center; cursor: pointer; box-shadow: 0 2px 8px var(--mp-shadow); }
    .addp:hover { filter: brightness(1.1); }
    .addp:disabled { background: var(--mp-hover); color: var(--mp-muted); cursor: not-allowed; box-shadow: none; filter: none; }
    .cur { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700; color: var(--mp-price); }
    .rm { min-height: 36px; padding: 0 12px; border: 1px solid var(--mp-border); border-radius: 4px; background: none; color: var(--mp-danger-text); font-size: 13px; cursor: pointer; }
    .none { text-align: center; padding: 40px 10px; color: var(--mp-muted); }

    .foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 24px; border-top: 1px solid var(--mp-line); background: var(--mp-surface-2); }
    .total { color: var(--mp-price); font-size: 24px; font-weight: 800; }
    .pager { display: flex; align-items: center; gap: 4px; }
    .pager button { min-width: 44px; height: 44px; border: 0; border-radius: 50%; background: none; font-size: 16px; cursor: pointer; display: grid; place-items: center; }
    .pager button:hover:not(:disabled) { background: var(--mp-hover); }
    .pager button.on { background: #12a33a; color: #fff; font-weight: 700; }
    .pager button:disabled { opacity: .35; cursor: default; }

    @media (prefers-reduced-motion: no-preference) {
      dialog[open] .win { animation: rise .2s cubic-bezier(.2, .8, .2, 1); }
      @keyframes rise { from { opacity: 0; transform: translateY(12px) scale(.985); } }
    }
    @media (max-width: 900px) {
      dialog { width: 100vw; height: 100dvh; }
      .win { border-radius: 0; }
      .top { padding: 8px 12px 8px 16px; } h2 { font-size: 18px; }
      .stepsbar { padding: 8px 12px; gap: 10px; }
      .steps button { font-size: 14px; height: 36px; padding: 0 12px; }
      .next { height: 42px; padding: 0 14px; font-size: 14px; }
      .body { grid-template-columns: minmax(0, 1fr); position: relative; }
      .filters { display: none; }
      .filters.on { display: grid; position: absolute; inset: 0; z-index: 4; background: var(--mp-surface); border: 0; padding-bottom: 0; }
      .fdone { display: block; position: sticky; bottom: 0; padding: 10px 0 14px; background: var(--mp-surface); }
      .fdone button { width: 100%; height: 48px; border: 0; border-radius: 4px; background: var(--mp-buy); color: #fff; font-weight: 800; font-size: 16px; cursor: pointer; }
      .ftoggle { display: inline-flex; align-items: center; gap: 8px; height: 50px; padding: 0 14px; border: 1px solid var(--mp-border); border-radius: 4px; background: var(--mp-surface-2); font-weight: 700; cursor: pointer; }
      .main { padding: 12px; }
      .tools { flex-wrap: wrap; }
      .search { flex-basis: 100%; }
      .sort { flex: 1; width: auto; }
      .req { font-size: 15px; padding: 14px; }
      .prod { grid-template-columns: 84px minmax(0, 1fr) auto; gap: 10px 12px; padding: 12px; align-items: start; }
      .pimg { width: 84px; height: 84px; grid-row: span 2; }
      .info { grid-column: 2 / 4; }
      .pr { grid-column: 2; align-items: flex-start; text-align: left; min-width: 0; }
      .pr .price { font-size: 21px; }
      .act { grid-column: 3; grid-row: 2; }
      .pname { font-size: 14px; }
      .foot { padding: 8px 12px; flex-wrap: wrap; }
      .total { font-size: 18px; }
      .pager button { min-width: 40px; height: 40px; }
    }
    @media (max-width: 560px) { .keys { right: 10px; left: 10px; } .fgroup.pair { grid-template-columns: 1fr; } }
  `];
};
customElements.get("mp-picker-dialog") || customElements.define("mp-picker-dialog", gn);
// src/three/layout.ts
var _n = 20, vn = 15, yn = 30, bn = 3, xn = 6.35, Sn = 3, Cn = 22, wn = 2, W = 3, Tn = 86, G = 150, En = 4, K = 125, Dn = 52, On = (e) => e.radiatorMounts.top.length ? 58 : 30, kn = {
	itx: {
		w: 170,
		h: 170,
		slot: 150
	},
	matx: {
		w: 244,
		h: 244,
		slot: 155
	},
	atx: {
		w: 244,
		h: 305,
		slot: 155
	},
	eatx: {
		w: 330,
		h: 305,
		slot: 155
	}
}, An = [
	"itx",
	"matx",
	"atx",
	"eatx"
], jn = {
	id: "ghost",
	slot: "case",
	name: "",
	brand: "",
	pricePix: 1,
	formFactors: [
		"itx",
		"matx",
		"atx"
	],
	maxGpuLengthMm: 360,
	expansionSlots: 7,
	maxCoolerHeightMm: 170,
	radiatorMounts: {
		front: [
			240,
			280,
			360
		],
		top: [240, 280],
		rear: [120]
	},
	maxPsuLengthMm: 200
}, q = {
	shell: "#8a8a8a",
	mobo: "#1f3a2c",
	cpu: "#c9c9c9",
	cooler: "#9aa0a6",
	pump: "#2b2b2b",
	radiator: "#3b3b3b",
	ram: "#b8141d",
	cage: "#55575c",
	gpu: "#2e2e30",
	gpuAccent: "#e90313",
	storage: "#4a6fa5",
	psu: "#262626",
	excess: "#e5484d"
}, Mn = (e) => e === "AM4" ? "am4" : e === "LGA1700" ? "lga1700" : "am5", Nn = {
	am4: [40, 40],
	am5: [40, 40],
	lga1700: [37.5, 45]
};
function Pn(e, t) {
	if (e < 80) return {
		x: [-47.5, 47.5],
		y: 47.5,
		fanMm: 92,
		dual: !1,
		low: !0
	};
	if (e >= 165) {
		let e = Math.min(72.5, t - 1);
		return {
			x: [-62.5, 62.5],
			y: e,
			fanMm: Math.min(140, 2 * e - 4),
			dual: !0,
			low: !1
		};
	}
	return {
		x: [-50, 25],
		y: Math.min(62.5, t - 1),
		fanMm: 120,
		dual: !1,
		low: !1
	};
}
var Fn = (e) => e + 36, In = {
	usb2: 2,
	usb5: 2,
	usb10: 0,
	usbc: 0,
	hdmi: 1,
	dp: 0,
	lanGbps: 1,
	wifi: !1,
	audio: 3,
	spdif: !1,
	ps2: !1,
	biosFlashback: !1,
	clearCmos: !1
}, Ln = (e) => [e - 45, e - 1];
function Rn(e) {
	let t = Ln(e)[0] - 1, n = t - bn >= 120 ? 120 : 92;
	return {
		mm: n,
		z: t - n / 2
	};
}
function J(e, t, n, r, i, a, o) {
	return {
		key: e,
		slot: t,
		kind: n,
		color: r,
		pos: [
			(i[0] + i[1]) / 2,
			(a[0] + a[1]) / 2,
			(o[0] + o[1]) / 2
		],
		size: [
			i[1] - i[0],
			a[1] - a[0],
			o[1] - o[0]
		]
	};
}
function zn(e) {
	let t = An.filter((t) => e.formFactors.includes(t)).pop() ?? "atx", n = kn[t], r = On(e), i = Math.max(e.maxGpuLengthMm + vn + yn, e.maxPsuLengthMm + W + 106 + yn), a = Math.max(r + n.h + 15 + Tn + En, r + n.slot + e.expansionSlots * _n + 5 + Tn + En), o = bn + e.maxCoolerHeightMm, s = o + 3 + xn;
	return {
		L: i,
		H: a,
		W: s + Sn + Cn + wn,
		zm: o,
		big: t,
		top: r,
		tray: s
	};
}
function Bn(t) {
	let n = t.selected, r = n.case ?? jn, i = !n.case, { L: a, H: o, W: s, zm: c, big: l, top: u, tray: d } = zn(r), p = (bn + s - wn) / 2, m = [], h = [], g = {}, _ = (e) => t.issues.some((t) => (t.severity === "nofit" || t.severity === "power") && t.slots[0] === e), v = (e) => (m.push(e), e), y = (e, t) => {
		g[e] || (g[e] = {
			pos: t.pos,
			size: t.size
		});
	}, b = `case:${r.id}`;
	v(J(`${b}:floor`, "case", i ? "ghost" : "shell", q.shell, [0, a], [0, 2], [0, s])), v(J(`${b}:tray`, "case", i ? "ghost" : "shell", q.shell, [0, a], [0, o], [d, d + Sn])), v(J(`${b}:rear`, "case", i ? "ghost" : "shell", q.shell, [a - W, a], [0, o], [0, s])), g.case = {
		pos: [
			a / 2,
			o / 2,
			s / 2
		],
		size: [
			a,
			o,
			s
		]
	};
	let x = n.mobo?.formFactor ?? l, S = kn[x], C = a - vn, w = o - u, T = C - 85, E = w - 85, D = w - S.slot, ee = D - r.expansionSlots * _n, O = (e) => T - 70 - e * 9, k = v(J(n.mobo ? `mobo:${n.mobo.id}` : "mobo:ghost", "mobo", n.mobo ? "part" : "ghost", q.mobo, [C - S.w, C], [w - S.h, w], [c, c + 3]));
	if (n.mobo) {
		let e = C - S.w, t = w - S.h;
		k.model = {
			type: "mobo",
			socket: [T - e, E - t],
			sock: Mn(n.mobo.socket),
			dimmX: Array.from({ length: n.mobo.memSlots }, (t, n) => O(n) - e),
			pcieY: D - t,
			atx24: x !== "itx"
		};
	}
	y("mobo", k);
	let te = a - W - r.maxPsuLengthMm, A = [
		te - 106,
		te,
		2,
		60,
		p - G / 2,
		p + G / 2
	];
	if (v(J(`${b}:cage`, "case", i ? "ghost" : "shell", q.cage, [A[0], A[1]], [A[2], A[3]], [A[4], A[5]])), !i) {
		let t = n.cooler?.kind === "aio" ? f(r, n.cooler.radiatorMm ?? 240) : null, i = t === "front" ? [] : Array.from({ length: Math.min(3, Math.floor((o - 50) / 125)) }, (e, t) => o - 30 - 60 - t * 125), u = r.radiatorMounts.rear.includes(120) ? [w - 125, w - 5] : void 0, m = t === "rear" ? void 0 : u, h = C - kn[l].w, g = h - 26, _ = g - 11 > yn ? [[
			g - 11,
			E - 40,
			g + 11,
			E + 40
		], [
			g - 11,
			w - kn[l].h + 20,
			g + 11,
			w - kn[l].h + 80
		]] : [], y = T - 47.5, S = [
			y - 22,
			w + 6,
			y + 22,
			Math.min(w + 20, o - 8)
		], ee = kn[x], O = C - ee.w, k = w - ee.h, te = x === "itx" ? [
			[O + 10, k + 10],
			[C - 10, k + 10],
			[O + 10, w - 10],
			[C - 10, w - 10]
		] : [
			O + 6.35,
			O + ee.w / 2,
			C - 6.35
		].flatMap((e) => [
			k + 6.35,
			k + ee.h / 2,
			w - 6.35
		].map((t) => [e, t])), ne = {};
		if (n.psu && n.mobo && x !== "itx" && _.length && (ne.atx24 = [
			[
				g,
				E,
				d
			],
			[
				g,
				E,
				c - 10
			],
			[
				C - ee.w + 4,
				E,
				c - 7
			]
		]), n.psu && n.mobo && (ne.eps = [
			[
				y,
				S[1] + 7,
				d
			],
			[
				y,
				S[1] + 7,
				c - 12
			],
			[
				y,
				w - 6,
				c - 6
			]
		]), n.psu && n.gpu) {
			let e = C - n.gpu.lengthMm + (n.gpu.lengthMm - 3) * .62 + 11, t = c - K - 5;
			ne.pcie = [
				[
					e,
					96,
					29
				],
				[
					e,
					D - 30,
					29
				],
				[
					e,
					D - 9,
					t - 1
				]
			];
		}
		v({
			...J(`${b}:body`, "case", "shell", q.shell, [0, a], [0, o], [0, s]),
			model: {
				type: "case",
				slotTop: D,
				slots: r.expansionSlots,
				zm: c,
				frontFans: i,
				rearFan: m,
				rearMount: u,
				rear: Rn(c),
				tray: d,
				back: s - wn,
				standoffs: te,
				grommets: _,
				epsHole: S,
				cables: ne,
				ioBox: [
					Ln(c)[0],
					D + 8,
					Ln(c)[1],
					D + 150
				],
				io: n.mobo ? e(n.mobo.rearIo ?? In) : null,
				gpuSlots: n.gpu ? Math.min(Math.ceil(n.gpu.slotWidth), r.expansionSlots) : 0,
				psu: [
					En,
					90,
					p - G / 2,
					p + G / 2
				],
				cpu: [T, E],
				moboFront: h,
				cage: A
			}
		});
	}
	if (n.cpu) {
		let e = Mn(n.cpu.socket), [t, r] = Nn[e];
		y("cpu", v({
			...J(`cpu:${n.cpu.id}`, "cpu", "part", q.cpu, [T - t / 2, T + t / 2], [E - r / 2, E + r / 2], [c - 6, c]),
			model: {
				type: "cpu",
				label: Vn(n.cpu.name),
				sock: e
			}
		}));
	}
	if (n.cooler) {
		let e = n.cooler, t = `cooler:${e.id}`, i = _("cooler");
		if (e.kind === "air") {
			let n = e.heightMm ?? 150, a = Pn(n, E - D), o = [T + a.x[0], T + a.x[1]], s = [E - a.y, E + a.y], l = {
				type: "air",
				fanMm: a.fanMm,
				dual: a.dual,
				low: a.low,
				cpu: [-a.x[0], a.y]
			}, u = v({
				...J(t, "cooler", "part", q.cooler, o, s, [c - n, c]),
				conflict: i,
				model: l
			});
			y("cooler", u), n > r.maxCoolerHeightMm && (v({
				...J(`${t}:excess`, "cooler", "excess", q.excess, o, s, [c - n, bn]),
				axis: 2
			}), v(J(`${t}:limit`, "cooler", "limit", q.excess, [o[0] - 10, o[1] + 10], [s[0] - 10, s[1] + 10], [2.4, 3.6])), h.push({
				key: `${t}:dim`,
				from: [
					o[1] + 8,
					s[1] + 5,
					bn
				],
				to: [
					o[1] + 8,
					s[1] + 5,
					c - n
				],
				label: `faltam ${n - r.maxCoolerHeightMm} mm`,
				at: [
					(o[0] + o[1]) / 2,
					s[1] - 12,
					c - n
				]
			}), g.cooler = {
				pos: u.pos,
				size: u.size,
				dir: [
					-1,
					.5,
					-.45
				]
			});
		} else {
			let n = v({
				...J(`${t}:pump`, "cooler", "part", q.pump, [T - 33, T + 33], [E - 33, E + 33], [c - 51, c - 6]),
				conflict: i
			});
			y("cooler", n);
			let s = e.radiatorMm ?? 240, l = f(r, s), u = c / 2, d = Fn(s), p = l === "top" ? J(`${t}:rad`, "cooler", "part", q.radiator, [a - 30 - d, a - 30], [o - 3 - Dn, o - 3], [u - 60, u + 60]) : l === "front" ? J(`${t}:rad`, "cooler", "part", q.radiator, [Un(r, a) - Dn, Un(r, a)], [o - 30 - d, o - 30], [u - 60, u + 60]) : l === "rear" ? J(`${t}:rad`, "cooler", "part", q.radiator, [a - 4 - Dn, a - 4], [w - 65 - d / 2, w - 65 + d / 2], [Rn(c).z - 60, Rn(c).z + 60]) : J(`${t}:rad`, "cooler", "part", q.radiator, [a / 2 - d / 2, a / 2 + d / 2], [o + 20, o + 47], [u - 60, u + 60]), m = Math.round(s / 120);
			p.model = l === "front" ? {
				type: "radiator",
				fans: m,
				axis: "x",
				inward: 1
			} : l === "rear" ? {
				type: "radiator",
				fans: 1,
				axis: "x",
				inward: -1
			} : {
				type: "radiator",
				fans: m,
				axis: "y",
				inward: -1
			}, v({
				...p,
				conflict: !l || i
			}), l || v({
				...p,
				key: `${t}:excess`,
				kind: "excess",
				color: q.excess,
				model: void 0
			}), n.model = {
				type: "pump",
				tubes: Hn(n, p, l, w)
			}, g.cooler = {
				pos: p.pos,
				size: p.size
			};
		}
	}
	if (n.ram) {
		let e = n.ram;
		for (let t = 0; t < e.modules; t++) {
			let n = O(t), r = v({
				...J(`ram:${e.id}:${t}`, "ram", "part", q.ram, [n - 3.5, n + 3.5], [E + 5 - 66.5, E + 5 + 66.5], [c - e.heightMm, c]),
				model: {
					type: "ram",
					rgb: /rgb/i.test(e.name)
				}
			});
			t === 0 && y("ram", r);
		}
	}
	if (n.gpu) {
		let e = n.gpu, t = `gpu:${e.id}`, i = e.slotWidth * _n;
		y("gpu", v({
			...J(t, "gpu", "part", q.gpu, [C - e.lengthMm, C], [D - i, D], [c - K - 5, c - 5]),
			conflict: _("gpu"),
			model: {
				type: "gpu",
				fans: e.lengthMm > 270 ? 3 : 2
			}
		}));
		let a = n.cooler?.kind === "aio" && n.cooler.radiatorMm && f(r, n.cooler.radiatorMm) === "front" ? r.maxGpuLengthFrontRadMm ?? r.maxGpuLengthMm : r.maxGpuLengthMm, o = C - a;
		e.lengthMm > a && (v({
			...J(`${t}:excess`, "gpu", "excess", q.excess, [C - e.lengthMm, o], [D - i, D], [c - K - 5, c - 5]),
			axis: 0
		}), v(J(`${t}:limit`, "gpu", "limit", q.excess, [o - 1, o + 1], [D - i - 20, D + 20], [c - K - 25, c])), h.push({
			key: `${t}:dim`,
			from: [
				o,
				D + 12,
				c - K - 5
			],
			to: [
				C - e.lengthMm,
				D + 12,
				c - K - 5
			],
			label: `faltam ${e.lengthMm - a} mm`,
			at: [
				(C - e.lengthMm + o) / 2,
				D - i / 2,
				c - K - 6
			]
		})), i > r.expansionSlots * _n && v({
			...J(`${t}:excess-slots`, "gpu", "excess", q.excess, [C - e.lengthMm, C], [D - i, ee], [c - K - 5, c - 5]),
			axis: 1
		});
	}
	if (n.storage) {
		let e = n.storage, t = `storage:${e.id}`, r = e.interface === "sata" ? J(t, "storage", "part", q.storage, [A[0] + 3, A[0] + 103], [A[3], A[3] + 7], [c - 110, c - 40]) : x === "itx" ? J(t, "storage", "part", q.storage, [T - 40, T + 40], [w - S.h + 20, w - S.h + 42], [c + 3, c + 7]) : J(t, "storage", "part", q.storage, [C - 160, C - 80], [D - 51, D - 29], [c - 4, c]), i = e.capacityGb >= 1e3 ? `${e.capacityGb / 1e3}TB` : `${e.capacityGb}GB`;
		y("storage", v({
			...r,
			model: {
				type: e.interface === "sata" ? "sata" : "m2",
				label: i
			}
		}));
	}
	if (n.psu) {
		let e = n.psu, t = `psu:${e.id}`, i = p;
		y("psu", v({
			...J(t, "psu", "part", q.psu, [a - W - e.lengthMm, a - W], [En, 90], [i - G / 2, i + G / 2]),
			conflict: _("psu"),
			model: {
				type: "psu",
				watts: e.wattage
			}
		}));
		let o = a - W - r.maxPsuLengthMm;
		e.lengthMm > r.maxPsuLengthMm && (v({
			...J(`${t}:excess`, "psu", "excess", q.excess, [a - W - e.lengthMm, o], [En, 90], [i - G / 2, i + G / 2]),
			axis: 0
		}), h.push({
			key: `${t}:dim`,
			from: [
				o,
				47,
				i - G / 2 - 1
			],
			to: [
				a - W - e.lengthMm,
				47,
				i - G / 2 - 1
			],
			label: `faltam ${e.lengthMm - r.maxPsuLengthMm} mm`,
			at: [
				(a - W - e.lengthMm + o) / 2,
				47,
				i - G / 2 - 1
			]
		}));
	}
	return {
		caseSize: [
			a,
			o,
			s
		],
		ghostCase: i,
		boxes: m,
		dims: h,
		focus: g
	};
}
var Vn = (e) => e.replace(/^Processador\s+(Exemplo\s+)?/i, "").split(",")[0].trim();
function Hn(e, t, n, r) {
	let i = [
		e.pos[0] - e.size[0] / 2,
		e.pos[1] - e.size[1] / 2,
		e.pos[2] - e.size[2] / 2
	], a = (e) => [
		e[0] - i[0],
		e[1] - i[1],
		e[2] - i[2]
	], [o, , s] = e.pos, c = e.pos[1] + e.size[1] / 2, [l, u, d] = t.pos, [f, p] = t.size;
	return [-1, 1].map((e) => {
		let t = s + e * 8, i = e * 11, m = [
			o + i,
			c - 4,
			t
		];
		if (n === "rear") {
			let n = l - f / 2;
			return [
				m,
				[
					o + i,
					c + 18,
					t
				],
				[
					n - 20,
					u + i,
					d + e * 20
				],
				[
					n,
					u + i,
					d + e * 20
				]
			].map(a);
		}
		if (n === "front") {
			let n = l + f / 2, s = u + p / 2 - 30 + e * 12;
			return [
				m,
				[
					o + i,
					r + 6,
					t
				],
				[
					n + 60,
					r + 6 + e * 4,
					d + e * 20
				],
				[
					n,
					s,
					d + e * 20
				]
			].map(a);
		}
		let h = u - p / 2;
		return [
			m,
			[
				o + i,
				(c + h) / 2,
				t
			],
			[
				o + i,
				h,
				d + e * 20
			]
		].map(a);
	});
}
function Un(e, t) {
	return t - vn - (e.maxGpuLengthFrontRadMm ?? e.maxGpuLengthMm - 30);
}
// src/ui/side-view.ts
var Y = {
	frame: "#1b1c1f",
	inner: "#26272b",
	tray: "#2c2d31",
	dark: "#151517",
	black: "#0e0e10",
	plastic: "#2f3033",
	metal: "#c3c7cc",
	alu: "#6d7278",
	fin: "#aeb3b9",
	copper: "#c07a44",
	pcb: "#141619",
	pcbGreen: "#17301f",
	red: "#e90313",
	rgb: "#ff3b47",
	gold: "#d4a53c",
	usb: "#2f6fd6",
	ram: "#9c1219",
	diffuser: "#ffb3b8",
	label: "#e9eaec",
	rubber: "#0b0b0c",
	beige: "#e2dac4"
};
function X(e, t, n, r, i, a = {}) {
	return n <= t || i <= r ? R`` : R`<rect x=${e.L - n} y=${e.top - i} width=${n - t} height=${i - r} rx=${a.rx ?? 0}
    fill=${a.fill ?? "none"} stroke=${a.stroke ?? "none"} stroke-width=${a.sw ?? 1} opacity=${a.op ?? 1} filter=${a.filter ?? "none"}>${a.title ? R`<title>${a.title}</title>` : ""}</rect>`;
}
var Z = (e, t, n, r, i = {}) => R`<circle cx=${e.L - t} cy=${e.top - n} r=${r} fill=${i.fill ?? "none"} stroke=${i.stroke ?? "none"} stroke-width=${i.sw ?? 1} opacity=${i.op ?? 1} filter=${i.filter ?? "none"}/>`, Wn = (e, t, n, r, i, a, o = 1, s = 1) => R`<line x1=${e.L - t} y1=${e.top - n} x2=${e.L - r} y2=${e.top - i} stroke=${a} stroke-width=${o} opacity=${s}/>`, Q = (e, t, n, r, i, a, o = "middle", s = 800) => R`<text x=${e.L - t} y=${e.top - n} font-size=${i} font-weight=${s} fill=${a} text-anchor=${o} dominant-baseline="middle" font-family="Roboto, Arial, sans-serif">${r}</text>`, Gn = (e, t, n, r, i = 1) => R`<polyline points=${t.map((t) => `${e.L - t[0]},${e.top - t[1]}`).join(" ")} fill="none" stroke=${n} stroke-width=${r} stroke-linejoin="round" stroke-linecap="round" opacity=${i}/>`, $ = (e) => [
	e.pos[0] - e.size[0] / 2,
	e.pos[1] - e.size[1] / 2,
	e.pos[2] - e.size[2] / 2
];
function Kn(e, t, n, r, i, a) {
	let o = [X(e, t, n, r, i, {
		fill: Y.dark,
		stroke: "#000",
		rx: 2
	})];
	if (a) for (let a = 1; a < 7; a++) {
		let s = r + (i - r) * a / 7;
		o.push(Wn(e, t + 3, s - 4, n - 3, s + 4, "#3a3b40", 2));
	}
	else for (let a = 1; a < 7; a++) {
		let s = t + (n - t) * a / 7;
		o.push(Wn(e, s - 4, r + 3, s + 4, i - 3, "#3a3b40", 2));
	}
	return o.push(a ? X(e, n - 2, n - .8, r + 4, i - 4, {
		fill: Y.rgb,
		filter: "url(#glow)"
	}) : X(e, t + 4, n - 4, i - 2, i - .8, {
		fill: Y.rgb,
		filter: "url(#glow)"
	})), o;
}
function qn(e, t, n, r) {
	let i = r * .47, a = [X(e, t - r / 2, t + r / 2, n - r / 2, n + r / 2, {
		fill: Y.dark,
		stroke: "#000",
		rx: 4
	}), Z(e, t, n, i, {
		fill: "#09090a",
		stroke: Y.rgb,
		sw: 2.2,
		filter: "url(#glow)"
	})];
	for (let o = 0; o < 9; o++) {
		let s = o / 9 * Math.PI * 2, c = s + .5;
		a.push(R`<path d="M ${e.L - t - Math.cos(s) * r * .16} ${e.top - n - Math.sin(s) * r * .16}
      Q ${e.L - t - Math.cos(s + .2) * i} ${e.top - n - Math.sin(s + .2) * i} ${e.L - t - Math.cos(c) * i * .92} ${e.top - n - Math.sin(c) * i * .92}" stroke="#2b2c31" stroke-width=${r * .09} fill="none" stroke-linecap="round"/>`);
	}
	a.push(Z(e, t, n, r * .16, {
		fill: Y.plastic,
		stroke: "#000"
	}), Z(e, t, n, r * .1, { fill: "#8f9399" }));
	for (let i of [-1, 1]) for (let o of [-1, 1]) a.push(Z(e, t + i * r * .43, n + o * r * .43, r * .022, { fill: "#000" }));
	return a;
}
function Jn(e, t, n) {
	let [r, i] = t.size, a = [];
	a.push(X(e, 0, r, 0, i, {
		fill: Y.frame,
		stroke: "#000",
		sw: 2,
		rx: 6
	})), a.push(X(e, 5, r - 5, 5, i - 5, {
		fill: Y.tray,
		title: "Bandeja da placa-mãe"
	}));
	let [o, s] = n.cpu;
	a.push(X(e, o - 62, o + 62, s - 58, s + 58, {
		fill: "#1a1a1d",
		stroke: "#3a3b40",
		rx: 3
	}));
	for (let [t, r, i, o] of [...n.grommets, n.epsHole]) a.push(X(e, t, i, r, o, {
		fill: Y.rubber,
		stroke: "#3a3b40",
		rx: 4,
		title: "Passa-cabos"
	})), a.push(i - t < o - r ? Wn(e, (t + i) / 2, r + 3, (t + i) / 2, o - 3, "#2a2b2f", 1.5) : Wn(e, t + 3, (r + o) / 2, i - 3, (r + o) / 2, "#2a2b2f", 1.5));
	for (let [t, r] of n.standoffs) a.push(Z(e, t, r, 3, {
		fill: Y.gold,
		stroke: "#7a5a12"
	}));
	return a;
}
function Yn(e, t, n) {
	let [r, i] = t.size, a = [];
	a.push(X(e, 5, r - 5, i - 2.5, i, { fill: "url(#mesh)" }), X(e, 0, 2.5, 5, i - 5, {
		fill: "url(#mesh)",
		title: "Frente com tela"
	})), a.push(X(e, r - 3, r, 5, i - 5, {
		fill: Y.inner,
		title: "Traseira"
	}));
	for (let t = 0; t < n.slots; t++) {
		let i = n.slotTop - t * 20 - 2.5, o = n.slotTop - (t + 1) * 20 + 2.5;
		a.push(X(e, r - 4.5, r - 3, o, i, { fill: t < n.gpuSlots ? "#000" : Y.metal })), a.push(Z(e, r - 1.5, (o + i) / 2, 2.2, {
			fill: Y.metal,
			stroke: "#555"
		}));
	}
	let [o, s, , c] = n.ioBox;
	a.push(X(e, r - 3, r - .5, s, c, {
		fill: n.io ? "#2a2c30" : "#000",
		title: n.io ? "Espelho de I/O" : "Recorte do I/O"
	})), n.rearFan && a.push(...Kn(e, r - 3 - 25 - 2, r - 3 - 2, (n.rearFan[0] + n.rearFan[1]) / 2 - n.rear.mm / 2, (n.rearFan[0] + n.rearFan[1]) / 2 + n.rear.mm / 2, !0));
	for (let t of n.frontFans) a.push(...Kn(e, 3, 28, t - 60, t + 60, !0));
	a.push(X(e, 5, r - 5, 0, 2, { fill: Y.inner })), a.push(X(e, r - 3 - 175, r - 3 - 8, 2, 2.4, { fill: "url(#mesh)" }));
	for (let t of [r - 3 - 22, r - 3 - 128]) a.push(X(e, t - 6, t + 6, 2, 4, { fill: Y.rubber }));
	return a.push(X(e, 16, 29, i - .5, i + .6, { fill: Y.usb }), Z(e, 22, i, 3, {
		fill: Y.metal,
		stroke: Y.rgb,
		sw: 1.2
	})), a;
}
function Xn(e, t) {
	let [n, r, i, a] = t.cage, o = [];
	o.push(X(e, n, r, i, a, {
		fill: Y.inner,
		stroke: "#000",
		sw: 1.5,
		title: "Gaiola de discos (limite da fonte)"
	}));
	for (let [t, s] of [[i + 3, i + 24], [i + 27, a - 4]]) o.push(X(e, n + 3, r - 3, t, s, {
		fill: Y.plastic,
		stroke: "#000",
		rx: 2
	})), o.push(X(e, n, n + 3, t + 4, s - 4, { fill: Y.black }), X(e, n, n + 1, t + 8, s - 8, { fill: Y.red }));
	return o;
}
function Zn(e, t) {
	let [n, r] = t.size;
	return [R`<rect x=${e.L - n + 5 + 5} y=${e.top - r + 5 + 5} width=${n - 10 - 10} height=${r - 10 - 10} fill="url(#glass)" stroke="#050506" stroke-width=${10}/>`, X(e, 0, n, 0, r, {
		stroke: "#000",
		sw: 3,
		rx: 6
	})];
}
function Qn(e, t, n) {
	let [r, i] = $(t), [a, o] = t.size, s = [], c = (t, n, a, o, s) => X(e, r + t, r + n, i + a, i + o, s), [l, u] = n.socket;
	s.push(c(0, a, 0, o, {
		fill: "url(#pcb)",
		stroke: "#000",
		sw: 1.5,
		rx: 2,
		title: "Placa-mãe"
	})), s.push(c(a - 20, a, u - 50, o - 5, {
		fill: Y.black,
		stroke: "#000",
		rx: 2
	}), c(a - 19, a - 1, u - 30, u - 26, { fill: Y.red })), s.push(c(l - 40, l + 42, u + 38, u + 60, {
		fill: "url(#finv)",
		stroke: "#2a2c30",
		rx: 2
	}), c(l + 42, l + 62, u - 40, u + 60, {
		fill: "url(#finh)",
		stroke: "#2a2c30",
		rx: 2
	}));
	for (let e = l - 34; e <= l + 34; e += 11) s.push(c(e - 4, e + 4, u + 33.5, u + 37.8, { fill: "#3a3b3f" }));
	for (let e = u - 34; e <= u + 28; e += 11) s.push(c(l + 37.5, l + 41.8, e - 4, e + 4, { fill: "#3a3b3f" }));
	if (n.sock === "lga1700") s.push(c(l - 23, l + 23, u - 29, u + 29, {
		fill: Y.metal,
		stroke: "#7d8187",
		rx: 2,
		title: "Soquete LGA1700"
	}), c(l - 17, l + 17, u - 21, u + 21, { fill: "#202124" })), s.push(c(l + 24.5, l + 26.5, u - 28, u + 28, { fill: Y.metal }));
	else {
		n.sock === "am4" ? s.push(c(l - 24, l + 24, u - 24, u + 24, {
			fill: "url(#pga)",
			stroke: "#9b927c",
			title: "Soquete AM4"
		})) : s.push(c(l - 24, l + 24, u - 24, u + 24, {
			fill: Y.metal,
			stroke: "#7d8187",
			rx: 2,
			title: "Soquete AM5"
		}), c(l - 18, l + 18, u - 18, u + 18, { fill: "#202124" })), s.push(c(l + 25.5, l + 27, u - 23, u + 23, { fill: Y.metal }));
		for (let e of [-1, 1]) s.push(c(l - 36, l + 36, u + (e < 0 ? -32 : 26), u + (e < 0 ? -26 : 32), {
			fill: Y.plastic,
			stroke: "#000",
			rx: 1.5
		}));
	}
	for (let e of n.dimmX) s.push(c(e - 3, e + 3, u - 63, u + 73, {
		fill: Y.plastic,
		stroke: "#000"
	}), c(e - 3, e + 3, u + 73, u + 79, { fill: "#8d9096" }));
	s.push(c(a - 137, a - 48, n.pcieY - 7, n.pcieY - 1, {
		fill: Y.metal,
		stroke: "#6b6f75",
		title: "PCIe x16"
	}), c(a - 135, a - 50, n.pcieY - 4.6, n.pcieY - 3.4, { fill: "#000" }));
	for (let e of [40, 80]) n.pcieY - e - 7 > 6 && s.push(c(a - 137, a - (e === 40 ? 112 : 48), n.pcieY - e - 7, n.pcieY - e - 1, {
		fill: Y.plastic,
		stroke: "#000"
	}));
	if (n.pcieY - 70 > 4 && (s.push(c(a - 45, a - 8, n.pcieY - 70, n.pcieY - 30, {
		fill: Y.alu,
		stroke: "#3a3d42",
		rx: 2
	}), c(a - 43, a - 10, n.pcieY - 52, n.pcieY - 48, { fill: Y.red })), s.push(Z(e, r + a - 62, i + n.pcieY - 50, 10, {
		fill: "#d3d6da",
		stroke: "#8a8e94",
		sw: 1.5
	}))), n.atx24) {
		s.push(c(6, 20, u - 30, u + 30, {
			fill: Y.plastic,
			stroke: "#000",
			title: "Conector de 24 pinos"
		}));
		for (let e = 0; e < 4; e++) s.push(c(2, 12, 14 + e * 9, 21 + e * 9, {
			fill: Y.black,
			stroke: "#333"
		}));
		for (let t = u - 40; t <= u + 40; t += 10) s.push(Z(e, r + 27, i + t, 2.5, {
			fill: "#3a3d44",
			stroke: "#9aa0a6",
			sw: .8
		}));
	}
	return s.push(c(l - 55, l - 40, o - 14, o - 4, {
		fill: Y.plastic,
		stroke: "#000",
		title: "EPS (8 pinos)"
	}), c(l - 12, l - 2, o - 10, o - 4, { fill: "#8d9096" })), s.push(Q(e, r + a - 70, i + 20, "EXEMPLO", 9, "#5f646b")), s;
}
function $n(e, t, n) {
	let [r, i] = $(t), [a, o] = t.size;
	return [
		X(e, r, r + a, i, i + o, {
			fill: n.sock === "lga1700" ? "#101113" : Y.pcbGreen,
			stroke: "#000",
			title: `Processador ${n.label}`
		}),
		X(e, r + 2.5, r + a - 2.5, i + 3, i + o - 3, {
			fill: Y.metal,
			stroke: "#8a8e94",
			rx: 1
		}),
		Q(e, r + a / 2, i + o / 2 + 4, "EXEMPLO", 5, "#6f747b"),
		Q(e, r + a / 2, i + o / 2 - 4, n.label, 4.5, "#6f747b")
	];
}
function er(e, t, n) {
	let [r, i] = $(t), [a, o, s] = t.size, c = [], l = (t, n, a, o, s) => X(e, r + t, r + n, i + a, i + o, s);
	if (n.low) return c.push(l(0, a, 0, o, {
		fill: "url(#finv)",
		stroke: "#555",
		title: "Cooler baixo"
	})), c.push(...qn(e, r + a / 2, i + o / 2, Math.min(n.fanMm, a, o))), c;
	let u = n.dual ? [[0, (a - 25) / 2], [(a + 25) / 2, a]] : [[25, a]];
	for (let [t, a] of u) {
		c.push(l(t, a, 0, o, {
			fill: "#1d1e21",
			stroke: "#000",
			rx: 2,
			title: n.dual ? "Air cooler torre dupla" : "Air cooler torre"
		})), c.push(l(t + 4, a - 4, o * .16 - 2, o * .16 + 2, { fill: Y.red })), [
			.25,
			.5,
			.75
		].forEach((n, s) => c.push(Z(e, r + t + (a - t) * n, i + o / 2 + (s % 2 ? 9 : -9), 3.6, {
			fill: Y.copper,
			stroke: "#7b4a22"
		})));
		for (let e of [3, o - 3]) c.push(l(t, a, e - 1.5, e + 1.5, {
			fill: Y.fin,
			op: .5
		}));
	}
	let d = n.dual ? a / 2 : 12.5, f = Math.min(n.fanMm, o - 2, s - 32);
	return c.push(...Kn(e, r + d - 12.5, r + d + 12.5, i + o / 2 - f / 2, i + o / 2 + f / 2, !0)), c;
}
function tr(e, t, n) {
	let [r, i, a] = $(t), [o] = t.size, s = t.pos[0], c = t.pos[1], l = n.tubes.map((t) => R`${Gn(e, t.map((e) => [
		r + e[0],
		i + e[1],
		a + e[2]
	]), "#0b0b0c", 10)}${Gn(e, t.map((e) => [
		r + e[0],
		i + e[1],
		a + e[2]
	]), "#2c2d31", 2.5, .8)}`);
	return l.push(Z(e, s, c, o / 2, {
		fill: Y.black,
		stroke: "#000",
		sw: 1.5
	}), Z(e, s, c, o / 2 - 4, {
		stroke: Y.rgb,
		sw: 3,
		filter: "url(#glow)"
	}), Z(e, s, c, o / 2 - 7, { fill: "#09090a" }), Z(e, s, c, o / 2 - 12.5, {
		stroke: Y.rgb,
		sw: 1,
		op: .6
	}), Z(e, s, c, o / 2 - 18.5, {
		stroke: Y.rgb,
		sw: 1,
		op: .35
	}), Q(e, s, c, "EXEMPLO", 6, "#6f747b")), l;
}
function nr(e, t, n) {
	let [r, i] = $(t), [a, o] = t.size, s = [], c = n.axis === "y", l = c ? a : o, u = c ? o : a, d = u >= 45 ? 25 : u - 4, f = u - d, [p, m, h] = n.inward === 1 ? [
		0,
		f,
		f
	] : [
		d,
		u,
		0
	], g = (t, n, a, o, s) => c ? X(e, r + t, r + n, i + a, i + o, s) : X(e, r + a, r + o, i + t, i + n, s);
	s.push(g(0, 14, p, m, {
		fill: Y.dark,
		stroke: "#000"
	}), g(l - 14, l, p, m, {
		fill: Y.dark,
		stroke: "#000"
	})), s.push(g(14, l - 14, p, m, {
		fill: c ? "url(#finv)" : "url(#finh)",
		stroke: "#2a2c30",
		title: "Radiador"
	}));
	let _ = (l - 28) / n.fans;
	for (let t = 0; t < n.fans; t++) {
		let n = 14 + _ * t + 1, a = 14 + _ * (t + 1) - 1;
		s.push(...c ? Kn(e, r + n, r + a, i + h, i + h + d, !1) : Kn(e, r + h, r + h + d, i + n, i + a, !0));
	}
	return s;
}
function rr(e, t, n) {
	let [r, i] = $(t), [a, o] = t.size, s = [];
	if (s.push(X(e, r, r + a, i, i + o, {
		fill: Y.ram,
		stroke: "#3a0508",
		rx: 1,
		title: "Memória"
	})), n.rgb) for (let t = 0; t < 8; t++) {
		let n = (o - 4) / 8;
		s.push(X(e, r + .6, r + a - .6, i + 2 + t * n + .5, i + 2 + (t + 1) * n - .5, {
			fill: Y.diffuser,
			filter: "url(#glow)"
		}));
	}
	else for (let t = 3; t < o - 6; t += 8) s.push(X(e, r, r + a, i + t, i + t + 5, { fill: Y.black }));
	return s;
}
function ir(e, t, n) {
	let [r, i] = $(t), [a, o] = t.size, s = a - 3, c = [], l = (t, n, a, o, s) => X(e, r + t, r + n, i + a, i + o, s);
	c.push(l(0, s, 9, o - 5, {
		fill: "url(#gpuside)",
		stroke: "#000",
		sw: 1.5,
		rx: 3,
		title: "Placa de vídeo"
	})), c.push(l(0, s, o - 2.5, o, { fill: Y.alu }), l(0, s, o - 5, o - 2.5, { fill: Y.pcb })), c.push(l(0, s, 6, 9, { fill: "#2c2d30" }));
	let u = s / n.fans;
	for (let e = 0; e < n.fans; e++) c.push(l(u * e + 6, u * (e + 1) - 6, 0, 6, {
		fill: Y.dark,
		stroke: "#000",
		rx: 2
	}));
	c.push(l(a - 2, a, 0, o, {
		fill: Y.metal,
		stroke: "#6b6f75",
		title: "Suporte PCIe"
	})), c.push(l(s * .06, s * .6, o * .32 - 1.5, o * .32 + 1.5, {
		fill: Y.red,
		filter: "url(#glow)"
	}));
	let d = s * .62;
	return c.push(l(d, d + 22, o - 13, o - 5, {
		fill: Y.black,
		stroke: "#333",
		title: "Conector de energia"
	})), c.push(Q(e, r + s * .3, i + o * .62, "EXEMPLO", Math.min(14, o * .3), "#e8e8e8")), c;
}
function ar(e, t, n) {
	let [r, i] = $(t);
	return [
		X(e, r, r + 4, i + 2, i + 20, { fill: Y.gold }),
		X(e, r + 4, r + 80, i, i + 22, {
			fill: Y.pcb,
			stroke: "#000"
		}),
		X(e, r + 5, r + 78, i + .5, i + 21.5, {
			fill: Y.alu,
			rx: 1,
			title: `SSD NVMe ${n.label}`
		}),
		X(e, r + 9, r + 62, i + 2, i + 20, { fill: Y.label }),
		X(e, r + 9, r + 11, i + 2, i + 20, { fill: Y.red }),
		Q(e, r + 36, i + 11, `NVMe ${n.label}`, 7, "#1b1c1f")
	];
}
function or(e, t, n) {
	let [r, i] = $(t), [a, o] = t.size;
	return [
		X(e, r, r + a, i, i + o, {
			fill: Y.alu,
			stroke: "#000",
			rx: 1,
			title: `SSD SATA ${n.label}`
		}),
		X(e, r + 8, r + a - 8, i + o - 1.2, i + o, { fill: Y.label }),
		X(e, r, r + .8, i + 1.5, i + o - 1.5, { fill: "#000" })
	];
}
function sr(e, t, n) {
	let [r, i] = $(t), [a, o] = t.size, s = (t, n, a, o, s) => X(e, r + t, r + n, i + a, i + o, s);
	return [
		s(0, a, 0, o, {
			fill: "#141416",
			stroke: "#000",
			sw: 1.5,
			rx: 3,
			title: `Fonte ${n.watts}W`
		}),
		s(a * .12, a * .88, 14, o - 14, {
			fill: "#1f2023",
			stroke: "#2f3034",
			rx: 2
		}),
		s(a * .12, a * .88, 20, 24, { fill: Y.red }),
		Q(e, r + a / 2, i + o / 2 + 8, `${n.watts}W`, 22, "#f2f2f2"),
		Q(e, r + a / 2, i + o / 2 - 8, "EXEMPLO · 80 PLUS", 7, "#bdbdbd", "middle", 600),
		s(0, 1.5, 12, o - 12, { fill: Y.plastic }),
		s(a - 1.5, a, 4, o - 4, { fill: "#3b3d42" })
	];
}
function cr(e, t) {
	let n = [];
	for (let [r, i, a] of [
		[
			"atx24",
			4,
			3.2
		],
		[
			"eps",
			2,
			3.2
		],
		[
			"pcie",
			3,
			3
		]
	]) {
		let o = t.cables[r];
		if (o) for (let t = 0; t < i; t++) {
			let s = (t - (i - 1) / 2) * a * 2.1, c = o.map(([e, t, n]) => [
				e + (r === "atx24" ? 0 : s),
				t + (r === "atx24" ? s : 0),
				n
			]);
			n.push(Gn(e, c, "#050505", a * 2), Gn(e, c, "#2a2b2f", a * .6, .9));
		}
	}
	return n;
}
var lr = {
	mobo: Qn,
	cpu: $n,
	air: er,
	pump: tr,
	radiator: nr,
	ram: rr,
	gpu: ir,
	m2: ar,
	sata: or,
	psu: sr
};
function ur(e) {
	let [t, n] = e.caseSize, r = Math.max(n, ...e.boxes.map((e) => e.pos[1] + e.size[1] / 2)), i = {
		L: t,
		top: r
	}, a = e.boxes.find((e) => e.model?.type === "case"), o = a?.model, s = e.boxes.filter((e) => e.model && e.model.type !== "case").sort((e, t) => t.pos[2] + t.size[2] / 2 - (e.pos[2] + e.size[2] / 2)), c = e.boxes.filter((e) => e.kind === "ghost" && e.key.startsWith("mobo")), l = e.boxes.filter((e) => e.kind === "excess" && e.axis === 2), u = new Set(l.map((e) => e.key.replace(/:excess$/, ""))), d = e.boxes.filter((e) => e.kind === "excess" && e.axis !== 2 || e.kind === "limit" && !u.has(e.key.replace(/:limit$/, ""))), f = new Set(e.boxes.filter((e) => e.conflict).map((e) => e.key)), p = l.length ? dr + 12 : 0;
	return R`<svg viewBox="${-34} ${-34} ${t + 68} ${r + 68 + p}" aria-hidden="true">
    <defs>
      <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#e5484d"/><rect width="4" height="10" fill="#fff" opacity=".8"/></pattern>
      <pattern id="mesh" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#2b2c30"/><circle cx="2" cy="2" r="1.1" fill="#060607"/></pattern>
      <pattern id="pcb" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#15171b"/><path d="M0 10h14v12h18M8 40V28h20M40 6H26v8" stroke="#232930" stroke-width="1.2" fill="none"/><rect x="30" y="30" width="3" height="3" fill="#2c3238"/></pattern>
      <pattern id="finv" width="3" height="10" patternUnits="userSpaceOnUse"><rect width="3" height="10" fill="#5d6268"/><rect width="1" height="10" fill="#b8bcc1"/></pattern>
      <pattern id="finh" width="10" height="3" patternUnits="userSpaceOnUse"><rect width="10" height="3" fill="#5d6268"/><rect width="10" height="1" fill="#b8bcc1"/></pattern>
      <pattern id="pga" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${Y.beige}"/><rect x="1.5" y="1.5" width="1.6" height="1.6" fill="#9b927c"/></pattern>
      <pattern id="gpuside" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="18" height="18" fill="#232427"/><rect width="5" height="18" fill="#2c2e32"/></pattern>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe3f0" stop-opacity=".10"/><stop offset=".35" stop-color="#cfe3f0" stop-opacity=".02"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".07"/><stop offset=".62" stop-color="#cfe3f0" stop-opacity="0"/></linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${a && o ? Jn(i, a, o) : R`<rect class="shell ghost" x="0" y=${r - n} width=${t} height=${n} rx="6" fill="none"/>`}
    ${c.map((e) => X(i, $(e)[0], $(e)[0] + e.size[0], $(e)[1], $(e)[1] + e.size[1], {
		stroke: "#777",
		sw: 2,
		title: "Placa-mãe (escolha uma)"
	}))}
    ${s.map((e) => R`<g class=${f.has(e.key) ? "bad" : ""}>${lr[e.model.type](i, e, e.model)}
      ${f.has(e.key) ? X(i, $(e)[0], $(e)[0] + e.size[0], $(e)[1], $(e)[1] + e.size[1], u.has(e.key) ? {
		stroke: "#ff8a8a",
		sw: 3
	} : {
		fill: "#e5484d",
		op: .28,
		stroke: "#ff8a8a",
		sw: 3
	}) : ""}</g>`)}
    ${o ? Xn(i, o) : ""}
    ${o ? cr(i, o) : ""}
    ${a && o ? Yn(i, a, o) : ""}
    ${a ? Zn(i, a) : ""}
    ${d.map((e) => X(i, $(e)[0], $(e)[0] + Math.max(e.size[0], 1), $(e)[1], $(e)[1] + Math.max(e.size[1], 1), e.kind === "excess" ? {
		fill: "url(#hatch)",
		stroke: "#ff8a8a",
		sw: 2,
		op: .9
	} : { fill: "#e5484d" }))}
    ${e.dims.filter((e) => e.from[0] !== e.to[0]).map((e) => R`
      <line class="dimline" x1=${t - e.from[0]} y1=${r - e.from[1]} x2=${t - e.to[0]} y2=${r - e.to[1]}/>
      <text class="dimtext" x=${Math.min(t - 50, Math.max(50, t - e.at[0]))} y=${r - e.at[1]} text-anchor="middle" dominant-baseline="middle">${e.label}</text>`)}
    ${l.map((t) => fr(i, e, t))}
    ${pr(i)}
  </svg>`;
}
var dr = 96;
function fr(e, t, n) {
	let [, , r] = t.caseSize, i = t.boxes.find((e) => e.key === n.key.replace(/:excess$/, "")), a = t.dims.find((e) => e.key === i.key + ":dim"), o = i.pos[2] + i.size[2] / 2, s = i.pos[2] - i.size[2] / 2, c = n.pos[2] + n.size[2] / 2, l = 150 / r, u = r * l + 40, d = dr, f = e.L - u, p = e.top + 26, m = (e) => f + 20 + e * l, h = p + 54, g = Math.max(16, i.size[0] * l * .6);
	return R`<g class="inset" role="presentation">
    <rect x=${f} y=${p} width=${u} height=${d} rx="6" fill="#111214" opacity=".92" stroke="#3a3b40"/>
    <text x=${f + 10} y=${p + 14} font-size="10.5" font-weight="700" fill="#d7d9dc" font-family="Roboto, Arial, sans-serif">Vista de cima</text>
    <rect x=${m(0)} y=${h - 28} width=${r * l} height="56" fill="#26272b" stroke="#000"/>
    <rect x=${m(o)} y=${h - 26} width="2" height="52" fill="#2e6b45"><title>Placa-mãe</title></rect>
    <rect x=${m(s)} y=${h - g / 2} width=${(o - s) * l} height=${g} fill="#9aa0a6" stroke="#000"><title>Cooler</title></rect>
    <rect x=${m(s)} y=${h - g / 2} width=${(c - s) * l} height=${g} fill="url(#hatch)" stroke="#ff8a8a"/>
    <rect x=${m(c) - 1} y=${h - 30} width="2" height="60" fill="#e5484d"><title>Vidro lateral</title></rect>
    <text x=${m(c) + 4} y=${h + 38} font-size="9.5" fill="#ffb3b3" font-family="Roboto, Arial, sans-serif">vidro</text>
    <text x=${m(o) + 4} y=${h - 32} font-size="9.5" fill="#9fd3b0" text-anchor="end" font-family="Roboto, Arial, sans-serif">placa-mãe</text>
    <text x=${f + u - 8} y=${p + 14} font-size="11" font-weight="800" fill="#ff8a8a" text-anchor="end" font-family="Roboto, Arial, sans-serif">${a?.label ?? ""}</text>
  </g>`;
}
function pr(e) {
	let t = e.top + 16;
	return R`<g opacity=".85"><line x1=${0} y1=${t} x2=${100} y2=${t} stroke="currentColor" stroke-width="2"/>
    <line x1=${0} y1=${t - 4} x2=${0} y2=${t + 4} stroke="currentColor" stroke-width="2"/><line x1=${100} y1=${t - 4} x2=${100} y2=${t + 4} stroke="currentColor" stroke-width="2"/>
    <text x=${108} y=${t} font-size="11" font-weight="700" text-anchor="start" dominant-baseline="middle" fill="currentColor" font-family="Roboto, Arial, sans-serif">100 mm</text></g>`;
}
// src/ui/pc-viewer.ts
var mr = "mp-viewer-mode", hr = () => matchMedia("(prefers-reduced-motion: reduce)").matches, gr = {
	geral: "Geral",
	vidro: "Lateral",
	frente: "Frente",
	traseira: "Traseira",
	topo: "Topo"
}, _r = L`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`, vr = L`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;
function yr() {
	try {
		let e = document.createElement("canvas");
		return !!(e.getContext("webgl2") || e.getContext("webgl"));
	} catch {
		return !1;
	}
}
function br() {
	try {
		let e = localStorage.getItem(mr);
		if (e === "2d" || e === "3d") return e === "3d" && !yr() ? "2d" : e;
	} catch {}
	let e = navigator;
	return !(e.connection?.saveData || (e.deviceMemory ?? 8) <= 2) && yr() ? "3d" : "2d";
}
var xr = class extends V {
	static properties = {
		evaluation: { attribute: !1 },
		focusPart: { attribute: !1 },
		_mode: { state: !0 },
		_loading: { state: !0 },
		_full: { state: !0 },
		_view: { state: !0 },
		_said: { state: !0 }
	};
	scene;
	loadingScene;
	io;
	visible = !1;
	layout;
	constructor() {
		super(), this._mode = br(), this._loading = !1, this._full = !1, this._said = "";
	}
	get isFsElement() {
		return (this.getRootNode().fullscreenElement ?? null) === this;
	}
	onFsChange = () => {
		!this.isFsElement && this._full && !this.classList.contains("fallback") && this.setFull(!1);
	};
	onEscFallback = (e) => {
		e.key === "Escape" && this._full && this.setFull(!1);
	};
	async setFull(e) {
		if (this._full = e, this.scene?.setWheelZoom(e), e) {
			if (this.requestFullscreen && document.fullscreenEnabled) try {
				await this.requestFullscreen(), this.classList.remove("fallback");
			} catch {
				this.classList.add("fallback");
			}
			else this.classList.add("fallback");
			document.addEventListener("keydown", this.onEscFallback), this._said = "Tela cheia. Role para aproximar; Esc para sair.";
		} else document.removeEventListener("keydown", this.onEscFallback), this.isFsElement && await document.exitFullscreen().catch(() => {}), this.classList.remove("fallback"), this._said = "Saiu da tela cheia.";
	}
	view(e) {
		this._view = e, this.scene?.setView(e), this._said = `Vista ${gr[e].toLowerCase()}.`;
	}
	onKey(e) {
		let t = this.scene;
		if (!t) return;
		let n = Math.PI / 15, r = {
			ArrowLeft: () => t.orbit(-n, 0),
			ArrowRight: () => t.orbit(n, 0),
			ArrowUp: () => t.orbit(0, -n / 2),
			ArrowDown: () => t.orbit(0, n / 2),
			"+": () => t.zoomBy(.85),
			"=": () => t.zoomBy(.85),
			"-": () => t.zoomBy(1.18),
			0: () => this.view("geral"),
			1: () => this.view("vidro"),
			2: () => this.view("frente"),
			3: () => this.view("traseira"),
			4: () => this.view("topo")
		}[e.key];
		r && (e.preventDefault(), e.key.startsWith("Arrow") && (this._view = void 0), r());
	}
	connectedCallback() {
		super.connectedCallback(), document.addEventListener("fullscreenchange", this.onFsChange), this.io = new IntersectionObserver(([e]) => {
			this.visible = e.isIntersecting, this.scene?.setActive(this.visible), this.visible && this._mode === "3d" && this.ensureScene();
		}), this.io.observe(this);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), document.removeEventListener("fullscreenchange", this.onFsChange), document.removeEventListener("keydown", this.onEscFallback), this.io?.disconnect(), this.scene?.dispose(), this.scene = void 0;
	}
	willUpdate(e) {
		e.has("evaluation") && this.evaluation && (this.layout = Bn(this.evaluation));
	}
	updated(e) {
		if (e.has("_mode") && (this._mode === "3d" && this.visible && this.ensureScene(), this._mode === "2d" && (this.scene?.dispose(), this.scene = void 0, this.loadingScene = void 0)), this.scene && this.layout && (e.has("evaluation") || e.has("focusPart"))) {
			let t = e.get("focusPart");
			this.scene.update(this.layout, this.focusPart && this.focusPart.n !== t?.n ? this.focusPart.slot : void 0);
		}
	}
	ensureScene() {
		this.scene || this.loadingScene || (this._loading = !0, this.loadingScene = import("./scene-AYTmqXTT.js").then(({ PcScene: e }) => {
			if (this._mode !== "3d") return;
			let t = this.renderRoot.querySelector("canvas"), n = this.renderRoot.querySelector(".overlay");
			try {
				this.scene = new e(t, n, { animate: !hr() }), this.scene.setWheelZoom(this._full), this.layout && this.scene.update(this.layout), this.scene.setActive(this.visible);
			} catch (e) {
				console.warn("[monte-seu-pc] 3D indisponível, usando 2D", e), this._mode = "2d";
			}
		}).catch((e) => {
			console.warn("[monte-seu-pc] falha ao carregar o 3D, usando 2D", e), this._mode = "2d";
		}).finally(() => {
			this._loading = !1;
		}));
	}
	setMode(e) {
		this._mode = e;
		try {
			localStorage.setItem(mr, e);
		} catch {}
	}
	render() {
		let e = this.layout, t = this.evaluation, n = t ? Object.keys(t.selected).length : 0, r = t?.issues.filter((e) => e.severity === "nofit") ?? [], i = `Prévia ilustrativa da montagem com ${n} ${n === 1 ? "peça" : "peças"}${r.length ? `. ${r.length} conflito(s) de encaixe, em vermelho` : ""}.`, a = this._mode === "3d", o = t?.selected.mobo?.rearIo ? un(t.selected.mobo.rearIo) : null;
		return L`<div class="wrap">
      <div class="head">
        <h3>Prévia da montagem <span class="tag">ilustrativa</span></h3>
        <div class="acts">
          <button @click=${() => this.setFull(!this._full)} aria-pressed=${this._full ? "true" : "false"}
            aria-label=${this._full ? "Sair da tela cheia" : "Abrir a prévia em tela cheia"} title=${this._full ? "Sair da tela cheia (Esc)" : "Tela cheia"}>${this._full ? vr : _r}</button>
          <button @click=${() => this.setMode(a ? "2d" : "3d")} aria-label=${a ? "Mudar para vista 2D" : "Mudar para vista 3D"}>${a ? "2D" : "3D"}</button>
        </div>
      </div>
      <div class="stage">
        ${a ? L`<canvas tabindex="0" role="application" aria-roledescription="prévia 3D"
              aria-label=${`${i} Setas giram, + e − aproximam, 0 a 4 escolhem a vista.`}
              aria-describedby=${o ? "ports" : z} @keydown=${this.onKey}></canvas>
            <div class="overlay"></div>
            ${this._loading ? L`<p class="hint center">Carregando 3D…</p>` : z}
` : L`<div class="svgwrap" role="img" aria-label=${i}>${e ? ur(e) : z}</div>`}
        ${e?.ghostCase ? L`<p class="hint corner">Gabinete genérico: escolha um gabinete</p>` : z}
      </div>
      ${a ? L`${this.scene ? L`<div class="tools" role="toolbar" aria-label="Vistas e zoom">
              ${[
			"geral",
			"vidro",
			"frente",
			"traseira",
			"topo"
		].map((e, t) => L`
                <button aria-pressed=${this._view === e ? "true" : "false"} @click=${() => this.view(e)} title=${`${gr[e]} (tecla ${t})`}>${gr[e]}</button>`)}
              <span class="sep" aria-hidden="true"></span>
              <button @click=${() => this.scene?.zoomBy(1.18)} aria-label="Afastar" title="Afastar (−)">−</button>
              <button @click=${() => this.scene?.zoomBy(.85)} aria-label="Aproximar" title="Aproximar (+)">+</button>
            </div>` : z}` : z}
      ${r.length ? L`<p class="note bad">Em vermelho: peça que não cabe no gabinete. A parte hachurada é o que sobra.</p>` : L`<p class="note">${a ? "Arraste ou use as setas para girar. O que fica na frente da última peça escolhida aparece transparente." : "Modelos genéricos nas medidas de cada peça."}</p>`}
      ${o ? L`<details class="ports"><summary>Portas traseiras da placa-mãe</summary><ul id="ports">${o.map((e) => L`<li>${e}</li>`)}</ul></details>` : z}
      <div class="sr-only" aria-live="polite">${this._said}</div></div>`;
	}
	static styles = [dn, Me`
    :host { display: block; background: var(--mp-surface); border: 1px solid var(--mp-line); border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    h3 { margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px; }
    .tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--mp-muted); border: 1px solid var(--mp-border); border-radius: 4px; padding: 2px 5px; }
    .acts { display: flex; gap: 6px; }
    .acts button { min-width: 44px; height: 36px; border-radius: 4px; border: 1px solid var(--mp-border); background: var(--mp-pop); cursor: pointer; font-size: 13px; font-weight: 700; }
    .acts button:hover { background: var(--mp-hover); }
    .stage { position: relative; height: var(--mp-viewer-h, 260px); border-radius: 6px; overflow: hidden;
      background: radial-gradient(120% 90% at 50% 30%, var(--stage-a, #3b3b3b) 0%, var(--stage-b, #262626) 100%); }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
    canvas:focus-visible { outline: 3px solid var(--mp-focus); outline-offset: -3px; }
    .svgwrap { width: 100%; height: 100%; }
    /* Vistas e zoom: embaixo da prévia (não cobrem o PC). */
    .tools { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 6px; }
    .tools button { min-height: 32px; min-width: 32px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--mp-border);
      background: var(--mp-pop); color: var(--mp-text); font-size: 12px; font-weight: 700; cursor: pointer; }
    .tools button:hover { background: var(--mp-hover); }
    .tools button[aria-pressed=true] { background: var(--mp-accent); border-color: var(--mp-accent); color: #fff; }
    .tools .sep { flex: 1; }
    .ports { margin-top: 8px; font-size: 13px; }
    .ports summary { cursor: pointer; font-weight: 700; min-height: 32px; display: flex; align-items: center; }
    .ports ul { margin: 4px 0 0; padding-left: 18px; columns: 2; column-gap: 18px; }
    .ports li { margin: 2px 0; }
    /* Tela cheia: API do navegador (:fullscreen) ou painel fixo (.fallback). */
    /* !important: o site (ou o painel do celular) pode posicionar o host por fora; em tela cheia vale esta. */
    :host(:fullscreen), :host(.fallback) { margin: 0 !important; border-radius: 0 !important; padding: 14px !important; background: var(--mp-surface); box-shadow: none !important; }
    :host(.fallback) { position: fixed !important; inset: 0 !important; z-index: 2147483000 !important; overflow: auto; }
    :host(:fullscreen) .wrap, :host(.fallback) .wrap { display: flex; flex-direction: column; height: 100%; }
    :host(:fullscreen) .stage, :host(.fallback) .stage { flex: 1; height: auto; min-height: 320px; }
    :host(:fullscreen) .tools button, :host(.fallback) .tools button { min-height: 40px; min-width: 40px; font-size: 13px; }
    canvas:active { cursor: grabbing; }
    .overlay { position: absolute; inset: 0; pointer-events: none; }
    .overlay .dim { position: absolute; left: 0; top: 0; background: #e5484d; color: #fff; font-size: 12px; font-weight: 700;
      padding: 3px 7px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0, 0, 0, .4); }
    svg { width: 100%; height: 100%; display: block; }
    svg { color: var(--mp-muted); }
    svg .shell.ghost { stroke: var(--mp-muted); stroke-width: 3; stroke-dasharray: 10 8; opacity: .6; }
    svg .dimline { stroke: #ff8a8a; stroke-width: 3; }
    svg .dimtext { fill: #fff; font-size: 17px; font-weight: 700; paint-order: stroke; stroke: #7a1015; stroke-width: 5px; }
    .hint { position: absolute; margin: 0; font-size: 12px; color: var(--mp-muted); }
    .hint.center { inset: 0; display: grid; place-items: center; }
    .hint.corner { left: 10px; top: 8px; }
    .note { margin: 8px 0 0; font-size: 12px; color: var(--mp-muted); }
    .note.bad { color: var(--mp-danger-text); }
  `];
};
customElements.get("mp-pc-viewer") || customElements.define("mp-pc-viewer", xr);
// src/ui/monte-seu-pc.ts
var Sr = () => matchMedia("(prefers-reduced-motion: reduce)").matches, Cr = class extends V {
	static properties = {
		catalog: { type: String },
		catalogData: { attribute: !1 },
		syncUrl: {
			type: Boolean,
			attribute: "sync-url"
		},
		_eval: { state: !0 },
		_error: { state: !0 },
		_msg: { state: !0 },
		_copied: { state: !0 },
		_focus: { state: !0 },
		_sheet: { state: !0 }
	};
	_cat;
	constructor() {
		super(), this.syncUrl = !0, this._msg = "", this._copied = "", this._sheet = !1;
	}
	willUpdate(e) {
		e.has("catalogData") && this.catalogData ? this._useCatalog(this.catalogData) : e.has("catalog") && this.catalog && !this.catalogData && this._load(this.catalog);
	}
	async _load(e) {
		try {
			let t = await fetch(e);
			if (!t.ok) throw Error(`HTTP ${t.status}`);
			let n = await t.json(), r = new URL(e, location.href);
			for (let e of n.parts ?? []) typeof e.image == "string" && (e.image = new URL(e.image, r).href);
			this._useCatalog(n);
		} catch (e) {
			console.error("[monte-seu-pc] falha ao carregar catálogo", e), this._error = "Não foi possível carregar as peças. Tente recarregar a página.";
		}
	}
	_useCatalog(e) {
		let t = se(e);
		t.length ? (console.error("[monte-seu-pc] catálogo inválido", t), this._error = "O catálogo de peças está com problemas. Tente novamente mais tarde.") : (this._cat = e, this._set(this.syncUrl ? ne(new URL(location.href), e) : {}));
	}
	get evaluation() {
		return this._eval;
	}
	setBuild(e) {
		this._set(e);
	}
	_set(e) {
		this._cat && (this._eval = O(this._cat, e), this.syncUrl && history.replaceState(history.state, "", re(new URL(location.href), this._eval.build)), this.dispatchEvent(new CustomEvent("build-change", {
			detail: this._eval,
			bubbles: !0,
			composed: !0
		})));
	}
	_pick(e, t) {
		this._set({
			...this._eval.build,
			[e]: t
		}), this._focus = {
			slot: e,
			n: (this._focus?.n ?? 0) + 1
		};
		let n = this._eval, r = n.selected[e], i = n.issues.find((t) => C(t) && t.slots.includes(e));
		this._msg = `${w(e)}: ${r?.name ?? ""}. Total ${o(n.totals.pix)} no PIX.${i ? ` Atenção: ${i.message}.` : ""}`;
	}
	_remove(e) {
		let t = { ...this._eval.build };
		delete t[e], this._set(t), this._msg = `${w(e)} removido. Total ${o(this._eval.totals.pix)} no PIX.`;
	}
	_openPicker(e, t = !1) {
		this.renderRoot.querySelector("mp-picker-dialog")?.open(e, { onlyFits: t });
	}
	_openAlternatives(e) {
		this._openPicker(e, !0);
	}
	_pickerClosed(e) {
		this.renderRoot.querySelector(`mp-part-picker[data-slot="${e}"]`)?.focusTrigger();
	}
	_buy() {
		let e = this._eval;
		if (!e.canBuy) {
			this._msg = `Não é possível comprar ainda. ${e.blockers.join(". ")}.`;
			return;
		}
		let n = t.map((t) => e.selected[t.slot]).filter(Boolean);
		this.dispatchEvent(new CustomEvent("add-to-cart", {
			detail: {
				build: e.build,
				parts: n,
				totals: e.totals
			},
			bubbles: !0,
			composed: !0
		}));
	}
	async _share() {
		let e = re(new URL(location.href), this._eval.build).href;
		try {
			await navigator.clipboard.writeText(e), this._copied = "Link da configuração copiado.";
		} catch {
			this._copied = "Não foi possível copiar. Use o endereço da barra do navegador.";
		}
		setTimeout(() => this._copied = "", 3e3);
	}
	updated(e) {
		let t = e.get("_eval");
		t && t.totals.pix !== this._eval?.totals.pix && !Sr() && this.renderRoot.querySelectorAll(".big, .mtotal").forEach((e) => e.animate([{ transform: "scale(1.06)" }, { transform: "none" }], {
			duration: 220,
			easing: "cubic-bezier(.2,.8,.2,1)"
		}));
	}
	_slotIssues(e) {
		return this._eval.issues.filter((t) => t.slots.includes(e) && (t.code !== "power" || e === "psu"));
	}
	_power() {
		let { power: e, selected: t } = this._eval;
		if (!t.cpu && !t.gpu && !t.psu) return L`<p class="muted">Escolha processador e placa de vídeo para estimar o consumo.</p>`;
		let n = {
			ok: "Folga adequada",
			warn: "Pouca folga: considere uma fonte maior",
			block: "Fonte insuficiente: bloqueia a compra",
			none: ""
		}[e.level];
		return L`
      <p>Consumo estimado: <b>${e.needW}W</b> · Recomendado: <b>${e.recommendedW}W ou mais</b></p>
      ${e.psuW ? L`
        <p>Fonte escolhida: <b>${e.psuW}W</b> (${e.loadPct}% de carga)</p>
        <div class="bar ${e.level}" role="meter" aria-label="Carga da fonte" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(100, e.loadPct ?? 0)}>
          <i style="transform:scaleX(${Math.min(1, (e.loadPct ?? 0) / 100)})"></i></div>
        <p class="lvl ${e.level}">${n}</p>` : L`<p class="muted">Escolha uma fonte para comparar.</p>`}
      ${e.suggestion && e.suggestion.id !== t.psu?.id ? L`
        <button class="alt" @click=${() => this._pick("psu", e.suggestion.id)}>Trocar por ${e.suggestion.name} (${o(e.suggestion.pricePix)})</button>` : z}`;
	}
	_blockers() {
		let e = this._eval;
		if (e.canBuy) {
			let t = T(e);
			return t.warnings ? L`<p id="blk" class="ready warn">Completa e compatível, com ${t.warnings === 1 ? "1 aviso" : `${t.warnings} avisos`} abaixo (não impede a compra).</p>` : L`<p id="blk" class="ready">Configuração completa e compatível.</p>`;
		}
		let t = e.issues.filter(C).length;
		return L`<ul id="blk" class="blockers">${[...e.missingRequired.length ? [`Falta escolher: ${e.missingRequired.map(w).join(", ")}`] : [], ...t ? [`Resolva ${t === 1 ? "1 conflito" : `${t} conflitos`} abaixo para comprar`] : []].map((e) => L`<li>${e}</li>`)}</ul>`;
	}
	_conflicts() {
		let e = this._eval.issues;
		return e.length ? L`<div class="box conflicts">
      <h3>Conflitos e avisos</h3>
      <ul>${e.map((e) => L`<li class=${e.severity}>
        <p><span class="badge ${e.severity}">${on[e.severity]}</span> ${e.message}${e.deltaMm ? L` <b>(faltam ${e.deltaMm} mm)</b>` : z}</p>
        ${C(e) ? L`<div class="acts">${(e.code === "power" ? ["psu"] : e.slots).map((t) => L`<button class="alt" @click=${() => this._openAlternatives(t)}>${ln(t, e.severity)}</button>`)}</div>` : z}
      </li>`)}</ul>
    </div>` : z;
	}
	render() {
		if (this._error) return L`<p class="error" role="alert">${this._error}</p>`;
		let e = this._eval;
		if (!e) return L`<p class="muted" role="status">Carregando peças…</p>`;
		let { totals: n, doneCount: r, requiredCount: i } = e, a = t.find((t) => t.required && !e.slots[t.slot].selected)?.slot, s = T(e), c = s.level === "ready" ? Nt : Pt;
		return L`
      <div class="layout">
        <section class="config" aria-labelledby="h-cfg">
          <h2 id="h-cfg">Configuração</h2>
          <slot name="notice"></slot>
          <div class="list" @mp-open=${(e) => this._openPicker(e.detail.slot, e.detail.onlyFits)} @mp-remove=${(e) => this._remove(e.detail.slot)}>
            ${t.map((t) => L`<mp-part-picker data-slot=${t.slot} .slotId=${t.slot} .label=${t.label} ?required=${t.required} ?highlight=${t.slot === a}
              .options=${e.slots[t.slot].options} .selected=${e.slots[t.slot].selected} .issues=${this._slotIssues(t.slot)}></mp-part-picker>`)}
          </div>
        </section>

        <aside class="sum" aria-labelledby="h-sum">
          <div class="sh">
            <h2 id="h-sum">Resumo</h2>
            <button class="icon" @click=${this._share} aria-label="Copiar link desta configuração" title="Copiar link desta configuração">${It}</button>
          </div>
          <p class="copied" role="status">${this._copied}</p>
          <mp-pc-viewer id="viewer" class=${this._sheet ? "viewer sheet" : "viewer"} .evaluation=${e} .focusPart=${this._focus}></mp-pc-viewer>
          <div class="box totals">
            <div class="big price">${o(n.pix)}</div>
            <div class="lbl">No PIX com 15% de desconto</div>
            <div class="ou"><span>ou</span></div>
            <div class="card-total">${o(n.card)}</div>
            <div class="lbl">Em até ${n.installments}x de <b>${o(n.installment)}</b> sem juros no cartão</div>
          </div>
          <button class="buy" aria-disabled=${e.canBuy ? "false" : "true"} aria-describedby="blk" @click=${this._buy}>COMPRAR</button>
          ${this._blockers()}
          ${this._conflicts()}
          <div class="box">
            <h3><span class="st ${s.level}">${c}</span>Status do Build</h3>
            <p class="st-title ${s.level}">${s.title}</p>
            <div class="row"><span>${r} de ${i} componentes obrigatórios</span>
              <b class="st ${s.level}">${s.conflicts ? `${s.conflicts} ${s.conflicts === 1 ? "conflito" : "conflitos"}` : s.warnings ? `${s.warnings} ${s.warnings === 1 ? "aviso" : "avisos"}` : `${Math.round(r / i * 100)}%`}</b></div>
            <div class="bar ${s.level === "ready" ? "ok" : s.level === "blocked" ? "block" : s.level === "warning" ? "warn" : "prog"}" role="progressbar" aria-label="Componentes obrigatórios escolhidos"
              aria-valuemin="0" aria-valuemax=${i} aria-valuenow=${r} aria-valuetext=${`${r} de ${i}. ${s.title}`}><i style="transform:scaleX(${r / i})"></i></div>
          </div>
          <div class="box power"><h3>${Ft}Consumo de Energia</h3>${this._power()}</div>
        </aside>
      </div>

      <div class="mbar">
        <div><span class="mtotal price">${o(n.pix)}</span><small class="st ${s.level}">no PIX · ${s.summary}</small></div>
        <button class="see" aria-controls="viewer" aria-expanded=${this._sheet ? "true" : "false"} @click=${() => this._sheet = !this._sheet}>
          ${this._sheet ? "Fechar" : "Ver PC"}</button>
        <button class="buy" aria-disabled=${e.canBuy ? "false" : "true"} aria-describedby="blk" @click=${this._buy}>COMPRAR</button>
      </div>
      <mp-picker-dialog .evaluation=${e} @mp-pick=${(e) => this._pick(e.detail.slot, e.detail.id)}
        @mp-remove=${(e) => this._remove(e.detail.slot)} @mp-dialog-close=${(e) => this._pickerClosed(e.detail.slot)}></mp-picker-dialog>
      <div class="sr-only" aria-live="polite">${this._msg}</div>`;
	}
	static styles = [dn, Me`
    :host { display: block; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 395px; gap: 24px; align-items: start; }
    h2 { font-size: 22px; font-weight: 700; margin: 0 0 16px; }
    h3 { display: flex; align-items: center; gap: 10px; font-size: 16px; margin: 0 0 14px; }
    p { margin: 0 0 8px; font-size: 13px; line-height: 1.45; }
    .list { background: var(--mp-surface); border-radius: var(--mp-radius); padding: 14px; display: grid; gap: 14px; }
    .sh { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sh h2 { margin: 0; }
    .icon { width: 44px; height: 44px; display: grid; place-items: center; background: none; border: 0; border-radius: 50%; cursor: pointer; }
    .icon:hover { background: var(--mp-hover); }
    .copied { min-height: 18px; font-size: 12px; color: var(--mp-muted); margin: 0 0 6px; }
    .box { background: var(--mp-surface); border: 1px solid var(--mp-line); border-radius: 8px; padding: 18px 20px; margin-bottom: 16px; }
    .totals { text-align: center; padding: 22px; }
    .big { font-size: 30px; display: inline-block; }
    .lbl { font-size: 12px; margin: 6px 0 12px; }
    .totals .lbl:last-child { margin-bottom: 0; }
    .ou { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #222; margin: 4px 0 10px; }
    .ou::before, .ou::after { content: ""; flex: 1; height: 1px; background: var(--mp-border); }
    .ou span { width: 28px; height: 28px; border-radius: 50%; background: #ddd; display: grid; place-items: center; }
    .card-total { font-size: 18px; font-weight: 700; }
    .buy { width: 100%; height: 48px; border: 0; border-radius: 4px; background: var(--mp-buy); color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; }
    .buy[aria-disabled=true] { background: var(--mp-hover); color: var(--mp-muted); cursor: not-allowed; }
    .blockers { list-style: none; margin: 10px 0 16px; padding: 0; font-size: 13px; color: var(--mp-danger-text); display: grid; gap: 4px; }
    .blockers li::before { content: "• "; }
    .ready { color: var(--mp-price); margin: 10px 0 16px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; }
    .ok { color: var(--mp-price); }
    .pend { color: var(--mp-accent); display: grid; }
    .st { display: inline-grid; } h3 .st { display: grid; }
    .st.ready { color: var(--mp-price); } .st.warning { color: var(--mp-warn-text); } .st.blocked, .st.incomplete { color: var(--mp-danger-text); }
    .mbar small.st.ready { color: var(--mp-muted); }
    .st-title { font-weight: 700; margin: -6px 0 8px; }
    .st-title.ready { color: var(--mp-price); } .st-title.warning { color: var(--mp-warn-text); } .st-title.blocked, .st-title.incomplete { color: var(--mp-danger-text); }
    .ready.warn { color: var(--mp-warn-text); }
    h3 .ok { display: grid; }
    .bar { height: 6px; background: var(--mp-chip); border-radius: 3px; margin: 8px 0; overflow: hidden; }
    .bar i { display: block; height: 100%; background: var(--mp-accent); transform-origin: left; }
    .bar.ok i { background: var(--mp-price); }
    .bar.warn i { background: var(--mp-warn); }
    .bar.block i { background: var(--mp-danger); }
    .lvl { font-weight: 700; }
    .lvl.ok { color: var(--mp-price); } .lvl.warn { color: var(--mp-warn-text); } .lvl.block { color: var(--mp-danger-text); }
    .muted { color: var(--mp-muted); }
    .alt { background: none; border: 1px solid var(--mp-border); border-radius: 4px; padding: 8px 12px; min-height: 44px; font-size: 13px; cursor: pointer; text-align: left; width: 100%; margin-top: 6px; }
    .alt:hover { border-color: var(--mp-muted); background: var(--mp-hover); }
    .conflicts ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
    .conflicts li.nofit p, .conflicts li.power p, .conflicts li.incompatible p { color: var(--mp-danger-text); }
    .conflicts li.warning p { color: var(--mp-warn-text); }
    .acts { display: grid; gap: 6px; }
    .error { background: rgba(229, 72, 77, .18); border-radius: 4px; padding: 14px; }
    .mbar { display: none; }
    @media (min-width: 901px) and (min-height: 640px) {
      .sum { position: sticky; top: 20px; max-height: calc(100svh - 40px); overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .bar i { transition: transform .35s cubic-bezier(.2, .8, .2, 1), background-color .2s; }
      .buy, .alt, .icon { transition: background-color .15s, border-color .15s, transform .1s; }
      .buy:active, .alt:active { transform: scale(.98); }
    }
    @media (max-width: 900px) {
      :host { padding-bottom: 84px; }
      .layout { grid-template-columns: minmax(0, 1fr); }
      .mbar { display: flex; position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; gap: 12px; align-items: center; justify-content: space-between;
        padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: var(--mp-pop); border-top: 1px solid var(--mp-line); box-shadow: 0 -6px 18px var(--mp-shadow); }
      .mbar > div { display: flex; flex-direction: column; }
      .mtotal { font-size: 20px; display: inline-block; }
      .mbar small { font-size: 12px; color: var(--mp-muted); }
      .mbar .buy { width: auto; padding: 0 22px; }
      .mbar .see { margin-left: auto; height: 48px; padding: 0 14px; border-radius: 4px; border: 1px solid var(--mp-border); background: var(--mp-surface); font-weight: 700; cursor: pointer; }
      .viewer { display: none; }
      .viewer.sheet { display: block; position: fixed; z-index: 31; left: 8px; right: 8px; bottom: calc(76px + env(safe-area-inset-bottom));
        margin: 0; --mp-viewer-h: min(46vh, 360px); box-shadow: 0 -8px 28px var(--mp-shadow); }
    }
    @media (max-width: 560px) { .list { padding: 8px; gap: 10px; } }
  `];
};
customElements.get("monte-seu-pc") || customElements.define("monte-seu-pc", Cr);
export { m as BASE_W, n as BLOCKING, l as FORM_FACTOR_LABEL, i as MAX_INSTALLMENTS, g as MAX_LOAD, Cr as MonteSeuPc, r as PIX_DISCOUNT, pn as PartPicker, k as SHARE_PARAM, t as SLOTS, h as TARGET_LOAD, Se as applyFilters, o as brl, ne as buildFromUrl, T as buildStatus, s as cardFromPix, ve as choices, u as compatIssues, A as decodeBuild, te as encodeBuild, O as evaluate, Ce as facetCounts, he as filtersFor, p as fitIssues, be as isActive, C as isBlocking, D as issuesFor, _ as needW, b as powerIssues, y as powerReport, f as radiatorPlacement, _e as rangeBounds, v as recommendedW, E as resolve, w as slotLabel, Te as sortOptions, c as totals, re as urlWithBuild, se as validateCatalog, S as worst };
