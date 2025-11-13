export const verifyArTemplate = (verifyUrl) => `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Tahoma, Arial; direction:rtl; text-align:right; padding:20px;">
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
        <td style="font-size:20px; font-weight:700; color:#111; padding-bottom:16px;">
          تأكيد البريد الإلكتروني
        </td>
      </tr>

      <!-- Body text -->
      <tr>
        <td style="font-size:15px; color:#444; padding-bottom:24px;">
          شكرًا لتسجيلك في منصة عقار دوت. اضغط على الزر أدناه لتأكيد البريد الإلكتروني الخاص بك.
        </td>
      </tr>

      <!-- Button -->
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <a href="${verifyUrl}"
            style="background:#2563eb; color:#fff; padding:10px 22px; border-radius:6px; text-decoration:none; font-size:15px; display:inline-block;">
            تأكيد البريد
          </a>
        </td>
      </tr>

      <!-- Fallback link -->
      <tr>
        <td style="font-size:13px; color:#666; word-break:break-all;">
          إذا لم يعمل الزر، قم بنسخ الرابط التالي ولصقه في المتصفح:
          <br/><br/>
          <a href="${verifyUrl}" style="color:#2563eb;">${verifyUrl}</a>
        </td>
      </tr>
    </table>

    <!-- Footer with links -->
    <table width="460" cellpadding="0" cellspacing="0" style="width:460px; max-width:460px; padding-top:14px; text-align:center;">
      <tr>
        <td style="font-size:12px; color:#777; padding-bottom:6px;">
          <a href="https://aqardot.com" style="color:#2563eb; text-decoration:none;">الموقع الرسمي</a>
          &nbsp;•&nbsp;
          <a href="https://aqardot.com/privacy" style="color:#2563eb; text-decoration:none;">الخصوصية</a>
          &nbsp;•&nbsp;
          <a href="https://aqardot.com/terms" style="color:#2563eb; text-decoration:none;">الشروط</a>
        </td>
      </tr>
      <tr>
        <td style="font-size:11px; color:#aaa;">
           جميع الحقوق محفوظة © ${new Date().getFullYear()} | عقار دوت
        </td>
      </tr>
    </table>

  </td></tr>
</table>
`;
