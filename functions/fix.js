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
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

module.exports = { fixMoney, fixCurrency, fixTime };
