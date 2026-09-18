import type { JsonLdNode } from "@/lib/structured-data";

/**
 * Renders schema.org nodes as `application/ld+json`. `<` is escaped because a
 * database value containing `</script>` would otherwise close the tag.
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
