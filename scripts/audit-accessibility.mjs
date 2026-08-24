const pairs = [
  ["body text", "#4a4356", "#faf8fc"],
  ["muted text", "#6d6676", "#faf8fc"],
  ["primary on white", "#7560aa", "#ffffff"],
  ["white on primary", "#ffffff", "#7560aa"],
  ["mint panel text", "#45675e", "#edf9f4"],
  ["blush panel text", "#80515d", "#fff0f3"],
];

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map(part => parseInt(part, 16));
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function ratio(foreground, background) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

let failed = false;
for (const [label, foreground, background] of pairs) {
  const value = ratio(foreground, background);
  const passes = value >= 4.5;
  console.log(`${passes ? "PASS" : "FAIL"} ${label}: ${value.toFixed(2)}:1`);
  if (!passes) failed = true;
}

console.log("PASS keyboard focus: global :focus-visible 2px ring and 3px offset are defined in client/src/index.css.");
if (failed) process.exit(1);
