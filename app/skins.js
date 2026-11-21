// scripts/gen-skins.mjs が app/skins.json から作る。手で直さない
export const TABLE = {
  "description": "FX時計の形と色の表（ここが元）。Swift のウィジェットもこの表を読む。直したら npm run skins で skins.css と skins.js を作り直す",
  "forms": {
    "dial": {
      "name": "文字盤",
      "geo": {
        "view": 360,
        "bezel-r": 178,
        "face-r": 104,
        "ring-r": [
          140,
          131,
          122,
          113
        ],
        "ticks-per-hour": 4,
        "tick-in": [
          145,
          149,
          152
        ],
        "tick-out": 155,
        "num-r": 167,
        "num-dy": 4.5,
        "num-step": 3,
        "ptr-in": 106,
        "ptr-out": 157,
        "ptr-dot": 3.2,
        "sec-r": 98,
        "sec-dot": 2.4,
        "mark-r": 159,
        "mark-dot": [
          2.8,
          1.8
        ],
        "ind-dot": [
          3.8,
          2.8
        ],
        "date-y": 128,
        "time-y": 170,
        "next-name-y": 197,
        "next-left-y": 219,
        "state-y": 246
      },
      "font": {
        "brand": 13,
        "top": 12,
        "num": 13,
        "date": 11.5,
        "time": 42,
        "next-name": 12,
        "next-left": 17,
        "state": 10.5,
        "legend": 12,
        "list": 14,
        "list-minor": 12.5,
        "list-left": 13,
        "goto": 11,
        "dst": 12
      },
      "stroke": {
        "ring": 6,
        "tick": 1.1,
        "tick-big": 2.2,
        "tick-q": 0.8,
        "ptr": 2.2,
        "bezel": 1,
        "face": 0.8
      }
    },
    "board": {
      "name": "時刻表",
      "geo": {
        "dia-w": 360,
        "dia-h": 76,
        "lane-x0": 56,
        "lane-x1": 354,
        "lane-y": [
          4,
          18,
          32,
          46
        ],
        "lane-h": 10,
        "lab-dy": 8.5,
        "start-hour": 7,
        "hour-marks": [
          0,
          5,
          11,
          17,
          23
        ],
        "grid-y": [
          58,
          62
        ],
        "hour-y": 72,
        "now-y": [
          2,
          60
        ],
        "now-tip-w": 8,
        "now-tip-h": 5
      },
      "font": {
        "brand": 15,
        "brand-sub": 12,
        "date": 12,
        "time": 54,
        "time-wide": 88,
        "time-sec": 22,
        "time-sec-wide": 34,
        "next": 12.5,
        "next-strong": 17,
        "left": 14,
        "dia": 10.5,
        "hour": 22,
        "min": 22,
        "name": 12.5,
        "min-minor": 16,
        "name-minor": 11.5,
        "goto": 11,
        "rel": 12.5,
        "day": 11,
        "foot": 12,
        "hour-wide": 28,
        "min-wide": 28,
        "name-wide": 15,
        "min-minor-wide": 20,
        "name-minor-wide": 13.5,
        "rel-wide": 15
      },
      "stroke": {
        "rule": 2,
        "grid": 1,
        "now": 2
      }
    }
  },
  "skins": {
    "kon": {
      "form": "dial",
      "name": "紺と真鍮",
      "scheme": "dark",
      "chip": [
        "#13243f",
        "#c9a660"
      ],
      "color": {
        "bg": "#0b1628",
        "bg2": "#0f1d36",
        "face": "#13243f",
        "line": "#2a3b5c",
        "ink": "#ebe1c8",
        "sub": "#8693ab",
        "metal": "#c9a660",
        "track": "rgba(235,225,200,.07)",
        "s-syd": "#6a9fb9",
        "s-tky": "#d27967",
        "s-ldn": "#84b089",
        "s-ny": "#ae97d2"
      }
    },
    "hakuji": {
      "form": "dial",
      "name": "白磁",
      "scheme": "light",
      "chip": [
        "#ffffff",
        "#2c55a3"
      ],
      "color": {
        "bg": "#dde2e8",
        "bg2": "#f6f6f4",
        "face": "#ffffff",
        "line": "#c6ccd5",
        "ink": "#1b2a48",
        "sub": "#6a7487",
        "metal": "#2c55a3",
        "track": "rgba(27,42,72,.06)",
        "s-syd": "#5f9fbf",
        "s-tky": "#cc6a59",
        "s-ldn": "#62a06c",
        "s-ny": "#8a74c0"
      }
    },
    "midori": {
      "form": "dial",
      "name": "深緑",
      "scheme": "dark",
      "chip": [
        "#173a27",
        "#d8b56b"
      ],
      "color": {
        "bg": "#0d2618",
        "bg2": "#12301f",
        "face": "#173a27",
        "line": "#2c5440",
        "ink": "#f0e8d2",
        "sub": "#88a594",
        "metal": "#d8b56b",
        "track": "rgba(240,232,210,.08)",
        "s-syd": "#8cc3c9",
        "s-tky": "#e59580",
        "s-ldn": "#bcd88d",
        "s-ny": "#cab4e6"
      }
    },
    "eki": {
      "form": "board",
      "name": "駅の白",
      "scheme": "light",
      "chip": [
        "#ffffff",
        "#cc1f2d"
      ],
      "color": {
        "bg": "#ffffff",
        "ink": "#16181c",
        "sub": "#5d636c",
        "line": "#d3d8df",
        "hour": "#e9ecf0",
        "hour-ink": "#16181c",
        "red": "#cc1f2d",
        "lane": "#eff1f4",
        "s-syd": "#8761c4",
        "s-tky": "#e07a00",
        "s-ldn": "#2b8a55",
        "s-ny": "#1f5ccf"
      }
    },
    "yako": {
      "form": "board",
      "name": "夜行の紺",
      "scheme": "dark",
      "chip": [
        "#132039",
        "#ffad4d"
      ],
      "color": {
        "bg": "#132039",
        "ink": "#f0f2f6",
        "sub": "#a0adc4",
        "line": "#2c3c60",
        "hour": "#1d2c4c",
        "hour-ink": "#f0f2f6",
        "red": "#ff7d74",
        "lane": "#1a2846",
        "s-syd": "#b39af0",
        "s-tky": "#ffad4d",
        "s-ldn": "#5cc98d",
        "s-ny": "#79a4ff"
      }
    },
    "wakakusa": {
      "form": "board",
      "name": "若草",
      "scheme": "light",
      "chip": [
        "#f3f8f0",
        "#2f7a4c"
      ],
      "color": {
        "bg": "#f3f8f0",
        "ink": "#15281c",
        "sub": "#566b5d",
        "line": "#c5d9c9",
        "hour": "#2f7a4c",
        "hour-ink": "#ffffff",
        "red": "#c42a2f",
        "lane": "#e2ede3",
        "s-syd": "#7d5bbd",
        "s-tky": "#d77400",
        "s-ldn": "#0f8a8a",
        "s-ny": "#2457c5"
      }
    }
  }
};
export const SKINS = TABLE.skins;
export const SIZE = TABLE.forms;
