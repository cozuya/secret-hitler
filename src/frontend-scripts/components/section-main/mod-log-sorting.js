const actionLabels = {
  comment: "Comment",
  warn: "Issue Warning",
  removeWarning: "Delete Warning",
  getIP: "Get IP",
  ban: "Ban",
  setSticky: "Set Sticky",
  ipbanlarge: "1 Week IP Ban",
  ipban: "18 Hour IP Ban",
  enableAccountCreation: "Enable Account Creation",
  disableAccountCreation: "Disable Account Creation",
  enableVPNCheck: "Enable VPN Check",
  disableVPNCheck: "Disable VPN Check",
  togglePrivate: "Toggle Private (Permanent)",
  togglePrivateEighteen: "Toggle Private (Temporary)",
  timeOut: "Timeout and IP Timeout 18 Hours",
  timeOut2: "Timeout 18 Hours",
  timeOut3: "Timeout and IP Timeout 1 Hour",
  timeOut4: "Timeout 6 Hours",
  clearTimeout: "Clear Timeout",
  clearTimeoutIP: "Clear IP Ban",
  clearTimeoutAndTimeoutIP: "Clear Timeout and IP Timeout",
  modEndGame: "End Game",
  deleteGame: "Delete Game",
  enableIpBans: "Enable IP Bans",
  disableIpBans: "Disable IP Bans",
  disableGameCreation: "Disable Game Creation",
  enableGameCreation: "Enable Game Creation",
  disableIpbans: "Disable IP Bans",
  enableIpbans: "Enable IP Bans",
  broadcast: "Broadcast",
  fragBanLarge: "1 Week Fragment Ban",
  fragBanSmall: "18 Hour Fragment Ban",
  clearGenchat: "Clear General Chat",
  deleteUser: "Delete User",
  deleteBio: "Delete Bio",
  deleteProfile: "Delete Profile",
  deleteCardback: "Delete Cardback",
  setPlayerPronouns: "Set Player Pronouns",
  resetGameName: "Reset Game Name",
  rainbowUser: "Grant Rainbow",
  removeStaffRole: "Remove Staff Role",
  toggleContributor: "Add/Remove Role (Contributor)",
  toggleTourneyMod: "Add/Remove Role (Tourney Mod)",
  promoteToAltMod: "Promote (Staff Alt)",
  promoteToTrialMod: "Promote (Trial Mod)",
  promoteToVeteran: "Promote (Veteran Staff)",
  promoteToMod: "Promote (Mod)",
  promoteToEditor: "Promote (Editor)",
  makeBypass: "Create Bypass Key",
  bypassKeyUsed: "Consume Bypass Key",
  resetServer: "Server Restart",
  regatherAEMList: "Refresh Staff List",
};

export const formatModAction = (action) =>
  Object.prototype.hasOwnProperty.call(actionLabels, action) ? actionLabels[action] : String(action ?? "");

const textOrder = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const dateValue = (value) => {
  if (value == null || value === "") return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const addressValue = (value) => {
  const sections = String(value ?? "")
    .trim()
    .replace(/^-/, "")
    .split("/");
  const [address, prefix] = sections;
  if (sections.length > 2 || (prefix != null && (!/^\d+$/.test(prefix) || !Number.isFinite(Number(prefix)))))
    return null;
  const ipv4 = address.split(".");
  if (ipv4.length === 4 && ipv4.every((part) => /^\d+$/.test(part) && Number.isFinite(Number(part)))) {
    return [4, ...ipv4.map(Number), prefix == null ? -1 : Number(prefix)];
  }
  const halves = address.split("::");
  if (address.includes(":") && halves.length <= 2) {
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];
    const parts =
      halves.length === 2 ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
    if (parts.length === 8 && parts.every((part) => /^[\da-f]{1,4}$/i.test(part))) {
      return [6, ...parts.map((part) => parseInt(part, 16)), prefix == null ? -1 : Number(prefix)];
    }
  }
  return null;
};

const compareAddresses = (a, b) => {
  const first = addressValue(a);
  const second = addressValue(b);
  if (first && second) {
    for (let index = 0; index < first.length; index++) {
      if (first[index] !== second[index]) return first[index] < second[index] ? -1 : 1;
    }
    return 0;
  }
  if (first || second) return first ? -1 : 1;
  return textOrder.compare(a.replace(/^-/, ""), b.replace(/^-/, ""));
};

// Compare the values shown in each column, not internal action codes. Returning
// zero for equal keys preserves received order without shuffling tied rows.
export const compareModLogEntries = (a, b, { type, direction }) => {
  const first =
    type === "date"
      ? dateValue(a.date)
      : type === "actionTaken"
        ? formatModAction(a[type])
        : String(a[type] ?? "").trim();
  const second =
    type === "date"
      ? dateValue(b.date)
      : type === "actionTaken"
        ? formatModAction(b[type])
        : String(b[type] ?? "").trim();
  const firstMissing = first == null || first === "";
  const secondMissing = second == null || second === "";
  // Keep missing values last in either direction, including malformed historical dates.
  if (firstMissing || secondMissing) return firstMissing === secondMissing ? 0 : firstMissing ? 1 : -1;
  const order =
    type === "date"
      ? Math.sign(first - second)
      : type === "ip"
        ? compareAddresses(first, second)
        : textOrder.compare(first, second);
  return order === 0 ? 0 : direction === "descending" ? -order : order;
};
