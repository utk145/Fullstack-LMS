import nodemailer, { Transporter } from "nodemailer";
import ejs from "ejs";
import path from "path";

/**
 * Interface representing options for sending an email.
 */
interface EmailOptions {
    email: string;
    subject: string;
    template: string;
    data: { [key: string]: any };
}

/**
 * Function to send an email using Nodemailer.
 * @param options Email sending options.
 * @param email 
 * @param subject 
 * @param template 
 * @param data 
 */
const sendMail = async (options: EmailOptions): Promise<void> => {
    // Step 1: Create a Nodemailer transporter
    const transporter: Transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || "587"),
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    // Step 2: Render email template
    const { data, email, subject, template } = options;
    const templatePath = path.join(__dirname, "../mails", template);
    const html: string = await ejs.renderFile(templatePath, data);

    // Step 3: Prepare email options
    const mailOptions = {
        from: process.env.SMTP_MAIL!,
        to: email,
        subject,
        html
    };

    // Step 4: Send email
    await transporter.sendMail(mailOptions);
};

export default sendMail;