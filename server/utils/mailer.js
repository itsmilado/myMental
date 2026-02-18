// server/utils/mailer.js

require("dotenv").config();

const nodemailer = require("nodemailer");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

// Create SES client
const sesClient = new SESv2Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Create Nodemailer transport
const transporter = nodemailer.createTransport({
    SES: { sesClient, SendEmailCommand },
});

const sendEmail = async ({ to, subject, text, html }) => {
    return transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
    });
};

module.exports = { sendEmail };
