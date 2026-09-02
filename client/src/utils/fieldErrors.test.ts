import { describe, expect, it } from "vitest";
import {
  errorBelongsToField,
  errorsForField,
  fieldHasError,
  firstErrorForField,
  relativeErrorsForField,
} from "./fieldErrors";

describe("errorBelongsToField", () => {
  it("matches an exact top-level path", () => {
    expect(errorBelongsToField("vaccineType", "vaccineType")).toBe(true);
  });

  it("matches a dot-nested path", () => {
    expect(errorBelongsToField("additionalVaccines.0.vaccineType", "additionalVaccines")).toBe(true);
  });

  it("matches a bracket-nested path", () => {
    expect(errorBelongsToField("items[0].name", "items")).toBe(true);
  });

  it("does not match an unrelated field, including one with the same prefix text", () => {
    expect(errorBelongsToField("vaccineTypeOther", "vaccineType")).toBe(false);
    expect(errorBelongsToField("otherField", "vaccineType")).toBe(false);
  });
});

describe("errorsForField / fieldHasError / firstErrorForField", () => {
  const errors = {
    vaccineType: "Select the vaccine given",
    "additionalVaccines.0.vaccineType": "Select the vaccine for this row, or remove it",
    "additionalVaccines.1.vaccineTypeOther": "Enter the vaccine name for this row",
    manufacturer: "Manufacturer is required",
  };

  it("collects every error nested under a field, in insertion order", () => {
    const found = errorsForField(errors, "additionalVaccines");
    expect(found).toEqual([
      { path: "additionalVaccines.0.vaccineType", message: "Select the vaccine for this row, or remove it" },
      { path: "additionalVaccines.1.vaccineTypeOther", message: "Enter the vaccine name for this row" },
    ]);
  });

  it("fieldHasError is true when any nested error exists", () => {
    expect(fieldHasError(errors, "additionalVaccines")).toBe(true);
    expect(fieldHasError(errors, "priorVaccines")).toBe(false);
  });

  it("firstErrorForField returns the first match's message", () => {
    expect(firstErrorForField(errors, "additionalVaccines")).toBe(
      "Select the vaccine for this row, or remove it"
    );
    expect(firstErrorForField(errors, "manufacturer")).toBe("Manufacturer is required");
    expect(firstErrorForField(errors, "lotNumber")).toBeUndefined();
  });
});

describe("relativeErrorsForField", () => {
  it("strips the field id prefix so a row editor can look itself up by row index", () => {
    const errors = {
      "additionalVaccines.0.vaccineType": "Select the vaccine for this row, or remove it",
      "additionalVaccines.2.vaccineTypeOther": "Enter the vaccine name for this row",
      manufacturer: "unrelated",
    };
    expect(relativeErrorsForField(errors, "additionalVaccines")).toEqual({
      "0.vaccineType": "Select the vaccine for this row, or remove it",
      "2.vaccineTypeOther": "Enter the vaccine name for this row",
    });
  });

  it("keeps a field's own top-level error under an empty-string key", () => {
    const errors = { vaccineType: "Select the vaccine given" };
    expect(relativeErrorsForField(errors, "vaccineType")).toEqual({ "": "Select the vaccine given" });
  });

  it("returns an empty object when nothing matches", () => {
    expect(relativeErrorsForField({ manufacturer: "x" }, "additionalVaccines")).toEqual({});
  });
});
