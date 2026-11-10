/* CallNxt Verify: checks a phone number, @username, payment ID or website against a shop's official list.
   Runs in the visitor's browser; nothing they type is sent anywhere. */
(function () {
  "use strict";
  const ZW = /[​-‏⁠-⁤﻿­͏᠎]/g;
  const VS = /[︀-️⃣]/g;
  const CONF = {
    "Α":"A","Β":"B","Ε":"E","Ζ":"Z","Η":"H","Ι":"I","Κ":"K","Μ":"M","Ν":"N","Ο":"O","Ρ":"P","Τ":"T","Υ":"Y","Χ":"X",
    "Λ":"A","Σ":"E","Ξ":"E","Δ":"A","Π":"N","Ω":"O","α":"a","ε":"e","ι":"i","κ":"k","ο":"o","ρ":"p","τ":"t","υ":"u",
    "χ":"x","ν":"v","а":"a","в":"b","е":"e","к":"k","м":"m","н":"h","о":"o","р":"p","с":"c","т":"t","у":"y","х":"x",
    "і":"i","ј":"j","ѕ":"s","А":"A","В":"B","Е":"E","К":"K","М":"M","Н":"H","О":"O","Р":"P","С":"C","Т":"T","Х":"X"
  };
  const DIGIT_BASES = [0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66, 0x0660, 0x06F0];
  function mapChar(ch) {
    const cp = ch.codePointAt(0);
    for (const b of DIGIT_BASES) if (cp >= b && cp <= b + 9) return String(cp - b);
    for (const b of [0x2776, 0x2780, 0x278A]) if (cp >= b && cp <= b + 9) return String((cp - b + 1) % 10);
    if (cp >= 0x1F170 && cp <= 0x1F189) return String.fromCharCode(65 + cp - 0x1F170);
    if (cp >= 0x1F150 && cp <= 0x1F169) return String.fromCharCode(65 + cp - 0x1F150);
    return CONF[ch] ?? ch;
  }
  function decode(s) {
    const t = String(s).normalize("NFKC").replace(ZW, "").replace(VS, "");
    return Array.from(t).map(mapChar).join("").replace(/[♢◇◊○◯](?=[A-Za-z])/g, "O")
      .replace(/[░▒▓█▀▄■□▪▫◆◇♢♦•·．]+/g, " ").replace(/\s+/g, " ").trim();
  }

  const COUNTRIES = {
    IN: { cc: "91", name: "India", report: "If you paid, call 1930 or file at cybercrime.gov.in, and report the number on Sanchar Saathi (Chakshu)." },
    ID: { cc: "62", name: "Indonesia", report: "If you paid, report it to the police cyber unit at patrolisiber.id." },
    BR: { cc: "55", name: "Brazil", report: "If you paid, file a police report (boletim de ocorrência) at your state's Delegacia Virtual." },
    NG: { cc: "234", name: "Nigeria", report: "If you paid, report it to the EFCC or your local police cybercrime unit." },
    PH: { cc: "63", name: "Philippines", report: "If you paid, call the CICC hotline 1326." },
    PK: { cc: "92", name: "Pakistan", report: "If you paid, report it to the FIA Cybercrime Wing." },
    AE: { cc: "971", name: "UAE", report: "If you paid, report it on the police eCrime platform for your emirate." },
    US: { cc: "1", name: "United States", report: "If you paid, report it at reportfraud.ftc.gov." },
    XX: { cc: "", name: "", report: "If you paid, report it to your national police cyber unit or fraud helpline." }
  };

  const digitsOnly = (s) => String(s).replace(/\D/g, "");
  function fullNumber(raw, cc) {
    const plus = /^\s*\+/.test(raw);
    const d = digitsOnly(raw);
    if (plus || !cc) return d;
    if (d.startsWith(cc) && d.length >= cc.length + 8) return d;
    return cc + d.replace(/^0+/, "");
  }
  const sameNumber = (a, b) => a.length >= 8 && b.length >= 8 && a.slice(-9) === b.slice(-9);
  function lev(a, b) {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let p = d[0]; d[0] = i;
      for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; }
    }
    return d[b.length];
  }
  const core = (h) => h.toLowerCase().replace(/^@/, "")
    .replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s").replace(/rn/g, "m").replace(/vv/g, "w")
    .replace(/official|oficial|original|real|store|shop|india|orders?|online|backup|new|demo/g, "").replace(/[^a-z]/g, "");
  function looksLike(a, b) {
    const x = core(a), y = core(b);
    if (x.length < 3 || y.length < 3) return false;
    return lev(x, y) <= 2 || (y.length >= 5 && x.includes(y)) || (x.length >= 5 && y.includes(x));
  }
  const host = (u) => u.toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");

  /* What did the buyer paste? */
  function classify(raw) {
    const text = decode(raw).trim();
    const low = text.toLowerCase();
    const ig = low.match(/instagram\.com\/([a-z0-9._]{1,30})/);
    if (ig) return { kind: "handle", value: ig[1] };
    if (/^@?[a-z0-9._]{2,30}$/i.test(text) && /[a-z]/i.test(text) && !/^\d/.test(text) && !/\.(com|in|net|org|co|br|id|ph|ng|pk|ae|shop|store)$/i.test(text)) {
      return { kind: "handle", value: low.replace(/^@/, "") };
    }
    const pay = low.match(/[a-z0-9._-]{2,}@[a-z][a-z0-9.-]{1,}/);
    if (pay) return { kind: "payment", value: pay[0] };
    const url = low.match(/(https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,12}\b(\/\S*)?)/);
    if (url && /[a-z]/.test(url[0]) && !/^\+?[\d\s().-]+$/.test(text)) return { kind: "site", value: host(url[0]) };
    const d = digitsOnly(text);
    if (d.length >= 8 && d.length <= 15) return { kind: "phone", value: text };
    if (/[a-z0-9]{4,}/i.test(text)) return { kind: "payment", value: low };
    return { kind: "unknown", value: text };
  }

  /* Check one input against one shop. status: official | copycat | notlisted | unknown */
  function checkShop(raw, shop) {
    const c = classify(raw);
    const cc = (COUNTRIES[shop.country] || COUNTRIES.XX).cc;
    if (c.kind === "phone") {
      const n = fullNumber(c.value, cc);
      const hit = shop.phones.find((p) => sameNumber(fullNumber(p, cc), n));
      return hit ? { status: "official", kind: c.kind, value: c.value, match: hit } : { status: "notlisted", kind: c.kind, value: c.value };
    }
    if (c.kind === "handle") {
      const hit = shop.handles.find((h) => h.toLowerCase() === c.value);
      if (hit) return { status: "official", kind: c.kind, value: "@" + c.value, match: "@" + hit };
      const like = shop.handles.find((h) => looksLike(c.value, h));
      return like ? { status: "copycat", kind: c.kind, value: "@" + c.value, match: "@" + like } : { status: "notlisted", kind: c.kind, value: "@" + c.value };
    }
    if (c.kind === "site") {
      const hit = (shop.sites || []).find((s) => c.value === host(s) || c.value.endsWith("." + host(s)));
      if (hit) return { status: "official", kind: c.kind, value: c.value, match: hit };
      const like = (shop.sites || []).find((s) => looksLike(c.value.split(".")[0], host(s).split(".")[0]));
      return like ? { status: "copycat", kind: c.kind, value: c.value, match: like } : { status: "notlisted", kind: c.kind, value: c.value };
    }
    if (c.kind === "payment") {
      const hit = (shop.payments || []).find((p) => p.toLowerCase() === c.value);
      return hit ? { status: "official", kind: c.kind, value: c.value, match: hit } : { status: "notlisted", kind: c.kind, value: c.value };
    }
    return { status: "unknown", kind: c.kind, value: c.value };
  }

  const KIND = { phone: "phone / WhatsApp number", handle: "Instagram account", site: "website", payment: "payment ID", unknown: "detail" };
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const waLink = (shop, text) => {
    const n = shop.phones[0] ? fullNumber(shop.phones[0], (COUNTRIES[shop.country] || COUNTRIES.XX).cc) : "";
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : "";
  };

  function resultHTML(r, shop) {
    const report = (COUNTRIES[shop.country] || COUNTRIES.XX).report;
    if (r.status === "official") {
      return `<div class="result ok" role="status"><div class="icon">✓</div><div>
        <h3>Yes, this is ${esc(shop.name)}'s official ${KIND[r.kind]}</h3>
        <p><b>${esc(r.value)}</b> matches the shop's own list (${esc(r.match)}).</p>
        <p class="small">Still careful: only pay through details the shop gives you in its own chat or website.</p></div></div>`;
    }
    if (r.status === "unknown") {
      return `<div class="result warn" role="status"><div class="icon">?</div><div>
        <h3>We couldn't read that</h3><p>Paste exactly what you were sent: a phone number, an @username, a payment ID (like name@upi) or a website.</p></div></div>`;
    }
    const tell = waLink(shop, `Hi ${shop.name}, someone contacted me claiming to be you: ${r.value}`);
    const head = r.status === "copycat"
      ? `Not official. This looks like a copy of ${esc(r.match)}`
      : `Not on ${esc(shop.name)}'s official list`;
    return `<div class="result bad" role="status"><div class="icon">!</div><div>
      <h3>${head}</h3>
      <p><b>${esc(r.value)}</b> is not one of the ${KIND[r.kind]}s this shop has listed. <b>Don't send money to it.</b></p>
      <ul class="next">
        ${tell ? `<li><a href="${tell}" target="_blank" rel="noopener">Tell ${esc(shop.name)} on their official WhatsApp</a></li>` : ""}
        <li>Report the account or number in Instagram and WhatsApp.</li>
        <li>${esc(report)}</li>
      </ul></div></div>`;
  }

  window.CnxVerify = { decode, classify, checkShop, resultHTML, COUNTRIES, fullNumber, looksLike, esc, KIND };
})();
