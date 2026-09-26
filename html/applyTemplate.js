
function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}
function renderSection(title, content) {
  return `
    <section
      style="
        margin:0 0 16px 0;
        padding:18px 20px;
        background:#f3f7ef;
        border:1px solid #dce8d9;
        border-radius:16px;
      "
    >

      <h2
        style="
          color:#21866b;
          font-size:12px;
          line-height:1.4;
          font-weight:700;
          letter-spacing:1.2px;
          text-transform:uppercase;
          margin:0 0 12px 0;
        "
      >
        ${escapeHtml(title)}
      </h2>

      <div
        style="
          color:#173b32;
          font-size:15px;
          line-height:1.65;
        "
      >
        ${content}
      </div>

    </section>
  `;
}

function unique(values) {
  return [...new Set(values)];
}

function withOther(values, other) {
  const normalized = normalizeArray(values);

  const cleanOther =
    typeof other === "string"
      ? other.trim()
      : "";

  const withoutOther = normalized.filter(
    (item) => item.toLowerCase() !== "other"
  );

  if (cleanOther) {
    return unique([
      ...withoutOther,
      `Other: ${cleanOther}`,
    ]);
  }

  return unique(normalized);
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderValue(value) {
  const safe = escapeHtml(value);

  return safe
    ? safe.replace(/\n/g, "<br/>")
    : '<span class="empty">N/A</span>';
}

function renderList(values) {
  const normalized = unique(
    normalizeArray(values)
  );

  if (!normalized.length) {
    return '<span class="empty">N/A</span>';
  }

  return `
    <ul>
      ${normalized
        .map(
          (item) =>
            `<li>${escapeHtml(item)}</li>`
        )
        .join("")}
    </ul>
  `;
}

function renderTextList(values) {
  const normalized = unique(
    normalizeArray(values)
  );

  if (!normalized.length) {
    return "N/A";
  }

  return normalized
    .map((item) => `- ${item}`)
    .join("\n");
}

function renderSectionText(title, value) {
  return `${title}
${value || "N/A"}

`;
}

module.exports = function applyTemplate(
  user,
  body = {},
  newsletter = false
) {
  const {
    email,
    igHandle,
    fullName,

    /* ======================================================
     * CURRENT APPLICATION
     * ====================================================== */

    writingNow,

    writingBarriers,
    writingBarriersOther,

    sharingReasons,
    sharingReasonsOther,

    sharingWays,
    sharingWaysOther,

    sharingOutcomes,
    sharingOutcomesOther,

    sharingStory,

    plumbumHope,

    howFindOut,

    /* ======================================================
     * LEGACY APPLICATION
     * ====================================================== */

    whyApply,
    communityNeeds,
    writingOutcome,

    events,
    selectedEvents,
    otherEvent,
    eventPain,
  } = body;

  /* ========================================================
   * NORMALIZE CURRENT ANSWERS
   * ======================================================== */

  const normalizedWritingBarriers =
    withOther(
      writingBarriers,
      writingBarriersOther
    );

  const normalizedSharingReasons =
    withOther(
      sharingReasons,
      sharingReasonsOther
    );

  const normalizedSharingWays =
    withOther(
      sharingWays,
      sharingWaysOther
    );

  const normalizedSharingOutcomes =
    withOther(
      sharingOutcomes,
      sharingOutcomesOther
    );

  /* ========================================================
   * NORMALIZE LEGACY EVENTS
   * ======================================================== */

  const baseEvents =
    normalizeArray(events);

  const oldSelectedEvents =
    normalizeArray(selectedEvents);

  const finalEvents = unique([
    ...baseEvents,
    ...oldSelectedEvents,
    ...(otherEvent &&
    String(otherEvent).trim()
      ? [
          `Other: ${String(
            otherEvent
          ).trim()}`,
        ]
      : []),
  ]);

  /* ========================================================
   * DETERMINE WHETHER LEGACY DATA EXISTS
   * ======================================================== */

  const hasLegacyApplication =
    Boolean(
      whyApply ||
      communityNeeds ||
      writingOutcome ||
      finalEvents.length ||
      eventPain
    );

  /* ========================================================
   * REVIEW LINK
   * ======================================================== */

  const params = new URLSearchParams({
    applicantId: user.id,
    action: "approve",
    email:
      email ||
      user.email ||
      "",
    newsletter: String(newsletter),
  });

  const basePath =
    process.env.BASEPATH || "";

  const path =
    basePath.replace(/\/?$/, "/") +
    "auth/review?" +
    params.toString();

  /* ========================================================
   * DISPLAY VALUES
   * ======================================================== */

  const displayName =
    fullName ||
    user.preferredName ||
    "Applicant";

  const displayEmail =
    email ||
    user.email ||
    "";

  /* ========================================================
   * PLAIN-TEXT EMAIL
   *
   * Important: send a text version alongside the HTML
   * version. This gives mail clients a proper multipart
   * alternative and avoids an HTML-only message.
   * ======================================================== */

  let text = "";

  text += "PLUMBUM APPLICATION\n";
  text += "===================\n\n";

  text += renderSectionText(
    "ABOUT YOU",
    [
      `Name: ${displayName}`,
      `Email: ${displayEmail}`,
      `Instagram: ${igHandle || "N/A"}`,
    ].join("\n")
  );

  text += renderSectionText(
    "WHAT THEY'RE WRITING",
    writingNow || "N/A"
  );

  text += renderSectionText(
    "WHAT'S GETTING IN THE WAY",
    renderTextList(
      normalizedWritingBarriers
    )
  );

  text += renderSectionText(
    "WHAT MAKES THEM SHARE",
    renderTextList(
      normalizedSharingReasons
    )
  );

  text += renderSectionText(
    "HOW THEY SHARE & PARTICIPATE",
    renderTextList(
      normalizedSharingWays
    )
  );

  text += renderSectionText(
    "WHAT HAPPENED AFTER SHARING",
    renderTextList(
      normalizedSharingOutcomes
    )
  );

  if (sharingStory) {
    text += renderSectionText(
      "THEIR SHARING STORY",
      sharingStory
    );
  }

  text += renderSectionText(
    "WHAT THEY'RE LOOKING FOR IN PLUMBUM",
    plumbumHope || "N/A"
  );

  text += renderSectionText(
    "HOW THEY FOUND PLUMBUM",
    howFindOut || "N/A"
  );

  if (hasLegacyApplication) {
    text += "\n";
    text += "LEGACY APPLICATION ANSWERS\n";
    text += "==========================\n\n";

    if (whyApply) {
      text += renderSectionText(
        "Why they applied",
        whyApply
      );
    }

    if (communityNeeds) {
      text += renderSectionText(
        "What they were looking for in writing spaces",
        communityNeeds
      );
    }

    if (writingOutcome) {
      text += renderSectionText(
        "What usually happened after sharing",
        writingOutcome
      );
    }

    if (finalEvents.length) {
      text += renderSectionText(
        "Events they engage with",
        renderTextList(finalEvents)
      );
    }

    if (eventPain) {
      text += renderSectionText(
        "What makes them stay or leave events",
        eventPain
      );
    }
  }

  text += "\n";
  text += "REVIEW APPLICATION\n";
  text += "==================\n";
  text += `${path}\n`;

  text += "\n";
  text += "Plumbum Application Review System\n";


  /* ========================================================
   * HTML EMAIL
   *
   * Kept intentionally simple:
   * - no external fonts
   * - no JavaScript
   * - no images required
   * - inline-compatible CSS
   * - normal text links
   * ======================================================== */

  const html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Plumbum Application</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f1df;
    color:#173b32;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <div
    style="
      width:100%;
      padding:32px 16px;
      box-sizing:border-box;
      background:#f5f1df;
    "
  >

    <div
      style="
        max-width:680px;
        margin:0 auto;
        background:#fffdf7;
        border:1px solid #dce8d9;
        border-radius:20px;
        padding:28px;
        box-sizing:border-box;
      "
    >

      <!-- Header -->

      <div
        style="
          color:#21866b;
          font-size:11px;
          line-height:1.4;
          font-weight:700;
          letter-spacing:2px;
          text-transform:uppercase;
          margin-bottom:8px;
        "
      >
        PLUMBUM
      </div>

      <h1
        style="
          color:#173b32;
          font-size:28px;
          line-height:1.2;
          font-weight:700;
          margin:0 0 28px 0;
        "
      >
        New Application
      </h1>


      <!-- About You -->

      ${renderSection(
        "About You",
        `
          <strong>Name:</strong>
          ${renderValue(displayName)}

          <br><br>

          <strong>Email:</strong>
          ${renderValue(displayEmail)}

          <br><br>

          <strong>Instagram:</strong>
          ${renderValue(igHandle)}
        `
      )}


      <!-- Writing -->

      ${renderSection(
        "What They're Writing",
        renderValue(writingNow)
      )}


      <!-- Writing Barriers -->

      ${renderSection(
        "What's Getting in the Way",
        renderList(
          normalizedWritingBarriers
        )
      )}


      <!-- Sharing Reasons -->

      ${renderSection(
        "What Makes Them Share",
        renderList(
          normalizedSharingReasons
        )
      )}


      <!-- Sharing Ways -->

      ${renderSection(
        "How They Share & Participate",
        renderList(
          normalizedSharingWays
        )
      )}


      <!-- Sharing Outcomes -->

      ${renderSection(
        "What Happened After Sharing",
        renderList(
          normalizedSharingOutcomes
        )
      )}


      <!-- Sharing Story -->

      ${
        sharingStory
          ? renderSection(
              "Their Sharing Story",
              renderValue(
                sharingStory
              )
            )
          : ""
      }


      <!-- Plumbum Hope -->

      ${renderSection(
        "What They're Looking For in Plumbum",
        renderValue(plumbumHope)
      )}


      <!-- Discovery -->

      ${renderSection(
        "How They Found Plumbum",
        renderValue(howFindOut)
      )}


      <!-- Legacy -->

      ${
        hasLegacyApplication
          ? `
            <div
              style="
                height:1px;
                background:#e2e8dd;
                margin:28px 0;
              "
            ></div>

            ${renderSection(
              "Legacy Application Answers",
              `
                ${
                  whyApply
                    ? `
                      <strong>
                        Why they applied:
                      </strong>

                      <br>

                      ${renderValue(
                        whyApply
                      )}

                      <br><br>
                    `
                    : ""
                }

                ${
                  communityNeeds
                    ? `
                      <strong>
                        What they were looking for
                        in writing spaces:
                      </strong>

                      <br>

                      ${renderValue(
                        communityNeeds
                      )}

                      <br><br>
                    `
                    : ""
                }

                ${
                  writingOutcome
                    ? `
                      <strong>
                        What usually happened
                        after sharing:
                      </strong>

                      <br>

                      ${renderValue(
                        writingOutcome
                      )}

                      <br><br>
                    `
                    : ""
                }

                ${
                  finalEvents.length
                    ? `
                      <strong>
                        Events they engage with:
                      </strong>

                      ${renderList(
                        finalEvents
                      )}

                      <br>
                    `
                    : ""
                }

                ${
                  eventPain
                    ? `
                      <strong>
                        What makes them stay
                        or leave events:
                      </strong>

                      <br>

                      ${renderValue(
                        eventPain
                      )}
                    `
                    : ""
                }
              `
            )}
          `
          : ""
      }


      <!-- Divider -->

      <div
        style="
          height:1px;
          background:#e2e8dd;
          margin:28px 0;
        "
      ></div>


      <!-- Review CTA -->

      <a
        href="${escapeHtml(path)}"
        style="
          display:inline-block;
          background:#21866b;
          color:#ffffff;
          text-decoration:none;
          padding:13px 20px;
          border-radius:999px;
          font-size:15px;
          line-height:1;
          font-weight:700;
        "
      >
        Review Application
      </a>


      <!-- Fallback link -->

      <p
        style="
          color:#789087;
          font-size:12px;
          line-height:1.5;
          margin:18px 0 0 0;
        "
      >
        If the button doesn't work, copy and paste this link
        into your browser:
      </p>

      <p
        style="
          font-size:12px;
          line-height:1.5;
          word-break:break-all;
          margin:6px 0 0 0;
        "
      >
        <a
          href="${escapeHtml(path)}"
          style="
            color:#21866b;
            text-decoration:underline;
          "
        >
          ${escapeHtml(path)}
        </a>
      </p>


      <!-- Footer -->

      <p
        style="
          color:#789087;
          font-size:12px;
          line-height:1.5;
          margin:24px 0 0 0;
        "
      >
        Plumbum Application Review System
      </p>

    </div>

  </div>

</body>

</html>
  `;


  /* ========================================================
   * RETURN RESEND PAYLOAD
   * ======================================================== */

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: process.env.PBEMAIL,

    subject: "New Plumbum Application",

    /*
     * Both versions are intentionally supplied.
     */
    text,
    html,

    /*
     * These headers are useful for bulk/subscription mail.
     *
     * This application email is actually an internal
     * transactional/review email, so these are not strictly
     * necessary for the application itself.
     *
     * Keeping List-Unsubscribe here is harmless if your
     * receiving mailbox/provider accepts it.
     */
    headers: {
      "List-Unsubscribe": `<mailto:${process.env.pbEmail}>`,
    },
  };
};