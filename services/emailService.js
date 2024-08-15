const emailjs = require('emailjs-com');
require('dotenv').config();

const sendEmail = async (toEmail, subject, message) => {
    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_ADMIN_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
    const templateParams = {
        to_email: toEmail,
        subject: subject,
        message: message
    };


    try {
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Failed to send email:', error);
    }
};

module.exports = { sendEmail };
