export const OPCODES = [
  "NOP",
  "CAL",
  "JMP",
  "JPF",
  "GJMP",
  "LBL",
  "RET",
  "PSHN_L",
  "PSHI_L",
  "POPI_L",
  "PSHM_B",
  "POPM_B",
  "PSHM_W",
  "POPM_W",
  "PSHM_L",
  "POPM_L",
  "PSHSM_B",
  "PSHSM_W",
  "PSHSM_L",
  "PSHAC",
  "REQ",
  "REQSW",
  "REQEW",
  "PREQ",
  "PREQSW",
  "PREQEW",
  "UNUSE",
  "DEBUG",
  "HALT",
  "SET",
  "SET3",
  "IDLOCK",
  "IDUNLOCK",
  "EFFECTPLAY2",
  "FOOTSTEP",
  "JUMP",
  "JUMP3",
  "LADDERUP",
  "LADDERDOWN",
  "LADDERUP2",
  "LADDERDOWN2",
  "MAPJUMP",
  "MAPJUMP3",
  "SETMODEL",
  "BASEANIME",
  "ANIME",
  "ANIMEKEEP",
  "CANIME",
  "CANIMEKEEP",
  "RANIME",
  "RANIMEKEEP",
  "RCANIME",
  "RCANIMEKEEP",
  "RANIMELOOP",
  "RCANIMELOOP",
  "LADDERANIME",
  "DISCJUMP",
  "SETLINE",
  "LINEON",
  "LINEOFF",
  "WAIT",
  "MSPEED",
  "MOVE",
  "MOVEA",
  "PMOVEA",
  "CMOVE",
  "FMOVE",
  "PJUMPA",
  "ANIMESYNC",
  "ANIMESTOP",
  "MESW",
  "MES",
  "MESSYNC",
  "MESVAR",
  "ASK",
  "WINSIZE",
  "WINCLOSE",
  "UCON",
  "UCOFF",
  "MOVIE",
  "MOVIESYNC",
  "SETPC",
  "DIR",
  "DIRP",
  "DIRA",
  "PDIRA",
  "SPUREADY",
  "TALKON",
  "TALKOFF",
  "PUSHON",
  "PUSHOFF",
  "ISTOUCH",
  "MAPJUMPO",
  "MAPJUMPON",
  "MAPJUMPOFF",
  "SETMESSPEED",
  "SHOW",
  "HIDE",
  "TALKRADIUS",
  "PUSHRADIUS",
  "AMESW",
  "AMES",
  "GETINFO",
  "THROUGHON",
  "THROUGHOFF",
  "BATTLE",
  "BATTLERESULT",
  "BATTLEON",
  "BATTLEOFF",
  "KEYSCAN",
  "KEYON",
  "AASK",
  "PGETINFO",
  "DSCROLL",
  "LSCROLL",
  "CSCROLL",
  "DSCROLLA",
  "LSCROLLA",
  "CSCROLLA",
  "SCROLLSYNC",
  "RMOVE",
  "RMOVEA",
  "RPMOVEA",
  "RCMOVE",
  "RFMOVE",
  "MOVESYNC",
  "CLEAR",
  "DSCROLLP",
  "LSCROLLP",
  "CSCROLLP",
  "LTURNR",
  "LTURNL",
  "CTURNR",
  "CTURNL",
  "ADDPARTY",
  "SUBPARTY",
  "CHANGEPARTY",
  "REFRESHPARTY",
  "SETPARTY",
  "ISPARTY",
  "ADDMEMBER",
  "SUBMEMBER",
  "ISMEMBER",
  "LTURN",
  "CTURN",
  "PLTURN",
  "PCTURN",
  "JOIN",
  "MESFORCUS",
  "BGANIME",
  "RBGANIME",
  "RBGANIMELOOP",
  "BGANIMESYNC",
  "BGDRAW",
  "BGOFF",
  "BGANIMESPEED",
  "SETTIMER",
  "DISPTIMER",
  "SHADETIMER",
  "SETGETA",
  "SETROOTTRANS",
  "SETVIBRATE",
  "STOPVIBRATE",
  "MOVIEREADY",
  "GETTIMER",
  "FADEIN",
  "FADEOUT",
  "FADESYNC",
  "SHAKE",
  "SHAKEOFF",
  "FADEBLACK",
  "FOLLOWOFF",
  "FOLLOWON",
  "GAMEOVER",
  "ENDING",
  "SHADELEVEL",
  "SHADEFORM",
  "FMOVEA",
  "FMOVEP",
  "SHADESET",
  "MUSICCHANGE",
  "MUSICLOAD",
  "FADENONE",
  "POLYCOLOR",
  "POLYCOLORALL",
  "KILLTIMER",
  "CROSSMUSIC",
  "DUALMUSIC",
  "EFFECTPLAY",
  "EFFECTLOAD",
  "LOADSYNC",
  "MUSICSTOP",
  "MUSICVOL",
  "MUSICVOLTRANS",
  "MUSICVOLFADE",
  "ALLSEVOL",
  "ALLSEVOLTRANS",
  "ALLSEPOS",
  "ALLSEPOSTRANS",
  "SEVOL",
  "SEVOLTRANS",
  "SEPOS",
  "SEPOSTRANS",
  "SETBATTLEMUSIC",
  "BATTLEMODE",
  "SESTOP",
  "BGANIMEFLAG",
  "INITSOUND",
  "BGSHADE",
  "BGSHADESTOP",
  "RBGSHADELOOP",
  "DSCROLL2",
  "LSCROLL2",
  "CSCROLL2",
  "DSCROLLA2",
  "LSCROLLA2",
  "CSCROLLA2",
  "DSCROLLP2",
  "LSCROLLP2",
  "CSCROLLP2",
  "SCROLLSYNC2",
  "SCROLLMODE2",
  "MENUENABLE",
  "MENUDISABLE",
  "FOOTSTEPON",
  "FOOTSTEPOFF",
  "FOOTSTEPOFFALL",
  "FOOTSTEPCUT",
  "PREMAPJUMP",
  "USE",
  "SPLIT",
  "ANIMESPEED",
  "RND",
  "DCOLADD",
  "DCOLSUB",
  "TCOLADD",
  "TCOLSUB",
  "FCOLADD",
  "FCOLSUB",
  "COLSYNC",
  "DOFFSET",
  "LOFFSETS",
  "COFFSETS",
  "LOFFSET",
  "COFFSET",
  "OFFSETSYNC",
  "RUNENABLE",
  "RUNDISABLE",
  "MAPFADEOFF",
  "MAPFADEON",
  "INITTRACE",
  "SETDRESS",
  "GETDRESS",
  "FACEDIR",
  "FACEDIRA",
  "FACEDIRP",
  "FACEDIRLIMIT",
  "FACEDIROFF",
  "SARALYOFF",
  "SARALYON",
  "SARALYDISPOFF",
  "SARALYDISPON",
  "MESMODE",
  "FACEDIRINIT",
  "FACEDIRI",
  "JUNCTION",
  "SETCAMERA",
  "BATTLECUT",
  "FOOTSTEPCOPY",
  "WORLDMAPJUMP",
  "RFACEDIRI",
  "RFACEDIR",
  "RFACEDIRA",
  "RFACEDIRP",
  "RFACEDIROFF",
  "FACEDIRSYNC",
  "COPYINFO",
  "PCOPYINFO",
  "RAMESW",
  "BGSHADEOFF",
  "AXIS",
  "AXISSYNC",
  "MENUNORMAL",
  "MENUPHS",
  "BGCLEAR",
  "GETPARTY",
  "MENUSHOP",
  "DISC",
  "DSCROLL3",
  "LSCROLL3",
  "CSCROLL3",
  "MACCEL",
  "MLIMIT",
  "ADDITEM",
  "SETWITCH",
  "SETODIN",
  "RESETGF",
  "MENUNAME",
  "REST",
  "MOVECANCEL",
  "PMOVECANCEL",
  "ACTORMODE",
  "MENUSAVE",
  "SAVEENABLE",
  "PHSENABLE",
  "HOLD",
  "MOVIECUT",
  "SETPLACE",
  "SETDCAMERA",
  "CHOICEMUSIC",
  "GETCARD",
  "DRAWPOINT",
  "PHSPOWER",
  "KEY",
  "CARDGAME",
  "SETBAR",
  "DISPBAR",
  "KILLBAR",
  "SCROLLRATIO2",
  "WHOAMI",
  "MUSICSTATUS",
  "MUSICREPLAY",
  "DOORLINEOFF",
  "DOORLINEON",
  "MUSICSKIP",
  "DYING",
  "SETHP",
  "GETHP",
  "MOVEFLUSH",
  "MUSICVOLSYNC",
  "PUSHANIME",
  "POPANIME",
  "KEYSCAN2",
  "KEYON2",
  "PARTICLEON",
  "PARTICLEOFF",
  "KEYSIGHNCHANGE",
  "ADDGIL",
  "ADDPASTGIL",
  "ADDSEEDLEVEL",
  "PARTICLESET",
  "SETDRAWPOINT",
  "MENUTIPS",
  "LASTIN",
  "LASTOUT",
  "SEALEDOFF",
  "MENUTUTO",
  "OPENEYES",
  "CLOSEEYES",
  "BLINKEYES",
  "SETCARD",
  "HOWMANYCARD",
  "WHERECARD",
  "ADDMAGIC",
  "SWAP",
  "SETPARTY2",
  "SPUSYNC",
  "BROKEN",
  "ANGELODISABLE",
  "UNKNOWN2",
  "UNKNOWN3",
  "UNKNOWN4",
  "HASITEM",
  "UNKNOWN6",
  "UNKNOWN7",
  "UNKNOWN8",
  "UNKNOWN9",
  "UNKNOWN10",
  "UNKNOWN11",
  "UNKNOWN12",
  "UNKNOWN13",
  "UNKNOWN14",
  "UNKNOWN15",
  "UNKNOWN16",
  "PREMAPJUMP2",
  "TUTO"
] as const;