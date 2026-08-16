import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, fullName } = await req.json();

    if (typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Adresse e-mail invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof password !== "string" || password.length < 6) {
      return new Response(JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof fullName !== "string" || fullName.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Le nom complet est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { count, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) {
      throw countError;
    }
    if (count && count > 0) {
      return new Response(JSON.stringify({ error: "Un administrateur existe déjà pour ce commerce" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: "Impossible de créer le compte administrateur" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      email,
      full_name: fullName.trim(),
      role: "admin",
      permissions: [],
      is_active: true,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("bootstrap-admin failed", error);
    return new Response(JSON.stringify({ error: "Une erreur est survenue, veuillez réessayer" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
