const cardTableClose = require("./cardTableClose");
const cardTableOpen = require("./cardTableOpen");


function footer({ manageUrl, unsubscribeUrl }) {
  return `
    ${cardTableOpen()}
   <p style="margin:0; color:#374151; font-size:13px;">
  Don’t want to receive emails from Plumbum?
  <a href="${unsubscribeUrl}" style="color:#065f46; text-decoration:underline;">
    Unsubscribe
  </a>.
</p>
    ${cardTableClose()}
  `;
}
module.exports = footer