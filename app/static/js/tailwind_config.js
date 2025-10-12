tailwind.config = {
	theme: {
		extend: {
			colors: {
				"dark-blue": "#1e1e2f",
			},
			keyframes: {
				"dot-pulse": {
					"0%, 80%, 100%": {
						transform: "scale(0.6)",
						opacity: "0.6",
					},
					"40%": {
						transform: "scale(1)",
						opacity: "1",
					},
				},
			},
			animation: {
				"dot-pulse": "dot-pulse 1.4s infinite ease-in-out",
			},
		},
	},
};
