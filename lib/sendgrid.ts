import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@nudgeable.ai';

interface CredentialEmailData {
  name: string;
  email: string;
  password: string;
  role: string;
  company_name: string;
  login_url: string;
}

interface WelcomeEmailData {
  name: string;
  cohort_name: string;
  training_date: string;
  trainer_name: string;
  login_url: string;
}

export async function sendCredentialEmail(to: string, data: CredentialEmailData) {
  const templateId = process.env.SENDGRID_CREDENTIAL_TEMPLATE_ID;

  if (templateId) {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      templateId,
      dynamicTemplateData: data,
    });
  } else {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject: `Your Nudgeable login credentials — ${data.company_name}`,
      html: `
        <h2>Welcome to Nudgeable, ${data.name}!</h2>
        <p>Your account has been created for <strong>${data.company_name}</strong>.</p>
        <p><strong>Email:</strong> ${data.email}<br/>
        <strong>Password:</strong> ${data.password}<br/>
        <strong>Role:</strong> ${data.role}</p>
        <p><a href="${data.login_url}">Log in here →</a></p>
        <p style="color:#888;font-size:12px;">Please change your password after first login.</p>
      `,
    });
  }
}

export async function sendWelcomeEmail(to: string, data: WelcomeEmailData) {
  const templateId = process.env.SENDGRID_WELCOME_TEMPLATE_ID;

  if (templateId) {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      templateId,
      dynamicTemplateData: data,
    });
  } else {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject: `You've been invited to ${data.cohort_name}`,
      html: `
        <h2>Hi ${data.name},</h2>
        <p>You've been enrolled in <strong>${data.cohort_name}</strong>.</p>
        <p><strong>Training Date:</strong> ${data.training_date}<br/>
        <strong>Trainer:</strong> ${data.trainer_name}</p>
        <p><a href="${data.login_url}">Go to your dashboard →</a></p>
      `,
    });
  }
}
