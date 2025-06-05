function fixMoney(num, asCurrency = false) {
  if (typeof num === "number" && !isFinite(num)) {
    return 0;
  }
  const n = typeof num === "string" ? parseFloat(num) : num;
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  if (asCurrency) {
    return `$${rounded.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
  }
  return rounded;
}

function fixCurrency(num) {
  if (typeof num === "number" && !isFinite(num)) {
    return "$0.00";
  }
  const n = typeof num === "string" ? parseFloat(num) : num;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fixTime(seconds) {
  if (!seconds) return undefined;
  const d = Math.floor(seconds / 86400);
  const rs = seconds % 86400;
  const h = Math.floor(rs / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((rs % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(rs % 60)
    .toString()
    .padStart(2, "0");

  if (d > 0) {
    const dt = d === 1 ? "day" : "days";
    return `${d} ${dt}, ${h}:${m}:${s}`;
  }

  return `${h}:${m}:${s}`;
}

module.exports = { fixMoney, fixCurrency, fixTime };
