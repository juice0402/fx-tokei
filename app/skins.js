// scripts/gen-skins.mjs が app/skins.json から作る。手で直さない
export const TABLE = {
  "description": "FX時計の形と色の表（ここが元）。Swift のウィジェットもこの表を読む。直したら npm run skins で skins.css と skins.js を作り直す",
  "forms": {
    "dial": {
      "name": "24時間の輪",
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
        "panel-rx": 22,
        "screw-at": 17,
        "screw-r": 7.5,
        "screw-slot": 5,
        "hair-step": 1.6,
        "clip-r": 177,
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
      "name": "時刻表（1時間ごと）",
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
    },
    "big": {
      "name": "大きな数字",
      "geo": {
        "day-w": 360,
        "day-h": 40,
        "start-hour": 7,
        "axis-y": 14,
        "mark-top": [
          6,
          10
        ],
        "ind-r": [
          3.6,
          2.6
        ],
        "hour-marks": [
          0,
          6,
          12,
          18
        ],
        "hour-y": 34,
        "hour-dx": 2,
        "now-r": 4
      },
      "font": {
        "brand": 13,
        "top": 12,
        "next": 14,
        "next-strong": 17,
        "num": 64,
        "num-wide": 150,
        "hour": 10,
        "foot": 12.5,
        "foot-wide": 14
      },
      "stroke": {
        "bar": 3,
        "axis": 1,
        "mark": 2
      }
    },
    "donut": {
      "name": "パステルのドーナツ",
      "geo": {
        "view": 300,
        "ring-r": 112,
        "knob-r": 8,
        "label-y": 104,
        "name-y": 134,
        "time-y": 158,
        "left-y": 194,
        "star": "M0,-8 C1,-2 2,-1 8,0 C2,1 1,2 0,8 C-1,2 -2,1 -8,0 C-2,-1 -1,-2 0,-8Z",
        "stars": [
          [
            38,
            40,
            0.9,
            1
          ],
          [
            262,
            56,
            0.7,
            2
          ],
          [
            30,
            240,
            0.6,
            2
          ],
          [
            268,
            246,
            0.85,
            1
          ],
          [
            150,
            14,
            0.5,
            3
          ]
        ]
      },
      "font": {
        "brand": 13,
        "top": 12,
        "label": 13,
        "name": 20,
        "time": 14,
        "left": 22,
        "tag": 12.5
      },
      "stroke": {
        "ring": 24,
        "knob": 3
      },
      "size": {
        "svg-max": 340,
        "svg-max-wide": 460
      }
    },
    "planner": {
      "name": "手帳",
      "geo": {
        "w": 360,
        "before": 2,
        "after": 10,
        "row-h": 26,
        "top": 12,
        "line-x0": 44,
        "line-x1": 352,
        "hour-x": 8,
        "hour-dy": 5,
        "dot-x": 55,
        "dot-r": 4,
        "text-x": 66,
        "text-dy": 4.5,
        "pen-dy": 6,
        "pen-h": 13,
        "pen-em": 12.5,
        "band-x": 320,
        "band-step": 8,
        "band-w": 6,
        "now-r": 3.5,
        "now-x": 314,
        "now-dy": 4,
        "dash": "2 4",
        "gap": 15
      },
      "font": {
        "brand": 13,
        "top": 12,
        "date": 21,
        "date-sub": 12,
        "stamp": 12.5,
        "hour": 13,
        "item": 14,
        "item-minor": 12,
        "now": 11,
        "legend": 12
      },
      "stroke": {
        "now": 1.6,
        "stamp": 2,
        "grid": 16
      },
      "size": {
        "stamp": 58,
        "swatch": 10,
        "swatch-r": 3
      }
    },
    "widget": {
      "name": "タイル",
      "geo": {
        "ring-view": 100,
        "ring-r": 40,
        "ring-text-y": 56
      },
      "font": {
        "brand": 13,
        "top": 12,
        "lab": 11,
        "ttl": 13,
        "small": 11,
        "ring": 19,
        "mk": 13,
        "time": 44,
        "list": 12.5,
        "la-name": 15,
        "la-left": 24
      },
      "stroke": {
        "ring": 9
      },
      "size": {
        "tile-r": 22,
        "la-r": 20,
        "la-bar": 5,
        "mk-dot": 9,
        "ring-max": 120,
        "grid-max": 380
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
        "bink": "#ebe1c8",
        "ptr": "#c9a660",
        "grain": "transparent",
        "panel": "transparent",
        "screw": "transparent",
        "off": ".42",
        "font": "var(--f-dial)",
        "tsz": "var(--dial-f-time)",
        "numf": "var(--dial-f-num)",
        "numw": "500",
        "timew": "500",
        "tkw": "1",
        "tko": ".7",
        "tkq": ".32",
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
        "bink": "#1b2a48",
        "ptr": "#2c55a3",
        "grain": "transparent",
        "panel": "transparent",
        "screw": "transparent",
        "off": ".42",
        "font": "var(--f-dial)",
        "tsz": "var(--dial-f-time)",
        "numf": "var(--dial-f-num)",
        "numw": "500",
        "timew": "500",
        "tkw": "1",
        "tko": ".7",
        "tkq": ".32",
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
        "bink": "#f0e8d2",
        "ptr": "#d8b56b",
        "grain": "transparent",
        "panel": "transparent",
        "screw": "transparent",
        "off": ".42",
        "font": "var(--f-dial)",
        "tsz": "var(--dial-f-time)",
        "numf": "var(--dial-f-num)",
        "numw": "500",
        "timew": "500",
        "tkw": "1",
        "tko": ".7",
        "tkq": ".32",
        "s-syd": "#8cc3c9",
        "s-tky": "#e59580",
        "s-ldn": "#bcd88d",
        "s-ny": "#cab4e6"
      }
    },
    "sakura": {
      "form": "dial",
      "name": "桜の木",
      "scheme": "light",
      "chip": [
        "#efe0c8",
        "#b33a2a"
      ],
      "deco": {
        "nums": "ar",
        "extra": "rings",
        "bez": [
          "#b98a62",
          "#d6ae87",
          "#c2946b",
          "#dab48e",
          "#b4855d"
        ],
        "face": [
          "#f3e6d0",
          "#e6cfae"
        ]
      },
      "color": {
        "bg": "#d9d6cf",
        "bg2": "#c99a72",
        "face": "#efe0c8",
        "line": "#8a6040",
        "ink": "#2b1d13",
        "sub": "#6b5a49",
        "metal": "#b33a2a",
        "track": "rgba(58,38,22,.11)",
        "bink": "#3a2616",
        "ptr": "#2b1d13",
        "grain": "rgba(140,95,55,.2)",
        "panel": "transparent",
        "screw": "transparent",
        "off": ".42",
        "font": "var(--f-dial)",
        "tsz": "var(--dial-f-time)",
        "numf": "var(--dial-f-num)",
        "numw": "500",
        "timew": "500",
        "tkw": "1",
        "tko": ".7",
        "tkq": ".32",
        "s-syd": "#4f8aa3",
        "s-tky": "#c4553f",
        "s-ldn": "#58894d",
        "s-ny": "#7a62a6"
      }
    },
    "washi": {
      "form": "dial",
      "name": "和紙と墨",
      "scheme": "light",
      "chip": [
        "#f7f6f1",
        "#c7372c"
      ],
      "deco": {
        "nums": "kan",
        "extra": "fibers"
      },
      "color": {
        "bg": "#d6d5ce",
        "bg2": "#efeee8",
        "face": "#f7f6f1",
        "line": "#c6c3b9",
        "ink": "#1f2328",
        "sub": "#686a6d",
        "metal": "#c7372c",
        "track": "rgba(31,35,40,.07)",
        "bink": "#1f2328",
        "ptr": "#c7372c",
        "grain": "rgba(110,98,74,.3)",
        "panel": "transparent",
        "screw": "transparent",
        "off": ".42",
        "font": "var(--f-dial)",
        "tsz": "var(--dial-f-time)",
        "numf": "var(--dial-f-num)",
        "numw": "500",
        "timew": "500",
        "tkw": "1",
        "tko": ".7",
        "tkq": ".32",
        "s-syd": "#3c97a8",
        "s-tky": "#c84657",
        "s-ldn": "#5a9a68",
        "s-ny": "#8670b4"
      }
    },
    "yakou": {
      "form": "dial",
      "name": "夜光",
      "scheme": "dark",
      "chip": [
        "#0b0e0f",
        "#9ef0b6"
      ],
      "deco": {
        "nums": "ar",
        "glow": 1.4,
        "glowOn": [
          "num",
          "ptr",
          "time"
        ]
      },
      "color": {
        "bg": "#000000",
        "bg2": "#07090a",
        "face": "#0b0e0f",
        "line": "#1b2224",
        "ink": "#bfe3cb",
        "sub": "#567562",
        "metal": "#9ef0b6",
        "track": "rgba(159,212,176,.07)",
        "bink": "#9fd4b0",
        "ptr": "#b8ffcc",
        "grain": "transparent",
        "panel": "transparent",
        "screw": "transparent",
        "off": ".3",
        "font": "var(--f-ui)",
        "tsz": "var(--dial-f-time)",
        "numf": "var(--dial-f-num)",
        "numw": "500",
        "timew": "500",
        "tkw": "1",
        "tko": ".7",
        "tkq": ".32",
        "s-syd": "#2f6a77",
        "s-tky": "#7e463b",
        "s-ldn": "#41724a",
        "s-ny": "#5d527d"
      }
    },
    "neon": {
      "form": "dial",
      "name": "ネオン",
      "scheme": "dark",
      "chip": [
        "#120a22",
        "#ff4fa3"
      ],
      "deco": {
        "nums": "ar",
        "glow": 2.4,
        "glowOn": [
          "arc",
          "ptr",
          "num",
          "mark",
          "time"
        ]
      },
      "color": {
        "bg": "#07040f",
        "bg2": "#0c0718",
        "face": "#120a22",
        "line": "#2a1a48",
        "ink": "#f3eaff",
        "sub": "#8c7bb0",
        "metal": "#ff4fa3",
        "track": "rgba(217,200,255,.06)",
        "bink": "#d9c8ff",
        "ptr": "#ff4fa3",
        "grain": "transparent",
        "panel": "transparent",
        "screw": "transparent",
        "off": ".35",
        "font": "var(--f-cond)",
        "tsz": "50px",
        "numf": "16px",
        "numw": "600",
        "timew": "500",
        "tkw": "1",
        "tko": ".7",
        "tkq": ".32",
        "s-syd": "#39e6ff",
        "s-tky": "#ff5c8a",
        "s-ldn": "#88ff6a",
        "s-ny": "#b48cff"
      }
    },
    "koku": {
      "form": "dial",
      "name": "航空計器",
      "scheme": "dark",
      "chip": [
        "#1d1e20",
        "#ff8a1f"
      ],
      "deco": {
        "nums": "ar",
        "extra": "screws"
      },
      "color": {
        "bg": "#0e0f10",
        "bg2": "#151618",
        "face": "#1d1e20",
        "line": "#30333a",
        "ink": "#f2f2ee",
        "sub": "#8a8d91",
        "metal": "#ff8a1f",
        "track": "rgba(242,242,238,.06)",
        "bink": "#f2f2ee",
        "ptr": "#ff8a1f",
        "grain": "transparent",
        "panel": "#1b1c1e",
        "screw": "#2a2c2f",
        "off": ".42",
        "font": "var(--f-cond)",
        "tsz": "50px",
        "numf": "16px",
        "numw": "600",
        "timew": "500",
        "tkw": "1.5",
        "tko": ".9",
        "tkq": ".45",
        "s-syd": "#4fa6c8",
        "s-tky": "#e9724f",
        "s-ldn": "#66b86a",
        "s-ny": "#a38bd9"
      }
    },
    "sus": {
      "form": "dial",
      "name": "ステンレス",
      "scheme": "light",
      "chip": [
        "#eef1f4",
        "#c8102e"
      ],
      "deco": {
        "nums": "ar",
        "extra": "hairline",
        "bez": [
          "#f6f8fa",
          "#b4bbc4",
          "#eef1f4",
          "#99a2ad",
          "#e6e9ed"
        ],
        "face": [
          "#f9fafc",
          "#dde2e8"
        ]
      },
      "color": {
        "bg": "#e3e6ea",
        "bg2": "#d5dae0",
        "face": "#eef1f4",
        "line": "#98a0aa",
        "ink": "#1c2a46",
        "sub": "#5d6878",
        "metal": "#c8102e",
        "track": "rgba(28,42,70,.07)",
        "bink": "#1c2a46",
        "ptr": "#c8102e",
        "grain": "rgba(28,42,70,.07)",
        "panel": "transparent",
        "screw": "transparent",
        "off": ".42",
        "font": "var(--f-ui)",
        "tsz": "var(--dial-f-time)",
        "numf": "var(--dial-f-num)",
        "numw": "500",
        "timew": "700",
        "tkw": "1",
        "tko": ".7",
        "tkq": ".32",
        "s-syd": "#3b8db2",
        "s-tky": "#d0573f",
        "s-ldn": "#3f985a",
        "s-ny": "#6b57b4"
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
    },
    "shiro": {
      "form": "big",
      "name": "白",
      "scheme": "light",
      "chip": [
        "#f1f1ee",
        "#121212"
      ],
      "color": {
        "bg": "#f1f1ee",
        "ink": "#121212",
        "sub": "#5c5c57",
        "line": "#d9d9d4",
        "bar": "#121212",
        "axis": "#bdbdb7",
        "red": "#d23c2c",
        "on": "#1c7a45"
      }
    },
    "kuro": {
      "form": "big",
      "name": "黒",
      "scheme": "dark",
      "chip": [
        "#0c0c0c",
        "#f2f2ee"
      ],
      "color": {
        "bg": "#0c0c0c",
        "ink": "#f2f2ee",
        "sub": "#9a9a94",
        "line": "#2a2a2a",
        "bar": "#f2f2ee",
        "axis": "#4a4a46",
        "red": "#ff5a4a",
        "on": "#4fd08a"
      }
    },
    "pink": {
      "form": "donut",
      "name": "ピンク",
      "scheme": "light",
      "chip": [
        "#fdf2f6",
        "#ff9ec4"
      ],
      "color": {
        "bg": "#fdf2f6",
        "ink": "#5a3d55",
        "sub": "#b58aa0",
        "line": "#f1d3df",
        "ring-bg": "#f9dfe8",
        "ring-a": "#ff9ec4",
        "ring-b": "#b9a2ff",
        "knob": "#ffffff",
        "knob-edge": "#ff9ec4",
        "left": "#e2668f",
        "star1": "#ffc2d6",
        "star2": "#cdbdff",
        "star3": "#ffd98a",
        "tag-bg": "#ffffff",
        "tag-ink": "#7a5a73",
        "next-bg": "#ff9ec4",
        "next-ink": "#ffffff",
        "on-bg": "#efe8ff",
        "on-ink": "#6b55b5",
        "on-line": "#ddd2ff",
        "g-bg": "#fff3c9",
        "g-ink": "#9a6a00",
        "g-line": "#f3dc8c"
      }
    },
    "mint": {
      "form": "donut",
      "name": "ミント",
      "scheme": "light",
      "chip": [
        "#effaf5",
        "#7fdcc0"
      ],
      "color": {
        "bg": "#effaf5",
        "ink": "#2f5a4e",
        "sub": "#7aa597",
        "line": "#cdeee2",
        "ring-bg": "#d4f1e6",
        "ring-a": "#7fdcc0",
        "ring-b": "#ffd96a",
        "knob": "#ffffff",
        "knob-edge": "#7fdcc0",
        "left": "#22a07f",
        "star1": "#a8ecd6",
        "star2": "#ffe59a",
        "star3": "#ffe59a",
        "tag-bg": "#ffffff",
        "tag-ink": "#2f5a4e",
        "next-bg": "#22a07f",
        "next-ink": "#ffffff",
        "on-bg": "#dcf5eb",
        "on-ink": "#1d7d63",
        "on-line": "#b3e6d3",
        "g-bg": "#fff6d4",
        "g-ink": "#8a6a00",
        "g-line": "#f3e09a"
      }
    },
    "hogan": {
      "form": "planner",
      "name": "方眼の白",
      "scheme": "light",
      "chip": [
        "#fbfaf6",
        "#e0503a"
      ],
      "color": {
        "bg": "#fbfaf6",
        "ink": "#3d3a35",
        "sub": "#8b8478",
        "line": "#e3ddd0",
        "grid": "#e4dfd3",
        "half": "#eee9de",
        "pen": "#ffe680",
        "now": "#e0503a",
        "stamp": "#d9473a",
        "stamp-plain": "#a39d92",
        "dot-fix": "#e0a400",
        "dot-open": "#6f8fc9",
        "dot-minor": "#b9b2a6",
        "s-syd": "#a8d4dd",
        "s-tky": "#f4b4a8",
        "s-ldn": "#bcdcae",
        "s-ny": "#cdbde9"
      }
    },
    "kraft": {
      "form": "planner",
      "name": "クラフト紙",
      "scheme": "light",
      "chip": [
        "#e8d9bd",
        "#c8402e"
      ],
      "color": {
        "bg": "#e8d9bd",
        "ink": "#4a3a28",
        "sub": "#7d6a52",
        "line": "#d2bf9c",
        "grid": "#d6c4a2",
        "half": "#dccbab",
        "pen": "#fff27a",
        "now": "#c8402e",
        "stamp": "#c8402e",
        "stamp-plain": "#998468",
        "dot-fix": "#b98600",
        "dot-open": "#58739f",
        "dot-minor": "#a8977c",
        "s-syd": "#8fbcc4",
        "s-tky": "#dc9a8b",
        "s-ldn": "#a6c495",
        "s-ny": "#b6a5d4"
      }
    },
    "kurai": {
      "form": "widget",
      "name": "くらい",
      "scheme": "dark",
      "chip": [
        "#1c1c1e",
        "#ff9f0a"
      ],
      "color": {
        "bg": "#304c5a",
        "ink": "#ffffff",
        "sub": "#a1a1a6",
        "line": "rgba(255,255,255,.28)",
        "wall-a": "#304c5a",
        "wall-b": "#5f7f86",
        "wall-c": "#b9a98f",
        "lab": "rgba(255,255,255,.75)",
        "tile": "rgba(28,28,30,.92)",
        "track": "#3a3a3c",
        "accent": "#ff9f0a",
        "on": "#30d158",
        "dot": "#48484a"
      }
    },
    "akarui": {
      "form": "widget",
      "name": "明るい",
      "scheme": "light",
      "chip": [
        "#ffffff",
        "#ff9500"
      ],
      "color": {
        "bg": "#dfe8ee",
        "ink": "#1c1c1e",
        "sub": "#6e6e73",
        "line": "rgba(28,28,30,.18)",
        "wall-a": "#dfe8ee",
        "wall-b": "#ebebe9",
        "wall-c": "#f6efe4",
        "lab": "rgba(28,28,30,.62)",
        "tile": "rgba(255,255,255,.92)",
        "track": "#e5e5ea",
        "accent": "#ff9500",
        "on": "#34c759",
        "dot": "#c7c7cc"
      }
    }
  }
};
export const SKINS = TABLE.skins;
export const SIZE = TABLE.forms;
