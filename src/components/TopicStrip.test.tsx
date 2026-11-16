import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicStrip } from "./TopicStrip";
import { RelatedTopics } from "./RelatedTopics";
import { findPage } from "../searchPages/pages";

const page = findPage("/scales/minor-pentatonic/e-shape")!;

describe("TopicStrip", () => {
  it("shows the topic heading as the page's h1 and the answer for the current key", () => {
    render(
      <TopicStrip
        page={page}
        selectedKey="E"
        onPickKey={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(page.heading);
    expect(screen.getByTestId("topic-strip")).toHaveTextContent(page.answer("E"));
  });

  it("offers any key and can be closed", async () => {
    const onPickKey = vi.fn();
    const onDismiss = vi.fn();
    render(
      <TopicStrip
        page={page}
        selectedKey="A"
        onPickKey={onPickKey}
        onDismiss={onDismiss}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Showing A, pick any key/ }),
    );
    expect(onPickKey).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Hide topic intro" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("collapses to the heading on small screens, with a toggle for the rest", async () => {
    render(
      <TopicStrip
        page={page}
        selectedKey="A"
        onPickKey={() => {}}
        onDismiss={() => {}}
      />,
    );
    const more = screen.getByRole("button", { name: "More about this topic" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
  });
});

describe("RelatedTopics", () => {
  it("links each related page by its heading", () => {
    render(<RelatedTopics page={page} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(page.related.length);
    expect(links[0]).toHaveAttribute("href", page.related[0]);
    expect(links[0]).toHaveTextContent(findPage(page.related[0])!.heading);
  });
});
