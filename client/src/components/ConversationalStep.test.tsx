import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationalStep, type ConversationalFieldSpec } from "./ConversationalStep";

const FIELDS: ConversationalFieldSpec[] = [
  { id: "name", label: "Your name", required: true, kind: "text" },
];

function setup(onNext: (data: Record<string, unknown>) => Promise<void>) {
  return render(
    <ConversationalStep
      stepTitle="Test step"
      fields={FIELDS}
      values={{ name: "Jane Doe" }}
      setValue={() => {}}
      errors={{}}
      validate={() => ({ success: true, data: { name: "Jane Doe" } })}
      onNext={onNext}
      onBack={() => {}}
      initialIndex={FIELDS.length}
    />
  );
}

describe("ConversationalStep — authoritative draft saving (spec section 7)", () => {
  it("REGRESSION: a failed save shows a retryable error, doesn't advance, and keeps the entered data visible", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn().mockRejectedValueOnce(new Error("Network error — please try again"));
    setup(onNext);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    await user.click(continueButton);

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("alert")).toHaveTextContent("Network error — please try again");
    // Still on the review screen (didn't navigate away) with the answer intact.
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(continueButton).not.toBeDisabled();
  });

  it("REGRESSION: retrying after a failure calls onNext exactly once more, not twice", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce(undefined);
    setup(onNext);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    await user.click(continueButton);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(continueButton);

    expect(onNext).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables the Continue button while the save is in flight, so a double-click can't fire two saves", async () => {
    const user = userEvent.setup();
    let resolveSave: () => void = () => {};
    const onNext = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    setup(onNext);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    await user.click(continueButton);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Saving…" }));
    expect(onNext).toHaveBeenCalledTimes(1);

    resolveSave();
  });
});
