import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const { data, error } = await resend.emails.send({
      from: "Customer Support Agent <onboarding@resend.dev>",
      to: ["ichaoui.shaima@gmail.com"],
      subject: "Customer Support Agent - Resend Test",
      html: `
        <h1>Customer Support Agent</h1>
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