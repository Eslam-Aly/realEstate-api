export const resetPassEnTemplate = (resetUrl) => `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial, 'Segoe UI', Tahoma, sans-serif; padding:20px;">
  <tr><td align="center">

    <table width="460" cellpadding="0" cellspacing="0" style="width:460px; max-width:460px; border:1px solid #eee; border-radius:8px; padding:30px; background:#ffffff;">
      <!-- Logo -->
      <tr>
        <td align="center" style="padding-bottom:20px;">
          <img src="https://aqardot.com/logoBlue.png" width="220" alt="AqarDot" />
        </td>
      </tr>

      <!-- Title -->
      <tr>
        <td style="font-size:20px; font-weight:600; color:#111; padding-bottom:16px;">
          Reset your password
        </td>
      </tr>

      <!-- Body text -->
      <tr>
        <td style="font-size:15px; color:#444; padding-bottom:24px;">
          We received a request to reset your AqarDot password. Click the button below to create a new password.
          This link is valid for a limited time.
        </td>
      </tr>

      <!-- Button -->
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <a href="${resetUrl}"
            style="background:#2563eb; color:#fff; padding:10px 22px; border-radius:6px; text-decoration:none; font-size:15px; display:inline-block;">
            Reset Password
          </a>
        </td>
      </tr>

      <!-- Fallback link -->
      <tr>
        <td style="font-size:13px; color:#666; word-break:break-all;">
          If the button doesn’t work, copy and paste this link into your browser:
          <br/><br/>
          <a href="${resetUrl}" style="color:#2563eb;">${resetUrl}</a>
          <br/><br/>
          If you did not request a password reset, you can safely ignore this email.
        </td>
      </tr>
    </table>

    <!-- Footer with links -->
    <table width="460" cellpadding="0" cellspacing="0" style="width:460px; max-width:460px; padding-top:14px; text-align:center;">
      <tr>
        <td style="font-size:12px; color:#777; padding-bottom:6px;">
          <a href="https://aqardot.com" style="color:#2563eb; text-decoration:none;">Website</a>
          &nbsp;•&nbsp;
          <a href="https://aqardot.com/privacy" style="color:#2563eb; text-decoration:none;">Privacy</a>
          &nbsp;•&nbsp;
          <a href="https://aqardot.com/terms" style="color:#2563eb; text-decoration:none;">Terms</a>
        </td>
      </tr>
      <tr>
        <td style="font-size:11px; color:#aaa;">
          All Rights Reserved © ${new Date().getFullYear()} | AqarDot
        </td>
      </tr>
    </table>

  </td></tr>
</table>
`;
