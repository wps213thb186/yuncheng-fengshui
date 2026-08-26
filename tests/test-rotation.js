/* P0-2 落宫旋转一致性 ground truth（Node 直跑：node tests/test-rotation.js）
 * 验收口径（审计 P0-2）：同一户型按 0°/90°/180°/270° 旋转出图后，
 * 各房间经 north_dir 校准的最终落宫必须一致。 */
"use strict";
require("../assets/js/store.js");
const YC = globalThis.YC;

let failed = 0;
function eq(actual, expect, msg){
  const a = JSON.stringify(actual), e = JSON.stringify(expect);
  if(a === e){ console.log("PASS " + msg); }
  else { failed++; console.log("FAIL " + msg + "  expect=" + e + " actual=" + a); }
}

/* 北向基准户型：8 个房间各占一宫（外接矩形 [100,100,900,900]） */
const BASE = [
  { name: "坎", box: [450, 100, 550, 200] },
  { name: "艮", box: [750, 100, 850, 200] },
  { name: "震", box: [750, 450, 850, 550] },
  { name: "巽", box: [750, 750, 850, 850] },
  { name: "离", box: [450, 750, 550, 850] },
  { name: "坤", box: [150, 750, 250, 850] },
  { name: "兑", box: [150, 450, 250, 550] },
  { name: "乾", box: [150, 100, 250, 200] },
];
const INV = { n: "n", e: "w", s: "s", w: "e" }; // 生成模拟图：把北向坐标逆向转回图面

/* 1. 旋转还原往返一致 */
for(const o of ["n", "e", "s", "w"]){
  for(const r of BASE){
    const img = YC.rotateBoxToNorth(r.box, INV[o]);
    const back = YC.rotateBoxToNorth(img, o);
    eq(back, r.box, "round-trip " + o + " " + r.name);
  }
}

/* 2. 四种出图方向下，各房间最终落宫与基准一致 */
for(const o of ["n", "e", "s", "w"]){
  const imgRooms = BASE.map(r => ({ name: r.name, box: YC.rotateBoxToNorth(r.box, INV[o]) }));
  const northRooms = imgRooms.map(r => ({ name: r.name, box: YC.rotateBoxToNorth(r.box, o) }));
  const house = YC.houseBoxOf(northRooms);
  for(let i = 0; i < BASE.length; i++){
    const g = YC.roomGongNorth(imgRooms[i].box, house, o);
    eq(g, BASE[i].name, "落宫 north_dir=" + o + " 房间=" + BASE[i].name);
  }
}

/* 3. 方向未知（unknown / 对角方位）不输出确定落宫 */
eq(YC.roomGongNorth([450,100,550,200], [100,100,900,900], "unknown"), null, "unknown 不落宫");
eq(YC.roomGongNorth([450,100,550,200], [100,100,900,900], "ne"), null, "ne 暂不落宫");
eq(YC.northDirValid("n"), true, "northDirValid n");
eq(YC.northDirValid("unknown"), false, "northDirValid unknown");

console.log(failed ? ("FAILED: " + failed) : "ALL PASS (44)");
process.exit(failed ? 1 : 0);
