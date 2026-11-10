import React from "react";
import { shallow } from "enzyme";
import Moderation from "./Moderation";
import { compareModLogEntries, formatModAction } from "./mod-log-sorting";

const sort = (rows, type, direction = "ascending") =>
  [...rows].sort((a, b) => compareModLogEntries(a, b, { type, direction }));

it.each([
  ["modUserName", "Beta", "alpha"],
  ["date", "2026-10-01T00:00:00Z", "2026-09-30T20:30:00-04:00"],
  ["actionTaken", "getIP", "ipban"], // "18 Hour IP Ban" precedes "Get IP", unlike the raw codes.
  ["userActedOn", "Player10", "player2"],
  ["ip", "-192.168.10.1", "192.168.2.1"],
  ["modNotes", "Case 12", "case 3"],
])("sorts the %s header in both directions using its displayed value", (type, high, low) => {
  // The date case above crosses a timezone boundary: Oct 1 00:00Z precedes Oct 1 00:30Z.
  const first = { [type]: high };
  const second = { [type]: low };
  const ordered = type === "date" ? [first, second] : [second, first];
  expect(sort([first, second], type)).toEqual(ordered);
  expect(sort([first, second], type, "descending")).toEqual([...ordered].reverse());
});

it("sorts action labels, keeping unknown historical actions readable", () => {
  expect(formatModAction("getIP")).toBe("Get IP");
  expect(formatModAction("oldAction")).toBe("oldAction");
  expect(formatModAction("constructor")).toBe("constructor");
  expect(
    sort([{ actionTaken: "getIP" }, { actionTaken: "deleteUser" }, { actionTaken: "ipban" }], "actionTaken")
  ).toEqual([{ actionTaken: "ipban" }, { actionTaken: "deleteUser" }, { actionTaken: "getIP" }]);
});

it("compares obfuscated IP blocks numerically while ignoring the display prefix", () => {
  const values = ["-900.300.700.800/24", "-300.900.700.800", "300.400.700.800", "300.400.700.800/16"];
  const rows = values.map((ip) => ({ ip }));
  expect(sort(rows, "ip").map((row) => row.ip)).toEqual([values[2], values[3], values[1], values[0]]);
  expect(compareModLogEntries({ ip: "-300.400.700.800" }, { ip: "300.400.700.800" }, { type: "ip" })).toBe(0);
  expect(rows.map((row) => row.ip)).toEqual(values);
});

it("sorts IPv6 hexadecimal groups and compressed forms by their address value", () => {
  const rows = ["-2001:db8::a0", "2001:0db8:0000:0000:0000:0000:0000:009f", "2001:db8::1"].map((ip) => ({ ip }));
  expect(sort(rows, "ip").map((row) => row.ip)).toEqual([rows[2].ip, rows[1].ip, rows[0].ip]);
});

it.each([
  "modUserName",
  "date",
  "actionTaken",
  "userActedOn",
  "ip",
  "modNotes",
])("keeps missing %s values last and equal values stable without changing the source list", (type) => {
  const value = type === "date" ? "2026-10-01" : type === "ip" ? "1.2.3.4" : "same";
  const rows = [{ id: "missing" }, { id: "first", [type]: value }, { id: "second", [type]: value }];
  for (const direction of ["ascending", "descending"]) {
    expect(sort(rows, type, direction).map((row) => row.id)).toEqual(["first", "second", "missing"]);
    expect(compareModLogEntries(rows[1], rows[2], { type, direction })).toBe(0);
  }
  expect(rows.map((row) => row.id)).toEqual(["missing", "first", "second"]);
});

it("treats malformed historical dates as missing rather than reversing comparator results", () => {
  const rows = [{ date: "invalid" }, { date: "2026-01-01" }, { date: null }];
  expect(sort(rows, "date")).toEqual([rows[1], rows[0], rows[2]]);
  expect(sort(rows, "date", "descending")).toEqual([rows[1], rows[0], rows[2]]);
});

it("connects every header to sorted rows and toggles its direction on the next click", () => {
  const component = shallow(<Moderation socket={{ on: jest.fn(), off: jest.fn(), emit: jest.fn() }} />, {
    disableLifecycleMethods: true,
  });
  component.setState({
    log: [
      {
        modUserName: "Beta",
        date: "2026-02-01",
        actionTaken: "getIP",
        userActedOn: "Player10",
        ip: "-10.0.0.1",
        modNotes: "Case12",
      },
      {
        modUserName: "alpha",
        date: "2026-01-01",
        actionTaken: "deleteUser",
        userActedOn: "player2",
        ip: "-2.0.0.1",
        modNotes: "case3",
      },
    ],
  });
  const table = () => shallow(component.instance().renderModLog());
  for (let column = 0; column < 6; column++) {
    // Date starts descending; reset to a different column so the first click consistently descends.
    component.setState({ logSort: { type: "none", direction: "ascending" } });
    table().find("th").at(column).simulate("click");
    expect(table().find("tbody tr").first().find("td").first().text()).toBe("Beta");
    table().find("th").at(column).simulate("click");
    expect(table().find("tbody tr").first().find("td").first().text()).toBe("alpha");
  }
  component.unmount();
});

it("renders a missing historical comment without crashing the log", () => {
  const component = shallow(<Moderation socket={{ on: jest.fn(), off: jest.fn(), emit: jest.fn() }} />, {
    disableLifecycleMethods: true,
  });
  component.setState({
    log: [{ modUserName: "Mod", date: "2026-01-01", actionTaken: "comment", userActedOn: "Player" }],
  });
  expect(() => shallow(component.instance().renderModLog())).not.toThrow();
  component.unmount();
});
