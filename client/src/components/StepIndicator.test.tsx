import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepIndicator } from "./StepIndicator";
import type { StepId } from "../../../shared/src/branchingRules";

const STEPS: StepId[] = ["submitter-type", "before-you-start", "about-you", "patient", "vaccine"];

describe("StepIndicator — jump-to-completed-step controls", () => {
  it("REGRESSION: without onStepClick, completed steps render as plain (non-interactive) labels", () => {
    render(<StepIndicator steps={STEPS} currentStep="vaccine" />);
    expect(screen.queryByRole("button", { name: "About you" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Jump to a completed step" })).not.toBeInTheDocument();
  });

  it("renders a clickable label for each completed step, and none for the current/upcoming ones", async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    render(<StepIndicator steps={STEPS} currentStep="patient" onStepClick={onStepClick} />);

    await user.click(screen.getByRole("button", { name: "About you" }));
    expect(onStepClick).toHaveBeenCalledWith("about-you");

    expect(screen.queryByRole("button", { name: "About the patient" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vaccine information" })).not.toBeInTheDocument();
  });

  it("the mobile jump select lists only completed steps and reports a selection", async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    render(<StepIndicator steps={STEPS} currentStep="vaccine" onStepClick={onStepClick} />);

    const select = screen.getByRole("combobox", { name: "Jump to a completed step" });
    expect(screen.getAllByRole("option")).toHaveLength(4 + 1); // 4 completed steps + the placeholder
    expect(screen.queryByRole("option", { name: "Vaccine information" })).not.toBeInTheDocument();

    await user.selectOptions(select, "about-you");
    expect(onStepClick).toHaveBeenCalledWith("about-you");
  });

  it("REGRESSION: no jump select renders when there are no completed steps yet", () => {
    render(<StepIndicator steps={STEPS} currentStep="submitter-type" onStepClick={vi.fn()} />);
    expect(screen.queryByRole("combobox", { name: "Jump to a completed step" })).not.toBeInTheDocument();
  });

  it("a step *after* the current one is also clickable when furthestCompletedStep says it has data (going back, then forward again)", async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    // Reporter went back to "about-you" after having already completed
    // through "vaccine" — those later steps must still be reachable.
    render(
      <StepIndicator
        steps={STEPS}
        currentStep="about-you"
        furthestCompletedStep="vaccine"
        onStepClick={onStepClick}
      />
    );

    await user.click(screen.getByRole("button", { name: "About the patient" }));
    expect(onStepClick).toHaveBeenCalledWith("patient");

    // "vaccine" itself is the furthest-completed marker (first NOT-yet-done
    // step), so it isn't included — only what's strictly before it.
    expect(screen.queryByRole("button", { name: "Vaccine information" })).not.toBeInTheDocument();
  });

  it("the mobile jump select includes steps both before and after the current one when they're already completed", async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    render(
      <StepIndicator
        steps={STEPS}
        currentStep="about-you"
        furthestCompletedStep="vaccine"
        onStepClick={onStepClick}
      />
    );

    const select = screen.getByRole("combobox", { name: "Jump to a completed step" });
    expect(screen.getByRole("option", { name: "Who is reporting?" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "About the patient" })).toBeInTheDocument();

    await user.selectOptions(select, "patient");
    expect(onStepClick).toHaveBeenCalledWith("patient");
  });
});
