// Dev-mode "mail" — prints the magic link to the server console instead of
// sending a real email. Swap in a real provider (Postmark, Resend, SES...)
// by replacing the body of sendMagicLink once MAIL_ENABLED=true.
export async function sendMagicLink(email, link) {
  if (process.env.MAIL_ENABLED === 'true') {
    throw new Error('MAIL_ENABLED is true but no real mail provider is wired up in src/services/mail.js');
  }
  console.log('\n──────────────────────────────────────────────');
  console.log(`  Magic sign-in link for ${email}:`);
  console.log(`  ${link}`);
  console.log('──────────────────────────────────────────────\n');
}
