import { Link, Section, Text } from "@react-email/components";
import { marked } from "marked";
import {
  EmailLayout,
  Regel,
  grundtext,
  kleintext,
  link as linkStil,
} from "./email-layout";
import { emailText, textLink } from "./email-text";

marked.use({
  gfm: true,
  breaks: true,
});

interface NewsletterEmailProps {
  content: string; // HTML content
  unsubscribeUrl: string;
  subscriberName?: string;
}

export function NewsletterEmail({
  content,
  unsubscribeUrl,
  subscriberName,
}: NewsletterEmailProps) {
  return (
    <EmailLayout preview="Newsletter">
      <Text style={grussStil}>
        {subscriberName ? `Hallo ${subscriberName},` : "Hallo,"}
      </Text>

      {/* Newsletter content will be injected here */}
      <div data-newsletter-content="true" style={inhaltStil}>
        {content || "NEWSLETTER_CONTENT_PLACEHOLDER_MARKER_12345"}
      </div>

      <Regel />

      <Section style={abmeldenFeld}>
        <Text style={abmeldenText}>
          Du möchtest keine Newsletter mehr erhalten?{" "}
          <Link href={unsubscribeUrl} style={linkStil}>
            Hier abmelden
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  );
}

/**
 * Nur-Text-Fassung. Der Rumpf ist vom Autor verfasstes HTML, das sich nicht
 * verlustfrei in Text verwandeln lässt — daher nur Hinweis, Anrede und
 * Abmeldelink, ohne den eigentlichen Inhalt.
 */
export function newsletterEmailText({
  unsubscribeUrl,
  subscriberName,
}: Omit<NewsletterEmailProps, "content">): string {
  return emailText([
    "NEWSLETTER",
    "",
    subscriberName ? `Hallo ${subscriberName},` : "Hallo,",
    "",
    "Diese Textfassung enthält den Newsletter-Inhalt nicht — er liegt nur als Gestaltung für das HTML-Postfach vor.",
    "",
    textLink("Newsletter abbestellen:", unsubscribeUrl),
  ]);
}

const grussStil = {
  ...grundtext,
  fontWeight: "bold" as const,
};

const inhaltStil = {
  ...grundtext,
};

const abmeldenFeld = {
  textAlign: "center" as const,
  margin: "32px 0 0 0",
};

const abmeldenText = {
  ...kleintext,
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
};
