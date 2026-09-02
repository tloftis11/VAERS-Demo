import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./Combobox";

const OPTIONS = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Banana" },
  { value: "c", label: "Cherry" },
];

function setup(overrides: Partial<React.ComponentProps<typeof Combobox>> = {}) {
  const onSelect = vi.fn();
  const { container } = render(
    <>
      <label id="lbl">Fruit</label>
      <Combobox id="fruit" options={OPTIONS} value="" onSelect={onSelect} labelledBy="lbl" {...overrides} />
    </>
  );
  const { getByRole, getAllByRole } = within(container);
  return { onSelect, input: getByRole("combobox") as HTMLInputElement, getByRole, getAllByRole };
}

describe("Combobox", () => {
  it("shows the selected option's label as the initial display value", () => {
    setup({ value: "b" });
    expect(screen.getByRole("combobox")).toHaveValue("Banana");
  });

  it("typing filters the option list", async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    await user.type(input, "ban");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("Banana");
  });

  it("clicking an option selects it", async () => {
    const user = userEvent.setup();
    const { onSelect, input } = setup();
    await user.click(input);
    await user.click(screen.getByRole("option", { name: "Banana" }));
    expect(onSelect).toHaveBeenCalledWith("b");
    expect(input).toHaveValue("Banana");
  });

  it("REGRESSION: the first ArrowDown press highlights the first option, not the second", async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", "fruit-opt-0");
    expect(screen.getByRole("option", { name: "Apple" })).toHaveClass("combobox__option--active");
  });

  it("a second ArrowDown press moves to the second option", async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", "fruit-opt-1");
  });

  it("End jumps to the last option and Home jumps back to the first", async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    await user.keyboard("{End}");
    expect(input).toHaveAttribute("aria-activedescendant", "fruit-opt-2");
    await user.keyboard("{Home}");
    expect(input).toHaveAttribute("aria-activedescendant", "fruit-opt-0");
  });

  it("REGRESSION: after typing to filter the list, the first ArrowDown still lands on the first result instead of skipping to the second", async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    // "a" matches both "Apple" and "Banana" — two results, so a
    // skip-the-first bug (landing on index 1 instead of 0) is visible.
    await user.type(input, "a");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", "fruit-opt-0");
    expect(screen.getByRole("option", { name: "Apple" })).toHaveClass("combobox__option--active");
  });

  it("Enter selects the highlighted option", async () => {
    const user = userEvent.setup();
    const { onSelect, input } = setup();
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("mouse and keyboard selection of the same option report the same value", async () => {
    const user = userEvent.setup();
    const mouse = setup();
    await user.click(mouse.input);
    await user.click(mouse.getByRole("option", { name: "Cherry" }));

    const keyboard = setup();
    await user.click(keyboard.input);
    await user.keyboard("{End}{Enter}");

    expect(mouse.onSelect).toHaveBeenCalledWith("c");
    expect(keyboard.onSelect).toHaveBeenCalledWith("c");
  });

  it("Escape closes the list and reverts the query to the current selection", async () => {
    const user = userEvent.setup();
    const { input } = setup({ value: "a" });
    await user.click(input);
    await user.type(input, "xyz");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("Apple");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("REGRESSION: typing a replacement without selecting an option clears the stale stored value as soon as the text no longer matches it", async () => {
    // A real, controlled parent (not the disconnected setup() spy above) —
    // this behavior specifically depends on the stored `value` actually
    // updating in response to onSelect, same as every real call site.
    const onSelectSpy = vi.fn();
    function Wrapper() {
      const [value, setValue] = useState("a");
      return (
        <Combobox
          id="fruit"
          options={OPTIONS}
          value={value}
          onSelect={(v) => {
            onSelectSpy(v);
            setValue(v);
          }}
          labelledBy="lbl"
        />
      );
    }
    const user = userEvent.setup();
    render(
      <>
        <label id="lbl">Fruit</label>
        <Wrapper />
      </>
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "something else entirely");
    // Cleared exactly once — the moment the typed text first diverges from
    // "Apple" — not once per keystroke afterward (the stored value is
    // already "" by then, so there's nothing left to clear).
    expect(onSelectSpy).toHaveBeenCalledTimes(1);
    expect(onSelectSpy).toHaveBeenCalledWith("");
    // Blurring without picking a new option reverts the *display* to match
    // the now-actually-empty stored value — not back to "Apple", which
    // would misrepresent a selection that no longer exists.
    await user.tab();
    expect(input).toHaveValue("");
  });

  it("an empty filtered result shows an accessible, non-selectable message", async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    await user.type(input, "nonexistent-fruit");
    const empty = screen.getByRole("option", { name: "No matches" });
    expect(empty).toHaveAttribute("aria-disabled", "true");
  });

  it("passes through invalid/describedBy for accessible error association", () => {
    const { input } = setup({ invalid: true, describedBy: "fruit-error" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "fruit-error");
  });
});
