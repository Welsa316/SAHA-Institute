import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { name, email, phone, subject, message } = await req.json()

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Name, email, and message are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Store in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { error: dbError } = await supabase
      .from("contact_submissions")
      .insert({ name, email, phone, subject, message })

    if (dbError) {
      console.error("DB error:", dbError)
    }

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY")
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured")
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SAHA Institute <onboarding@resend.dev>",
        to: ["iiwally26@gmail.com"],
        subject: `New Contact: ${subject || "Website Inquiry"} — from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a2b55; padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0;">New Contact Form Submission</h2>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #1a2b55; width: 100px;">Name:</td>
                  <td style="padding: 8px 0; color: #334155;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #1a2b55;">Email:</td>
                  <td style="padding: 8px 0; color: #334155;"><a href="mailto:${email}">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #1a2b55;">Phone:</td>
                  <td style="padding: 8px 0; color: #334155;">${phone || "Not provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #1a2b55;">Subject:</td>
                  <td style="padding: 8px 0; color: #334155;">${subject || "General Inquiry"}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <p style="font-weight: bold; color: #1a2b55; margin-bottom: 8px;">Message:</p>
              <p style="color: #334155; white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error("Resend error:", errText)
      throw new Error("Failed to send email")
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Error:", err)
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
