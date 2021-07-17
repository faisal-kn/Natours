const nodemailer = require('nodemailer');
const htmlToText = require('html-to-text');
const pug = require('pug');
const nodemailMailgun = require('nodemailer-mailgun-transport');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Mohd. Faisal <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      const auth = {
        auth: {
          api_key: `${process.env.PROD_EMAIL_APIKEY}`,
          domain: `${process.env.PROD_EMAIL_DOMAIN}`,
        },
      };
      return nodemailer.createTransport(nodemailMailgun(auth));
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      //OUR ACCONUT WHICH IS SENDING THE MAIL.
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    //Render HTML for the email based on a template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    //define mail options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };
    //create a transport and send the email
    await this.newTransport().sendMail(mailOptions, (err, data) => {
      if (err) {
        // console.log(err);
      } else {
        // console.log(data);
      }
    });
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the natours family!!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your Password Reset token. Valid for only 10 minutes'
    );
  }
};
//CREATE A TRANSPORTER:- A SERVICE WHICH WILL ACTUALLY SEND THE EMAIl like gmail
//NOT USING GMAIL BECAUSE GMAIL HAS A LIMIT ON NO. OF EMAILS SO NOT USED IN MATTERS OF PRODUCTION APP
//CREATING MAIL OPTIONS : LIKE THE USER TO WHOM WE ARE SENDING THE MAIL
//sending the email to
