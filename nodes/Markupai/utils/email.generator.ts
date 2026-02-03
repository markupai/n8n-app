import { GetStyleRewriteResponse } from "../Markupai.api.types";
import { categorizeIssues } from "./issues";

interface ExtendedInputData {
  document_name?: string;
  document_owner?: string;
  document_link?: string;
}

function getScoreBackgroundColor(score: number | undefined): string {
  if (score === undefined) {
    return "#888";
  }

  if (score < 60) {
    return "#fcd9e4";
  } else if (score >= 60 && score < 80) {
    return "#fff7c5";
  } else {
    return "#caffc9";
  }
}

function formatScore(score: number | undefined): string {
  return score === undefined ? "N/A" : String(score);
}

function escapeHtml(text: string | undefined): string {
  if (text === undefined) {
    return "";
  }
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function generateEmailHTMLReport(
  result: GetStyleRewriteResponse,
  inputData: ExtendedInputData,
): string {
  const categorizedIssues = categorizeIssues(result.original?.issues ?? []);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MarkupAI Document Analysis Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap');

  </style>
</head>
<body style="margin:0; padding:0; background-color:#f9f9f9;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="background-color:#f9f9f9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="800" style="font-family:'Roboto', Helvetica, Arial, sans-serif; background-color:#ffffff; padding:24px; border-radius:12px;">
          <!-- Header -->
          <tr>
            <td style="font-size:24px; font-weight:600; color:#000000;padding-bottom:10px;">Document Analysis Report</td>
          </tr>
          <tr>
            <td style="font-size:16px; font-weight:500; color:#000000; padding-bottom:26px;">Comprehensive quality assessment of your document</td>
          </tr>

          <!-- Document Info -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-weight:500; padding-bottom:8px; font-size:20px;">Document details</td>
                </tr>
                <tr>
                  <td style="font-size:14px; padding-bottom:4px; line-height:21px;">
                    Title: <strong>${escapeHtml(inputData.document_name) || "N/A"}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:14px; padding-bottom:4px;line-height:21px;">
                    Owner: <strong>${escapeHtml(inputData.document_owner) || "N/A"}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:14px;">
                    ${inputData.document_link ? `<a href="${escapeHtml(inputData.document_link)}" style="color:#0077cc;line-height:21px;">Open document</a>` : ""}
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" style="padding-left:16px;">
              <table cellpadding="0" cellspacing="0" style="background-color:${getScoreBackgroundColor(result.original?.scores.quality.score)}; border-radius:12px; padding:16px; width:200px;">
                <tr>
                  <td align="center" style="font-size:28px; font-weight:600; color:#000;">${formatScore(
                    result.original?.scores.quality.score,
                  )}</td>
                </tr>
                <tr>
                  <td align="center" style="font-size:14px; color:#000;">Quality Score</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td colspan="2" style="padding-top:24px;"></td></tr>

          <!-- Check Overview -->
          <tr>
            <td colspan="2" style="padding:16px; border:1px solid #eee; border-radius:12px;">
              <div style="font-weight:500; padding-bottom:12px; font-size:20px;">Score details</div>
              <table width="100%" cellpadding="0" cellspacing="8">
                <tr>
                  <td style="background:${getScoreBackgroundColor(result.original?.scores.quality.grammar.score)}; border-radius:8px; text-align:center; padding:12px; width:25%;">
                    <div style="font-size:18px; font-weight:700;">${formatScore(
                      result.original?.scores.quality.grammar.score,
                    )}</div>
                    <div style="font-size:14px;">Grammar</div>
                  </td>
                  <td style="background:${getScoreBackgroundColor(result.original?.scores.quality.consistency.score)}; border-radius:8px; text-align:center; padding:12px; width:25%;">
                    <div style="font-size:18px; font-weight:700;">${formatScore(
                      result.original?.scores.quality.consistency.score,
                    )}</div>
                    <div style="font-size:14px;">Consistency</div>
                  </td>
                  <td style="background:${getScoreBackgroundColor(result.original?.scores.quality.terminology.score)}; border-radius:8px; text-align:center; padding:12px; width:25%;">
                    <div style="font-size:18px; font-weight:700;">${formatScore(
                      result.original?.scores.quality.terminology.score,
                    )}</div>
                    <div style="font-size:14px;">Terminology</div>
                  </td>
                  <td style="background:${getScoreBackgroundColor(result.original?.scores.analysis.clarity.score)}; border-radius:8px; text-align:center; padding:12px; width:25%;">
                    <div style="font-size:18px; font-weight:700;">${formatScore(
                      result.original?.scores.analysis.clarity.score,
                    )}</div>
                    <div style="font-size:14px;">Clarity</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td colspan="2" style="padding-top:24px;"></td></tr>

          <!-- Document Stats -->
          <tr>
            <td colspan="2" style="padding:16px; border:1px solid #eee; border-radius:12px;">
              <div style="font-weight:500; padding-bottom:16px;font-size:20px;">Document statistics</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center; width:33.33%;"><span style="font-size:18px;"><strong>${formatScore(
                    result.original?.scores.analysis.clarity.word_count,
                  )}</strong></span><br><span style="font-size:14px;">Words Analyzed</span></td>
                  <td style="text-align:center; width:33.33%;"><span style="font-size:18px;"><strong>${formatScore(
                    result.original?.scores.analysis.clarity.sentence_count,
                  )}</strong></span><br><span style="font-size:14px;">Total Sentences</span></td>
                  <td style="text-align:center; width:33.33%;"><span style="font-size:18px;"><strong>${formatScore(
                    result.original?.scores.analysis.clarity.average_sentence_length,
                  )}</strong></span><br><span style="font-size:14px;">Average Sentence Length</span></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td colspan="2" style="padding-top:24px;"></td></tr>

          <!-- Issues Detected -->
          <tr>
            <td colspan="2" style="padding:16px; border:1px solid #eee; border-radius:12px;">
              <div style="font-weight:500; padding-bottom:12px;font-size:20px;">Issues found</div>
              <div style="font-size:14px; color:#555; text-align:left;">Total issues found: <strong>${String(result.original?.issues ? result.original.issues.length : 0)}</strong></div><br>
              <table width="100%" cellpadding="8" cellspacing="0">
                <tr>
					        <td align="center" style="width:25%;"><span style="font-size:18px;"><strong>${String(
                    categorizedIssues.grammar.length,
                  )}</strong></span><br><span style="font-size:14px;">Grammar &amp; Spelling</span></td>
                  <td align="center" style="width:25%;"><span style="font-size:18px;"><strong>${String(
                    categorizedIssues.terminology.length,
                  )}</strong></span><br><span style="font-size:14px;">Terminology</span></td>
                  <td align="center" style="width:25%;"><span style="font-size:18px;"><strong>${String(
                    categorizedIssues.consistency.length,
                  )}</strong></span><br><span style="font-size:14px;">Consistency</span></td>
                  <td align="center" style="width:25%;"><span style="font-size:18px;"><strong>${String(
                    categorizedIssues.clarity.length,
                  )}</strong></span><br><span style="font-size:14px;">Clarity</span></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td colspan="2" style="padding-top:24px;"></td></tr>

          <!-- Configuration -->
          <tr>
            <td colspan="2" style="padding:16px; border:1px solid #eee; border-radius:12px;">
              <div style="font-weight:500; padding-bottom:12px;font-size:20px;">Check configuration</div>
              <div style="font-size:14px; line-height:21px;">Style Guide: <strong>${result.config?.style_guide.style_guide_type ?? "N/A"}</strong></div>
              <div style="font-size:14px; line-height:21px;">Dialect: <strong>${result.config?.dialect ?? "N/A"}</strong></div>
              <div style="font-size:14px; line-height:21px;">Tone: <strong>${result.config?.tone ?? "N/A"}</strong></div>
              <div style="font-size:14px; line-height:21px;">Workflow ID: <strong>${result.workflow.id || "N/A"}</strong></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td colspan="2" style="font-size:12px; color:#888; text-align:center; padding-top:24px;"><img src="https://cdn.markup.ai/markup-logo-horz-coral.png" width="160"  alt="Logo Markup AI"/>
              <p>© 2026 Markup AI</p>
              This report was automatically generated
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
