import React from "react";
import {
  X,
  Settings,
  Info,
  Hourglass,
  Handshake,
  FastForward,
  ThumbsUp,
  VenetianMask,
  Smile,
  Shield,
  VolumeX,
  Lock,
  Gavel,
  Crown,
  MoveHorizontal,
  EyeOff,
  Plane,
  Play,
  SkipForward,
  LogOut,
  Share2,
  Ban,
  Filter,
  User,
  CircleHelp,
  SquareMinus,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Repeat,
  // Extended set, added for the full migration.
  Gamepad2,
  MessageCircle,
  Volume2,
  Pencil,
  AlarmClock,
  Rewind,
  SkipBack,
  MessageSquare,
  MessageSquareMore,
  Circle,
  Eye,
  File,
  FileText,
  LockOpen,
  GraduationCap,
  MessageCircleOff,
  Flame,
  LogIn,
} from "lucide-react";

// In-app icon name -> Lucide glyph. These are the Lucide replacements chosen for the icon
// refresh; the Semantic-font originals each one replaces are documented in
// .semantic-visual-diff/MIGRATION-PLAN.md. Extend this map as more icons migrate off the
// Semantic font. Imported explicitly (not via lucide-react's `icons` map) so webpack only
// bundles the glyphs we actually use.
const REGISTRY = {
  x: X,
  settings: Settings,
  info: Info,
  hourglass: Hourglass,
  handshake: Handshake,
  "fast-forward": FastForward,
  "thumbs-up": ThumbsUp,
  "venetian-mask": VenetianMask,
  smile: Smile,
  shield: Shield,
  "volume-x": VolumeX,
  lock: Lock,
  gavel: Gavel,
  crown: Crown,
  "move-horizontal": MoveHorizontal,
  "eye-off": EyeOff,
  plane: Plane,
  play: Play,
  "skip-forward": SkipForward,
  "log-out": LogOut,
  "share-2": Share2,
  ban: Ban,
  filter: Filter,
  user: User,
  "circle-help": CircleHelp,
  "square-minus": SquareMinus,
  check: Check,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  repeat: Repeat,
  // Extended set. Ambiguous Semantic->Lucide picks (no exact match) — change the glyph here
  // in one line if a better fit is wanted: `game`->gamepad-2, `talk`->message-circle,
  // `edit`->pencil, `alarm`->alarm-clock. (`chess`/`chess king` reuse `crown` above;
  // `flipped play` is handled at the call site with a CSS flip.) The Gamechat state toggles
  // use message-square(+ -more), circle, eye, and file(-text).
  "gamepad-2": Gamepad2,
  "message-circle": MessageCircle,
  "volume-2": Volume2,
  pencil: Pencil,
  "alarm-clock": AlarmClock,
  rewind: Rewind,
  "skip-back": SkipBack,
  "message-square": MessageSquare,
  "message-square-more": MessageSquareMore,
  circle: Circle,
  eye: Eye,
  file: File,
  "file-text": FileText,
  "lock-open": LockOpen,
  // practice game (was Semantic `chess`); graduation-cap reads as "practice/learning".
  "graduation-cap": GraduationCap,
  // disabled-chat composite (was a stacked game-icon + red remove); single slashed bubble.
  "message-circle-off": MessageCircleOff,
  flame: Flame,
  "log-in": LogIn,
};

// Shared wrapper for the Lucide icon migration. Renders a Lucide glyph inside a
// `.lucide-icon` shim span whose box mirrors Semantic's `.icon` footprint, so swapping a
// font icon for this one does not change layout (the shim is what prevents wrapping/height
// regressions). The SVG inherits `color` via currentColor, so account theming
// (`--theme-secondary` on `i.icon, .lucide-icon`) tints it exactly like the old font icons.
//
// Not yet wired into any call site — this is the Step 0 foundation; per-component swaps
// follow incrementally while the Semantic font stays live.
const Icon = ({ name, className = "", strokeWidth = 2.25, ...rest }) => {
  const Glyph = REGISTRY[name];
  // Unknown/typo'd name renders nothing rather than throwing: a bad icon name must never
  // crash a render. Intentional, not an oversight.
  if (!Glyph) return null;
  return (
    <span className={`lucide-icon ${className}`.trim()} {...rest}>
      <Glyph strokeWidth={strokeWidth} />
    </span>
  );
};

export default Icon;
