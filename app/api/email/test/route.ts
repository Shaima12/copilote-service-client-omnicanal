import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const { data, error } = await resend.emails.send({
      from: "ZEN Copilot <onboarding@resend.dev>",
      to: ["ichaoui.shaima@gmail.com"],
      subject: "ZEN Copilot - Resend Test",
      html: `
        <h1>ZEN Copilot</h1>
        <p>This is a test email sent through Resend.</p>
        <p>Resend is working correctly. ✅</p>
      `,
    });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Email sent successfully",
      data,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong",
      },
      { status: 500 }
    );
  }
}