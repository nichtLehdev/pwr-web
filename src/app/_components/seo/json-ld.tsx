import type { JsonLdNode } from "@/lib/structured-data";

/**
 * Renders one or more schema.org nodes as a `application/ld+json` block.
 *
 * `<` is escaped because the payload carries database content: a post title
 * containing `</script>` would otherwise close the tag and turn the rest of
 * the JSON into markup.
 */
export default function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
