import ContentPage from '@/components/content/ContentPage';
import { contentMetadata, SITE_CONTENT, type ContentSlug } from '@/lib/site-content';

export function makeContentPage(slug: ContentSlug) {
  const page = SITE_CONTENT[slug];
  return {
    metadata: contentMetadata(slug),
    Page: function ContentPageRoute() {
      return (
        <ContentPage
          title={page.title}
          subtitle={page.subtitle}
          sections={page.sections}
          relatedLinks={page.relatedLinks}
        />
      );
    },
  };
}
