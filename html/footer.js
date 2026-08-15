
function footer({ manageUrl, unsubscribeUrl }) {
  return `
    ${cardTableOpen()}
      <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="font-size:12px; color:#3D6B47;">
            <p style="margin:0 0 10px 0;">You’re receiving this email from Plumbum.</p>
            <p style="margin:0 0 8px 0;">
              <a href="${manageUrl}" style="color:#065f46; text-decoration:underline;">Manage Preferences</a>
            </p>
            <p style="margin:0; color:#374151; font-size:13px;">
              Need a break? <a href="${unsubscribeUrl}" style="color:#065f46; text-decoration:underline;">Unsubscribe</a>.
            </p>
          </td>
        </tr>
      </table>
    ${cardTableClose()}
  `;
}
module.exports = footer