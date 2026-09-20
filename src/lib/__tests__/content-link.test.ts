import { describe, expect, it } from "@jest/globals";
import {
  absolutizeHtmlLinks,
  auswahlchorLinkHref,
  linkHref,
} from "../content-link";

const ID = "7b1f2c8e-3d4a-4b5c-9e6f-0a1b2c3d4e5f";

describe("linkHref", () => {
  it("adressiert jede Art unter ihrem öffentlichen Pfad", () => {
    expect(linkHref("post", ID)).toBe(`/aktuelles/${ID}`);
    expect(linkHref("event", ID)).toBe(`/termine/event/${ID}`);
    expect(linkHref("course", ID)).toBe(`/termine/course/${ID}`);
    expect(linkHref("ensemble", ID)).toBe(`/ensembles/${ID}`);
  });

  // Der Slug ändert sich mit dem Titel; die UUID hält den Verweis.
  it("verlinkt die UUID, nicht den Slug", () => {
    expect(linkHref("event", ID)).not.toMatch(/[a-z]+-[a-z]+/);
  });

  it("führt Auswahlchöre auf ihren Abschnitt der Sammelseite", () => {
    expect(auswahlchorLinkHref("conspirito")).toBe(
      "/ueber-uns/auswahlchoere#conspirito",
    );
  });
});

describe("absolutizeHtmlLinks", () => {
  const base = "https://posaunenwerk-rheinland.de";

  it("setzt seiteneigene Verweise absolut", () => {
    expect(
      absolutizeHtmlLinks(`<a href="/termine/event/${ID}">Konzert</a>`, base),
    ).toBe(`<a href="${base}/termine/event/${ID}">Konzert</a>`);
  });

  it("behält weitere Attribute des Links", () => {
    expect(
      absolutizeHtmlLinks(
        '<a class="x" href="/aktuelles" target="_blank">News</a>',
        base,
      ),
    ).toBe(`<a class="x" href="${base}/aktuelles" target="_blank">News</a>`);
  });

  it("lässt fremde und schon absolute Adressen unberührt", () => {
    const html =
      '<a href="https://example.org/x">A</a><a href="mailto:a@b.de">B</a><a href="#anker">C</a>';
    expect(absolutizeHtmlLinks(html, base)).toBe(html);
  });

  // "//host/pfad" ist protokollrelativ und meint einen fremden Host, keinen Pfad.
  it("lässt protokollrelative Adressen unberührt", () => {
    const html = '<a href="//example.org/x">A</a>';
    expect(absolutizeHtmlLinks(html, base)).toBe(html);
  });

  it("verträgt eine Basisadresse mit Schrägstrich am Ende", () => {
    expect(absolutizeHtmlLinks('<a href="/aktuelles">N</a>', `${base}/`)).toBe(
      `<a href="${base}/aktuelles">N</a>`,
    );
  });

  it("rührt andere Attribute mit Pfadwert nicht an", () => {
    const html = '<img src="/uploads/bild.jpg" alt="x">';
    expect(absolutizeHtmlLinks(html, base)).toBe(html);
  });

  it("setzt mehrere Verweise im selben Text", () => {
    expect(
      absolutizeHtmlLinks(
        '<p><a href="/a">1</a> und <a href="/b">2</a></p>',
        base,
      ),
    ).toBe(`<p><a href="${base}/a">1</a> und <a href="${base}/b">2</a></p>`);
  });
});
