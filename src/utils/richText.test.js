import { describe, it, expect } from "vitest";
import { isSimpleHtml, htmlToEditable, editableToHtml, toggleMarker } from "./richText";

describe("deciding what can be edited as plain text", () => {
  it("accepts the shape every description in this catalogue has", () => {
    expect(isSimpleHtml("<p>Ashwagandha Churna</p>")).toBe(true);
    expect(isSimpleHtml("<p>One</p><p>Two</p>")).toBe(true);
    expect(isSimpleHtml("<p>A<br>B</p>")).toBe(true);
    expect(isSimpleHtml("<p><strong>How to use:</strong> twice daily</p>")).toBe(true);
    expect(isSimpleHtml("")).toBe(true);
  });

  it("refuses anything the markers cannot express", () => {
    // These must keep their HTML rather than being flattened into prose.
    expect(isSimpleHtml("<ul><li>One</li></ul>")).toBe(false);
    expect(isSimpleHtml("<h2>Key ingredients</h2>")).toBe(false);
    expect(isSimpleHtml("<table><tr><td>x</td></tr></table>")).toBe(false);
  });

  it("refuses a tag carrying attributes, because they would be lost", () => {
    expect(isSimpleHtml('<p class="lead">Text</p>')).toBe(false);
    expect(isSimpleHtml('<strong style="color:red">x</strong>')).toBe(false);
    // A self-closing break is still simple.
    expect(isSimpleHtml("<p>A<br />B</p>")).toBe(true);
  });
});

describe("reading a description into the editor", () => {
  it("turns bold tags into markers", () => {
    expect(htmlToEditable("<p><strong>How to use:</strong> twice daily</p>").text)
      .toBe("**How to use:** twice daily");
    expect(htmlToEditable("<p><b>Bold</b></p>").text).toBe("**Bold**");
    expect(htmlToEditable("<p><em>soft</em></p>").text).toBe("_soft_");
  });

  it("turns paragraphs into blank lines and breaks into newlines", () => {
    expect(htmlToEditable("<p>One</p><p>Two</p>").text).toBe("One\n\nTwo");
    expect(htmlToEditable("<p>One<br>Two</p>").text).toBe("One\nTwo");
  });

  it("decodes the entities WordPress stores", () => {
    expect(htmlToEditable("<p>Joint &amp; Knee</p>").text).toBe("Joint & Knee");
    expect(htmlToEditable("<p>Hasaram&#8217;s</p>").text).toBe("Hasaram’s");
  });

  it("hands back structure it cannot represent, untouched and flagged", () => {
    const html = "<ul><li>One</li><li>Two</li></ul>";
    const out = htmlToEditable(html);
    expect(out.raw).toBe(true);
    expect(out.text).toBe(html);
  });

  it("copes with an empty description", () => {
    expect(htmlToEditable("")).toEqual({ text: "", raw: false });
    expect(htmlToEditable(null)).toEqual({ text: "", raw: false });
  });
});

describe("writing the editor's text back to HTML", () => {
  it("turns markers into tags", () => {
    expect(editableToHtml("**How to use:** twice daily"))
      .toBe("<p><strong>How to use:</strong> twice daily</p>");
    expect(editableToHtml("_soft_")).toBe("<p><em>soft</em></p>");
  });

  it("turns blank lines into paragraphs and single newlines into breaks", () => {
    expect(editableToHtml("One\n\nTwo")).toBe("<p>One</p><p>Two</p>");
    expect(editableToHtml("One\nTwo")).toBe("<p>One<br>Two</p>");
  });

  it("escapes markup so a description cannot inject tags", () => {
    expect(editableToHtml("5 < 6 & 7 > 2")).toBe("<p>5 &lt; 6 &amp; 7 &gt; 2</p>");
    expect(editableToHtml('<script>alert(1)</script>'))
      .toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });

  it("does not let an unclosed marker swallow the rest of the text", () => {
    // A stray ** is far more likely than a deliberate one, and the damage of
    // guessing wrong is a whole description turning bold.
    expect(editableToHtml("**How to use: twice daily")).toBe("<p>**How to use: twice daily</p>");
    expect(editableToHtml("**One**\n\n**Two**")).toBe("<p><strong>One</strong></p><p><strong>Two</strong></p>");
  });

  it("leaves a raw HTML description exactly as typed", () => {
    const html = "<ul><li>One</li></ul>";
    expect(editableToHtml(html, { raw: true })).toBe(html);
  });

  it("an empty box clears the description", () => {
    expect(editableToHtml("")).toBe("");
    expect(editableToHtml("   ")).toBe("");
  });
});

describe("the round trip", () => {
  // The property that matters: editing a description and saving it without
  // changing anything must not alter what the customer sees.
  const samples = [
    "<p>Vaidyaratnam Mahathikthakam Ghrutham (150gm)</p>",
    "<p><strong>How to use:</strong> Take 1 tablespoon twice daily.</p>",
    "<p>One</p><p>Two</p>",
    "<p>Line one<br>Line two</p>",
    "<p>Joint &amp; Knee pain</p>",
    "<p><strong>A</strong> and <em>B</em></p>",
  ];

  for (const html of samples) {
    it(`survives untouched: ${html.slice(0, 44)}`, () => {
      const { text, raw } = htmlToEditable(html);
      expect(editableToHtml(text, { raw })).toBe(html);
    });
  }

  it("survives for content kept as raw HTML too", () => {
    const html = "<ul><li>One</li><li>Two</li></ul>";
    const { text, raw } = htmlToEditable(html);
    expect(editableToHtml(text, { raw })).toBe(html);
  });
});

describe("the bold button", () => {
  it("wraps the selection and keeps the caret around it", () => {
    const r = toggleMarker("How to use: daily", 0, 11);
    expect(r.value).toBe("**How to use:** daily");
    expect(r.value.slice(r.start, r.end)).toBe("How to use:");
  });

  it("unwraps a selection that is already bold", () => {
    const r = toggleMarker("**How to use:** daily", 0, 15);
    expect(r.value).toBe("How to use: daily");
    expect(r.value.slice(r.start, r.end)).toBe("How to use:");
  });

  it("unwraps when the markers sit just outside the selection", () => {
    const r = toggleMarker("**How to use:** daily", 2, 13);
    expect(r.value).toBe("How to use: daily");
  });

  it("with nothing selected, leaves the caret between a fresh pair", () => {
    const r = toggleMarker("abc", 3, 3);
    expect(r.value).toBe("abc****");
    expect(r.start).toBe(5);
    expect(r.end).toBe(5);
  });
});
