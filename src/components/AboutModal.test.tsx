import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AboutModal } from "./AboutModal";

describe("AboutModal", () => {
  it("renders nothing when closed", () => {
    render(<AboutModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when open", () => {
    render(<AboutModal open={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<AboutModal open={true} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(<AboutModal open={true} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("contains author credit and GitHub link", () => {
    render(<AboutModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/Felix Zailskas/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Source on GitHub/ })).toHaveAttribute(
      "href",
      "https://github.com/felix-zailskas/fretlab",
    );
  });
});
