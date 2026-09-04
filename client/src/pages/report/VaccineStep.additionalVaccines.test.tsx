import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdditionalVaccinesEditor } from "./VaccineStep";
import type { AdditionalVaccineRow } from "../../api/client";

const VACCINE_OPTIONS = [
  { value: "covid19", label: "COVID-19" },
  { value: "flu", label: "Influenza (Flu)" },
  { value: "other", label: "Other" },
];

function blankRow(overrides: Partial<AdditionalVaccineRow> = {}): AdditionalVaccineRow {
  return {
    vaccineType: "",
    vaccineTypeOther: "",
    manufacturer: "",
    lotNumber: "",
    route: "",
    bodySite: "",
    bodySiteOther: "",
    doseNumber: "",
    ...overrides,
  };
}

describe("AdditionalVaccinesEditor", () => {
  it("a blank row shows no error and is not marked invalid", () => {
    render(
      <AdditionalVaccinesEditor
        value={[blankRow()]}
        onChange={() => {}}
        vaccineTypeOptions={VACCINE_OPTIONS}
        isHcp={false}
        errors={{}}
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Vaccine" })).not.toHaveAttribute("aria-invalid", "true");
  });

  it("REGRESSION: a partial row's error is visible with an accessible message identifying the row", () => {
    render(
      <AdditionalVaccinesEditor
        value={[blankRow({ manufacturer: "moderna" })]}
        onChange={() => {}}
        vaccineTypeOptions={VACCINE_OPTIONS}
        isHcp={false}
        errors={{ "0.vaccineType": "Select the vaccine for this row, or remove it" }}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Select the vaccine for this row, or remove it");
    expect(screen.getByRole("combobox", { name: "Vaccine" })).toHaveAttribute("aria-invalid", "true");
  });

  it("REGRESSION: the first invalid row's control receives focus", () => {
    render(
      <AdditionalVaccinesEditor
        value={[blankRow({ manufacturer: "moderna" }), blankRow({ vaccineType: "flu" })]}
        onChange={() => {}}
        vaccineTypeOptions={VACCINE_OPTIONS}
        isHcp={false}
        errors={{ "0.vaccineType": "Select the vaccine for this row, or remove it" }}
      />
    );
    expect(document.activeElement).toHaveAttribute("id", "additional-0-type");
  });

  it("correcting the row (selecting a vaccine) reports the fix to the parent", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AdditionalVaccinesEditor
        value={[blankRow({ manufacturer: "moderna" })]}
        onChange={onChange}
        vaccineTypeOptions={VACCINE_OPTIONS}
        isHcp={false}
        errors={{ "0.vaccineType": "Select the vaccine for this row, or remove it" }}
      />
    );
    const combobox = screen.getByRole("combobox", { name: "Vaccine" });
    await user.click(combobox);
    await user.type(combobox, "Flu");
    await user.click(screen.getByRole("option", { name: "Influenza (Flu)" }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ vaccineType: "flu", manufacturer: "" }),
    ]);
  });

  it("removing a row reports the remaining row(s), correctly re-indexed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const rows = [blankRow({ vaccineType: "covid19" }), blankRow({ vaccineType: "flu" })];
    render(
      <AdditionalVaccinesEditor value={rows} onChange={onChange} vaccineTypeOptions={VACCINE_OPTIONS} isHcp={false} errors={{}} />
    );
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await user.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ vaccineType: "flu" })]);
  });

  it("selecting 'Other' reveals a plain-text vaccine-name field", () => {
    render(
      <AdditionalVaccinesEditor
        value={[blankRow({ vaccineType: "other" })]}
        onChange={() => {}}
        vaccineTypeOptions={VACCINE_OPTIONS}
        isHcp={false}
        errors={{}}
      />
    );
    expect(screen.getByLabelText("Please specify the vaccine")).toBeInTheDocument();
  });

  it("changing away from 'Other' clears the stale vaccine-name text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AdditionalVaccinesEditor
        value={[blankRow({ vaccineType: "other", vaccineTypeOther: "Some old brand" })]}
        onChange={onChange}
        vaccineTypeOptions={VACCINE_OPTIONS}
        isHcp={false}
        errors={{}}
      />
    );
    const combobox = screen.getByRole("combobox", { name: "Vaccine" });
    await user.click(combobox);
    await user.clear(combobox);
    await user.type(combobox, "Flu");
    await user.click(screen.getByRole("option", { name: "Influenza (Flu)" }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ vaccineType: "flu", vaccineTypeOther: "" }),
    ]);
  });

  it("REGRESSION: a public row's manufacturer list matches the selected vaccine, not just 'Unknown'", () => {
    render(
      <AdditionalVaccinesEditor
        value={[blankRow({ vaccineType: "covid19" })]}
        onChange={() => {}}
        vaccineTypeOptions={VACCINE_OPTIONS}
        isHcp={false}
        errors={{}}
      />
    );
    const manufacturerSelect = screen.getByLabelText("Manufacturer");
    expect(within(manufacturerSelect).getByRole("option", { name: "Pfizer-BioNTech" })).toBeInTheDocument();
    expect(within(manufacturerSelect).getByRole("option", { name: "Moderna" })).toBeInTheDocument();
  });

  it("an HCP row still resolves manufacturers through the HCP vaccine list", () => {
    render(
      <AdditionalVaccinesEditor
        value={[blankRow({ vaccineType: "covid19" })]}
        onChange={() => {}}
        vaccineTypeOptions={VACCINE_OPTIONS}
        isHcp={true}
        errors={{}}
      />
    );
    const manufacturerSelect = screen.getByLabelText("Manufacturer");
    // The HCP vaccine-code space doesn't recognize the public "covid19"
    // code, so it correctly falls back to the generic single-option list —
    // this pins that an HCP row uses the HCP-path function at all (a wrong
    // wire-up the other direction would show the public COVID-19 brands
    // here instead).
    expect(within(manufacturerSelect).getAllByRole("option")).toHaveLength(2);
  });
});
