import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatientStep } from "./PatientStep";
import type { PatientData } from "../../api/client";

const VALID_SELF_REPORT_PARTIAL_DOB: PatientData = {
  patientFirstName: "Casey",
  patientLastName: "Caregiver",
  patientDateOfBirth: "1990-05",
  dateOfBirthUnknown: false,
  patientSex: "female",
  ageYears: "",
  ageMonths: "",
  patientStreet: "",
  patientCity: "",
  patientState: "",
  patientCounty: "",
  patientZip: "",
  patientPhone: "",
  patientEmail: "",
  patientEmailConfirm: "",
  pregnant: "",
  pregnancyDetails: "",
  medicationsAtVaccination: "",
  allergies: "",
  recentIllnesses: "",
  chronicConditions: "",
  patientRace: [],
  patientRaceOther: "",
  patientEthnicity: "",
};

const noop = async () => {};

describe("PatientStep — self-report date-of-birth redirect notice", () => {
  it("REGRESSION: a self-report with only month/year of birth shows the 'unusual for a self-report' notice and a switch-to-caregiver button", async () => {
    const user = userEvent.setup();
    render(
      <PatientStep
        submitterType="public"
        isSelfReport={true}
        initialData={VALID_SELF_REPORT_PARTIAL_DOB}
        onNext={noop}
        onBack={noop}
        onSwitchSubmitterType={() => {}}
      />
    );
    // Starts on the review screen (initialData is already schema-valid) —
    // jump back to the date-of-birth question specifically, exactly as a
    // reporter would via the recap pill / "Edit answer" link.
    await user.click(screen.getByRole("button", { name: /Edit answer: Date of birth/i }));
    expect(
      screen.getByText("Not knowing your own exact date of birth is unusual for a self-report.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change who's filling out this report" })).toBeInTheDocument();
  });

  it("does not show the redirect notice for a caregiver report with the same partial date of birth", async () => {
    const user = userEvent.setup();
    render(
      <PatientStep
        submitterType="public"
        isSelfReport={false}
        initialData={VALID_SELF_REPORT_PARTIAL_DOB}
        onNext={noop}
        onBack={noop}
        onSwitchSubmitterType={() => {}}
      />
    );
    await user.click(screen.getByRole("button", { name: /Edit answer: Date of birth/i }));
    expect(
      screen.queryByText("Not knowing your own exact date of birth is unusual for a self-report.")
    ).not.toBeInTheDocument();
  });
});
