import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationalStep, type ConversationalFieldSpec } from "./ConversationalStep";
import { LanguageProvider } from "../i18n/LanguageContext";

const FIELDS: ConversationalFieldSpec[] = [
  { id: "name", label: "Your name", required: true, kind: "text" },
];

function setup(onNext: (data: Record<string, unknown>) => Promise<void>) {
  return render(
    <LanguageProvider>
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
    </LanguageProvider>
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

// A "choice" question whose "other"-like option reveals a required inline
// field via `extras` — same shape as VaccineStep's bodySite/bodySiteOther.
const SITE_FIELDS: ConversationalFieldSpec[] = [
  {
    id: "bodySite",
    label: "Where was it given?",
    required: false,
    kind: "choice",
    options: [
      { value: "mouth", label: "Mouth" },
      { value: "other", label: "Other" },
    ],
    alsoValidates: ["bodySiteOther"],
    optionsRequiringFollowUp: ["other"],
  },
];

function SiteChoiceHarness({ onNext }: { onNext: (data: Record<string, unknown>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, unknown>>({ bodySite: "", bodySiteOther: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setValue(id: string, value: unknown) {
    setValues((v) => ({ ...v, [id]: value }));
    setErrors((e) => {
      const { [id]: _removed, ...rest } = e;
      return rest;
    });
  }

  function validate() {
    if (values.bodySite === "other" && !String(values.bodySiteOther ?? "").trim()) {
      const nextErrors = { bodySiteOther: "Describe where it was given" };
      setErrors(nextErrors);
      return { success: false as const, errors: nextErrors };
    }
    setErrors({});
    return { success: true as const, data: values };
  }

  return (
    <ConversationalStep
      stepTitle="Test step"
      fields={SITE_FIELDS}
      values={values}
      setValue={setValue}
      errors={errors}
      validate={validate}
      onNext={onNext}
      onBack={() => {}}
      extras={{
        bodySite: () =>
          values.bodySite === "other" ? (
            <div>
              <label htmlFor="site-other-input">Describe where it was given</label>
              <input
                id="site-other-input"
                value={String(values.bodySiteOther ?? "")}
                onChange={(e) => setValue("bodySiteOther", e.target.value)}
              />
              {errors.bodySiteOther && <p role="alert">{errors.bodySiteOther}</p>}
            </div>
          ) : null,
      }}
    />
  );
}

describe("ConversationalStep — a choice option requiring inline follow-up", () => {
  it("REGRESSION: selecting 'Other' does not auto-advance, so the revealed field is actually visible", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <SiteChoiceHarness onNext={vi.fn()} />
      </LanguageProvider>
    );

    await user.click(screen.getByRole("button", { name: "Other" }));

    expect(screen.getByLabelText("Describe where it was given")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Where was it given?" })).toBeInTheDocument();
  });

  it("REGRESSION: clicking Next with the follow-up still blank blocks, without a duplicated error banner", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <SiteChoiceHarness onNext={vi.fn()} />
      </LanguageProvider>
    );

    await user.click(screen.getByRole("button", { name: "Other" }));
    await user.click(screen.getByRole("button", { name: "Next →" }));

    // Still on this question (blocked), not advanced to the review screen.
    expect(screen.getByRole("heading", { name: "Where was it given?" })).toBeInTheDocument();
    // Exactly two: the inline field's own <label> plus its own <p role="alert">
    // error — previously a third, generic banner repeated the identical
    // text a second time above the field.
    expect(screen.getAllByText("Describe where it was given")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Describe where it was given");
  });

  it("advances once the follow-up is filled in", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn().mockResolvedValue(undefined);
    render(
      <LanguageProvider>
        <SiteChoiceHarness onNext={onNext} />
      </LanguageProvider>
    );

    await user.click(screen.getByRole("button", { name: "Other" }));
    await user.type(screen.getByLabelText("Describe where it was given"), "Buttock");
    await user.click(screen.getByRole("button", { name: "Next →" }));

    // Only one field, so advancing lands straight on the review screen.
    expect(await screen.findByRole("heading", { name: "Review: Test step" })).toBeInTheDocument();
  });
});

// Two plain text fields — required:false so the "Next" button (this field
// kind never shows "Skip") is always enabled, letting a test drive Next/Back
// without needing to fill anything in.
const SCROLL_FIELDS: ConversationalFieldSpec[] = [
  { id: "first", label: "First question", required: false, kind: "text" },
  { id: "second", label: "Second question", required: false, kind: "text" },
];

function renderScrollHarness() {
  return render(
    <LanguageProvider>
      <ConversationalStep
        stepTitle="Test step"
        fields={SCROLL_FIELDS}
        values={{ first: "", second: "" }}
        setValue={() => {}}
        errors={{}}
        validate={() => ({ success: true, data: { first: "", second: "" } })}
        onNext={vi.fn().mockResolvedValue(undefined)}
        onBack={() => {}}
      />
    </LanguageProvider>
  );
}

/** jsdom implements neither a real layout engine nor `scrollTo` — every
 * element's `getBoundingClientRect()` reports all-zero, and `scrollY`/
 * `innerWidth` aren't meaningfully settable without stubbing them directly.
 * This fakes just enough of the browser's layout/scroll surface for the
 * positioning math itself to be exercised and asserted on. */
function mockLayout({ panelTop, scrollY, innerWidth }: { panelTop: number; scrollY: number; innerWidth: number }) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top: panelTop,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: panelTop,
    toJSON: () => {},
  } as DOMRect);
  Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });
  Object.defineProperty(window, "innerWidth", { value: innerWidth, configurable: true });
}

describe("ConversationalStep — question-panel scroll positioning", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrolls to the panel's document position minus a 24px offset at desktop widths (>= 640px)", () => {
    mockLayout({ panelTop: 500, scrollY: 100, innerWidth: 1024 });
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    renderScrollHarness();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 100 + 500 - 24, behavior: "auto" });
  });

  it("REGRESSION: uses a 16px offset below the 640px breakpoint, not the desktop 24px one", () => {
    mockLayout({ panelTop: 500, scrollY: 100, innerWidth: 375 });
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    renderScrollHarness();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 100 + 500 - 16, behavior: "auto" });
  });

  it("never scrolls smoothly — always an instant jump", () => {
    mockLayout({ panelTop: 500, scrollY: 100, innerWidth: 1024 });
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    renderScrollHarness();

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });

  it("REGRESSION: clamps the scroll target to 0 instead of scrolling to a negative position", () => {
    mockLayout({ panelTop: 0, scrollY: 0, innerWidth: 1024 });
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    renderScrollHarness();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("re-positions on every Next/Back navigation, not just on mount", async () => {
    mockLayout({ panelTop: 500, scrollY: 100, innerWidth: 1024 });
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const user = userEvent.setup();

    renderScrollHarness();
    expect(scrollToSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Next →" }));
    expect(scrollToSpy).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "← Back" }));
    expect(scrollToSpy).toHaveBeenCalledTimes(3);
  });

  it("moves focus to the new question's heading with preventScroll, so the browser's own auto-scroll doesn't fight the explicit one", () => {
    mockLayout({ panelTop: 500, scrollY: 100, innerWidth: 1024 });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");

    renderScrollHarness();

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});
