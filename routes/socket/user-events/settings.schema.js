const { z } = require('zod');

// Theme update: a marker `field` plus any of the five colour fields (all strings).
const THEME_COLOR_FIELDS = ['primaryColor', 'secondaryColor', 'tertiaryColor', 'backgroundColor', 'textColor'];

const themeSchema = z
	.object({
		field: z.string(),
		primaryColor: z.string().optional(),
		secondaryColor: z.string().optional(),
		tertiaryColor: z.string().optional(),
		backgroundColor: z.string().optional(),
		textColor: z.string().optional()
	})
	.passthrough();

// Game settings is an arbitrary key/value map; the handler whitelists which keys it
// applies. The schema only guarantees it's an object so `for..in`/`data.x` can't throw.
const gameSettingsSchema = z.object({}).passthrough();

// Replaces the manual typeof checks for the blacklist setting.
const blacklistSchema = z.array(z.object({ userName: z.string(), reason: z.string(), timestamp: z.number() }).passthrough()).max(30);

// Bio is sent as a bare string.
const bioSchema = z.string();

module.exports = { themeSchema, gameSettingsSchema, blacklistSchema, bioSchema, THEME_COLOR_FIELDS };
