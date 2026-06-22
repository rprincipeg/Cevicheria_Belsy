tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary":                     "#00288e",
                "primary-container":           "#1e40af",
                "primary-fixed":               "#dde1ff",
                "primary-fixed-dim":           "#b8c4ff",
                "on-primary":                  "#ffffff",
                "on-primary-container":        "#a8b8ff",
                "on-primary-fixed":            "#001453",
                "on-primary-fixed-variant":    "#173bab",
                "inverse-primary":             "#b8c4ff",
                "surface-tint":                "#3755c3",

                "secondary":                   "#006a61",
                "secondary-container":         "#86f2e4",
                "secondary-fixed":             "#89f5e7",
                "secondary-fixed-dim":         "#6bd8cb",
                "on-secondary":                "#ffffff",
                "on-secondary-container":      "#006f66",
                "on-secondary-fixed":          "#00201d",
                "on-secondary-fixed-variant":  "#005049",

                "tertiary":                    "#611e00",
                "tertiary-container":          "#872d00",
                "tertiary-fixed":              "#ffdbce",
                "tertiary-fixed-dim":          "#ffb599",
                "on-tertiary":                 "#ffffff",
                "on-tertiary-container":       "#ffa582",
                "on-tertiary-fixed":           "#370e00",
                "on-tertiary-fixed-variant":   "#7f2b00",

                "surface":                     "#f6fafe",
                "surface-dim":                 "#d6dade",
                "surface-bright":              "#f6fafe",
                "surface-container-lowest":    "#ffffff",
                "surface-container-low":       "#f0f4f8",
                "surface-container":           "#eaeef2",
                "surface-container-high":      "#e4e9ed",
                "surface-container-highest":   "#dfe3e7",
                "surface-variant":             "#dfe3e7",
                "on-surface":                  "#171c1f",
                "on-surface-variant":          "#444653",
                "inverse-surface":             "#2c3134",
                "inverse-on-surface":          "#edf1f5",

                "background":                  "#f6fafe",
                "on-background":               "#171c1f",

                "outline":                     "#757684",
                "outline-variant":             "#c4c5d5",

                "error":                       "#ba1a1a",
                "error-container":             "#ffdad6",
                "on-error":                    "#ffffff",
                "on-error-container":          "#93000a"
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg":      "0.5rem",
                "xl":      "0.75rem",
                "full":    "9999px"
            },
            spacing: {
                "touch-target-min":    "48px",
                "container-max-width": "1280px",
                "margin":              "32px",
                "unit":                "8px",
                "gutter":              "24px"
            },
            fontFamily: {
                "headline-md": ["Inter"],
                "label-md":    ["Inter"],
                "body-lg":     ["Inter"],
                "display-lg":  ["Inter"],
                "headline-lg": ["Inter"],
                "body-md":     ["Inter"],
                "label-lg":    ["Inter"]
            },
            fontSize: {
                "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
                "label-md":    ["12px", { lineHeight: "16px", fontWeight: "500" }],
                "body-lg":     ["18px", { lineHeight: "28px", fontWeight: "400" }],
                "display-lg":  ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
                "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }],
                "body-md":     ["16px", { lineHeight: "24px", fontWeight: "400" }],
                "label-lg":    ["14px", { lineHeight: "20px", fontWeight: "600" }]
            }
        }
    }
}
