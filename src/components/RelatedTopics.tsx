import { findPage, type SearchPage } from "../searchPages/pages";

// Plain links to neighbouring topic pages, under the view. Crawlers follow
// them too, so every topic page is reachable from every other.
export function RelatedTopics({ page }: { page: SearchPage }) {
  return (
    <nav
      data-testid="related-topics"
      aria-label="Related topics"
      className="mt-4 text-sm text-fg-muted"
    >
      <span className="mr-2">More:</span>
      {page.related.map((path, i) => (
        <span key={path}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <a href={path} className="text-fg-secondary underline hover:text-fg-primary">
            {findPage(path)?.heading ?? path}
          </a>
        </span>
      ))}
    </nav>
  );
}
