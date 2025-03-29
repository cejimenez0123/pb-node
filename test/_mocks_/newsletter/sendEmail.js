const sendEmail = jest.fn(async (template) => {
    if (!template || !template.to || !template.subject || !template.html) {
      throw new Error("Invalid email template");
    }
    console.log("Mock email sent:", template);
    return { messageId: "mock-message-id" };
  });
  
module.exports = sendEmail;
  