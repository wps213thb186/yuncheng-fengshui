/* 运乘风水 · 八宅引擎（浏览器/Node 通用，不操作 DOM）
 * 与 Python 引擎 engine.py 同源：64 组门宫判定逐项对账（selfCheck）。
 * 规则来源：《阳宅爱众篇》（清·张觉正）数字化 + 师承口径（老唐版），yingxiang.level 分级标注。
 */
(function(root){
const DYN = {"乾":{"乾":"伏位","坎":"六煞","艮":"天医","震":"五鬼","巽":"祸害","离":"绝命","坤":"延年","兑":"生气"},"坎":{"坎":"伏位","艮":"五鬼","震":"天医","巽":"生气","离":"延年","坤":"绝命","兑":"祸害","乾":"六煞"},"艮":{"艮":"伏位","震":"六煞","巽":"绝命","离":"祸害","坤":"生气","兑":"延年","乾":"天医","坎":"五鬼"},"震":{"震":"伏位","巽":"延年","离":"生气","坤":"祸害","兑":"绝命","乾":"五鬼","坎":"天医","艮":"六煞"},"巽":{"巽":"伏位","离":"天医","坤":"五鬼","兑":"六煞","乾":"祸害","坎":"生气","艮":"绝命","震":"延年"},"离":{"离":"伏位","坤":"六煞","兑":"五鬼","乾":"绝命","坎":"延年","艮":"祸害","震":"生气","巽":"天医"},"坤":{"坤":"伏位","兑":"天医","乾":"延年","坎":"绝命","艮":"生气","震":"祸害","巽":"五鬼","离":"六煞"},"兑":{"兑":"伏位","乾":"生气","坎":"祸害","艮":"延年","震":"绝命","巽":"六煞","离":"五鬼","坤":"天医"}};
const EXP = {"乾":{"乾":{"star":"伏位","base":"次凶","rel":"宫克星"},"坎":{"star":"六煞","base":"大凶","rel":"比和"},"艮":{"star":"天医","base":"大吉","rel":"比和"},"震":{"star":"五鬼","base":"大凶","rel":"宫生星"},"巽":{"star":"祸害","base":"次凶","rel":"宫克星"},"离":{"star":"绝命","base":"次凶","rel":"宫克星"},"坤":{"star":"延年","base":"大吉","rel":"宫生星"},"兑":{"star":"生气","base":"中吉(吉星失位)","rel":"宫克星"}},"坎":{"坎":{"star":"伏位","base":"大凶","rel":"宫生星"},"艮":{"star":"五鬼","base":"大凶","rel":"星生宫"},"震":{"star":"天医","base":"中吉(吉星失位)","rel":"宫克星"},"巽":{"star":"生气","base":"大吉","rel":"比和"},"离":{"star":"延年","base":"中吉(吉星失位)","rel":"宫克星"},"坤":{"star":"绝命","base":"大凶","rel":"宫生星"},"兑":{"star":"祸害","base":"大凶","rel":"星生宫"},"乾":{"star":"六煞","base":"大凶","rel":"宫生星"}},"艮":{"艮":{"star":"伏位","base":"次凶","rel":"星克宫"},"震":{"star":"六煞","base":"大凶","rel":"星生宫"},"巽":{"star":"绝命","base":"次凶","rel":"星克宫"},"离":{"star":"祸害","base":"大凶","rel":"宫生星"},"坤":{"star":"生气","base":"中吉(吉星失位)","rel":"星克宫"},"兑":{"star":"延年","base":"大吉","rel":"比和"},"乾":{"star":"天医","base":"大吉","rel":"星生宫"},"坎":{"star":"五鬼","base":"次凶","rel":"宫克星"}},"震":{"震":{"star":"伏位","base":"大凶","rel":"比和"},"巽":{"star":"延年","base":"中吉(吉星失位)","rel":"星克宫"},"离":{"star":"生气","base":"大吉","rel":"星生宫"},"坤":{"star":"祸害","base":"大凶","rel":"比和"},"兑":{"star":"绝命","base":"大凶","rel":"比和"},"乾":{"star":"五鬼","base":"次凶","rel":"星克宫"},"坎":{"star":"天医","base":"中吉(吉星失位)","rel":"星克宫"},"艮":{"star":"六煞","base":"次凶","rel":"宫克星"}},"巽":{"巽":{"star":"伏位","base":"大凶","rel":"比和"},"离":{"star":"天医","base":"大吉","rel":"宫生星"},"坤":{"star":"五鬼","base":"大凶","rel":"星生宫"},"兑":{"star":"六煞","base":"大凶","rel":"宫生星"},"乾":{"star":"祸害","base":"大凶","rel":"星生宫"},"坎":{"star":"生气","base":"大吉","rel":"宫生星"},"艮":{"star":"绝命","base":"大凶","rel":"宫生星"},"震":{"star":"延年","base":"中吉(吉星失位)","rel":"星克宫"}},"离":{"离":{"star":"伏位","base":"大凶","rel":"星生宫"},"坤":{"star":"六煞","base":"次凶","rel":"宫克星"},"兑":{"star":"五鬼","base":"次凶","rel":"星克宫"},"乾":{"star":"绝命","base":"大凶","rel":"比和"},"坎":{"star":"延年","base":"大吉","rel":"星生宫"},"艮":{"star":"祸害","base":"大凶","rel":"比和"},"震":{"star":"生气","base":"大吉","rel":"比和"},"巽":{"star":"天医","base":"中吉(吉星失位)","rel":"宫克星"}},"坤":{"坤":{"star":"伏位","base":"次凶","rel":"星克宫"},"兑":{"star":"天医","base":"大吉","rel":"星生宫"},"乾":{"star":"延年","base":"大吉","rel":"比和"},"坎":{"star":"绝命","base":"大凶","rel":"星生宫"},"艮":{"star":"生气","base":"中吉(吉星失位)","rel":"星克宫"},"震":{"star":"祸害","base":"次凶","rel":"宫克星"},"巽":{"star":"五鬼","base":"大凶","rel":"宫生星"},"离":{"star":"六煞","base":"次凶","rel":"星克宫"}},"兑":{"兑":{"star":"伏位","base":"次凶","rel":"宫克星"},"乾":{"star":"生气","base":"中吉(吉星失位)","rel":"宫克星"},"坎":{"star":"祸害","base":"次凶","rel":"星克宫"},"艮":{"star":"延年","base":"大吉","rel":"宫生星"},"震":{"star":"绝命","base":"次凶","rel":"星克宫"},"巽":{"star":"六煞","base":"大凶","rel":"星生宫"},"离":{"star":"五鬼","base":"大凶","rel":"比和"},"坤":{"star":"天医","base":"大吉","rel":"比和"}}};
const SE = {"生气":"木","天医":"土","延年":"金","绝命":"金","五鬼":"火","六煞":"水","祸害":"土","伏位":"木"};
const PE = {"乾":"金","兑":"金","坤":"土","艮":"土","震":"木","巽":"木","离":"火","坎":"水","中":"土"};
const JX = {"生气":"吉","天医":"吉","延年":"吉","伏位":"小凶","绝命":"大凶","五鬼":"大凶","六煞":"次凶","祸害":"次凶"};
const STARMING = {"生气":"贪狼木","天医":"巨门土","延年":"武曲金","绝命":"破军金","五鬼":"廉贞火","六煞":"文曲水","祸害":"禄存土","伏位":"辅弼木"};
const YX = {
"生气":{"star":"贪狼木","level":"原书明文","吉":"上吉","应象":"主发丁财、人丁兴旺（子息歌：贪生五子）；星宫生比时福禄增（八星吉凶总要：临宫得位福禄增）","应期":"亥卯未（木局）年月"},
"天医":{"star":"巨门土","level":"原书明文","吉":"次吉","应象":"主康健福寿（星宫生克论示例：天医宜高大主大发福寿）；子息歌：巨三郎","应期":"土神之年（土无三合局，细则存疑）"},
"延年":{"star":"武曲金","level":"原书明文","吉":"次吉","应象":"主丁财两旺、富贵双全、夫妻和合（星宫生克论：延年得位主向为妙，丁财两旺富贵双全）","应期":"巳酉丑（金局）年月"},
"伏位":{"star":"左辅/右弼","level":"原书明文+演绎","吉":"辅弼小凶/无定","应象":"左辅阴木次凶；右弼所属无定，休咎随向星（原书：惟有右弼无生克，休咎翻随向星云）。门宫伏位本身主安稳（演绎）","应期":"亥卯未（辅弼木合局论）"},
"五鬼":{"star":"廉贞火","level":"原书明文+师承","吉":"大凶","应象":"主口舌争讼、火惊之患（原书：火性本烈况居离宫祸孽安得不生）；窝气时主瘫痪、火灾、伤灾手术，久窝（两年以上）易出重症（师承·老唐版）","应期":"寅午戌（火局）年月"},
"六煞":{"star":"文曲水","level":"原书明文+师承","吉":"次凶","应象":"主淫荡流荡、浮华不实（原书星宫生克论：震巽逢文曲多浮华不实，水泛木浮；乾兑逢文曲主游荡、阴旺阳衰叠产群女生男不育）","应期":"申子辰（水局）年月"},
"祸害":{"star":"禄存土","level":"原书明文+师承","吉":"次凶","应象":"主伤病、子息难盛（子息歌：禄存高大了难盛/他本：禄存无子人延寿）；临震宫长男泄气，或伤脾胃或患疮疾疯呆（原书断静宅要诀）","应期":"土神之年（同天医）"},
"绝命":{"star":"破军金","level":"原书明文","吉":"大凶","应象":"主绝败、孤寡、伤丁（子息歌：破军绝败守孤寡）；星宫相克时次凶，得位发凶更速","应期":"巳酉丑（金局）年月"}};
const HUAJIE = {"打洞泄煞":"打洞两指宽、从内向外出，泄煞通气为上端","白矾":"白矾收气，下于酉亥位；吉星宫位莫沾矾","盐":"小窝用盐通气场","灶背":"灶座背后实墙填"};
const IRON = "吉方宜动宜通宜开门，凶方宜静宜闭宜整洁少动——但静≠窝：凶位可储物（须留泄口），不可完全封死无泄";
const ZONGJUE = "气贵流通忌直穿，曲中有情聚为先；尽头无泄名窝气，久窝成病两年验；多转停驻是死气，重症沉疴宫上断；背后来风冲坐卧，小人算计防暗箭；白矾收气酉亥下，吉星宫位矾莫沾；打洞两指从内出，泄煞通气是上端；小窝用盐通气场，灶座背后实墙填；吉方流通凶方静，藏风聚气福自绵。";
const DOORS = ["乾","坎","艮","震","巽","离","坤","兑"];
const DONG = {"坎":1,"离":1,"震":1,"巽":1};
const DIRNAME = {"乾":"西北","坎":"正北","艮":"东北","震":"正东","巽":"东南","离":"正南","坤":"西南","兑":"正西"};
const SHENG = new Set(["金水","水木","木火","火土","土金"]);
const KE = new Set(["金木","木土","土水","水火","火金"]);

function relation(s,g){
  const se=SE[s]||"木", ge=PE[g];
  if(se===ge) return ["比和", s+"("+se+")与"+g+"宫("+ge+")同五行"];
  if(SHENG.has(se+ge)) return ["星生宫", s+"("+se+")生"+g+"宫("+ge+")"];
  if(SHENG.has(ge+se)) return ["宫生星", g+"宫("+ge+")生"+s+"("+se+")"];
  if(KE.has(se+ge)) return ["星克宫", s+"("+se+")克"+g+"宫("+ge+")"];
  return ["宫克星", g+"宫("+ge+")克"+s+"("+se+")"];
}
function judge(door,gong){
  const star = DYN[door][gong];
  const rel2 = relation(star,gong), rel=rel2[0], desc=rel2[1];
  const sj = JX[star];
  const shengbi = (rel==="比和"||rel==="星生宫"||rel==="宫生星");
  let base;
  if(sj==="吉") base = shengbi?"大吉":"中吉(吉星失位)";
  else base = shengbi?"大凶":"次凶";
  const cross = (!!DONG[door]) !== (!!DONG[gong]);
  let note="";
  if(cross && sj==="吉" && shengbi) note="门宫异组（东西相犯）：吉星生比降为不吉（星宫生克论）";
  if((star==="六煞"&&gong==="坎")||(star==="五鬼"&&gong==="离")) note="门宫异组特例：星宫比和反主大凶（水性荡居坎/火性烈居离）";
  if(star==="生气"&&(gong==="乾"||gong==="兑")) note="贪狼入乾兑，木受金克，吉星亦主多灾";
  return {door:door,gong:gong,star:star,rel:rel,desc:desc,base:base,cross:cross,note:note};
}
function selfCheck(){
  const bad=[];
  for(const d of DOORS) for(const g of DOORS){
    const j=judge(d,g), e=EXP[d][g];
    if(j.star!==e.star||j.base!==e.base||j.rel!==e.rel) bad.push(d+g);
  }
  return {total:64, bad:bad, pass:bad.length===0};
}
function mingGua(year,gender){
  const yy=year%100; let n;
  if(year<2000){ n = gender==="男" ? (100-yy)%9 : ((yy-4)%9+9)%9; }
  else { n = gender==="男" ? ((99-yy)%9+9)%9 : (yy+6)%9; }
  if(n===0)n=9;
  const map={1:"坎",2:"坤",3:"震",4:"巽",5:(gender==="男"?"坤":"艮"),6:"乾",7:"兑",8:"艮",9:"离"};
  const g = map[n];
  return {n:n, gua:g, group: DONG[g]?"东四命":"西四命"};
}
function doorSummary(door){
  const items = DOORS.map(function(g){ return judge(door,g); });
  const ji = items.filter(function(j){return j.base==="大吉";}).length;
  const zhongji = items.filter(function(j){return j.base.indexOf("中吉")===0;}).length;
  const daxiong = items.filter(function(j){return j.base==="大凶";}).length;
  return {door:door, group: DONG[door]?"东四宅":"西四宅", items:items, ji:ji, zhongji:zhongji, daxiong:daxiong};
}
function compareDoors(){
  return DOORS.map(function(d){ return doorSummary(d); })
    .sort(function(a,b){ return (b.ji-a.ji)||(b.zhongji-a.zhongji)||(a.daxiong-b.daxiong); });
}
root.YC_ENG = {DYN:DYN,DOORS:DOORS,DONG:DONG,DIRNAME:DIRNAME,SE:SE,PE:PE,JX:JX,STARMING:STARMING,YX:YX,HUAJIE:HUAJIE,IRON:IRON,ZONGJUE:ZONGJUE,
  relation:relation,judge:judge,selfCheck:selfCheck,mingGua:mingGua,doorSummary:doorSummary,compareDoors:compareDoors};
})(typeof window!=="undefined"?window:globalThis);
