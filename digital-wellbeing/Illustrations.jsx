// Illustrations.jsx — Animated scene illustrations for each world

// ── INTRO — Phone in dark room ────────────────────────────────────────────────
function IllustrationIntro() {
  return (
    <svg viewBox="0 0 200 200" className="il il--intro" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="il-phone-glow" cx="50%" cy="55%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* Ambient aura */}
      <ellipse cx="100" cy="108" rx="52" ry="68" fill="url(#il-phone-glow)" className="il-aura"/>
      {/* Phone shadow */}
      <ellipse cx="100" cy="175" rx="32" ry="6" fill="rgba(0,0,0,0.4)"/>
      {/* Phone body */}
      <rect x="66" y="38" width="68" height="120" rx="10" fill="rgba(10,5,22,0.97)" stroke="rgba(124,58,237,0.55)" strokeWidth="1.5"/>
      {/* Notch */}
      <rect x="88" y="42" width="24" height="5" rx="2.5" fill="rgba(0,0,0,0.8)"/>
      {/* Screen */}
      <rect x="70" y="50" width="60" height="95" rx="3" fill="rgba(50,18,120,0.18)" className="il-screen"/>
      {/* Time */}
      <text x="100" y="76" textAnchor="middle" fill="rgba(210,190,255,0.85)" fontSize="13" fontFamily="monospace" fontWeight="bold">22:47</text>
      {/* Screen time */}
      <text x="100" y="88" textAnchor="middle" fill="rgba(150,120,220,0.5)" fontSize="5.5" fontFamily="monospace" letterSpacing="1">SCREEN TIME</text>
      <text x="100" y="100" textAnchor="middle" fill="rgba(190,160,255,0.75)" fontSize="11" fontFamily="monospace">7h 03m</text>
      {/* Notification lines */}
      <rect x="78" y="112" width="44" height="3" rx="1.5" fill="rgba(200,180,255,0.45)"/>
      <rect x="78" y="119" width="34" height="3" rx="1.5" fill="rgba(200,180,255,0.28)"/>
      <rect x="78" y="126" width="38" height="3" rx="1.5" fill="rgba(200,180,255,0.28)"/>
      <rect x="78" y="133" width="28" height="3" rx="1.5" fill="rgba(200,180,255,0.18)"/>
      {/* Home bar */}
      <rect x="84" y="154" width="32" height="2.5" rx="1.25" fill="rgba(255,255,255,0.18)"/>
      {/* Badge */}
      <circle cx="134" cy="45" r="10" fill="#dc2626" className="il-badge"/>
      <text x="134" y="49" textAnchor="middle" fill="white" fontSize="7.5" fontFamily="monospace" fontWeight="bold">47</text>
      {/* Bedside line */}
      <line x1="20" y1="173" x2="180" y2="173" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
    </svg>
  );
}

// ── SWAMP — Algorithm Eye in the forest ──────────────────────────────────────
function IllustrationSwamp() {
  const treeData = [10,42,76,112,148,184,222,258,292];
  const heights  = [90,120,75,105,135,80,115,95,110];
  return (
    <svg viewBox="0 0 310 185" className="il il--swamp" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="il-eye-grd" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* Fog base */}
      <ellipse cx="155" cy="168" rx="190" ry="32" fill="rgba(18,55,22,0.5)" className="il-fog"/>
      <ellipse cx="155" cy="158" rx="160" ry="22" fill="rgba(14,44,18,0.4)" className="il-fog2"/>
      {/* Trees */}
      {treeData.map((x, i) => {
        const h = heights[i];
        const w = 10 + (i % 3) * 4;
        return (
          <g key={i}>
            <rect x={x - w/2} y={168 - h} width={w} height={h} rx="3" fill={`rgba(4,${12+i%4*3},6,0.96)`}/>
            <polygon
              points={`${x},${162-h} ${x-14},${168-h+16} ${x+14},${168-h+16}`}
              fill={`rgba(6,${18+i%3*5},8,0.95)`}
            />
          </g>
        );
      })}
      {/* Eye glow halo */}
      <ellipse cx="155" cy="88" rx="36" ry="22" fill="url(#il-eye-grd)" className="il-eye-halo"/>
      {/* Eye whites */}
      <ellipse cx="155" cy="88" rx="28" ry="17" fill="rgba(2,10,4,0.97)" stroke="rgba(34,197,94,0.55)" strokeWidth="1.5"/>
      {/* Iris */}
      <circle cx="155" cy="88" r="11" fill="rgba(34,197,94,0.22)" className="il-iris"/>
      {/* Pupil */}
      <circle cx="155" cy="88" r="5" fill="rgba(34,197,94,0.9)" className="il-pupil"/>
      {/* Iris lines */}
      {[0,45,90,135,180,225,270,315].map(deg => (
        <line key={deg}
          x1={155 + Math.cos(deg*Math.PI/180)*6} y1={88 + Math.sin(deg*Math.PI/180)*6}
          x2={155 + Math.cos(deg*Math.PI/180)*13} y2={88 + Math.sin(deg*Math.PI/180)*13}
          stroke="rgba(34,197,94,0.35)" strokeWidth="0.8"/>
      ))}
      {/* Floating particles */}
      {[30,70,110,150,195,240,280].map((x,i) => (
        <circle key={i} cx={x} cy={22 + (i%4)*20} r="2.2"
          fill="rgba(34,197,94,0.6)"
          className={`il-pt il-pt--${i%3}`}/>
      ))}
    </svg>
  );
}

// ── ARCADE — Neon grid + machines ────────────────────────────────────────────
function IllustrationArcade() {
  const winLights = [1,0,1,1,0,1,0,1,1,0,1,0];
  return (
    <svg viewBox="0 0 310 185" className="il il--arcade" xmlns="http://www.w3.org/2000/svg">
      {/* Perspective grid floor */}
      {[0,1,2,3,4].map(i => (
        <line key={`h${i}`}
          x1={155 - 155*(0.25+i*0.19)} y1={95+i*20}
          x2={155 + 155*(0.25+i*0.19)} y2={95+i*20}
          stroke={`rgba(168,85,247,${0.1+i*0.04})`} strokeWidth="0.8"/>
      ))}
      {[-4,-3,-2,-1,0,1,2,3,4].map(i => (
        <line key={`v${i}`} x1={155} y1={95} x2={155+i*38} y2={185}
          stroke="rgba(168,85,247,0.12)" strokeWidth="0.6"/>
      ))}
      {/* Left cabinet */}
      <rect x="18" y="22" width="72" height="108" rx="6" fill="rgba(35,0,70,0.97)" stroke="rgba(168,85,247,0.65)" strokeWidth="1.5"/>
      <rect x="25" y="34" width="58" height="44" rx="3" fill="rgba(168,85,247,0.1)" className="il-scr1"/>
      <text x="54" y="62" textAnchor="middle" fontSize="22" className="il-reel1">📱</text>
      <rect x="28" y="86" width="52" height="2" rx="1" fill="rgba(168,85,247,0.25)"/>
      <circle cx="54" cy="100" r="7" fill="rgba(168,85,247,0.35)" stroke="rgba(168,85,247,0.6)" strokeWidth="1.2"/>
      <rect x="36" y="112" width="36" height="10" rx="3" fill="rgba(168,85,247,0.2)"/>
      {/* Right cabinet */}
      <rect x="222" y="22" width="72" height="108" rx="6" fill="rgba(35,0,55,0.97)" stroke="rgba(251,146,60,0.65)" strokeWidth="1.5"/>
      <rect x="229" y="34" width="58" height="44" rx="3" fill="rgba(251,146,60,0.09)" className="il-scr2"/>
      <text x="258" y="62" textAnchor="middle" fontSize="22" className="il-reel2">🎰</text>
      <rect x="232" y="86" width="52" height="2" rx="1" fill="rgba(251,146,60,0.25)"/>
      <circle cx="258" cy="100" r="7" fill="rgba(251,146,60,0.3)" stroke="rgba(251,146,60,0.6)" strokeWidth="1.2"/>
      <rect x="240" y="112" width="36" height="10" rx="3" fill="rgba(251,146,60,0.2)"/>
      {/* Center streak */}
      <text x="155" y="72" textAnchor="middle" fill="rgba(251,191,36,0.92)" fontSize="11" fontFamily="monospace" fontWeight="bold" className="il-streak">🔥 STREAK: 847</text>
      {/* Coins */}
      <circle cx="125" cy="18" r="8" fill="rgba(251,191,36,0.75)" className="il-coin1"/>
      <text x="125" y="22" textAnchor="middle" fill="rgba(90,45,0,0.9)" fontSize="8" fontFamily="monospace" fontWeight="bold">$</text>
      <circle cx="192" cy="14" r="7" fill="rgba(251,191,36,0.55)" className="il-coin2"/>
      <text x="192" y="18" textAnchor="middle" fill="rgba(90,45,0,0.9)" fontSize="7" fontFamily="monospace" fontWeight="bold">$</text>
      {/* Win lights */}
      {winLights.map((on, i) => (
        <circle key={i} cx={18 + i*26} cy={16} r="4"
          fill={on ? 'rgba(251,191,36,0.8)' : 'rgba(60,30,0,0.5)'}
          className={on ? `il-light il-light--${i%4}` : ''}/>
      ))}
      {/* AI slop blobs */}
      {[80,155,232].map((x,i) => (
        <ellipse key={i} cx={x} cy={165} rx="20" ry="11"
          fill={`rgba(${80+i*40},0,${130+i*30},0.3)`}
          className="il-blob"/>
      ))}
    </svg>
  );
}

// ── CITY — Validation skyline ─────────────────────────────────────────────────
function IllustrationCity() {
  const blds = [
    {x:0,w:28,h:82},{x:32,w:22,h:112},{x:58,w:32,h:60},{x:94,w:18,h:98},
    {x:116,w:26,h:135},{x:146,w:20,h:88},{x:170,w:38,h:105},{x:212,w:26,h:72},
    {x:242,w:22,h:118},{x:268,w:30,h:68},{x:282,w:28,h:95}
  ];
  // Deterministic window states based on index
  const winOn = (bi, ri, ci) => ((bi*7 + ri*13 + ci*3) % 10) > 3;
  return (
    <svg viewBox="0 0 310 185" className="il il--city" xmlns="http://www.w3.org/2000/svg">
      {/* Stars */}
      {[20,55,88,115,145,175,205,230,255,280,300].map((x,i) => (
        <circle key={i} cx={x} cy={6+(i%5)*10} r="1.3"
          fill="rgba(255,220,100,0.7)"
          className={`il-star il-star--${i%3}`}/>
      ))}
      {/* Moon */}
      <circle cx="272" cy="24" r="16" fill="rgba(200,210,255,0.12)" stroke="rgba(200,210,255,0.2)" strokeWidth="1"/>
      <circle cx="278" cy="21" r="12" fill="rgba(3,3,18,0.95)"/>
      {/* Profile mirror in sky */}
      <rect x="108" y="4" width="96" height="58" rx="4" fill="rgba(6,6,22,0.96)" stroke="rgba(167,139,250,0.45)" strokeWidth="1.5" className="il-mirror"/>
      <circle cx="156" cy="26" r="13" fill="rgba(70,50,150,0.5)" stroke="rgba(167,139,250,0.35)" strokeWidth="1"/>
      <text x="156" y="30" textAnchor="middle" fill="rgba(167,139,250,0.65)" fontSize="8" fontFamily="monospace" letterSpacing="0.5">YOU</text>
      <rect x="134" y="44" width="44" height="3" rx="1.5" fill="rgba(167,139,250,0.4)"/>
      <rect x="142" y="50" width="28" height="2" rx="1" fill="rgba(167,139,250,0.25)"/>
      {/* Follower count */}
      <text x="156" y="57" textAnchor="middle" fill="rgba(167,139,250,0.45)" fontSize="6" fontFamily="monospace">2,341 followers</text>
      {/* Buildings */}
      {blds.map((b, bi) => (
        <g key={bi}>
          <rect x={b.x} y={185-b.h} width={b.w} height={b.h}
            fill={`rgba(${4+bi%3*2},${4+bi%4*2},${12+bi%5*4},0.97)`}/>
          {Array.from({length: Math.floor(b.h/16)}).map((_, ri) =>
            Array.from({length: Math.floor(b.w/10)}).map((_, ci) => (
              <rect key={`${ri}-${ci}`}
                x={b.x+3+ci*10} y={185-b.h+6+ri*14}
                width={4} height={5} rx="0.5"
                fill={winOn(bi,ri,ci) ? `rgba(255,220,80,0.${3+bi%3})` : 'rgba(15,15,40,0.8)'}
                className={winOn(bi,ri,ci) ? `il-win il-win--${(ri+ci+bi)%4}` : ''}/>
            ))
          )}
        </g>
      ))}
    </svg>
  );
}

// ── TRAIL — Dawn run ──────────────────────────────────────────────────────────
function IllustrationTrail() {
  return (
    <svg viewBox="0 0 310 185" className="il il--trail" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="il-dawn-grd" cx="72%" cy="15%">
          <stop offset="0%" stopColor="rgba(251,191,36,0.28)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <rect width="310" height="185" fill="url(#il-dawn-grd)"/>
      {/* Sun */}
      <circle cx="228" cy="38" rx="26" ry="26" fill="rgba(251,191,36,0.12)"/>
      <circle cx="228" cy="38" r="18" fill="rgba(251,191,36,0.2)"/>
      <circle cx="228" cy="38" r="10" fill="rgba(251,191,36,0.75)" className="il-sun"/>
      {/* Sun rays */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
        <line key={deg}
          x1={228+Math.cos(deg*Math.PI/180)*12} y1={38+Math.sin(deg*Math.PI/180)*12}
          x2={228+Math.cos(deg*Math.PI/180)*26} y2={38+Math.sin(deg*Math.PI/180)*26}
          stroke="rgba(251,191,36,0.38)" strokeWidth="1.2"
          className="il-ray"
          style={{transformOrigin:'228px 38px'}}/>
      ))}
      {/* Far hills */}
      <path d="M0,135 Q55,85 110,115 Q165,145 220,105 Q260,80 310,118 L310,185 L0,185Z"
        fill="rgba(8,25,6,0.92)"/>
      {/* Near hills */}
      <path d="M0,155 Q50,128 100,148 Q155,168 210,140 Q255,118 310,148 L310,185 L0,185Z"
        fill="rgba(6,18,4,0.97)"/>
      {/* Path — perspective */}
      <path d="M140,185 Q150,165 152,148 Q154,132 153,115"
        stroke="rgba(200,175,90,0.28)" strokeWidth="14" fill="none" strokeLinecap="round"/>
      <path d="M140,185 Q150,165 152,148 Q154,132 153,115"
        stroke="rgba(200,175,90,0.5)" strokeWidth="5" fill="none" strokeLinecap="round"
        className="il-path"/>
      {/* Runner */}
      <g className="il-runner">
        <circle cx="150" cy="107" r="4.5" fill="rgba(220,195,110,0.75)"/>
        <line x1="150" y1="111" x2="150" y2="122" stroke="rgba(220,195,110,0.75)" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="150" y1="115" x2="143" y2="122" stroke="rgba(220,195,110,0.65)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="150" y1="115" x2="157" y2="119" stroke="rgba(220,195,110,0.65)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="150" y1="122" x2="144" y2="130" stroke="rgba(220,195,110,0.65)" strokeWidth="1.8" strokeLinecap="round" className="il-leg1"/>
        <line x1="150" y1="122" x2="156" y2="128" stroke="rgba(220,195,110,0.65)" strokeWidth="1.8" strokeLinecap="round" className="il-leg2"/>
      </g>
      {/* Side trees */}
      {[10,36,260,286].map((x,i) => (
        <g key={i}>
          <rect x={x-4} y={108-(i%2)*18} width="8" height={65+(i%2)*18} fill="rgba(4,12,3,0.95)"/>
          <polygon
            points={`${x},${82-(i%2)*18} ${x-14},${112-(i%2)*18} ${x+14},${112-(i%2)*18}`}
            fill="rgba(5,16,4,0.95)"/>
        </g>
      ))}
    </svg>
  );
}

// ── BEACH — The purpose beach (win screen) ────────────────────────────────────
function IllustrationBeach() {
  return (
    <svg viewBox="0 0 310 185" className="il il--beach" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="il-sea-grd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(30,90,200,0.35)"/>
          <stop offset="100%" stopColor="rgba(60,140,220,0.25)"/>
        </linearGradient>
      </defs>
      {/* Sun glow layers */}
      <circle cx="155" cy="62" r="46" fill="rgba(255,200,50,0.1)"/>
      <circle cx="155" cy="62" r="32" fill="rgba(255,200,50,0.18)"/>
      <circle cx="155" cy="62" r="20" fill="rgba(255,210,60,0.7)" className="il-bsun"/>
      {/* Sun rays */}
      {[0,22,45,68,90,112,135,158,180,202,225,248,270,292,315,338].map(deg => (
        <line key={deg}
          x1={155+Math.cos(deg*Math.PI/180)*22} y1={62+Math.sin(deg*Math.PI/180)*22}
          x2={155+Math.cos(deg*Math.PI/180)*44} y2={62+Math.sin(deg*Math.PI/180)*44}
          stroke="rgba(255,200,50,0.32)" strokeWidth="1.4"
          className="il-bray"
          style={{transformOrigin:'155px 62px'}}/>
      ))}
      {/* Horizon */}
      <line x1="0" y1="112" x2="310" y2="112" stroke="rgba(255,210,100,0.45)" strokeWidth="1.5" className="il-horiz"/>
      {/* Sea */}
      <rect x="0" y="112" width="310" height="73" fill="url(#il-sea-grd)"/>
      {/* Waves */}
      <path d="M-10,124 Q25,118 62,124 Q99,130 136,124 Q173,118 210,124 Q247,130 284,124 Q310,119 330,124"
        stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" className="il-bwv1"/>
      <path d="M-10,138 Q30,132 72,138 Q114,144 156,138 Q198,132 240,138 Q275,144 320,138"
        stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" fill="none" className="il-bwv2"/>
      <path d="M-10,152 Q35,146 80,152 Q125,158 170,152 Q215,146 260,152 Q295,158 330,152"
        stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" className="il-bwv3"/>
      {/* Sand */}
      <path d="M0,158 Q78,150 155,158 Q232,166 310,158 L310,185 L0,185Z"
        fill="rgba(215,185,110,0.45)"/>
      {/* Birds */}
      <path d="M62,42 Q67,37 72,42 Q77,37 82,42" stroke="rgba(20,50,140,0.4)" strokeWidth="1.2" fill="none"/>
      <path d="M198,34 Q202,30 206,34 Q210,30 214,34" stroke="rgba(20,50,140,0.35)" strokeWidth="1.1" fill="none"/>
      <path d="M108,52 Q112,48 116,52 Q120,48 124,52" stroke="rgba(20,50,140,0.3)" strokeWidth="1" fill="none"/>
      <path d="M238,48 Q241,44 244,48 Q247,44 250,48" stroke="rgba(20,50,140,0.3)" strokeWidth="1" fill="none"/>
    </svg>
  );
}

// ── ROUTER ────────────────────────────────────────────────────────────────────
function Illustration({ bg }) {
  if (bg === 'intro')  return React.createElement(IllustrationIntro,  null);
  if (bg === 'swamp')  return React.createElement(IllustrationSwamp,  null);
  if (bg === 'arcade') return React.createElement(IllustrationArcade, null);
  if (bg === 'city')   return React.createElement(IllustrationCity,   null);
  if (bg === 'trail')  return React.createElement(IllustrationTrail,  null);
  if (bg === 'beach')  return React.createElement(IllustrationBeach,  null);
  return null;
}

Object.assign(window, { Illustration });
